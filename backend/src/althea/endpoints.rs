use crate::althea::{
    database::{
        pools::{get_init_pool, get_init_pools},
        positions::{
            get_active_user_pool_positions, get_active_user_positions, get_all_burn_ambient,
            get_all_burn_ranged, get_all_mint_ambient, get_all_mint_ranged,
        },
    },
    ALTHEA_MAINNET_EVM_CHAIN_ID,
};
use actix_web::{
    get, post,
    web::{self, Json},
    HttpResponse, Responder,
};
use clarity::{Address, Uint256};
use log::{error, info};
use rocksdb::DB;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::database::positions::Position::{Ambient, Ranged};

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
    info!("Querying all InitPools");
    let pools = get_init_pools(&db);
    if pools.is_empty() {
        HttpResponse::NotFound().body("No pools found, try again later")
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
    info!("Querying all MintRanged events");
    let events = get_all_mint_ranged(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No MintRangedEvents found, try again later")
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
    info!("Querying all MintAmbinet events");
    let events = get_all_mint_ambient(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No MintAmbientEvents found, try again later")
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
    info!("Querying all BurnRanged events");
    let events = get_all_burn_ranged(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No BurnRangedEvents found, try again later")
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
    info!("Querying all MintAmbinet events");
    let events = get_all_burn_ambient(&db, None);
    if events.is_empty() {
        HttpResponse::NotFound().body("No BurnAmbientEvents found, try again later")
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
#[get("/user_pool_positions")]
pub async fn user_pool_positions(
    req: web::Query<UserPoolPositionsRequest>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
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
                is_bid: p.base_amount > 0,
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
                is_bid: p.base_amount > 0,
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

#[get("/user_positions")]
pub async fn user_positions(
    req: web::Query<UserPositionsRequest>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
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
                is_bid: p.base_amount > 0,
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
                is_bid: p.base_amount > 0,
                conc_liq: 0u8.into(),
                ambient_liq: p.liq.into(),
                ..Default::default()
            },
        });
    }
    HttpResponse::Ok().json(results)
}

/// Retrieves all validators from the Althea chain
///
/// # Query
///
/// A simple HTTP GET request
///
/// # Response
///
/// The response body will be a JSON array of validator information
#[derive(Deserialize)]
pub struct ValidatorQuery {
    active: Option<bool>,
}

#[get("/validators")]
pub async fn get_validators(
    query: web::Query<ValidatorQuery>,
    db: web::Data<Arc<DB>>,
) -> impl Responder {
    info!("Querying validators with filter: {:?}", query.active);
    let contact = super::get_althea_contact(super::TIMEOUT);

    match super::validators::fetch_validators_filtered(&db, &contact, query.active).await {
        Ok(validators) => {
            if validators.is_empty() {
                HttpResponse::NotFound().body("No validators found")
            } else {
                HttpResponse::Ok().json(validators)
            }
        }
        Err(e) => {
            error!("Error getting validators: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
