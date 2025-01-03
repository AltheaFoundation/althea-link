// This file deals with inferring pool state from observed events by maintaining a cache of pool data and updating it as new events are observed.

pub mod updates;

use std::cmp::Ordering;
use std::cmp::Ordering::Equal;

use clarity::Address;
use clarity::Int256;
use clarity::Uint256;
use log::debug;
use log::info;
use log::warn;
use num_traits::ToPrimitive;
use num_traits::Zero;
use serde::Deserialize;
use serde::Serialize;
use updates::PoolUpdateEvent;

use crate::althea::database::pools::get_pool_template;

use super::pools::get_init_pools;
use super::InitPoolEvent;

/// Tracks the state of a given pool's dirty flag and last event block
/// When `dirty` the associated TrackedPool should be updated before being used
#[derive(Debug, Serialize, Deserialize)]
pub struct DirtyPoolTracker {
    pub dirty: bool,
    pub last_block: Uint256,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
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
    let v = DirtyPoolTracker {
        dirty,
        last_block,
        base,
        quote,
        pool_idx,
    };
    db.put(k.as_bytes(), bincode::serialize(&v).unwrap())
        .unwrap();
}

/// Gets the dirty flag and last event block for a pool
pub fn get_dirty_pool(
    db: &rocksdb::DB,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Option<(bool, Uint256)> {
    let v = db
        .get(dirty_pool_key(base, quote, pool_idx).as_bytes())
        .unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        return None;
    }
    let value: DirtyPoolTracker = bincode::deserialize(&v.unwrap()).unwrap();
    Some((value.dirty, value.last_block))
}

pub fn mark_pool_fresh(
    db: &rocksdb::DB,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
    block: Uint256,
) {
    set_dirty_pool(db, base, quote, pool_idx, false, block);
}

pub fn mark_pool_dirty(db: &rocksdb::DB, base: Address, quote: Address, pool_idx: Uint256) {
    let block = {
        let dirty_pool = get_dirty_pool(db, base, quote, pool_idx);
        dirty_pool.unwrap_or((true, Uint256::default())).1
    };
    set_dirty_pool(db, base, quote, pool_idx, true, block);
}

pub fn get_all_dirty_pools(db: &rocksdb::DB) -> Vec<DirtyPoolTracker> {
    let prefix = DIRTY_POOL_PREFIX.as_bytes();
    let iter = db.prefix_iterator(prefix);
    let mut ret = vec![];
    for value in iter {
        match value {
            Ok((k, v)) => {
                if !k.starts_with(prefix) {
                    break;
                }
                let value: DirtyPoolTracker = bincode::deserialize(&v).unwrap();
                ret.push(value);
            }
            Err(_) => continue,
        }
    }

    ret
}

/// Tracks the inferred state of a pool. Before using this, check the dirty flag and update the state if necessary
/// This is analogous to the AccumPoolStats combined with the liquidity curve bump tracking in the original graphcache-go implementation
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct TrackedPool {
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub base_tvl: Uint256,
    pub quote_tvl: Uint256,
    pub base_volume: Uint256,
    pub quote_volume: Uint256,
    pub base_fees: f64,
    pub quote_fees: f64,
    pub last_price_swap: f64, // Price as of the last swap: Used extensively by frontend
    pub last_price_liq: f64, // Price as of the last liquidity change: Fetched but not used by frontend
    pub last_price_indic: f64, // Most recent price change (liq or swap):  Fetched but not used by frontend

    pub ambient_liq: Uint256,
    pub bumps: Vec<LiquidityBump>,
    pub conc_liq: Uint256,
    pub fee_rate: f64,
}

impl TrackedPool {
    pub fn get_bump(&self, tick: i32) -> Option<&LiquidityBump> {
        self.bumps.iter().find(|b| b.tick == tick)
    }
    pub fn get_bump_mut(&mut self, tick: i32) -> Option<&mut LiquidityBump> {
        self.bumps.iter_mut().find(|b| b.tick == tick)
    }

    pub fn init_bump(&mut self, tick: i32) {
        let bump = self.get_bump(tick);
        if bump.is_some() {
            return;
        }

        let bump = LiquidityBump {
            tick,
            ..Default::default()
        };
        let pos = self.bumps.binary_search(&bump).unwrap_err();
        self.bumps.insert(pos, bump);
    }
}

