use std::sync::Arc;

use clarity::{Address, Uint256};
use croc_query::get_template;
use events::{
    BURN_AMBIENT_SIGNATURE, BURN_KNOCKOUT_SIGNATURE, BURN_RANGED_SIGNATURE, HARVEST_SIGNATURE,
    INIT_POOL_SIGNATURE, MINT_AMBIENT_SIGNATURE, MINT_KNOCKOUT_SIGNATURE, MINT_RANGED_SIGNATURE,
    SWAP_SIGNATURE, WITHDRAW_KNOCKOUT_SIGNATURE,
};
use futures::future::join_all;
use futures::join;
use knockout::{BurnKnockoutEvent, MintKnockoutEvent, WithdrawKnockoutEvent};
use log::{debug, info};
use pools::InitPoolEvent;
use positions::{
    BurnAmbientEvent, BurnRangedEvent, HarvestEvent, MintAmbientEvent, MintRangedEvent,
};
use swap::SwapEvent;
use web30::client::Web3;

use crate::althea::{
    database::{
        pools::{save_init_pool, save_swap},
        positions::{
            ambient::{save_burn_ambient, save_mint_ambient},
            knockout::{save_burn_knockout, save_mint_knockout, save_withdraw_knockout},
            ranged::{save_burn_ranged, save_harvest, save_mint_ranged},
        },
        tracking::{mark_pool_dirty, set_dirty_pool, update_pool},
    },
    error,
};

use super::{
    database::{
        curve::{get_curve, get_liquidity, get_price, save_curve, save_liquidity, save_price},
        pools::{
            get_all_revision_after_block, get_all_swap_after_block, get_init_pool,
            get_pool_template, save_pool_template,
        },
        positions::{
            ambient::{get_all_burn_ambient_after_block, get_all_mint_ambient_after_block},
            knockout::{
                get_all_burn_knockout_after_block, get_all_mint_knockout_after_block,
                get_all_withdraw_knockout_after_block,
            },
            ranged::{
                get_all_burn_ranged_after_block, get_all_harvest_after_block,
                get_all_mint_ranged_after_block,
            },
        },
        tracking::{get_all_dirty_pools, updates::PoolUpdateEvent, DirtyPoolTracker},
    },
    error::AltheaError,
};

pub mod croc_query;
pub mod events;
pub mod knockout;
pub mod pools;
pub mod positions;
pub mod swap;

