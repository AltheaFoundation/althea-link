use std::cmp::min;

use clarity::Address;
use clarity::Int256;
use clarity::Uint256;
use log::debug;
use serde::Deserialize;
use serde::Serialize;

use crate::althea::ambient::knockout::BurnKnockoutEvent;
use crate::althea::ambient::knockout::MintKnockoutEvent;
use crate::althea::ambient::knockout::WithdrawKnockoutEvent;
use crate::althea::ambient::pools::PoolRevisionEvent;
use crate::althea::ambient::positions::BurnAmbientEvent;
use crate::althea::ambient::positions::BurnRangedEvent;
use crate::althea::ambient::positions::HarvestEvent;
use crate::althea::ambient::positions::MintAmbientEvent;
use crate::althea::ambient::positions::MintRangedEvent;
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

#[derive(Debug, Serialize, Deserialize)]
pub struct DirtyPoolTracker {
    pub dirty: bool,
    pub last_block: Uint256,
}
pub const DIRTY_POOL_PREFIX: &str = "dirty-pool_";
fn dirty_pool_key(base: Address, quote: Address, pool_idx: Uint256) -> String {
    format!("{}{}_{}_{}", DIRTY_POOL_PREFIX, base, quote, pool_idx)
}

/// Sets the dirty flag and last event block for a pool
pub fn set_dirty_pool(
    db: &rocksdb::DB,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    dirty: bool,
    last_block: Uint256,
) {
    let k = dirty_pool_key(base, quote, pool_idx);
    debug!("Setting dirty pool at key {}", k);
    let v = DirtyPoolTracker { dirty, last_block };
    db.put(k.as_bytes(), bincode::serialize(&v).unwrap())
        .unwrap();
}

/// Gets the dirty flag and last event block for a pool
pub fn get_dirty_pool(
    db: &rocksdb::DB,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> (bool, Uint256) {
    let v = db
        .get(dirty_pool_key(base, quote, pool_idx).as_bytes())
        .unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return (false, Uint256::default());
    }
    let value: DirtyPoolTracker = bincode::deserialize(&v.unwrap()).unwrap();
    (value.dirty, value.last_block)
}

pub struct TrackedPool {
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub base_tvl: Uint256,
    pub quote_tvl: Uint256,
    pub base_volume: Uint256,
    pub quote_volume: Uint256,
    pub base_fees: Uint256,
    pub quote_fees: Uint256,
    pub price: Int256,

    pub ambient_liq: Uint256,
    pub bumps: Vec<LiquidityBump>,
    pub conc_liq: Uint256,
    pub fee_rate: u128,
}
pub struct LiquidityBump {
    pub last_block: Uint256,
    pub tick: Uint256,
    pub liquidity_delta: Int256,
    pub knockout_bid_liq: i128,
    pub knockout_ask_liq: i128,
    pub knockout_bid_width: i128,
    pub knockout_ask_width: i128,
}
pub const TRACKED_POOL_PREFIX: &str = "pool_";
fn tracked_pool_key(base: Address, quote: Address, pool_idx: Uint256) -> String {
    format!("{}{}_{}_{}", TRACKED_POOL_PREFIX, base, quote, pool_idx)
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PoolUpdateEvent {
    pub block: Uint256,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub ambient_liq: Int256,
    pub conc_liq: Int256,
    pub price: f64,
    pub fee_rate: f64,
    pub fees: u128,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub is_swap: bool,
    pub is_liq: bool,
    pub is_tick_skewed: bool, // TODO: Figure out how the subgraph code sources this
}

impl From<InitPoolEvent> for PoolUpdateEvent {
    fn from(value: InitPoolEvent) -> Self {
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: value.liq.into(),
            is_liq: true,
            ..Default::default()
        }
    }
}

impl From<PoolRevisionEvent> for PoolUpdateEvent {
    fn from(value: PoolRevisionEvent) -> Self {
        let rate = value.fee_rate as f64 / 1000000f64;
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            fee_rate: rate,
            ..Default::default()
        }
    }
}

impl From<MintRangedEvent> for PoolUpdateEvent {
    fn from(value: MintRangedEvent) -> Self {
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            conc_liq: value.liq.into(),
            bid_tick: value.bid_tick,
            ask_tick: value.ask_tick,
            is_liq: true,
            ..Default::default()
        }
    }
}

impl From<BurnRangedEvent> for PoolUpdateEvent {
    fn from(value: BurnRangedEvent) -> Self {
        let liq: Int256 = value.liq.into();
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            conc_liq: -(liq),
            bid_tick: value.bid_tick,
            ask_tick: value.ask_tick,
            is_liq: true,
            ..Default::default()
        }
    }
}

