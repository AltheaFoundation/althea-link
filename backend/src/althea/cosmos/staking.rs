use crate::althea::{abi_util::format_decimal_18, ALTHEA_GRPC_URL, CACHE_DURATION};
use cosmos_sdk_proto_althea::cosmos::mint::v1beta1::query_client::QueryClient as MintQueryClient;
use cosmos_sdk_proto_althea::cosmos::staking::v1beta1::query_client::QueryClient as StakingQueryClient;
use cosmos_sdk_proto_althea::cosmos::staking::v1beta1::QueryPoolRequest;
use log::{error, info};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tonic::transport::Endpoint;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StakingInfo {
    pub annual_provisions: String,
    pub bonded_tokens: String,
    pub apr: String,
    pub last_updated: u64,
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

    // Convert and format annual_provisions
    let annual_provisions = String::from_utf8(annual_provisions_bytes)
        .map_err(|e| format!("Invalid UTF-8 in annual_provisions: {}", e))?;
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
        annual_provisions,
        bonded_tokens,
        apr,
        last_updated: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    cache_staking_info(db, &staking_info);
    Ok(staking_info)
}

fn calculate_apr(annual_provisions: &str, bonded_tokens: &str) -> String {
    let annual_provisions = match Decimal::from_str(annual_provisions) {
        Ok(ap) => ap,
        Err(_) => return "0".to_string(),
    };

    let bonded_tokens = match Decimal::from_str(bonded_tokens) {
        Ok(bt) => bt,
        Err(_) => return "0".to_string(),
    };

    // If bonded tokens is 0, return 0 to avoid division by zero
    if bonded_tokens.is_zero() {
        return "0".to_string();
    }

    // If annual provisions is 0, return 0 but in the future this will change
    if annual_provisions.is_zero() {
        return "0".to_string();
    }

    // Calculate APR: (annual_provisions / bonded_tokens) * 100
    let apr = (annual_provisions / bonded_tokens) * Decimal::from(100);
    apr.to_string()
}

fn get_cached_staking_info(db: &rocksdb::DB) -> Option<StakingInfo> {
    let key = b"staking_info";
    match db.get(key).unwrap() {
        Some(data) => {
            let info: StakingInfo = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            if now - info.last_updated < CACHE_DURATION {
                Some(info)
            } else {
                None
            }
        }
        None => None,
    }
}

fn cache_staking_info(db: &rocksdb::DB, info: &StakingInfo) {
    const STAKING_INFO_CACHE_KEY: &[u8] = b"staking_info";
    let encoded = bincode::serialize(info).unwrap();
    db.put(STAKING_INFO_CACHE_KEY, encoded).unwrap();
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