// Searches for all the pool events needed for tracking including swapping, minting, and burning among others.
pub async fn search_for_pool_events(
    db: &Arc<rocksdb::DB>,
    web3: &Web3,
    dex_ctr: Address,
    tokens: &[Address],
    templates: &[Uint256],
    start_block: Uint256,
    end_block: Uint256,
) -> Result<(), AltheaError> {
    info!("Searching for pool events");
    let init_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![INIT_POOL_SIGNATURE],
    );
    let swap_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![SWAP_SIGNATURE],
    );
    let mint_ranged_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![MINT_RANGED_SIGNATURE],
    );
    let mint_ambient_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![MINT_AMBIENT_SIGNATURE],
    );
    let burn_ranged_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![BURN_RANGED_SIGNATURE],
    );
    let burn_ambient_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![BURN_AMBIENT_SIGNATURE],
    );
    let harvest_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![HARVEST_SIGNATURE],
    );
    let mint_knockout_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![MINT_KNOCKOUT_SIGNATURE],
    );
    let burn_knockout_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![BURN_KNOCKOUT_SIGNATURE],
    );
    let withdraw_knockout_events = web3.check_for_events(
        start_block,
        Some(end_block),
        vec![dex_ctr],
        vec![WITHDRAW_KNOCKOUT_SIGNATURE],
    );
    let (
        init,
        swap,
        mint_ranged,
        mint_ambient,
        burn_ranged,
        burn_ambient,
        harvest,
        mint_knockout,
        burn_knockout,
        withdraw_knockout,
    ) = join!(
        init_events,
        swap_events,
        mint_ranged_events,
        mint_ambient_events,
        burn_ranged_events,
        burn_ambient_events,
        harvest_events,
        mint_knockout_events,
        burn_knockout_events,
        withdraw_knockout_events
    );

    let (
        init_events,
        swap_events,
        mint_ranged_events,
        mint_ambient_events,
        burn_ranged_events,
        burn_ambient_events,
        harvest_events,
        mint_knockout_events,
        burn_knockout_events,
        withdraw_knockout_events,
    ) = (
        init?,
        swap?,
        mint_ranged?,
        mint_ambient?,
        burn_ranged?,
        burn_ambient?,
        harvest?,
        mint_knockout?,
        burn_knockout?,
        withdraw_knockout?,
    );
    debug!(
        "Found {} events",
        init_events.len()
            + swap_events.len()
            + mint_ranged_events.len()
            + mint_ambient_events.len()
            + burn_ranged_events.len()
            + burn_ambient_events.len()
            + harvest_events.len()
            + mint_knockout_events.len()
            + burn_knockout_events.len()
            + withdraw_knockout_events.len()
    );
    let init_events = InitPoolEvent::from_logs(&init_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let swap_events = SwapEvent::from_logs(&swap_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx) && (tokens.contains(&v.buy) || tokens.contains(&v.sell))
        })
        .collect::<Vec<_>>();
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
    let harvest_events = HarvestEvent::from_logs(&harvest_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let mint_knockout_events = MintKnockoutEvent::from_logs(&mint_knockout_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let burn_knockout_events = BurnKnockoutEvent::from_logs(&burn_knockout_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    let withdraw_knockout_events = WithdrawKnockoutEvent::from_logs(&withdraw_knockout_events)?
        .into_iter()
        .filter(|v| {
            templates.contains(&v.pool_idx)
                && (tokens.contains(&v.base) || tokens.contains(&v.quote))
        })
        .collect::<Vec<_>>();
    if init_events.is_empty()
        && swap_events.is_empty()
        && mint_ranged_events.is_empty()
        && mint_ambient_events.is_empty()
        && burn_ranged_events.is_empty()
        && burn_ambient_events.is_empty()
        && harvest_events.is_empty()
        && mint_knockout_events.is_empty()
        && burn_knockout_events.is_empty()
        && withdraw_knockout_events.is_empty()
    {
        debug!("No events found");
        return Ok(());
    }

    for event in init_events {
        debug!("Writing {event:?} to database");
        set_dirty_pool(
            db,
            event.base,
            event.quote,
            event.pool_idx,
            true,
            Uint256::default(),
        );
        save_init_pool(db, event);
    }
    for event in swap_events {
        debug!("Writing {event:?} to database");
        let (base, quote) = if event.buy < event.sell {
            (event.buy, event.sell)
        } else {
            (event.sell, event.buy)
        };
        mark_pool_dirty(db, base, quote, event.pool_idx);
        save_swap(db, event);
    }
    for event in mint_ranged_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_mint_ranged(db, event);
    }
    for event in mint_ambient_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_mint_ambient(db, event);
    }
    for event in burn_ranged_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_burn_ranged(db, event);
    }
    for event in burn_ambient_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_burn_ambient(db, event);
    }
    for event in harvest_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_harvest(db, event);
    }
    for event in mint_knockout_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_mint_knockout(db, event);
    }
    for event in burn_knockout_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_burn_knockout(db, event);
    }
    for event in withdraw_knockout_events {
        debug!("Writing {event:?} to database");
        mark_pool_dirty(db, event.base, event.quote, event.pool_idx);
        save_withdraw_knockout(db, event);
    }
    Ok(())
}

pub fn track_pools(db: &Arc<rocksdb::DB>) -> Result<(), AltheaError> {
    for pool in get_all_dirty_pools(db) {
        if let Err(e) = track_pool(db, pool) {
            error!("Unable to track pool: {e}");
        }
    }
    Ok(())
}