/// WARNING: UPDATES TO THE ORDER OF ITEMS IN LiquidityBump WILL NOT BE REFLECTED IN Ord
/// WITHOUT A MANUAL UPDATE TO ITS IMPL
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct LiquidityBump {
    pub tick: i32,
    pub last_block: Uint256,
    pub liquidity_delta: f64,
    pub knockout_bid_liq: f64,
    pub knockout_ask_liq: f64,
    pub knockout_bid_width: i32,
    pub knockout_ask_width: i32,
}

/// An implementation of PartialEq using total_cmp for f64 and defaults for the rest
impl PartialEq for LiquidityBump {
    fn eq(&self, other: &Self) -> bool {
        let l_eq = self.liquidity_delta.total_cmp(&other.liquidity_delta) == Equal;
        let kb_eq = self.knockout_bid_liq.total_cmp(&other.knockout_bid_liq) == Equal;
        let ka_eq = self.knockout_ask_liq.total_cmp(&other.knockout_ask_liq) == Equal;
        self.tick == other.tick
            && self.last_block == other.last_block
            && l_eq
            && kb_eq
            && ka_eq
            && self.knockout_bid_width == other.knockout_bid_width
            && self.knockout_ask_width == other.knockout_ask_width
    }
}
impl Eq for LiquidityBump {}

/// An implementation of Ord using total_cmp for f64 and defaults for the rest
/// As of the time of writing, the order of items follows their specification in the LiquidityBump struct
/// WARNING: UPDATES TO THE ORDER OF ITEMS IN LiquidityBump WILL NOT BE REFLECTED IN Ord
/// WITHOUT A MANUAL UPDATE TO THIS IMPL
impl Ord for LiquidityBump {
    fn cmp(&self, other: &Self) -> Ordering {
        match self.tick.cmp(&other.tick) {
            Equal => match self.last_block.cmp(&other.last_block) {
                Equal => match self.liquidity_delta.total_cmp(&other.liquidity_delta) {
                    Equal => match self.knockout_bid_liq.total_cmp(&other.knockout_bid_liq) {
                        Equal => match self.knockout_ask_liq.total_cmp(&other.knockout_ask_liq) {
                            Equal => match self.knockout_bid_width.cmp(&other.knockout_bid_width) {
                                Equal => self.knockout_ask_width.cmp(&other.knockout_ask_width),
                                x => x,
                            },
                            x => x,
                        },
                        x => x,
                    },
                    x => x,
                },
                x => x,
            },
            x => x,
        }
    }
}

