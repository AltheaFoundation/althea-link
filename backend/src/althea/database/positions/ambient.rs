use clarity::Address;
use clarity::Uint256;
use log::debug;

use super::super::super::ambient::positions::{BurnAmbientEvent, MintAmbientEvent};

pub const MINT_AMBIENT_PREFIX: &str = "mint-ambient_";
pub fn mint_ambient_user_prefix(user: Address) -> String {
    format!("{}{}", MINT_AMBIENT_PREFIX, user)
}
pub fn mint_ambient_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        mint_ambient_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
pub fn mint_ambient_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!(
        "{}_{}",
        mint_ambient_user_pool_prefix(user, base, quote, pool_idx),
        block,
    )
}
pub fn mint_ambient_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        mint_ambient_block_prefix(user, base, quote, pool_idx, block),
        index,
    )
}

// Gets a single MintAmbient event from `db` by the other arguments, returns none if it does not exist
pub fn get_mint_ambient(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> Option<MintAmbientEvent> {
    let k = mint_ambient_key(user, base, quote, pool_idx, block, index);
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known MintAmbient events from the database
pub fn get_all_mint_ambient(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<MintAmbientEvent> {
    let prefix = prefix.unwrap_or_else(|| MINT_AMBIENT_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: MintAmbientEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_mint_ambient_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<MintAmbientEvent> {
    let unfiltered = get_all_mint_ambient(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_mint_ambient(db: &rocksdb::DB, mae: MintAmbientEvent) {
    let k = mint_ambient_key(
        mae.user,
        mae.base,
        mae.quote,
        mae.pool_idx,
        mae.block_height,
        mae.index,
    );
    debug!("Saving MintAmbientEvent to key {}", k);
    let v = bincode::serialize(&mae).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const BURN_AMBIENT_PREFIX: &str = "burn-ambient_";
pub fn burn_ambient_user_prefix(user: Address) -> String {
    format!("{}{}", BURN_AMBIENT_PREFIX, user)
}
pub fn burn_ambient_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        burn_ambient_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
pub fn burn_ambient_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!(
        "{}_{}",
        burn_ambient_user_pool_prefix(user, base, quote, pool_idx),
        block,
    )
}
pub fn burn_ambient_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        burn_ambient_block_prefix(user, base, quote, pool_idx, block),
        index,
    )
}
// Gets a single BurnAmbient event from `db` by the other arguments, returns none if it does not exist
pub fn get_burn_ambient(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> Option<BurnAmbientEvent> {
    let k = burn_ambient_key(user, base, quote, pool_idx, block, index);
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known BurnAmbient events from the database
pub fn get_all_burn_ambient(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<BurnAmbientEvent> {
    let prefix = prefix.unwrap_or_else(|| BURN_AMBIENT_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: BurnAmbientEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_burn_ambient_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<BurnAmbientEvent> {
    let unfiltered = get_all_burn_ambient(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}
pub fn save_burn_ambient(db: &rocksdb::DB, bae: BurnAmbientEvent) {
    let k = burn_ambient_key(
        bae.user,
        bae.base,
        bae.quote,
        bae.pool_idx,
        bae.block_height,
        bae.index,
    );
    debug!("Saving BurnAmbientEvent to key {}", k);
    let v = bincode::serialize(&bae).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}
