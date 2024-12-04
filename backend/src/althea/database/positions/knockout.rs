use clarity::Address;
use clarity::Uint256;
use log::debug;

use crate::althea::ambient::knockout::BurnKnockoutEvent;
use crate::althea::ambient::knockout::MintKnockoutEvent;
use crate::althea::ambient::knockout::WithdrawKnockoutEvent;

pub const MINT_KNOCKOUT_PREFIX: &str = "mint-knockout_";
pub fn mint_knockout_user_prefix(user: Address) -> String {
    format!("{}{}", MINT_KNOCKOUT_PREFIX, user)
}
pub fn mint_knockout_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        mint_knockout_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
pub fn mint_knockout_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!(
        "{}_{}",
        mint_knockout_user_pool_prefix(user, base, quote, pool_idx),
        block,
    )
}
pub fn mint_knockout_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        mint_knockout_block_prefix(user, base, quote, pool_idx, block),
        index,
    )
}

// Gets a single MintKnockout event from `db` by the other arguments, returns none if it does not exist
pub fn get_mint_knockout(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> Option<MintKnockoutEvent> {
    let k = mint_knockout_key(user, base, quote, pool_idx, block, index);
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known MintKnockout events from the database
pub fn get_all_mint_knockout(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<MintKnockoutEvent> {
    let prefix = prefix.unwrap_or_else(|| MINT_KNOCKOUT_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: MintKnockoutEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_mint_knockout_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<MintKnockoutEvent> {
    let unfiltered = get_all_mint_knockout(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_mint_knockout(db: &rocksdb::DB, mke: MintKnockoutEvent) {
    let k = mint_knockout_key(
        mke.user,
        mke.base,
        mke.quote,
        mke.pool_idx,
        mke.block_height,
        mke.index,
    );
    debug!("Saving MintKnockoutEvent to key {}", k);
    let v = bincode::serialize(&mke).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const BURN_KNOCKOUT_PREFIX: &str = "burn-knockout_";
pub fn burn_knockout_user_prefix(user: Address) -> String {
    format!("{}{}", BURN_KNOCKOUT_PREFIX, user)
}
pub fn burn_knockout_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        burn_knockout_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
pub fn burn_knockout_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!(
        "{}_{}",
        burn_knockout_user_pool_prefix(user, base, quote, pool_idx),
        block,
    )
}
pub fn burn_knockout_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        burn_knockout_block_prefix(user, base, quote, pool_idx, block),
        index,
    )
}

// Gets a single BurnKnockout event from `db` by the other arguments, returns none if it does not exist
pub fn get_burn_knockout(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> Option<BurnKnockoutEvent> {
    let k = burn_knockout_key(user, base, quote, pool_idx, block, index);
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known BurnKnockout events from the database
pub fn get_all_burn_knockout(db: &rocksdb::DB, prefix: Option<&[u8]>) -> Vec<BurnKnockoutEvent> {
    let prefix = prefix.unwrap_or_else(|| BURN_KNOCKOUT_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: BurnKnockoutEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_burn_knockout_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<BurnKnockoutEvent> {
    let unfiltered = get_all_burn_knockout(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}

pub fn save_burn_knockout(db: &rocksdb::DB, bke: BurnKnockoutEvent) {
    let k = burn_knockout_key(
        bke.user,
        bke.base,
        bke.quote,
        bke.pool_idx,
        bke.block_height,
        bke.index,
    );
    debug!("Saving BurnKnockoutEvent to key {}", k);
    let v = bincode::serialize(&bke).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}

pub const WITHDRAW_KNOCKOUT_PREFIX: &str = "withdraw-knockout_";
pub fn withdraw_knockout_user_prefix(user: Address) -> String {
    format!("{}{}", WITHDRAW_KNOCKOUT_PREFIX, user)
}
pub fn withdraw_knockout_user_pool_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> String {
    format!(
        "{}_{}_{}_{}",
        withdraw_knockout_user_prefix(user),
        base,
        quote,
        pool_idx
    )
}
pub fn withdraw_knockout_block_prefix(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) -> String {
    format!(
        "{}_{}",
        withdraw_knockout_user_pool_prefix(user, base, quote, pool_idx),
        block,
    )
}
pub fn withdraw_knockout_key(
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> String {
    format!(
        "{}_{}",
        withdraw_knockout_block_prefix(user, base, quote, pool_idx, block),
        index,
    )
}

// Gets a single WithdrawKnockout event from `db` by the other arguments, returns none if it does not exist
pub fn get_withdraw_knockout(
    db: &rocksdb::DB,
    user: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
    index: Uint256,
) -> Option<WithdrawKnockoutEvent> {
    let k = withdraw_knockout_key(user, base, quote, pool_idx, block, index);
    let v = db.get(k.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    Some(bincode::deserialize(&v.unwrap()).unwrap())
}

// Gets all known WithdrawKnockout events from the database
pub fn get_all_withdraw_knockout(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
) -> Vec<WithdrawKnockoutEvent> {
    let prefix = prefix.unwrap_or_else(|| WITHDRAW_KNOCKOUT_PREFIX.as_bytes());
    let mut events = vec![];
    let iter = db.prefix_iterator(prefix);
    for entry in iter {
        match entry {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let event: WithdrawKnockoutEvent = bincode::deserialize(&v).unwrap();
                events.push(event);
            }
            Err(_) => break,
        }
    }
    events
}

pub fn get_all_withdraw_knockout_after_block(
    db: &rocksdb::DB,
    prefix: Option<&[u8]>,
    block: Uint256,
) -> Vec<WithdrawKnockoutEvent> {
    let unfiltered = get_all_withdraw_knockout(db, prefix);
    unfiltered
        .iter()
        .filter(|v| v.block_height > block)
        .cloned()
        .collect()
}
pub fn save_withdraw_knockout(db: &rocksdb::DB, bke: WithdrawKnockoutEvent) {
    let k = withdraw_knockout_key(
        bke.user,
        bke.base,
        bke.quote,
        bke.pool_idx,
        bke.block_height,
        bke.index,
    );
    debug!("Saving WithdrawKnockoutEvent to key {}", k);
    let v = bincode::serialize(&bke).unwrap();

    db.put(k.as_bytes(), v).unwrap();
}
