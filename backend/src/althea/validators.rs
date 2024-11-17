use crate::althea::abi_util::format_decimal_18;
use crate::althea::CACHE_DURATION;
use crate::Arc;
use cosmos_sdk_proto_althea::cosmos::base::query::v1beta1::PageRequest;
use cosmos_sdk_proto_althea::cosmos::staking::v1beta1::{QueryValidatorsRequest, Validator};
use deep_space::Contact;
use log::{error, info};
use rocksdb::DB;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidatorInfo {
    pub operator_address: String,
    pub consensus_pubkey: Option<String>,
    pub jailed: bool,
    pub status: i32,
    pub tokens: String,
    pub delegator_shares: String,
    pub description: Option<ValidatorDescription>,
    pub unbonding_height: i64,
    pub unbonding_time: Option<SystemTime>,
    pub commission: Option<String>,
    pub min_self_delegation: String,
    pub last_updated: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidatorDescription {
    pub moniker: String,
    pub identity: String,
    pub website: String,
    pub security_contact: String,
    pub details: String,
}

pub async fn fetch_validators(
    db: &rocksdb::DB,
    contact: &deep_space::Contact,
) -> Result<Vec<ValidatorInfo>, Box<dyn std::error::Error>> {
    info!("Fetching validators");
    let cached = get_cached_validators(db);
    if let Some(validators) = cached {
        return Ok(validators);
    }

    let request = QueryValidatorsRequest {
        status: String::new(),
        pagination: Some(PageRequest {
            key: Vec::new(),
            offset: 0,
            limit: 1000,
            count_total: true,
            reverse: false,
        }),
    };

    let validators = contact.get_validators_list(request).await?;
    let mut all_validators: Vec<ValidatorInfo> =
        validators.into_iter().map(ValidatorInfo::from).collect();

    // Sort validators by tokens (voting power) in descending order
    all_validators.sort_by(|a, b| {
        let a_tokens = u128::from_str(&a.tokens).unwrap_or_default();
        let b_tokens = u128::from_str(&b.tokens).unwrap_or_default();
        b_tokens.cmp(&a_tokens)
    });

    cache_validators(db, &all_validators);
    info!(
        "Successfully fetched and stored {} validators",
        all_validators.len()
    );
    Ok(all_validators)
}

fn get_cached_validators(db: &rocksdb::DB) -> Option<Vec<ValidatorInfo>> {
    let key = b"validators";
    match db.get(key).unwrap() {
        Some(data) => {
            let validators: Vec<ValidatorInfo> = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Cache for 5 minutes
            if now - validators[0].last_updated < CACHE_DURATION {
                Some(validators)
            } else {
                None
            }
        }
        None => None,
    }
}

fn cache_validators(db: &rocksdb::DB, validators: &[ValidatorInfo]) {
    const VALIDATORS_CACHE_KEY: &[u8] = b"validators";
    let encoded = bincode::serialize(validators).unwrap();
    db.put(VALIDATORS_CACHE_KEY, encoded).unwrap();
}

impl From<Validator> for ValidatorInfo {
    fn from(v: Validator) -> Self {
        let commission = v
            .commission
            .and_then(|c| c.commission_rates.map(|r| format_decimal_18(r.rate)));

        ValidatorInfo {
            operator_address: v.operator_address,
            consensus_pubkey: v
                .consensus_pubkey
                .map(|p| String::from_utf8_lossy(&p.value).to_string()),
            jailed: v.jailed,
            status: v.status,
            tokens: v.tokens,
            delegator_shares: v.delegator_shares,
            description: v.description.map(|d| ValidatorDescription {
                moniker: d.moniker,
                identity: d.identity,
                website: d.website,
                security_contact: d.security_contact,
                details: d.details,
            }),
            unbonding_height: v.unbonding_height,
            unbonding_time: v
                .unbonding_time
                .map(|t| SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(t.seconds as u64)),
            commission,
            min_self_delegation: v.min_self_delegation,
            last_updated: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

impl ValidatorInfo {
    pub fn is_active(&self) -> bool {
        self.status == 3 && !self.jailed
    }
}

pub async fn fetch_validators_filtered(
    db: &rocksdb::DB,
    contact: &deep_space::Contact,
    active_only: Option<bool>,
) -> Result<Vec<ValidatorInfo>, Box<dyn std::error::Error>> {
    let validators = fetch_validators(db, contact).await?;

    Ok(match active_only {
        Some(true) => validators.into_iter().filter(|v| v.is_active()).collect(),
        Some(false) => validators.into_iter().filter(|v| !v.is_active()).collect(),
        None => validators,
    })
}

pub fn start_validator_cache_refresh_task(db: Arc<DB>, contact: Contact) {
    tokio::spawn(async move {
        loop {
            // Check if cache needs refresh
            if get_cached_validators(&db).is_none() {
                info!("Validator cache expired, refreshing...");
                match fetch_validators(&db, &contact).await {
                    Ok(_) => info!("Successfully refreshed validator cache"),
                    Err(e) => error!("Failed to refresh validator cache: {}", e),
                }
            }

            // Sleep for the cache duration before refreshing again
            tokio::time::sleep(tokio::time::Duration::from_secs(CACHE_DURATION)).await;
        }
    });
}

pub async fn fetch_validator_by_address(
    db: &rocksdb::DB,
    contact: &deep_space::Contact,
    operator_address: &str,
) -> Result<Option<ValidatorInfo>, Box<dyn std::error::Error>> {
    let validators = fetch_validators(db, contact).await?;
    Ok(validators
        .into_iter()
        .find(|v| v.operator_address == operator_address))
}
