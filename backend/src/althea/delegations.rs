use deep_space::{Address as CosmosAddress, Contact};
use log::info;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DelegationInfo {
    pub validator_address: String,
    pub delegator_address: String,
    pub shares: String,
    pub balance: Option<String>,
    pub last_updated: u64,
}

pub async fn fetch_delegations(
    db: &rocksdb::DB,
    contact: &Contact,
    delegator_address: CosmosAddress,
) -> Result<Vec<DelegationInfo>, Box<dyn std::error::Error>> {
    info!("Fetching delegations for {}", delegator_address);
    let cached = get_cached_delegations(db, &delegator_address);
    if let Some(delegations) = cached {
        return Ok(delegations);
    }

    // First get all validators this delegator has delegated to
    let validators = contact
        .query_delegator_validators(delegator_address)
        .await?;

    // For each validator, get the delegation details
    let mut delegations = Vec::new();
    for validator_addr in validators {
        let validator_address = CosmosAddress::from_bech32(validator_addr.clone())?;

        if let Some(delegation) = contact
            .get_delegation(validator_address, delegator_address)
            .await?
        {
            if let Some(del_response) = delegation.delegation {
                delegations.push(DelegationInfo {
                    validator_address: validator_addr,
                    delegator_address: delegator_address.to_string(),
                    shares: del_response.shares,
                    balance: delegation.balance.map(|b| b.amount),
                    last_updated: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                });
            }
        }
    }

    cache_delegations(db, &delegator_address, &delegations);
    info!(
        "Successfully fetched and stored {} delegations for {}",
        delegations.len(),
        delegator_address
    );
    Ok(delegations)
}

fn get_cached_delegations(
    db: &rocksdb::DB,
    delegator: &CosmosAddress,
) -> Option<Vec<DelegationInfo>> {
    let key = format!("delegations:{}", delegator).into_bytes();
    match db.get(&key).unwrap() {
        Some(data) => {
            let delegations: Vec<DelegationInfo> = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Cache for 5 minutes
            if !delegations.is_empty() && now - delegations[0].last_updated < 300 {
                Some(delegations)
            } else {
                None
            }
        }
        None => None,
    }
}

fn cache_delegations(db: &rocksdb::DB, delegator: &CosmosAddress, delegations: &[DelegationInfo]) {
    let key = format!("delegations:{}", delegator).into_bytes();
    let encoded = bincode::serialize(delegations).unwrap();
    db.put(key, encoded).unwrap();
}
