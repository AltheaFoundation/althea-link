use crate::database::compact_db;
use crate::Opts;
use actix_web::rt::System;
use actix_web::web::{self};
use ambient::pools::InitPoolEvent;
use ambient::{initialize_templates, query_latest, search_for_pool_events};
use clarity::{Address, Uint256};
use cosmos::delegations::start_delegation_cache_refresh_task;
use cosmos::governance::start_proposal_cache_refresh_task;
use cosmos::staking::start_staking_info_cache_refresh_task;
use cosmos::validators::start_validator_cache_refresh_task;
use database::pools::get_init_pools;
use database::{get_latest_searched_block, save_latest_searched_block, save_syncing};
use deep_space::Contact;
use endpoints::cosmos::{get_delegations, get_proposals, get_staking_info, get_validators};
use log::{error, info};
use std::cmp::min;
use std::str::FromStr;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use web30::client::Web3;

pub mod abi_util;
pub mod ambient;
pub mod cosmos;
pub mod database;
pub mod endpoints;
pub mod error;

pub const ALTHEA_GRPC_URL: &str = "http://66.172.36.142:3890";
pub const ALTHEA_ETH_RPC_URL: &str = "https://nodes.chandrastation.com/evm/althea/";
pub const ALTHEA_MAINNET_CHAIN_ID: &str = "althea_258432-1";
pub const ALTHEA_MAINNET_EVM_CHAIN_ID: usize = 258432;
pub const CACHE_DURATION: u64 = 300;
pub const DELEGATIONS_CACHE_DURATION: u64 = 4;

pub const ALTHEA_PREFIX: &str = "althea";
pub const TIMEOUT: Duration = Duration::from_secs(45);
const DEFAULT_START_SEARCH_BLOCK: u128 = 0u128;
const DEFAULT_SEARCH_RANGE: u128 = 1000u128;
/// Tokens we care to index pools for - any user may create pools permissionlessly
/// but that does not mean we care to report their data to the frontend
const DEFAULT_TOKEN_ADDRESSES: &[&str] = &[
    "0x0412C7c846bb6b7DC462CF6B453f76D8440b2609",
    "0x30dA8589BFa1E509A319489E014d384b87815D89",
    "0x9676519d99E390A180Ab1445d5d857E3f6869065",
];
/// These are the poolIdx values used when creating pools in our scripts/tests.
/// Template creation requires governance permission (Ops role) but any user can create a
/// pool using these templates permissionlessly.
const DEFAULT_POOL_TEMPLATES: &[u64] = &[36000, 36001];
const DEFAULT_QUERIER: &str = "0xbf660843528035a5a4921534e156a27e64b231fe";

/// Returns a Contact struct for interacting with Gravity Bridge, pre-configured with the url
/// and prefix
pub fn get_althea_contact(timeout: Duration) -> Contact {
    Contact::new(ALTHEA_GRPC_URL, timeout, ALTHEA_PREFIX).unwrap()
}

pub fn get_althea_web3(timeout: Duration) -> Web3 {
    Web3::new(ALTHEA_ETH_RPC_URL, timeout)
}

pub fn start_ambient_indexer(opts: Opts, db: Arc<rocksdb::DB>) {
    let tokens = get_tokens(&opts);
    let templates = get_templates(&opts);

    // Start cache refresh tasks
    let contact = get_althea_contact(TIMEOUT);
    start_validator_cache_refresh_task(db.clone(), contact.clone());
    start_proposal_cache_refresh_task(db.clone(), contact.clone());
    start_delegation_cache_refresh_task(db.clone(), contact.clone());
    start_staking_info_cache_refresh_task(db.clone(), contact.clone());

    thread::spawn(move || {
        let db = db.clone();
        let runner = System::new();

        let web3 = get_althea_web3(TIMEOUT);
        runner.block_on(async move {
            initialize_templates(&db, &web3, opts.query_contract, &templates)
                .await
                .unwrap();
            loop {
                let start_block =
                    get_latest_searched_block(&db).unwrap_or(DEFAULT_START_SEARCH_BLOCK.into());
                let current_block = web3.eth_block_number().await;
                if current_block.is_err() {
                    error!("Error getting current block number, retrying later");
                    thread::sleep(Duration::from_secs(10));
                    continue;
                }
                let current_block = current_block.unwrap();
                if current_block - start_block < 500u32.into() {
                    save_syncing(&db, false);
                } else {
                    save_syncing(&db, true);
                }
                if current_block == start_block {
                    // We are caught up, sleep for a bit
                    thread::sleep(Duration::from_secs(3));
                    continue;
                }
                let end_block = min(start_block + DEFAULT_SEARCH_RANGE.into(), current_block);
                if let Err(e) = search_for_pool_events(
                    &db,
                    &web3,
                    opts.dex_contract,
                    &tokens,
                    &templates,
                    start_block,
                    end_block,
                )
                .await
                {
                    error!("Error searching for positions: {}", e);
                }
                save_latest_searched_block(&db, end_block);

                if end_block != start_block {
                    let pools = get_init_pools(&db);
                    let pools = pools
                        .iter()
                        .map(|p| (p.base, p.quote, p.pool_idx))
                        .collect::<Vec<_>>();
                    if let Err(e) = query_latest(&db, &web3, opts.query_contract, &pools).await {
                        error!("Error querying latest: {}", e);
                    }
                }

                if opts.compact {
                    info!("Compacting database");
                    compact_db(&db);
                }

                if opts.halt_after_indexing {
                    info!("Halt after indexing set - halting");
                    std::process::exit(0);
                }
            }
        });
    });
}

fn get_tokens(opts: &Opts) -> Vec<Address> {
    let tokens = if opts.pool_tokens.is_empty() {
        DEFAULT_TOKEN_ADDRESSES
            .iter()
            .map(|v| Address::from_str(v).unwrap())
            .collect::<Vec<_>>()
    } else {
        opts.pool_tokens.clone()
    };
    info!("Using pool tokens: {:?}", tokens);
    tokens
}

fn get_templates(opts: &Opts) -> Vec<Uint256> {
    let templates = if opts.pool_templates.is_empty() {
        DEFAULT_POOL_TEMPLATES.to_vec()
    } else {
        opts.pool_templates.clone()
    }
    .iter()
    .map(|v| (*v).into())
    .collect::<Vec<_>>();
    info!("Using pool templates {:?}", templates);
    templates
}

pub fn register_endpoints(cfg: &mut web::ServiceConfig) {
    cfg.service(get_validators)
        .service(get_proposals)
        .service(get_delegations)
        .service(get_staking_info);
}