/// A canonical implementation of PartialOrd for LiquidityBump using the Ord implementation
impl PartialOrd for LiquidityBump {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub const TRACKED_POOL_PREFIX: &str = "tracked-pool_";
fn tracked_pool_key(base: Address, quote: Address, pool_idx: Uint256) -> String {
    format!("{}{}_{}_{}", TRACKED_POOL_PREFIX, base, quote, pool_idx)
}

/// Stores the cached pool state for a tracked pool
pub fn set_tracked_pool(db: &rocksdb::DB, pool: TrackedPool) {
    let k = tracked_pool_key(pool.base, pool.quote, pool.pool_idx);
    debug!("Setting tracked pool at key {}", k);
    db.put(k.as_bytes(), bincode::serialize(&pool).unwrap())
        .unwrap();
}

/// Gets the latest known inferred pool state for the given pool
pub fn get_tracked_pool(
    db: &rocksdb::DB,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Option<TrackedPool> {
    let v = db
        .get(tracked_pool_key(base, quote, pool_idx).as_bytes())
        .unwrap()?;
    Some(bincode::deserialize(&v).unwrap())
}

pub fn reset_all_pool_indexes(db: &rocksdb::DB) {
    let dirty = get_all_dirty_pools(db);
    let pools_iter = dirty.iter().map(|p| (p.base, p.quote, p.pool_idx));

    // First, delete the dirty and tracked pool objects in the database
    for (base, quote, pool_idx) in pools_iter {
        let dpk = dirty_pool_key(base, quote, pool_idx);
        let tpk = tracked_pool_key(base, quote, pool_idx);

        db.delete(dpk.as_bytes())
            .unwrap_or_else(|e| panic!("Unable to delete dirty pool at key {}: {e}", dpk));
        db.delete(tpk.as_bytes())
            .unwrap_or_else(|e| panic!("Unable to delete tracked pool at key {}: {e}", tpk));
    }

    // Now recreate the dirty pool objects from the InitPoolEvents already stored - this should trigger the pools to be tracked again
    for event in get_init_pools(db) {
        set_dirty_pool(
            db,
            event.base,
            event.quote,
            event.pool_idx,
            true,
            Uint256::default(),
        );
    }
}

pub fn update_pool(db: &rocksdb::DB, update: PoolUpdateEvent) {
    let dirty_status = get_dirty_pool(db, update.base, update.quote, update.pool_idx);
    let not_initialized =
        dirty_status.is_none() || dirty_status.is_some_and(|(_, last_block)| last_block.is_zero());
    let pool = if not_initialized {
        handle_init_pool(db, &update)
    } else {
        let pool = get_tracked_pool(db, update.base, update.quote, update.pool_idx)
            .expect("Missing tracked pool for update");
        handle_update(pool, &update)
    };
    mark_pool_fresh(db, update.base, update.quote, update.pool_idx, update.block);

    set_tracked_pool(db, pool);
}

pub fn handle_update(pool: TrackedPool, update: &PoolUpdateEvent) -> TrackedPool {
    if update.is_liq {
        handle_liq(pool, update)
    } else if update.is_swap {
        handle_swap(pool, update)
    } else {
        handle_revision(pool, update)
    }
}

pub fn handle_init_pool(db: &rocksdb::DB, update: &PoolUpdateEvent) -> TrackedPool {
    assert!(
        update.base_flow >= 0 && update.quote_flow >= 0,
        "Invalid pool initialization flows"
    );
    let template = get_pool_template(db, update.pool_idx).expect("Missing pool template");
    let ambient_liq = update
        .ambient_liq
        .try_into()
        .expect("Invalid InitPool ambient liquidity");
    let price = root_price_from_reserves(update.base_flow as u128, update.quote_flow as u128);
    TrackedPool {
        base: update.base,
        quote: update.quote,
        pool_idx: update.pool_idx,
        base_tvl: update.base_flow.unsigned_abs().into(),
        quote_tvl: update.quote_flow.unsigned_abs().into(),
        base_volume: 0u128.into(),
        quote_volume: 0u128.into(),
        base_fees: 0.0,
        quote_fees: 0.0,
        last_price_liq: price,
        last_price_indic: price,
        last_price_swap: price,
        ambient_liq,
        bumps: vec![],
        conc_liq: 0u128.into(),
        fee_rate: template.fee_rate.into(),
    }
}

fn root_price_from_reserves(base: u128, quote: u128) -> f64 {
    if quote == 0 {
        return 1.0;
    }
    ((base as f64) / (quote as f64)).sqrt()
}

fn root_price_from_tick(tick: i32) -> f64 {
    let tick = tick as f64;
    let price = 1.0001f64.powf(tick);
    price.sqrt()
}

// fn tick_from_root_price(price: f64) -> i32 {
//     if price.abs() <= 0.0001 {
//         return 0;
//     }
//     let price = price * price;
//     let tick = price.log(1.0001f64);
//     tick as i32
// }

pub fn handle_liq(mut pool: TrackedPool, update: &PoolUpdateEvent) -> TrackedPool {
    // Calculate TVL by inc/dec-rementing by the flows
    pool.base_tvl = add_uint256_int256(pool.base_tvl, update.base_flow.into());
    pool.quote_tvl = add_uint256_int256(pool.quote_tvl, update.quote_flow.into());

    let base_mag = update.base_flow.unsigned_abs();
    let quote_mag = update.quote_flow.unsigned_abs();

    if base_mag < 1000 || quote_mag < 1000 {
        return pool;
    }
    // flows_at_market is a confusing value coming from the croc-subgraph repo
    // it's only true for mints, burns, harvests, and swaps
    if !update.flows_at_market {
        return pool;
    }

    // let mut remove_bid_bump = false;
    // let mut remove_ask_bump = false;

    // is_tick_skewed is a confusing value coming from the croc-subgraph repo
    // it's only true when ask tick != bid tick and this is not a harvest
    if update.is_tick_skewed {
        // Handle concentrated liquidity
        let (bid_tick, ask_tick) = (update.bid_tick.unwrap(), update.ask_tick.unwrap());
        let updated_price =
            derive_price_conc_flow(update.base_flow, update.quote_flow, bid_tick, ask_tick);

        if let Some(price) = updated_price {
            pool.last_price_liq = price;
            pool.last_price_indic = price;
        } else {
            warn!("Unable to compute price from concentrated flow (is something zero?): base_flow: {}, quote_flow: {}, bid_tick: {}, ask_tick: {}", update.base_flow, update.quote_flow, bid_tick, ask_tick);
        }
        // // Initialize or fetch the liquidity bumps at bid and ask tick
        // pool.init_bump(bid_tick);
        // pool.init_bump(ask_tick);
        // let liq_magn = liquidity_magnitude(update);

        // let ko_bid = update.is_knockout && update.is_bid;
        // let ko_ask = update.is_knockout && !update.is_bid;

        // // We separate the bid and ask bump updates to avoid mut borrowing issues
        // let bid_bump = pool.get_bump_mut(bid_tick).unwrap();
        // if update.is_burn {
        //     bid_bump.liquidity_delta -= liq_magn;
        //     if ko_bid {
        //         bid_bump.knockout_bid_liq -= liq_magn;
        //         bid_bump.knockout_bid_width = 0;
        //     }
        // } else {
        //     bid_bump.liquidity_delta += liq_magn;
        //     if ko_bid {
        //         bid_bump.knockout_bid_liq += liq_magn;
        //         bid_bump.knockout_bid_width = ask_tick - bid_tick;
        //     }
        // }
        // remove_bid_bump = should_remove_bump(bid_bump);

        // let ask_bump = pool.get_bump_mut(ask_tick).unwrap();
        // if update.is_burn {
        //     ask_bump.liquidity_delta += liq_magn;
        //     if ko_ask {
        //         ask_bump.knockout_ask_liq += liq_magn;
        //         ask_bump.knockout_ask_width = 0;
        //     }
        // } else {
        //     ask_bump.liquidity_delta -= liq_magn;
        //     if ko_ask {
        //         ask_bump.knockout_ask_liq -= liq_magn;
        //         ask_bump.knockout_ask_width = ask_tick - bid_tick;
        //     }
        // }
        // remove_ask_bump = should_remove_bump(ask_bump);

        // Finally update the ambient liquidity (in the event rewards were collected)
        // pool.ambient_liq = add_uint256_int256(pool.ambient_liq, update.ambient_liq);
    } else {
        // Handle ambient liquidity
        // pool.ambient_liq = add_uint256_int256(pool.ambient_liq, update.ambient_liq);

        let price = derive_price_from_amb_flow(update.base_flow, update.quote_flow);
        pool.last_price_liq = price;
        pool.last_price_indic = price;
    }

    // if remove_bid_bump {
    //     pool.bumps.retain(|b| b.tick != update.bid_tick.unwrap());
    // }
    // if remove_ask_bump {
    //     pool.bumps.retain(|b| b.tick != update.ask_tick.unwrap());
    // }

    pool
}

// fn liquidity_magnitude(update: &PoolUpdateEvent) -> f64 {
//     let (b_mag, q_mag) = (
//         update.base_flow.abs() as f64,
//         update.quote_flow.abs() as f64,
//     );
//     // If the flows are both less than 1k then the liquidity is "not numerically stable" and 0 is returned
//     if b_mag < 1000f64 && q_mag < 1000f64 {
//         0.0
//     } else if update.conc_liq != 0u8.into() {
//         conc_liquidity_magnitude(update, b_mag, q_mag)
//     } else {
//         amb_liquidity_magnitude(b_mag, q_mag)
//     }
// }

// fn conc_liquidity_magnitude(update: &PoolUpdateEvent, base_mag: f64, quote_mag: f64) -> f64 {
//     let bid_price = root_price_from_tick(update.bid_tick.unwrap());
//     let ask_price = root_price_from_tick(update.ask_tick.unwrap());

//     if update.quote_flow == 0 {
//         base_mag / (ask_price - bid_price)
//     } else if update.base_flow == 0 {
//         quote_mag / (1.0 / bid_price - 1.0 / ask_price)
//     } else {
//         let curr_price = derive_root_price_from_conc_flow(
//             base_mag,
//             quote_mag,
//             update.bid_tick.unwrap(),
//             update.ask_tick.unwrap(),
//         )
//         .unwrap_or_default();
//         base_mag / (curr_price - bid_price)
//     }
// }

fn derive_price_conc_flow(
    base_flow: i128,
    quote_flow: i128,
    bid_tick: i32,
    ask_tick: i32,
) -> Option<f64> {
    let root_price = derive_root_price_from_conc_flow(base_flow, quote_flow, bid_tick, ask_tick)?;
    Some(root_price * root_price)
}

fn derive_root_price_from_conc_flow(
    base_flow: i128,
    quote_flow: i128,
    bid_tick: i32,
    ask_tick: i32,
) -> Option<f64> {
    // If either flow is zero, return None
    if base_flow.is_zero() || quote_flow.is_zero() {
        return None;
    }
    let base_flow = base_flow as f64;
    let quote_flow = quote_flow as f64;

    // Translate ticks to root prices via sqrt(1.0001 ^ tick)
    let bid_root_price = root_price_from_tick(bid_tick);
    let ask_root_price = root_price_from_tick(ask_tick);

    // Use the quadratic formula where a = quote_flow * ask_root_price, b = base_flow - (quote_flow * bid_price * ask_price), c = -base_flow * ask_price
    let a = quote_flow * ask_root_price;
    let b = base_flow - (quote_flow * bid_root_price * ask_root_price);
    let c = -base_flow * ask_root_price;

    // The roots of the quadratic formula are the possible root prices
    let s_pos = (-b + (b * b - 4f64 * a * c).sqrt()) / (2f64 * a);
    let s_neg = (-b - (b * b - 4f64 * a * c).sqrt()) / (2f64 * a);

    // If the positive root is within the current root prices, return it, otherwise return the negative root
    Some(if s_pos >= bid_root_price && s_pos <= ask_root_price {
        s_pos
    } else {
        s_neg
    })
}

// fn amb_liquidity_magnitude(base_mag: f64, quote_mag: f64) -> f64 {
//     (base_mag * quote_mag).sqrt()
// }

// fn should_remove_bump(bump: &LiquidityBump) -> bool {
//     bump.liquidity_delta.abs() < 0.0001
//         && bump.knockout_bid_liq.abs() < 0.0001
//         && bump.knockout_ask_liq.abs() < 0.0001
// }

fn derive_price_from_amb_flow(base_flow: i128, quote_flow: i128) -> f64 {
    if quote_flow == 0 {
        return 1.0;
    }
    let price = (base_flow as f64) / (quote_flow as f64);
    price.abs()
}

pub fn handle_swap(mut pool: TrackedPool, update: &PoolUpdateEvent) -> TrackedPool {
    // magnitude == absolute value
    let base_mag = update.base_flow.unsigned_abs();
    let quote_mag = update.quote_flow.unsigned_abs();

    // Accumulate TVL
    pool.base_tvl = add_uint256_int256(pool.base_tvl, update.base_flow.into());
    pool.quote_tvl = add_uint256_int256(pool.quote_tvl, update.quote_flow.into());

    // Accumulate Volume
    pool.base_volume += base_mag.into();
    pool.quote_volume += quote_mag.into();
    // Accumulate fees and add to ambient liquidity
    if update.in_base_qty {
        pool.quote_fees += (quote_mag as f64) * pool.fee_rate;
    } else {
        pool.base_fees += (base_mag as f64) * pool.fee_rate;
    }

    if is_flow_dual_stable(update.base_flow as f64, update.quote_flow as f64) {
        let new_price = derive_price_swap(
            base_mag.to_f64().unwrap(),
            quote_mag.to_f64().unwrap(),
            pool.fee_rate,
            update.base_flow < 0,
        );
        // let old_price = pool.last_price_swap;
        pool.last_price_swap = new_price;
        pool.last_price_indic = new_price;

        // // Determine if any knockouts were crossed and handle those changes to liquidity
        // // using updateKOCross in graphcache-go model/liquidityCurve.go
        // let old_tick = tick_from_root_price(old_price);
        // let new_tick = tick_from_root_price(new_price);
        // let ko_bumps: Vec<LiquidityBump> = get_crossed_ko_bumps(&pool, old_tick, new_tick);

        // for bump in ko_bumps {
        //     cross_ko_bump(&mut pool, &bump, new_price < old_price);
        // }
    }

    pool
}

fn add_uint256_int256(a: Uint256, b: Int256) -> Uint256 {
    if b >= Int256::default() {
        a + b.to_uint256().unwrap()
    } else {
        let abs = Uint256(b.0.unsigned_abs());
        a - abs
    }
}

fn is_flow_dual_stable(base_flow: f64, quote_flow: f64) -> bool {
    base_flow.abs() >= 1000.0 && quote_flow.abs() >= 1000.0
}

fn derive_price_swap(base_mag: f64, quote_mag: f64, _fee_rate: f64, _is_sell: bool) -> f64 {
    // This implementation seems more accurate from manual testing
    (base_mag / quote_mag).abs()

    // GCGO implementation that tracks the fee rate
    // if is_sell {
    //     (base_mag / quote_mag).abs() * (1.0 + (fee_rate / (10000.0 * 100.0)))
    // } else {
    //     (base_mag / quote_mag).abs() * (1.0 - (fee_rate / (10000.0 * 100.0)))
    // }
}

// fn get_crossed_ko_bumps(pool: &TrackedPool, old_tick: i32, new_tick: i32) -> Vec<LiquidityBump> {
//     if new_tick > old_tick {
//         // Moving in the positive direction, we care about "ask" knockouts
//         pool.bumps
//             .iter()
//             .filter(|b| b.tick > old_tick && b.tick <= new_tick && b.knockout_ask_liq > 0.0)
//             .cloned()
//             .collect()
//     } else {
//         // Moving in the negative direction, we care about "bid" knockouts
//         pool.bumps
//             .iter()
//             .filter(|b| b.tick < old_tick && b.tick >= new_tick && b.knockout_bid_liq > 0.0)
//             .cloned()
//             .collect()
//     }
// }

// Knockout liquidity can be removed from a pool in a bid (price reduced) or ask (price increased) direction
// Once a knockout "pivot" is crossed, the position's liquidity must be removed from both bumps to cancel out the position
// e.g. a ko position from (bid) tick -32 to (ask) tick -16 worth 100 liquidity and current tick -64 would create a bid bump with
// liquidity -100 and an ask bump with liquidity +100 (with knockout ask liq and width set appropriately). If the tick moves
// to -15 or higher, then the bid bump's liquidity must be increased by 100 and the ask bump's liquidity must be decreased by 100,
// making sure to reset knockout ask liq and width.
fn cross_ko_bump(pool: &mut TrackedPool, bump: &LiquidityBump, is_bid: bool) {
    if is_bid {
        // Price is moving in the negative direction, need to reduce bid liquidity and remove the ask liquidity
        let bid_bump = pool.get_bump_mut(bump.tick).unwrap();
        bid_bump.liquidity_delta -= bump.knockout_bid_liq;
        // Reset the knockout state
        bid_bump.knockout_bid_liq = 0.0;
        bid_bump.knockout_bid_width = 0;

        let ask_bump = pool
            .get_bump_mut(bump.tick + bump.knockout_bid_width)
            .unwrap();
        // Remove the ask liquidity to cancel out the position
        ask_bump.liquidity_delta += bump.knockout_bid_liq;
    } else {
        // Price is moving in the positive direction, need to reduce ask liquidity and remove the bid liquidity
        let ask_bump = pool.get_bump_mut(bump.tick).unwrap();
        ask_bump.liquidity_delta -= bump.knockout_ask_liq;
        // Reset the knockout state
        ask_bump.knockout_ask_liq = 0.0;
        ask_bump.knockout_ask_width = 0;

        let bid_bump = pool
            .get_bump_mut(bump.tick - bump.knockout_ask_width)
            .unwrap();
        // Remove the bid liquidity to cancel out the position
        bid_bump.liquidity_delta += bump.knockout_ask_liq;
    }
}

// // This is a bit different than the calcFeeOverSwap function in the DEX because at this point we know all the tokens were swapped and don't care about mezzanine or terminus tickmaps, etc.
// // so we just directly calculate the fees generated by the swap and how that affects the ambient liquidity
// fn calc_fee_over_swap(pool: &TrackedPool, update: &PoolUpdateEvent) -> f64 {
//     const FEE_BP_MULT: f64 = 1_000_000f64;
//     let buy_flow = if update.base_flow > 0 {
//         update.base_flow
//     } else {
//         update.quote_flow
//     };
//     buy_flow as f64 * pool.fee_rate / FEE_BP_MULT
// }

// fn assimilate_liq(pool: &mut TrackedPool, update: &PoolUpdateEvent, fees: f64) {
//     let liq = pool.conc_liq + pool.ambient_liq;
//     let reserve = if update.base_flow > 0 {
//         liq * (pool.price as u128).into()
//     } else {
//         liq / (pool.price as u128).into()
//     };
//     if reserve == Uint256::default() {
//         return;
//     }
//     let inflate = (reserve + (fees as u128).into()) / reserve;
//     pool.ambient_liq += pool.ambient_liq * inflate
// }

// Revisions are only useful to us in that the update the fee rate
pub fn handle_revision(mut pool: TrackedPool, update: &PoolUpdateEvent) -> TrackedPool {
    pool.fee_rate = update.fee_rate;
    pool
}

// Test bumps are not created unnecessarily
#[test]
fn ambient_noop() {
    use crate::althea::ambient::positions::MintAmbientEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    let update = MintAmbientEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    if !pool.bumps.is_empty() {
        panic!("Ambient update created tick bump");
    }
}
#[test]
fn ambient_burn() {
    use crate::althea::ambient::positions::BurnAmbientEvent;
    use crate::althea::ambient::positions::MintAmbientEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use num_traits::Zero;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    let update = MintAmbientEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    let mint_liq = pool.ambient_liq;
    let update = BurnAmbientEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        base_flow: -30000,
        quote_flow: -30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    let burn_liq = pool.ambient_liq;
    if burn_liq != Uint256::zero() {
        panic!(
            "Unexpected liquidity after burn: {} (mint liq {})",
            burn_liq, mint_liq
        );
    }
    if !pool.bumps.is_empty() {
        panic!("Ambient mint and burn created tick bump");
    }
}

// Test ranged liquidity bumps are created correctly
#[test]
fn range_mint() {
    use crate::althea::ambient::positions::MintRangedEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    let update = MintRangedEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        bid_tick: -250,
        ask_tick: 500,
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    let bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    if bid_liq <= 0.0 {
        panic!("Lower liquidity range not positive {}", bid_liq);
    }
    if ask_liq >= 0.0 {
        panic!("Upper liquidity range not negative {}", ask_liq);
    }

    if bid_liq != -ask_liq {
        panic!("Liquidity range mismatch {} <-> {}", bid_liq, ask_liq);
    }
}

// Test ranged liquidity bumps are destroyed correctly
#[test]
fn range_burn() {
    use crate::althea::ambient::positions::BurnRangedEvent;
    use crate::althea::ambient::positions::MintRangedEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let user = Address::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    let update = MintRangedEvent {
        block_height: 1u8.into(),
        user,
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        bid_tick: -250,
        ask_tick: 500,
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    assert!(pool.get_bump(-250).is_some());
    assert!(pool.get_bump(500).is_some());
    let update = BurnRangedEvent {
        block_height: 2u8.into(),
        user,
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        bid_tick: -250,
        ask_tick: 500,
        base_flow: -30000,
        quote_flow: -30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    assert!(pool.get_bump(-250).is_none());
    assert!(pool.get_bump(500).is_none());
}

// Test knockout bid positions affect bumps correctly
#[test]
fn knockout_bid() {
    use crate::althea::ambient::knockout::MintKnockoutEvent;
    use crate::althea::ambient::positions::MintRangedEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    // This liquidity will put the pool at tick 0 (equal amounts of base + quote) with a concentrated position of [-250, 500]
    let update = MintRangedEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        bid_tick: -250,
        ask_tick: 500,
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    let start_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let start_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    let update = MintKnockoutEvent {
        block_height: 2u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        lower_tick: -250,
        upper_tick: 500,
        base_flow: 250000,
        quote_flow: 250000,
        is_bid: true,
        ..Default::default()
    };
    let mut pool = handle_update(pool, &update.into());
    let second_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let second_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    let bid_bump = pool.get_bump(-250).unwrap().clone();
    cross_ko_bump(&mut pool, &bid_bump, true);
    let third_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let third_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    println!(
        "BID: Start {}, Second {}, Third {}",
        start_bid_liq, second_bid_liq, third_bid_liq
    );
    println!(
        "ASK: Start {}, Second {}, Third {}",
        start_ask_liq, second_ask_liq, third_ask_liq
    );

    let bid_bump = pool.get_bump(-250).unwrap();
    let ask_bump = pool.get_bump(500).unwrap();
    if (bid_bump.liquidity_delta - start_bid_liq).abs() > 0.0001 {
        panic!(
            "Mismatched bid liq {} (expected {})",
            bid_bump.liquidity_delta, start_bid_liq
        );
    }
    if bid_bump.knockout_bid_liq != 0.0 {
        panic!(
            "Mismatched bid ko liq {} (expected {})",
            bid_bump.knockout_bid_liq, 0.0
        );
    }
    if bid_bump.knockout_bid_width != 0 {
        panic!("Knockout bid width not reset");
    }
    if (ask_bump.liquidity_delta - start_ask_liq).abs() > 0.0001 {
        panic!(
            "Mismatched ask liq {} (expected {})",
            ask_bump.liquidity_delta, start_ask_liq
        );
    }
}

// Test knockout ask positions affect bumps correctly
#[test]
fn knockout_ask() {
    use crate::althea::ambient::knockout::MintKnockoutEvent;
    use crate::althea::ambient::positions::MintRangedEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    // This liquidity will put the pool at tick 0 (equal amounts of base + quote) with a concentrated position of [-250, 500]
    let update = MintRangedEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        bid_tick: -250,
        ask_tick: 500,
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    let start_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let start_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    let update = MintKnockoutEvent {
        block_height: 2u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        lower_tick: -250,
        upper_tick: 500,
        base_flow: 250000,
        quote_flow: 250000,
        is_bid: false,
        ..Default::default()
    };
    let mut pool = handle_update(pool, &update.into());
    let second_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let second_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    let ask_bump = pool.get_bump(500).unwrap().clone();
    cross_ko_bump(&mut pool, &ask_bump, false);
    let third_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let third_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;
    println!(
        "BID: Start {}, Second {}, Third {}",
        start_bid_liq, second_bid_liq, third_bid_liq
    );
    println!(
        "ASK: Start {}, Second {}, Third {}",
        start_ask_liq, second_ask_liq, third_ask_liq
    );
    let ask_bump = pool.get_bump(500).unwrap();
    let bid_bump = pool.get_bump(-250).unwrap();
    if (ask_bump.liquidity_delta - start_ask_liq).abs() > 0.0001 {
        panic!(
            "Mismatched ask liq {} (expected {})",
            ask_bump.liquidity_delta, start_ask_liq
        );
    }
    if ask_bump.knockout_ask_liq != 0.0 {
        panic!(
            "Mismatched ask ko liq {} (expected {})",
            ask_bump.knockout_ask_liq, 0.0
        );
    }
    if ask_bump.knockout_ask_width != 0 {
        panic!("Knockout ask width not reset");
    }
    if (bid_bump.liquidity_delta - start_bid_liq).abs() > 0.0001 {
        panic!(
            "Mismatched bid liq {} (expected {})",
            bid_bump.liquidity_delta, start_bid_liq
        );
    }
}

// Test knockout burns are handled correctly
#[test]
fn knockout_burn() {
    use crate::althea::ambient::knockout::BurnKnockoutEvent;
    use crate::althea::ambient::knockout::MintKnockoutEvent;
    use crate::althea::ambient::positions::MintRangedEvent;
    use crate::althea::DEFAULT_TOKEN_ADDRESSES;
    use std::str::FromStr;

    let pool = TrackedPool::default();
    let base = Address::default();
    let quote = Address::from_str(DEFAULT_TOKEN_ADDRESSES[0]).unwrap();
    // This liquidity will put the pool at tick 0 (equal amounts of base + quote) with a concentrated position of [-250, 500]
    let update = MintRangedEvent {
        block_height: 1u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        liq: 30000u32.into(),
        bid_tick: -250,
        ask_tick: 500,
        base_flow: 30000,
        quote_flow: 30000,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());
    let start_bid_liq = pool.get_bump(-250).unwrap().liquidity_delta;
    let start_ask_liq = pool.get_bump(500).unwrap().liquidity_delta;

    let update = MintKnockoutEvent {
        block_height: 2u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        lower_tick: -250,
        upper_tick: 500,
        base_flow: 250000,
        quote_flow: 250000,
        is_bid: true,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());

    let update = BurnKnockoutEvent {
        block_height: 2u8.into(),
        base,
        quote,
        pool_idx: 36000u32.into(),
        lower_tick: -250,
        upper_tick: 500,
        base_flow: 250000,
        quote_flow: 250000,
        is_bid: true,
        ..Default::default()
    };
    let pool = handle_update(pool, &update.into());

    let bid_bump = pool.get_bump(-250).unwrap();
    let ask_bump = pool.get_bump(500).unwrap();

    if (bid_bump.liquidity_delta - start_bid_liq).abs() > 0.0001 {
        panic!(
            "Mismatched bid liq {} (expected {})",
            bid_bump.liquidity_delta, start_bid_liq
        );
    }
    if bid_bump.knockout_bid_liq != 0.0 {
        panic!(
            "Mismatched bid ko liq {} (expected {})",
            bid_bump.knockout_bid_liq, 0.0
        );
    }
    if bid_bump.knockout_bid_width != 0 {
        panic!("Knockout bid width not reset");
    }
    if (ask_bump.liquidity_delta - start_ask_liq).abs() > 0.0001 {
        panic!(
            "Mismatched ask liq {} (expected {})",
            ask_bump.liquidity_delta, start_ask_liq
        );
    }
}
