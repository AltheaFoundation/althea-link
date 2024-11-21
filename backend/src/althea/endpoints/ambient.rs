use crate::althea::database::{
    get_syncing,
    positions::Position::{Ambient, Ranged},
    tracking::{LiquidityBump, TrackedPool},
};
use crate::althea::{
    database::{
        pools::{get_init_pool, get_init_pools},
        positions::{
            ambient::{get_all_burn_ambient, get_all_mint_ambient},
            get_active_user_pool_positions, get_active_user_positions,
            ranged::{get_all_burn_ranged, get_all_mint_ranged},
        },
        tracking::get_tracked_pool,
    },
    ALTHEA_MAINNET_EVM_CHAIN_ID,
};
use actix_web::{
    get, post,
    web::{self, Json},
    HttpResponse, Responder,
};
use clarity::{Address, Uint256};

use log::info;
use num_traits::ToPrimitive;
use rocksdb::DB;
use serde::{Deserialize, Serialize};

use std::sync::Arc;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PoolRequest {
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
}

/// Retrieves a pool by its base, quote, and pool index.
///
/// # Query
///
/// The request body should be a JSON object with the following fields:
///
/// - `base`: The address of the pool's base token
/// - `quote`: The address of the pool's quote token
/// - `poolIdx`: The pool's template value
///
/// # Response
///
/// The response body will be a JSON array of `PoolInitEvent` objects representing the moment of creation of the pool
#[post("/init_pool")]
pub async fn query_pool(req: Json<PoolRequest>, db: web::Data<Arc<DB>>) -> impl Responder {
    let req = req.into_inner();
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    info!("Querying pool {:?}", req);
    let pool = get_init_pool(&db, req.base, req.quote, req.pool_idx);
    match pool {
        Some(pool) => HttpResponse::Ok().json(pool),
        None => HttpResponse::NotFound().body("No pool found for base quote poolIdx triple"),
    }
}

/// Retrieves all known InitPool events
///
/// # Query
///
/// A simple HTTP GET request
///
/// # Response
///
/// The response body will be a JSON array of `InitPoolEvent` objects representing the moment of creation of the pools
#[get("/init_pools")]
pub async fn query_all_init_pools(db: web::Data<Arc<DB>>) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    info!("Querying all InitPools");
    let pools = get_init_pools(&db);
    if pools.is_empty() {
        HttpResponse::NotFound().body("No pools found")
    } else {
        HttpResponse::Ok().json(pools)
    }
}

/// Retrieves all known MintRanged events
///
/// # Query
///
/// A simple HTTP GET request
///
/// # Response
///
/// The response body will be a JSON array of `MintRangedEvent` objects representing the moment of creation of the pools
#[get("/all_mint_ranged")]
pub async fn query_all_mint_ranged(db: web::Data<Arc<DB>>) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    info!("Querying all MintRanged events");
    let events = get_all_mint_ranged(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No MintRangedEvents found")
    } else {
        HttpResponse::Ok().json(events)
    }
}

/// Retrieves all known MintAmbient events
///
/// # Query
///
/// A simple HTTP GET request
///
/// # Response
///
/// The response body will be a JSON array of `MintAmbientEvent` objects representing the moment of creation of the pools
#[get("/all_mint_ambient")]
pub async fn query_all_mint_ambient(db: web::Data<Arc<DB>>) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    info!("Querying all MintAmbinet events");
    let events = get_all_mint_ambient(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No MintAmbientEvents found")
    } else {
        HttpResponse::Ok().json(events)
    }
}

/// Retrieves all known BurnRanged events
///
/// # Query
///
/// A simple HTTP GET request
///
/// # Response
///
/// The response body will be a JSON array of `BurnRangedEvent` objects representing the moment of creation of the pools
#[get("/all_burn_ranged")]
pub async fn query_all_burn_ranged(db: web::Data<Arc<DB>>) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    info!("Querying all BurnRanged events");
    let events = get_all_burn_ranged(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No BurnRangedEvents found")
    } else {
        HttpResponse::Ok().json(events)
    }
}

/// Retrieves all known BurnAmbient events
///
/// # Query
///
/// A simple HTTP GET request
///
/// # Response
///
/// The response body will be a JSON array of `BurnAmbientEvent` objects representing the moment of creation of the pools
#[get("/all_burn_ambient")]
pub async fn query_all_burn_ambient(db: web::Data<Arc<DB>>) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    info!("Querying all MintAmbient events");
    let events = get_all_burn_ambient(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No BurnAmbientEvents found")
    } else {
        HttpResponse::Ok().json(events)
    }
}