// We require priceRoot context to calculate the liquidity impact of a Harvest, so we use the HarvestUpdate type to capture it
pub struct HarvestUpdate(pub HarvestEvent, pub Int256);
impl From<HarvestUpdate> for PoolUpdateEvent {
    fn from(value: HarvestUpdate) -> Self {
        let event = value.0;
        let price_root = value.1;
        let liq: Int256 = price_root * event.quote_flow.into();
        PoolUpdateEvent {
            block: event.block_height,
            base: event.base,
            quote: event.quote,
            pool_idx: event.pool_idx,
            base_flow: event.base_flow,
            quote_flow: event.quote_flow,
            ambient_liq: -(liq),
            bid_tick: event.bid_tick,
            ask_tick: event.ask_tick,
            is_liq: true,
            ..Default::default()
        }
    }
}

impl From<MintAmbientEvent> for PoolUpdateEvent {
    fn from(value: MintAmbientEvent) -> Self {
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: value.liq.into(),
            is_liq: true,
            ..Default::default()
        }
    }
}

impl From<BurnAmbientEvent> for PoolUpdateEvent {
    fn from(value: BurnAmbientEvent) -> Self {
        let liq: Int256 = value.liq.into();
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: -(liq),
            is_liq: true,
            ..Default::default()
        }
    }
}

impl From<SwapEvent> for PoolUpdateEvent {
    fn from(event: SwapEvent) -> Self {
        let base = min(event.buy, event.sell);
        // A "buy" is any swap of base tokens for quote tokens
        let is_buy = base != event.buy;

        if is_buy {
            PoolUpdateEvent {
                block: event.block_height,
                base: event.sell,
                quote: event.buy,
                base_flow: event.sell_flow,
                quote_flow: event.buy_flow,
                is_swap: true,
                ..Default::default()
            }
        } else {
            PoolUpdateEvent {
                block: event.block_height,
                base: event.buy,
                quote: event.sell,
                base_flow: event.buy_flow,
                quote_flow: event.sell_flow,
                is_swap: true,
                ..Default::default()
            }
        }
    }
}

impl From<MintKnockoutEvent> for PoolUpdateEvent {
    fn from(value: MintKnockoutEvent) -> Self {
        // TODO: Determine the liquidity using the formulation below, NOTE THAT priceDelta IS NOT THE TICK DELTA
        // The liquidity supported is baseAmount / priceDelta OR quoteAmount * priceDelta depending on the direction of the knockout
        // where priceDelta is upperPrice - lowerPrice (when out of range) OR
        // currentPrice - lowerPrice (when in range and the knockout is a bid) OR
        // upperPrice - currentPrice (when in range and the knockout is NOT a bid)
        let update = PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            bid_tick: value.lower_tick,
            ask_tick: value.upper_tick,
            is_liq: true,
            ..Default::default()
        };
        if value.is_bid {
            PoolUpdateEvent {
                base_flow: value.qty.try_into().unwrap(),
                ..update
            }
        } else {
            PoolUpdateEvent {
                quote_flow: value.qty.try_into().unwrap(),
                ..update
            }
        }
    }
}

impl From<BurnKnockoutEvent> for PoolUpdateEvent {
    fn from(value: BurnKnockoutEvent) -> Self {
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            bid_tick: value.lower_tick,
            ask_tick: value.upper_tick,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            is_liq: true,
            ..Default::default()
        }
    }
}

// Knockout Withdrawals are not like burning a ranged position because they happen after the position is knocked out
// and thus the principal liquidity of the position will never kick back in on future price changes, aka the liquidity
// impact happened earlier when the knockout pivot was crossed.
// HOWEVER, it is important to note that Knockout positions accrue fees and if the position is claimed
// rather than recovered then the fees are paid out to the position holder. This amount is included
// in the baseFlow/quoteFlow field (depending on the direction of the knockout position). If proven is false, then the
// fees are forfeited and the baseFlow/quoteFlow is the amount of the position that was recovered.
// Thus, only when fee_rewards > 0 is the ambient liquidity impacted by the withdrawal.
impl From<WithdrawKnockoutEvent> for PoolUpdateEvent {
    fn from(value: WithdrawKnockoutEvent) -> Self {
        // The ambient liquidity (as sqrt(XY)) is reduced by the sqrt of the fee reward payout
        let ambient_impact = -(value.fee_rewards as f64).sqrt() as i128;
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            bid_tick: value.lower_tick,
            ask_tick: value.upper_tick,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: ambient_impact.into(),
            is_liq: true,
            ..Default::default()
        }
    }
}
fn derive_price_swap(base_flow: i128, quote_flow: i128, take_rate: u16, is_buy: bool) -> f64 {
    let base = base_flow.abs();
    let quote = quote_flow.abs();
    let take_rate = f64::from(take_rate);
    let rate = if is_buy {
        1.0 + take_rate
    } else {
        1.0 - take_rate
    };

    ((base / quote / 1000000i128) as f64) * rate
}

// TODO: Implement the rest of the update conversions, for swaps + knockout
