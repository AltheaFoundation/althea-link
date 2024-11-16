use bincode;
use deep_space::{Address as CosmosAddress, Contact};
use log::{error, info};
use rocksdb::DB;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use std::vec::Vec;

use crate::althea::CACHE_DURATION;
use tokio;

const DELEGATIONS_KEY_PREFIX: &str = "delegations_";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DelegatorResponse {
    pub delegations: Vec<DelegationResponse>,
    pub unbonding_delegations: Option<Vec<String>>,
    pub rewards: RewardsResponse,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DelegationResponse {
    pub delegation: DelegationInfo,
    pub balance: Balance,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DelegationInfo {
    pub delegator_address: String,
    pub validator_address: String,
    pub shares: String,
    pub last_updated: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Balance {
    pub denom: String,
    pub amount: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RewardsResponse {
    pub rewards: Vec<ValidatorReward>,
    pub total: Vec<Balance>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidatorReward {
    pub validator_address: String,
    pub reward: Vec<Balance>,
}

fn get_cached_delegations(
    db: &rocksdb::DB,
    delegator: &CosmosAddress,
) -> Option<DelegatorResponse> {
    let key = format!("{}{}", DELEGATIONS_KEY_PREFIX, delegator.to_string());
    match db.get(key.as_bytes()).unwrap() {
        Some(data) => {
            let delegations: DelegatorResponse = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Check if any delegations exist and if cache is still valid
            if !delegations.delegations.is_empty()
                && now - delegations.delegations[0].delegation.last_updated < CACHE_DURATION
            {
                Some(delegations)
            } else {
                None
            }
        }
        None => None,
    }
}

fn cache_delegations(db: &rocksdb::DB, delegator: &CosmosAddress, response: &DelegatorResponse) {
    let key = format!("{}{}", DELEGATIONS_KEY_PREFIX, delegator.to_string());
    let encoded = bincode::serialize(response).unwrap();
    db.put(key.as_bytes(), encoded).unwrap();
}

pub async fn fetch_delegations(
    db: &rocksdb::DB,
    contact: &Contact,
    delegator_address: CosmosAddress,
) -> Result<DelegatorResponse, Box<dyn std::error::Error>> {
    // Check cache first
    if let Some(cached) = get_cached_delegations(db, &delegator_address) {
        return Ok(cached);
    }

    let validators = contact
        .query_delegator_validators(delegator_address)
        .await?;

    let mut delegation_responses = Vec::new();
    for validator_addr in &validators {
        let validator_address = CosmosAddress::from_bech32(validator_addr.to_string())?;

        if let Some(delegation) = contact
            .get_delegation(validator_address, delegator_address)
            .await?
        {
            if let Some(del_response) = delegation.delegation {
                delegation_responses.push(DelegationResponse {
                    delegation: DelegationInfo {
                        delegator_address: delegator_address.to_string(),
                        validator_address: validator_addr.clone(),
                        shares: format!("{}.000000000000000000", del_response.shares),
                        last_updated: SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    },
                    balance: Balance {
                        denom: "aalthea".to_string(),
                        amount: delegation.balance.map(|b| b.amount).unwrap_or_default(),
                    },
                });
            }
        }
    }

    // Fetch rewards using query_all_delegation_rewards
    let rewards_response = contact
        .query_all_delegation_rewards(delegator_address)
        .await?;

    let rewards = validators
        .iter()
        .map(|validator_addr| ValidatorReward {
            validator_address: validator_addr.clone(),
            reward: vec![Balance {
                denom: "aalthea".to_string(),
                amount: rewards_response
                    .rewards
                    .iter()
                    .find(|r| r.validator_address == *validator_addr)
                    .and_then(|r| r.reward.first())
                    .map(|r| {
                        // Convert to u128, divide by 10^14 to get the correct decimal position
                        let amount = r.amount.parse::<u128>().unwrap_or_default();
                        format!("{}.000000000000000000", amount / 100_000_000_000_000)
                    })
                    .unwrap_or_else(|| "0.000000000000000000".to_string()),
            }],
        })
        .collect();

    let total = vec![Balance {
        denom: "aalthea".to_string(),
        amount: rewards_response
            .total
            .first()
            .map(|t| {
                let amount = t.amount.parse::<u128>().unwrap_or_default();
                format!("{}.000000000000000000", amount / 100_000_000_000_000)
            })
            .unwrap_or_else(|| "0.000000000000000000".to_string()),
    }];

    // Cache the response before returning
    let response = DelegatorResponse {
        delegations: delegation_responses,
        unbonding_delegations: None,
        rewards: RewardsResponse { rewards, total },
    };

    cache_delegations(db, &delegator_address, &response);
    Ok(response)
}

pub fn start_delegation_cache_refresh_task(db: Arc<DB>, contact: Contact) {
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(CACHE_DURATION)).await;

            let iter = db.iterator(rocksdb::IteratorMode::Start);
            for item in iter {
                if let Ok((key_bytes, _)) = item {
                    let key_str = String::from_utf8_lossy(&key_bytes);
                    if key_str.starts_with(DELEGATIONS_KEY_PREFIX) {
                        let delegator_addr = key_str.trim_start_matches(DELEGATIONS_KEY_PREFIX);
                        if let Ok(cosmos_addr) =
                            CosmosAddress::from_bech32(delegator_addr.to_string())
                        {
                            match fetch_delegations(&db, &contact, cosmos_addr).await {
                                Ok(_) => {
                                    info!("Refreshed delegations cache for {}", delegator_addr)
                                }
                                Err(e) => error!(
                                    "Failed to refresh delegations cache for {}: {}",
                                    delegator_addr, e
                                ),
                            }
                        }
                    }
                }
            }
        }
    });
}
