use bincode;
use deep_space::{Address as CosmosAddress, Contact};
use log::error;
use rocksdb::DB;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use std::vec::Vec;

use crate::althea::abi_util::format_u128_to_decimal_18;
use crate::althea::ALTHEA_GRPC_URL;
use crate::althea::DELEGATIONS_CACHE_DURATION;
use cosmos_sdk_proto_althea::cosmos::staking::v1beta1::{
    query_client::QueryClient as StakingQueryClient, QueryDelegatorUnbondingDelegationsRequest,
};
use tokio;
use tonic::transport::Endpoint;

const DELEGATIONS_KEY_PREFIX: &str = "delegations_";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DelegatorResponse {
    pub delegations: Vec<DelegationResponse>,
    pub unbonding_delegations: Option<Vec<UnbondingDelegation>>,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnbondingDelegation {
    pub delegator_address: String,
    pub validator_address: String,
    pub creation_height: i64,
    pub completion_time: String,
    pub initial_balance: String,
    pub balance: String,
}

fn get_cached_delegations(
    db: &rocksdb::DB,
    delegator: &CosmosAddress,
) -> Option<DelegatorResponse> {
    let key = format!("{}{}", DELEGATIONS_KEY_PREFIX, delegator);
    match db.get(key.as_bytes()).unwrap() {
        Some(data) => {
            let delegations: DelegatorResponse = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Check if any delegations exist and if cache is still valid
            if !delegations.delegations.is_empty()
                && now - delegations.delegations[0].delegation.last_updated
                    < DELEGATIONS_CACHE_DURATION
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
    let key = format!("{}{}", DELEGATIONS_KEY_PREFIX, delegator);
    let encoded = bincode::serialize(response).unwrap();
    db.put(key.as_bytes(), encoded).unwrap();
}

async fn fetch_unbonding_delegations(
    delegator_address: CosmosAddress,
) -> Result<Vec<UnbondingDelegation>, Box<dyn std::error::Error>> {
    let channel = Endpoint::from_static(ALTHEA_GRPC_URL).connect().await?;
    let mut client = StakingQueryClient::new(channel);

    let request = tonic::Request::new(QueryDelegatorUnbondingDelegationsRequest {
        delegator_addr: delegator_address.to_string(),
        pagination: None,
    });

    let response = client.delegator_unbonding_delegations(request).await?;
    let unbonding_responses = response.into_inner().unbonding_responses;

    let mut unbonding_delegations = Vec::new();

    for unbonding in unbonding_responses {
        // Clone the validator address since we'll use it multiple times in the loop
        let validator_address = unbonding.validator_address.clone();
        for entry in unbonding.entries {
            unbonding_delegations.push(UnbondingDelegation {
                delegator_address: delegator_address.to_string(),
                validator_address: validator_address.clone(),
                creation_height: entry.creation_height,
                completion_time: entry.completion_time.unwrap().to_string(),
                initial_balance: format!("{}.000000000000000000", entry.initial_balance),
                balance: format!("{}.000000000000000000", entry.balance),
            });
        }
    }

    Ok(unbonding_delegations)
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
                        let amount = r.amount.parse::<u128>().unwrap_or_default();
                        format_u128_to_decimal_18(amount, 100_000_000_000_000)
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
                format_u128_to_decimal_18(amount, 100_000_000_000_000)
            })
            .unwrap_or_else(|| "0.000000000000000000".to_string()),
    }];

    // Fetch unbonding delegations
    let unbonding_delegations = fetch_unbonding_delegations(delegator_address).await?;
    let unbonding_delegations = if unbonding_delegations.is_empty() {
        None
    } else {
        Some(unbonding_delegations)
    };

    // Create and cache response
    let response = DelegatorResponse {
        delegations: delegation_responses,
        unbonding_delegations,
        rewards: RewardsResponse { rewards, total },
    };

    cache_delegations(db, &delegator_address, &response);
    Ok(response)
}

pub fn start_delegation_cache_refresh_task(db: Arc<DB>, contact: Contact) {
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(DELEGATIONS_CACHE_DURATION)).await;

            let iter = db.iterator(rocksdb::IteratorMode::Start);
            for item in iter {
                if item.is_ok() {
                    let (key_bytes, _) = item.unwrap();
                    let key_str = String::from_utf8_lossy(&key_bytes);
                    if key_str.starts_with(DELEGATIONS_KEY_PREFIX) {
                        let delegator_addr = key_str.trim_start_matches(DELEGATIONS_KEY_PREFIX);
                        if let Ok(cosmos_addr) =
                            CosmosAddress::from_bech32(delegator_addr.to_string())
                        {
                            match fetch_delegations(&db, &contact, cosmos_addr).await {
                                Ok(_) => {}
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
