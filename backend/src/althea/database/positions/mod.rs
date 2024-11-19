use clarity::Address;
use clarity::Uint256;
use log::error;
use log::info;

use ambient::{
    burn_ambient_user_pool_prefix, burn_ambient_user_prefix, get_all_burn_ambient,
    get_all_mint_ambient, mint_ambient_user_pool_prefix, mint_ambient_user_prefix,
};
use ranged::{
    burn_ranged_user_pool_prefix, burn_ranged_user_prefix, get_all_burn_ranged,
    get_all_mint_ranged, mint_ranged_user_pool_prefix, mint_ranged_user_prefix,
};

use super::super::ambient::positions::{
    BurnAmbientEvent, BurnRangedEvent, MintAmbientEvent, MintRangedEvent,
};

pub mod ambient;
pub mod knockout;
pub mod ranged;

pub enum Position {
    Ranged(RangedPosition),
    Ambient(AmbientPosition),
}

#[derive(Debug)]
pub struct RangedPosition {
    pub start_block: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}
pub fn get_active_user_positions(db: &rocksdb::DB, user: Address) -> Vec<Position> {
    let mut mint_ranged = get_all_mint_ranged(db, Some(mint_ranged_user_prefix(user).as_bytes()));
    mint_ranged.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    let mut burn_ranged = get_all_burn_ranged(db, Some(burn_ranged_user_prefix(user).as_bytes()));
    burn_ranged.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    let mut mint_ambient =
        get_all_mint_ambient(db, Some(mint_ambient_user_prefix(user).as_bytes()));
    mint_ambient.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    let mut burn_ambient =
        get_all_burn_ambient(db, Some(burn_ambient_user_prefix(user).as_bytes()));
    burn_ambient.sort_by(|a, b| a.block_height.cmp(&b.block_height));

    let ranged_positions: Vec<RangedPosition> =
        combine_and_filter_ranged_positions(mint_ranged, burn_ranged);
    let ambient_positions = combine_and_filter_ambient_positions(mint_ambient, burn_ambient);
    let mut positions = ranged_positions
        .into_iter()
        .map(Position::Ranged)
        .collect::<Vec<_>>();
    positions.extend(ambient_positions.into_iter().map(Position::Ambient));
    positions.sort_by_key(|a| match a {
        Position::Ranged(v) => v.start_block,
        Position::Ambient(v) => v.start_block,
    });
    positions
}
pub fn get_active_user_pool_positions(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Vec<Position> {
    let mut mint_ranged = get_all_mint_ranged(
        db,
        Some(mint_ranged_user_pool_prefix(user, base, quote, pool_idx).as_bytes()),
    );
    mint_ranged.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    let mut burn_ranged = get_all_burn_ranged(
        db,
        Some(burn_ranged_user_pool_prefix(user, base, quote, pool_idx).as_bytes()),
    );
    burn_ranged.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    let mut mint_ambient = get_all_mint_ambient(
        db,
        Some(mint_ambient_user_pool_prefix(user, base, quote, pool_idx).as_bytes()),
    );
    mint_ambient.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    let mut burn_ambient = get_all_burn_ambient(
        db,
        Some(burn_ambient_user_pool_prefix(user, base, quote, pool_idx).as_bytes()),
    );
    burn_ambient.sort_by(|a, b| a.block_height.cmp(&b.block_height));
    info!("MR: {mint_ranged:?} BR: {burn_ranged:?} MA: {mint_ambient:?} BA: {burn_ambient:?}");
    let ranged_positions: Vec<RangedPosition> =
        combine_and_filter_ranged_positions(mint_ranged, burn_ranged);
    info!("Ranged positions: {ranged_positions:?}");
    let ambient_positions = combine_and_filter_ambient_positions(mint_ambient, burn_ambient);
    info!("Ambient positions: {ambient_positions:?}");
    let mut positions = ranged_positions
        .into_iter()
        .map(Position::Ranged)
        .collect::<Vec<_>>();
    positions.extend(ambient_positions.into_iter().map(Position::Ambient));
    positions.sort_by_key(|a| match a {
        Position::Ranged(v) => v.start_block,
        Position::Ambient(v) => v.start_block,
    });
    positions
}

// Combines together any corresponding mint_ranged entries, and filters them by any corresponding burn_ranged entries
fn combine_and_filter_ranged_positions(
    mint_ranged: Vec<MintRangedEvent>,
    burn_ranged: Vec<BurnRangedEvent>,
) -> Vec<RangedPosition> {
    let mut ranged_positions: Vec<RangedPosition> = vec![];
    for mr in mint_ranged {
        match ranged_positions.iter_mut().find(|v| {
            v.start_block <= mr.block_height
                && v.base == mr.base
                && v.quote == mr.quote
                && v.pool_idx == mr.pool_idx
                && v.bid_tick == mr.bid_tick
                && v.ask_tick == mr.ask_tick
        }) {
            Some(pos) => {
                pos.base_flow += mr.base_flow;
                pos.quote_flow += mr.quote_flow;
                pos.liq += mr.liq;
                // We overwrite the block because fees should only apply from the most recent effective mint
                pos.start_block = mr.block_height;
            }
            None => ranged_positions.push(RangedPosition {
                start_block: mr.block_height,
                user: mr.user,
                base: mr.base,
                quote: mr.quote,
                pool_idx: mr.pool_idx,
                bid_tick: mr.bid_tick,
                ask_tick: mr.ask_tick,
                liq: mr.liq,
                base_flow: mr.base_flow,
                quote_flow: mr.quote_flow,
            }),
        }
    }
    for br in burn_ranged {
        if let Some(idx) = ranged_positions.iter().position(|v| {
            v.start_block <= br.block_height
                && v.base == br.base
                && v.quote == br.quote
                && v.pool_idx == br.pool_idx
                && v.bid_tick == br.bid_tick
                && v.ask_tick == br.ask_tick
        }) {
            ranged_positions.remove(idx);
        } else {
            error!("BurnRangedEvent without corresponding MintRangedEvent");
        }
    }
    ranged_positions
}

#[derive(Debug)]
pub struct AmbientPosition {
    pub start_block: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

// Combines together any corresponding mint_ambient entries, and filters them by any corresponding burn_ambient entries
fn combine_and_filter_ambient_positions(
    mint_ambient: Vec<MintAmbientEvent>,
    burn_ambient: Vec<BurnAmbientEvent>,
) -> Vec<AmbientPosition> {
    let mut ambient_positions: Vec<AmbientPosition> = vec![];
    for ma in mint_ambient {
        match ambient_positions.iter_mut().find(|v| {
            v.start_block <= ma.block_height
                && v.base == ma.base
                && v.quote == ma.quote
                && v.pool_idx == ma.pool_idx
        }) {
            Some(pos) => {
                pos.base_flow += ma.base_flow;
                pos.quote_flow += ma.quote_flow;
                pos.liq += ma.liq;
                // We overwrite the block because fees should only apply from the most recent effective mint
                pos.start_block = ma.block_height;
            }
            None => ambient_positions.push(AmbientPosition {
                start_block: ma.block_height,
                user: ma.user,
                base: ma.base,
                quote: ma.quote,
                pool_idx: ma.pool_idx,
                liq: ma.liq,
                base_flow: ma.base_flow,
                quote_flow: ma.quote_flow,
            }),
        }
    }
    for br in burn_ambient {
        if let Some(idx) = ambient_positions.iter().position(|v| {
            v.start_block <= br.block_height
                && v.base == br.base
                && v.quote == br.quote
                && v.pool_idx == br.pool_idx
        }) {
            ambient_positions.remove(idx);
        } else {
            error!("BurnAmbientEvent without corresponding MintAmbientEvent");
        }
    }
    ambient_positions
}
