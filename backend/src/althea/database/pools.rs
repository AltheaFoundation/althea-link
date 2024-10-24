use clarity::Address;
use clarity::Uint256;
use log::debug;
use serde::Deserialize;
use serde::Serialize;

use crate::althea::ambient::pools::PoolRevisionEvent;
use crate::althea::ambient::swap::SwapEvent;

use super::InitPoolEvent;

pub const INIT_POOL_PREFIX: &str = "init-pool_";
fn init_pool_key(base: Address, quote: Address, pool_idx: Uint256) -> String {
    format!("{}{}_{}_{}", INIT_POOL_PREFIX, base, quote, pool_idx,)
}

// Gets all known InitPool events from the database
// Note: these are the pools as of the InitPool event, not the current state
pub fn get_init_pools(db: &rocksdb::DB) -> Vec<InitPoolEvent> {
    let prefix = INIT_POOL_PREFIX.as_bytes();
    let mut pools = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let pool: InitPoolEvent = bincode::deserialize(&v).unwrap();
                pools.push(pool);
            }
            Err(_) => break,
        }
    }
    pools
}

// Gets a single InitPool event from the database by its (base, quote, pool index) triple, returns none if it does not exist
// Note: this is the pool as of the InitPool event, not the current state
pub fn get_init_pool(
    db: &rocksdb::DB,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Option<InitPoolEvent> {
    let v = db
        .get(init_pool_key(base, quote, pool_idx).as_bytes())
        .unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    bincode::deserialize(&v.unwrap()).unwrap()
}

pub fn save_init_pool(db: &rocksdb::DB, pool: InitPoolEvent) {
    let k = init_pool_key(pool.base, pool.quote, pool.pool_idx);
    debug!("Saving pool to key {}", k);
    let v = bincode::serialize(&pool).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const POOL_TEMPLATE_PREFIX: &str = "template_";
fn pool_template_key(pool_idx: Uint256) -> String {
    format!("{}{}", POOL_TEMPLATE_PREFIX, pool_idx)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pool {
    pub schema: u8,
    pub fee_rate: u16,
    pub protocol_take: u8,
    pub tick_size: u16,
    pub jit_thresh: u8,
    pub knockout_bits: u8,
    pub oracle_flags: u8,
}
// Gets a known template from the database by its pool index, returns none if it does not exist
pub fn get_pool_template(db: &rocksdb::DB, pool_idx: Uint256) -> Option<Pool> {
    let v = db.get(pool_template_key(pool_idx).as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    bincode::deserialize(&v.unwrap()).unwrap()
}

pub fn save_pool_template(db: &rocksdb::DB, pool_idx: Uint256, template: Pool) {
    let k = pool_template_key(pool_idx);
    debug!("Saving pool template to key {}", k);
    let v = bincode::serialize(&template).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const SWAP_PREFIX: &str = "swap_";
fn swap_user_prefix(user: Address) -> String {
    format!("{}{}", SWAP_PREFIX, user)
}
fn swap_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!("{}_{}_{}_{}", swap_user_prefix(user), base, quote, pool_idx)
}

fn swap_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!(
        "{}_{}",
        swap_user_pool_prefix(user, base, quote, pool_idx),
        block,
    )
}
fn swap_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        swap_block_prefix(user, base, quote, pool_idx, block),
        index,
    )
}

// Gets a single Swap event from `db` by the other arguments, returns none if it does not exist
pub fn get_swap(
    db: &rocksdb::DB,
    user: Address,
    block: Uint256,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    index: Option<Uint256>,
) -> Option<SwapEvent> {
    let k = swap_key(
        user,
        base,
        quote,
        pool_idx,
        block,
        index.unwrap_or_default(),
    );
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    bincode::deserialize(&v.unwrap()).unwrap()
}

// Gets all known Swap events from the database
pub fn get_all_swap(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<SwapEvent> {
    let prefix = prefix.unwrap_or_else(|| SWAP_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let pool: SwapEvent = bincode::deserialize(&v).unwrap();
                events.push(pool);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_swap_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<SwapEvent> {
    let unfiltered = get_all_swap(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_swap(db: &rocksdb::DB, swap: SwapEvent) {
    let (base, quote) = if swap.buy < swap.sell {
        (swap.buy, swap.sell)
    } else {
        (swap.sell, swap.buy)
    };
    let k = swap_key(
        swap.user,
        base,
        quote,
        swap.pool_idx,
        swap.block_height,
        swap.index,
    );
    debug!("Saving SwapEvent to key {}", k);
    let v = bincode::serialize(&swap).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const REVISION_PREFIX: &str = "revision_";
fn revision_pool_prefix(base: Address, quote: Address, pool_idx: Uint256) -> String {
    format!("{}{}_{}_{}", REVISION_PREFIX, base, quote, pool_idx)
}
fn revision_block_prefix(
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!("{}_{}", revision_pool_prefix(base, quote, pool_idx), block,)
}
fn revision_key(
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        revision_block_prefix(base, quote, pool_idx, block),
        index,
    )
}

// Gets a single PoolRevision event from `db` by the other arguments, returns none if it does not exist
pub fn get_revision(
    db: &rocksdb::DB,
    block: Uint256,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    index: Option<Uint256>,
) -> Option<PoolRevisionEvent> {
    let k = revision_key(base, quote, pool_idx, block, index.unwrap_or_default());
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    bincode::deserialize(&v.unwrap()).unwrap()
}

// Gets all known PoolRevision events from the database
pub fn get_all_revision(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<PoolRevisionEvent> {
    let prefix = prefix.unwrap_or_else(|| REVISION_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let pool: PoolRevisionEvent = bincode::deserialize(&v).unwrap();
                events.push(pool);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_revision_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<PoolRevisionEvent> {
    let unfiltered = get_all_revision(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_revision(db: &rocksdb::DB, revision: PoolRevisionEvent) {
    let k = revision_key(
        revision.base,
        revision.quote,
        revision.pool_idx,
        revision.block_height,
        revision.index,
    );
    debug!("Saving PoolRevision to key {}", k);
    let v = bincode::serialize(&revision).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}