pub fn track_pool(db: &Arc<rocksdb::DB>, pool: DirtyPoolTracker) -> Result<(), AltheaError> {
    if pool.last_block == Uint256::default() {
        if let Some(init) = get_init_pool(db, pool.base, pool.quote, pool.pool_idx) {
            update_pool(db, init.into());
        } else {
            debug!("No InitPool found for {pool:?}");
        }
    } else {
        // Get unhandled events by filtering for new ones
        let mint_ambient = get_all_mint_ambient_after_block(db, None, pool.last_block);
        let burn_ambient = get_all_burn_ambient_after_block(db, None, pool.last_block);
        let mint_ranged = get_all_mint_ranged_after_block(db, None, pool.last_block);
        let burn_ranged = get_all_burn_ranged_after_block(db, None, pool.last_block);
        let harvest = get_all_harvest_after_block(db, None, pool.last_block);
        let mint_knockout = get_all_mint_knockout_after_block(db, None, pool.last_block);
        let burn_knockout = get_all_burn_knockout_after_block(db, None, pool.last_block);
        let withdraw_knockout = get_all_withdraw_knockout_after_block(db, None, pool.last_block);
        let swap = get_all_swap_after_block(db, None, pool.last_block);
        let revision = get_all_revision_after_block(db, None, pool.last_block);

        // Sort the events by block number and index and apply them in order
        let mut updates: Vec<PoolUpdateEvent> = mint_ambient
            .into_iter()
            .map(PoolUpdateEvent::from)
            .chain(burn_ambient.into_iter().map(PoolUpdateEvent::from))
            .chain(mint_ranged.into_iter().map(PoolUpdateEvent::from))
            .chain(burn_ranged.into_iter().map(PoolUpdateEvent::from))
            .chain(harvest.into_iter().map(PoolUpdateEvent::from))
            .chain(mint_knockout.into_iter().map(PoolUpdateEvent::from))
            .chain(burn_knockout.into_iter().map(PoolUpdateEvent::from))
            .chain(withdraw_knockout.into_iter().map(PoolUpdateEvent::from))
            .chain(swap.into_iter().map(PoolUpdateEvent::from))
            .chain(revision.into_iter().map(PoolUpdateEvent::from))
            .collect();
        updates.sort_by_key(|v| (v.block, v.index));

        for update in updates {
            debug!("Applying update {update:?}");
            update_pool(db, update);
        }
    }

    Ok(())
}

pub async fn query_latest(
    db: &Arc<rocksdb::DB>,
    web30: &Web3,
    query_ctr: Address,
    pools: &[(Address, Address, Uint256)],
) -> Result<(), AltheaError> {
    info!("Querying latest pool data");

    let mut futures = vec![];
    for pool in pools {
        futures.push(query_pool(db, web30, query_ctr, pool.0, pool.1, pool.2));
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
    query_ctr: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Result<(), AltheaError> {
    let curve = croc_query::get_curve(web30, query_ctr, base, quote, pool_idx);
    let price = croc_query::get_price(web30, query_ctr, base, quote, pool_idx);
    let liq = croc_query::get_liquidity(web30, query_ctr, base, quote, pool_idx);

    let (curve, price, liq) = join!(curve, price, liq);

    // Only save items if the value is nonzero (empty) or if the key is already in the database
    if let Ok(curve) = curve {
        if !curve.is_zero() || get_curve(db, base, quote, pool_idx).is_some() {
            debug!("Writing curve to database for pool {base} {quote} {pool_idx}");
            save_curve(db, curve, base, quote, pool_idx);
        }
    }
    if let Ok(price) = price {
        if price != 0 || get_price(db, base, quote, pool_idx).is_some() {
            debug!("Writing price to database for pool {base} {quote} {pool_idx}");
            save_price(db, price, base, quote, pool_idx);
        }
    }
    if let Ok(liq) = liq {
        if liq != 0 || get_liquidity(db, base, quote, pool_idx).is_some() {
            debug!("Writing liquidity to database for pool {base} {quote} {pool_idx}");
            save_liquidity(db, liq, base, quote, pool_idx);
        }
    }

    Ok(())
}

/// Initializes the pool template data in the database so that we can populate pool specs from InitPool events
pub async fn initialize_templates(
    db: &Arc<rocksdb::DB>,
    web30: &Web3,
    query_ctr: Address,
    templates: &[Uint256],
) -> Result<(), AltheaError> {
    for template in templates {
        if get_pool_template(db, *template).is_none() {
            let pool_template = get_template(web30, query_ctr, *template).await?;
            save_pool_template(db, *template, pool_template);
        }
    }
    Ok(())
}