/// A request for a user's positions in a pool
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UserPoolPositionsRequest {
    pub chain_id: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
}

/// An individual position report for a user in a pool
/// Many of these fields are not used by the frontend, so the default values are used instead
/// of trying to populate them with real data
#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct UserPosition {
    // USED
    pub chain_id: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub is_bid: bool,
    pub ambient_liq: Uint256,
    pub conc_liq: Uint256,

    // UNUSED
    pub time_first_mint: i32,
    pub latest_update_time: i32,
    pub last_mint_tx: String,
    pub first_mint_tx: String,
    pub position_type: String,
    pub reward_liq: Uint256,
    pub liq_refresh_time: Uint256,
    // This is a particularly strange field in the original code
    #[serde(rename = "-")]
    pub strange: StrangeStruct,
    pub apr_duration: f64,
    pub apr_post_liq: f64,
    pub apr_contributed_liq: f64,
    pub apr: f64,
    pub position_id: f64,
}

/// This struct is used to populate the `strange` field in `UserPosition`, which becomes renamed to `-`
/// It is unused, so this struct is just meant to populate expected JSON fields
#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct StrangeStruct {
    pub hist: Vec<StrangeInnerStruct>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct StrangeInnerStruct {
    #[serde(rename = "Time")]
    pub time: i32,
    #[serde(rename = "LiqChange")]
    pub liq_change: f64,
    pub reset_rewards: bool,
}

/// Retrieves all known user positions in a pool
///
/// # Query
///
/// A query string with the following parameters:
/// - chain_id: A number representing the id of the chain to use (not used, added for compatibility with legacy frontend queries)
/// - user: The user's address as a EIP 55 string
/// - base: The address of the base token in the pool (0 if native token) as a EIP 55 string
/// - quote: The address of the quote token in the pool as a EIP 55 string
/// - pool_idx: A number representing the pool's template index, needed for identifying the specific pool
///
/// # Response
///
/// A json response body containing an array of UserPosition objects, otherwise a 404 Not Found response
#[get("/user_pool_positions")]
pub async fn user_pool_positions(
    req: web::Query<UserPoolPositionsRequest>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    let positions =
        get_active_user_pool_positions(&db, req.user, req.base, req.quote, req.pool_idx);
    if positions.is_empty() {
        HttpResponse::NotFound().body("No pool positions found for user");
    }
    let mut results = vec![];
    for position in positions {
        results.push(match position {
            Ranged(p) => UserPosition {
                chain_id: ALTHEA_MAINNET_EVM_CHAIN_ID.into(),
                user: p.user,
                base: p.base,
                quote: p.quote,
                pool_idx: p.pool_idx,
                bid_tick: p.bid_tick,
                ask_tick: p.ask_tick,
                is_bid: p.base_flow > 0,
                ambient_liq: 0u8.into(),
                conc_liq: p.liq.into(),
                ..Default::default()
            },
            Ambient(p) => UserPosition {
                chain_id: ALTHEA_MAINNET_EVM_CHAIN_ID.into(),
                user: p.user,
                base: p.base,
                quote: p.quote,
                pool_idx: p.pool_idx,
                is_bid: p.base_flow > 0,
                conc_liq: 0u8.into(),
                ambient_liq: p.liq.into(),
                ..Default::default()
            },
        });
    }
    HttpResponse::Ok().json(results)
}

/// A request for a user's positions in a pool
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct UserPositionsRequest {
    pub chain_id: Uint256,
    pub user: Address,
}

/// Retrieves all known positions for a user
///
/// # Query
///
/// A query string with the following parameters:
/// - chain_id: A number representing the id of the chain to use (not used, added for compatibility with legacy frontend queries)
/// - user: The user's address as a EIP 55 string
///
/// # Response
///
/// A json response body containing an array of UserPosition objects, otherwise a 404 Not Found response
#[get("/user_positions")]
pub async fn user_positions(
    req: web::Query<UserPositionsRequest>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    let positions = get_active_user_positions(&db, req.user);
    if positions.is_empty() {
        HttpResponse::NotFound().body("No positions found for user");
    }
    let mut results = vec![];
    for position in positions {
        results.push(match position {
            Ranged(p) => UserPosition {
                chain_id: ALTHEA_MAINNET_EVM_CHAIN_ID.into(),
                user: p.user,
                base: p.base,
                quote: p.quote,
                pool_idx: p.pool_idx,
                bid_tick: p.bid_tick,
                ask_tick: p.ask_tick,
                is_bid: p.base_flow > 0,
                ambient_liq: 0u8.into(),
                conc_liq: p.liq.into(),
                ..Default::default()
            },
            Ambient(p) => UserPosition {
                chain_id: ALTHEA_MAINNET_EVM_CHAIN_ID.into(),
                user: p.user,
                base: p.base,
                quote: p.quote,
                pool_idx: p.pool_idx,
                is_bid: p.base_flow > 0,
                conc_liq: 0u8.into(),
                ambient_liq: p.liq.into(),
                ..Default::default()
            },
        });
    }
    HttpResponse::Ok().json(results)
}

