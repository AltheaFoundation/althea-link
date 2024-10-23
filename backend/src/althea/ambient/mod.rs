use std::{str::FromStr, sync::Arc};

use clarity::{Address, Uint256};
use events::{
    BURN_AMBIENT_SIGNATURE, BURN_RANGED_SIGNATURE, INIT_POOL_SIGNATURE, MINT_AMBIENT_SIGNATURE,
    MINT_RANGED_SIGNATURE,
};
use futures::future::{join3, join4, join_all};
use log::{debug, info};
use pools::InitPoolEvent;
use positions::{BurnAmbientEvent, BurnRangedEvent, MintAmbientEvent, MintRangedEvent};
use web30::client::Web3;

use crate::althea::{
    database::{
        pools::save_init_pool,
        positions::{save_burn_ambient, save_burn_ranged, save_mint_ambient, save_mint_ranged},
    },
    CROC_SWAP_CTR,
};

use super::{
    database::curve::{
        get_curve, get_liquidity, get_price, save_curve, save_liquidity, save_price,
    },
    error::AltheaError,
    CROC_QUERY_CTR,
};

pub mod croc_query;
pub mod events;
pub mod knockout;
pub mod pools;
pub mod positions;
pub mod swap;

// Searches for InitPool events and saves them
pub async fn search_for_pools(
    db: &Arc<rocksdb::DB>,
    web3: &Web3,
    start_block: Uint256,
    end_block: Uint256,
) -> Result<(), AltheaError> {
    info!("Search for pools");

    let ctr = Address::from_str(CROC_SWAP_CTR).unwrap();
    let topics = vec![INIT_POOL_SIGNATURE];
    debug!("Searching on {ctr} for {topics:?} from block {start_block} to block {end_block}");
    let events = web3
        .check_for_events(start_block, Some(end_block), vec![ctr], topics)
        .await?;
    debug!("Found {} events", events.len());
    let decoded_events = InitPoolEvent::from_logs(&events)?;
    debug!("Decoded {} events", decoded_events.len());
    if decoded_events.is_empty() {
        return Ok(());
    }

    for event in decoded_events {
        info!("Writing {event:?} to database");
        save_init_pool(db, event);
    }

    Ok(())
}

// Searches for any position events (minting or burning ranged or ambient positions), saving them if the events contain the given tokens and templates
pub async fn search_for_positions(
    db: &Arc<rocksdb::DB>,
    web3: &Web3,
    tokens: &[Address],
    templates: &[Uint256],
    start_block: Uint256,
    end_block: Uint256,
) -> Result<(), AltheaError> {
    let ctr = Address::from_str(CROC_SWAP_CTR).unwrap();
    info!("Searching for position events");
    let mint_ranged_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![ctr],
        vec![MINT_RANGED_SIGNATURE],
    );
    let mint_ambient_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![ctr],
        vec![MINT_AMBIENT_SIGNATURE],
    );
    let burn_ranged_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![ctr],
        vec![BURN_RANGED_SIGNATURE],
    );
    let burn_ambient_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![ctr],
        vec![BURN_AMBIENT_SIGNATURE],
    );
    let (mint_ranged, mint_ambient, burn_ranged, burn_ambient) = join4(
        mint_ranged_events,
        mint_ambient_events,
        burn_ranged_events,
        burn_ambient_events,
    )
    .await;

    let (mint_ranged_events, mint_ambient_events, burn_ranged_events, burn_ambient_events) =
        (mint_ranged?, mint_ambient?, burn_ranged?, burn_ambient?);
    debug!(
        "Found {} events",
        mint_ranged_events.len()
            + mint_ambient_events.len()
            + burn_ranged_events.len()
            + burn_ambient_events.len()
    );
    let mint_ranged_events = MintRangedEvent::from_logs(&mint_ranged_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let mint_ambient_events = MintAmbientEvent::from_logs(&mint_ambient_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let burn_ranged_events = BurnRangedEvent::from_logs(&burn_ranged_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let burn_ambient_events = BurnAmbientEvent::from_logs(&burn_ambient_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    if mint_ranged_events.is_empty()
        && mint_ambient_events.is_empty()
        && burn_ranged_events.is_empty()
        && burn_ambient_events.is_empty()
    {
        debug!("No events found");
        return Ok(());
    }

    for event in mint_ranged_events {
        debug!("Writing {event:?} to database");
        save_mint_ranged(db, event);
    }
    for event in mint_ambient_events {
        debug!("Writing {event:?} to database");
        save_mint_ambient(db, event);
    }
    for event in burn_ranged_events {
        debug!("Writing {event:?} to database");
        save_burn_ranged(db, event);
    }
    for event in burn_ambient_events {
        debug!("Writing {event:?} to database");
        save_burn_ambient(db, event);
    }
    Ok(())
}

pub async fn query_latest(
    db: &Arc<rocksdb::DB>,
    web30: &Web3,
    pools: &[(Address, Address, Uint256)],
) -> Result<(), AltheaError> {
    info!("Querying latest pool data");

    let mut futures = vec![];
    for pool in pools {
        futures.push(query_pool(db, web30, pool.0, pool.1, pool.2));
    }

    let results = join_all(futures).await;
    for result in results {
        result?
    }

    Ok(())
}

pub async fn query_pool(
    db: &Arc<rocksdb::DB>,
    web30: &Web3,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Result<(), AltheaError> {
    let croc_query = Address::from_str(CROC_QUERY_CTR).unwrap();
    let curve = croc_query::get_curve(web30, croc_query, base, quote, pool_idx);
    let price = croc_query::get_price(web30, croc_query, base, quote, pool_idx);
    let liq = croc_query::get_liquidity(web30, croc_query, base, quote, pool_idx);

    let (curve, price, liq) = join3(curve, price, liq).await;

    // Only save items if the value is nonzero (empty) or if the key is already in the database
    if let Ok(curve) = curve {
        if !curve.is_zero() || get_curve(db, base, quote, pool_idx).is_some() {
            info!("Writing curve to database for pool {base} {quote} {pool_idx}");
            save_curve(db, curve, base, quote, pool_idx);
        }
    }
    if let Ok(price) = price {
        if price != 0 || get_price(db, base, quote, pool_idx).is_some() {
            info!("Writing price to database for pool {base} {quote} {pool_idx}");
            save_price(db, price, base, quote, pool_idx);
        }
    }
    if let Ok(liq) = liq {
        if liq != 0 || get_liquidity(db, base, quote, pool_idx).is_some() {
            info!("Writing liquidity to database for pool {base} {quote} {pool_idx}");
            save_liquidity(db, liq, base, quote, pool_idx);
        }
    }

    Ok(())
}
