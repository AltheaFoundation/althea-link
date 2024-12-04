use clarity::Address;
use clarity::Uint256;
use log::debug;

use crate::althea::ambient::positions::HarvestEvent;

use super::super::super::ambient::positions::{BurnRangedEvent, MintRangedEvent};

pub const MINT_RANGED_PREFIX: &str = "mint-ranged_";
pub fn mint_ranged_user_prefix(user: Address) -> String {
    format!("{}{}", MINT_RANGED_PREFIX, user)
}
pub fn mint_ranged_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        mint_ranged_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
#[allow(clippy::too_many_arguments)]
pub fn mint_ranged_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        mint_ranged_user_pool_prefix(user, base, quote, pool_idx),
        bid_tick,
        ask_tick,
        block,
    )
}
#[allow(clippy::too_many_arguments)]
pub fn mint_ranged_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        mint_ranged_block_prefix(user, base, quote, pool_idx, bid_tick, ask_tick, block),
        index,
    )
}

// Gets a single MintRanged event from `db` by the other arguments, returns none if it does not exist
#[allow(clippy::too_many_arguments)]
pub fn get_mint_ranged(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
    index: Uint256,
) -> Option<MintRangedEvent> {
    let k = mint_ranged_key(
        user, base, quote, pool_idx, bid_tick, ask_tick, block, index,
    );
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known MintRanged events from the database
pub fn get_all_mint_ranged(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<MintRangedEvent> {
    let prefix = prefix.unwrap_or_else(|| MINT_RANGED_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let pool: MintRangedEvent = bincode::deserialize(&v).unwrap();
                events.push(pool);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_mint_ranged_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<MintRangedEvent> {
    let unfiltered = get_all_mint_ranged(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_mint_ranged(db: &rocksdb::DB, mre: MintRangedEvent) {
    let k = mint_ranged_key(
        mre.user,
        mre.base,
        mre.quote,
        mre.pool_idx,
        mre.bid_tick,
        mre.ask_tick,
        mre.block_height,
        mre.index,
    );
    debug!("Saving MintRangedEvent to key {}", k);
    let v = bincode::serialize(&mre).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const BURN_RANGED_PREFIX: &str = "burn-ranged_";
pub fn burn_ranged_user_prefix(user: Address) -> String {
    format!("{}{}", BURN_RANGED_PREFIX, user)
}
pub fn burn_ranged_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        burn_ranged_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
#[allow(clippy::too_many_arguments)]
pub fn burn_ranged_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        burn_ranged_user_pool_prefix(user, base, quote, pool_idx),
        bid_tick,
        ask_tick,
        block,
    )
}
#[allow(clippy::too_many_arguments)]
pub fn burn_ranged_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        burn_ranged_block_prefix(user, base, quote, pool_idx, bid_tick, ask_tick, block),
        index,
    )
}

// Gets a single BurnRanged event from `db` by the other arguments, returns none if it does not exist
#[allow(clippy::too_many_arguments)]
pub fn get_burn_ranged(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
    index: Uint256,
) -> Option<BurnRangedEvent> {
    let k = burn_ranged_key(
        user, base, quote, pool_idx, bid_tick, ask_tick, block, index,
    );
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known BurnRanged events from the database
pub fn get_all_burn_ranged(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<BurnRangedEvent> {
    let prefix = prefix.unwrap_or_else(|| BURN_RANGED_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: BurnRangedEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_burn_ranged_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<BurnRangedEvent> {
    let unfiltered = get_all_burn_ranged(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_burn_ranged(db: &rocksdb::DB, bre: BurnRangedEvent) {
    let k = burn_ranged_key(
        bre.user,
        bre.base,
        bre.quote,
        bre.pool_idx,
        bre.bid_tick,
        bre.ask_tick,
        bre.block_height,
        bre.index,
    );
    debug!("Saving BurnRangedEvent to key {}", k);
    let v = bincode::serialize(&bre).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const HARVEST_PREFIX: &str = "harvest_";
pub fn harvest_user_prefix(user: Address) -> String {
    format!("{}{}", HARVEST_PREFIX, user)
}
pub fn harvest_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        harvest_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
#[allow(clippy::too_many_arguments)]
pub fn harvest_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        harvest_user_pool_prefix(user, base, quote, pool_idx),
        bid_tick,
        ask_tick,
        block,
    )
}
#[allow(clippy::too_many_arguments)]
pub fn harvest_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        harvest_block_prefix(user, base, quote, pool_idx, bid_tick, ask_tick, block),
        index,
    )
}
// Gets a single Harvest event from `db` by the other arguments, returns none if it does not exist
#[allow(clippy::too_many_arguments)]
pub fn get_harvest(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    bid_tick: i32,
    ask_tick: i32,
    block: Uint256,
    index: Uint256,
) -> Option<BurnRangedEvent> {
    let k = harvest_key(
        user, base, quote, pool_idx, bid_tick, ask_tick, block, index,
    );
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known Harvest events from the database
pub fn get_all_harvest(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<HarvestEvent> {
    let prefix = prefix.unwrap_or_else(|| HARVEST_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: HarvestEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_harvest_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<HarvestEvent> {
    let unfiltered = get_all_harvest(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_harvest(db: &rocksdb::DB, he: HarvestEvent) {
    let k = burn_ranged_key(
        he.user,
        he.base,
        he.quote,
        he.pool_idx,
        he.bid_tick,
        he.ask_tick,
        he.block_height,
        he.index,
    );
    debug!("Saving HarvestEvent to key {}", k);
    let v = bincode::serialize(&he).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}