/// A request which specifies a pool (and the unused chain id)
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PoolLiqCurveRequest {
    pub chain_id: Uint256,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PoolLiqCurveResp {
    pub ambient_liq: f64,
    pub liquidity_bumps: Vec<LiquidityBump>,
}

impl From<TrackedPool> for PoolLiqCurveResp {
    fn from(pool: TrackedPool) -> Self {
        Self {
            ambient_liq: pool.ambient_liq.to_u128().unwrap().to_f64().unwrap(),
            liquidity_bumps: pool.bumps,
        }
    }
}

/// Retrieves the liquidity curve for a pool
///
/// # Query
///
/// A query string with the following parameters:
///
/// - chain_id: A number representing the id of the chain to use (not used, added for compatibility with legacy frontend queries)
/// - base: The address of the base token in the pool (0 if native token) as a EIP 55 string
/// - quote: The address of the quote token in the pool as a EIP 55 string
/// - pool_idx: A number representing the pool's template index, needed for identifying the specific pool
///
/// # Response
///
/// A json response body containing a PoolLiqCurveResp object, otherwise a 404 Not Found response if the pool is unknown.
/// Notably the response includes the ambient liquidity and a collection of liquidity bumps for the pool (sorted by tick)
#[get("/pool_liq_curve")]
pub async fn pool_liq_curve(
    req: web::Query<PoolLiqCurveRequest>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    let pool = get_tracked_pool(&db, req.base, req.quote, req.pool_idx);

    match pool {
        Some(pool) => HttpResponse::Ok().json(PoolLiqCurveResp::from(pool)),
        None => HttpResponse::NotFound().body("No pool found for base quote poolIdx triple"),
    }
}

/// A request which specifies a pool (and the unused chain id)
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PoolStatsRequest {
    pub chain_id: Uint256,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,

    // Not used
    pub hist_time: Option<isize>,
}

#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct PoolStatsResp {
    pub base_tvl: f64,
    pub quote_tvl: f64,
    pub last_price_swap: f64,
    pub fee_rate: f64,

    // Not used by us
    pub init_time: usize,
    pub latest_time: usize,
    pub base_volume: f64,
    pub quote_volume: f64,
    pub base_fees: f64,
    pub quote_fees: f64,
    pub last_price_liq: f64,
    pub last_price_indic: f64,
}

impl From<TrackedPool> for PoolStatsResp {
    fn from(pool: TrackedPool) -> Self {
        Self {
            base_tvl: pool.base_tvl.to_f64().unwrap(),
            quote_tvl: pool.quote_tvl.to_f64().unwrap(),
            last_price_swap: pool.price.to_f64().unwrap(),
            fee_rate: pool.fee_rate.to_f64().unwrap(),
            ..Default::default()
        }
    }
}

/// Retrieves the statistics for a pool
///
/// # Query
///
/// A query string with the following parameters:
///
/// - chain_id: A number representing the id of the chain to use (not used, added for compatibility with legacy frontend queries)
/// - base: The address of the base token in the pool (0 if native token) as a EIP 55 string
/// - quote: The address of the quote token in the pool as a EIP 55 string
/// - pool_idx: A number representing the pool's template index, needed for identifying the specific pool
/// - hist_time: An unused parameter added for compatibility with legacy frontend queries
///
/// # Response
///
/// A json response body containing a PoolStatsResp object, otherwise a 404 Not Found response if the pool is unknown.
/// Notably the response includes baseTvl, quoteTvl, lastPriceSwap, and feeRate for the pool (other fields are unused by the backend and included for legacy compatibility)
#[get("/pool_stats")]
pub async fn pool_stats(
    req: web::Query<PoolStatsRequest>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
    if get_syncing(&db) {
        return HttpResponse::ServiceUnavailable().body("Syncing");
    }
    let pool = get_tracked_pool(&db, req.base, req.quote, req.pool_idx);

    match pool {
        Some(pool) => HttpResponse::Ok().json(PoolStatsResp::from(pool)),
        None => HttpResponse::NotFound().body("No pool found for base quote poolIdx triple"),
    }
}