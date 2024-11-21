use crate::althea::{abi_util::format_decimal_18, ALTHEA_GRPC_URL, CACHE_DURATION};
use cosmos_sdk_proto_althea::cosmos::mint::v1beta1::query_client::QueryClient as MintQueryClient;
use cosmos_sdk_proto_althea::cosmos::staking::v1beta1::query_client::QueryClient as StakingQueryClient;
use cosmos_sdk_proto_althea::cosmos::staking::v1beta1::QueryPoolRequest;
use log::{error, info};
use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tonic::transport::Endpoint;

#[derive(Debug, Clone)]
pub struct StakingInfo {
    pub apr: String,
    pub last_updated: u64,
}

// Separate serialization structs for cache vs API
#[derive(Serialize, Deserialize)]
struct StakingInfoCache {
    pub apr: String,
    pub last_updated: u64,
}

#[derive(Serialize)]
struct StakingInfoAPI {
    pub apr: String,
}

// Implement custom serialization
impl Serialize for StakingInfo {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // For JSON serialization (API responses)
        if serializer.is_human_readable() {
            StakingInfoAPI {
                apr: self.apr.clone(),
            }
            .serialize(serializer)
        } else {
            // For bincode serialization (cache)
            StakingInfoCache {
                apr: self.apr.clone(),
                last_updated: self.last_updated,
            }
            .serialize(serializer)
        }
    }
}

// Implement custom deserialization
impl<'de> Deserialize<'de> for StakingInfo {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Always deserialize as cache format
        let cache = StakingInfoCache::deserialize(deserializer)?;
        Ok(StakingInfo {
            apr: cache.apr,
            last_updated: cache.last_updated,
        })
    }
}

pub async fn fetch_staking_info(
    db: &rocksdb::DB,
) -> Result<StakingInfo, Box<dyn std::error::Error>> {
    info!("Fetching staking info");
    let cached = get_cached_staking_info(db);
    if let Some(info) = cached {
        return Ok(info);
    }

    let channel = Endpoint::from_static(ALTHEA_GRPC_URL).connect().await?;

    // Fetch annual provisions
    let mut mint_client = MintQueryClient::new(channel.clone());
    let annual_provisions_req = tonic::Request::new(
        cosmos_sdk_proto_althea::cosmos::mint::v1beta1::QueryAnnualProvisionsRequest {},
    );
    let annual_provisions_bytes = mint_client
        .annual_provisions(annual_provisions_req)
        .await?
        .into_inner()
        .annual_provisions;

    // Handle empty response
    let annual_provisions = if annual_provisions_bytes.is_empty() {
        "0".to_string()
    } else {
        String::from_utf8(annual_provisions_bytes)
            .map_err(|e| format!("Invalid UTF-8 in annual_provisions: {}", e))?
    };

    let annual_provisions = format_decimal_18(&annual_provisions);

    // Fetch pool info
    let mut staking_client = StakingQueryClient::new(channel);
    let pool_req = tonic::Request::new(QueryPoolRequest {});
    let pool = staking_client
        .pool(pool_req)
        .await?
        .into_inner()
        .pool
        .ok_or("Pool not found")?;

    // Format bonded_tokens
    let bonded_tokens = format_decimal_18(&pool.bonded_tokens);

    // Calculate APR
    let apr = calculate_apr(&annual_provisions, &bonded_tokens);

    let staking_info = StakingInfo {
        apr,
        last_updated: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    if let Err(e) = cache_staking_info(db, &staking_info) {
        error!("Failed to cache staking info: {}", e);
    }

    Ok(staking_info)
}

fn calculate_apr(annual_provisions: &str, bonded_tokens: &str) -> String {
    let annual_provisions = match Decimal::from_str(annual_provisions) {
        Ok(ap) => ap,
        Err(_) => return "0.000000000000000000".to_string(),
    };

    let bonded_tokens = match Decimal::from_str(bonded_tokens) {
        Ok(bt) => bt / Decimal::from(10u64.pow(18)), // Convert to decimal form
        Err(_) => return "0.000000000000000000".to_string(),
    };

    // If bonded tokens is 0, return 0 to avoid division by zero
    if bonded_tokens.is_zero() {
        return "0.000000000000000000".to_string();
    }

    // If annual provisions is 0, return 0
    if annual_provisions.is_zero() {
        return "0.000000000000000000".to_string();
    }

    // Now both values are in decimal form, we can divide them directly
    let apr = annual_provisions / bonded_tokens;
    apr.to_string()
}

fn get_cached_staking_info(db: &rocksdb::DB) -> Option<StakingInfo> {
    let key = b"staking_info";

    // Try to get the data from cache
    let data = match db.get(key) {
        Ok(Some(data)) if !data.is_empty() => data,
        Ok(_) => {
            // Empty or no data, clean up and return None
            let _ = db.delete(key);
            return None;
        }
        Err(e) => {
            error!("Failed to read from cache: {}", e);
            return None;
        }
    };

    // Try to deserialize
    match bincode::deserialize::<StakingInfo>(&data) {
        Ok(info) => {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            if now - info.last_updated < CACHE_DURATION {
                Some(info)
            } else {
                // Cache expired, clean up
                let _ = db.delete(key);
                None
            }
        }
        Err(e) => {
            error!("Failed to deserialize cache: {}", e);
            // Invalid cache data, clean up
            let _ = db.delete(key);
            None
        }
    }
}

fn cache_staking_info(
    db: &rocksdb::DB,
    info: &StakingInfo,
) -> Result<(), Box<dyn std::error::Error>> {
    let key = b"staking_info";

    // Serialize first to validate the data
    let encoded = bincode::serialize(info)?;

    // Only clear existing cache and write if serialization succeeded
    db.put(key, encoded)?;

    Ok(())
}

pub fn start_staking_info_cache_refresh_task(db: Arc<rocksdb::DB>) {
    tokio::spawn(async move {
        loop {
            if get_cached_staking_info(&db).is_none() {
                info!("Staking info cache expired, refreshing...");
                match fetch_staking_info(&db).await {
                    Ok(_) => info!("Successfully refreshed staking info cache"),
                    Err(e) => error!("Failed to refresh staking info cache: {}", e),
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_secs(CACHE_DURATION)).await;
        }
    });
}