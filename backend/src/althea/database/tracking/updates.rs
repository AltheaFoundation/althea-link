use std::cmp::min;

use clarity::Address;
use clarity::Int256;
use clarity::Uint256;
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

use super::root_price_from_conc_flow;
use super::root_price_from_reserves;
use super::root_price_from_tick;
use super::InitPoolEvent;

/// Encodes various pool update evetns (swap, mint burn, ...) into a single format which can be used to update
/// inferred pool state in a TrackedPool
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct PoolUpdateEvent {
    pub block: Uint256,
    pub index: Uint256,
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
    pub bid_tick: Option<i32>,
    pub ask_tick: Option<i32>,
    pub is_swap: bool,
    pub is_liq: bool,
    pub is_mint: bool,
    pub is_burn: bool,
    pub is_knockout: bool,
    pub is_bid: bool,
    pub is_harvest: bool,
}

impl From<InitPoolEvent> for PoolUpdateEvent {
    fn from(value: InitPoolEvent) -> Self {
        let price = root_price_from_reserves(value.base_flow as u128, value.quote_flow as u128);
        PoolUpdateEvent {
            block: value.block_height,
            index: Uint256::default(),
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: value.liq.into(),
            price,
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
            bid_tick: Some(value.bid_tick),
            ask_tick: Some(value.ask_tick),
            is_liq: true,
            is_mint: true,
            ..Default::default()
        }
    }
}

impl From<BurnRangedEvent> for PoolUpdateEvent {
    fn from(value: BurnRangedEvent) -> Self {
        let conc_liq: Int256 = value.liq.into();
        assert!(value.base_flow <= 0 && value.quote_flow <= 0);
        let full_liq_impact =
            (Int256::from(value.base_flow) * Int256::from(value.quote_flow)).sqrt();
        assert!(full_liq_impact >= Uint256(conc_liq.0.unsigned_abs()));
        let amb_liq: Int256 = conc_liq - full_liq_impact.to_int256().unwrap();
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            conc_liq: -conc_liq,
            ambient_liq: -amb_liq,
            bid_tick: Some(value.bid_tick),
            ask_tick: Some(value.ask_tick),
            is_liq: true,
            is_burn: true,
            ..Default::default()
        }
    }
}

impl From<HarvestEvent> for PoolUpdateEvent {
    fn from(event: HarvestEvent) -> Self {
        PoolUpdateEvent {
            block: event.block_height,
            base: event.base,
            quote: event.quote,
            pool_idx: event.pool_idx,
            base_flow: event.base_flow,
            quote_flow: event.quote_flow,
            bid_tick: Some(event.bid_tick),
            ask_tick: Some(event.ask_tick),
            is_harvest: true,
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
            ambient_liq: Int256::from(value.liq),
            is_liq: true,
            is_mint: true,
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
            is_burn: true,
            ..Default::default()
        }
    }
}

impl From<SwapEvent> for PoolUpdateEvent {
    fn from(event: SwapEvent) -> Self {
        let base = min(event.buy, event.sell);
        // A "buy" is any swap of base tokens for quote tokens
        let is_buy = base == event.sell;
        // TODO: Port over the fees calculation

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
    fn from(event: MintKnockoutEvent) -> Self {
        let base_mag = event.base_flow.abs();
        let quote_mag = event.quote_flow.abs();
        let (bid_tick, ask_tick) = (event.lower_tick, event.upper_tick);
        let lower_price = root_price_from_tick(bid_tick);
        let upper_price = root_price_from_tick(ask_tick);
        let conc_liq = {
            if quote_mag == 0 {
                base_mag * (upper_price - lower_price) as i128
            } else if base_mag == 0 {
                (quote_mag as f64 / (1.0 / lower_price - 1.0 / upper_price)) as i128
            } else {
                let price = root_price_from_conc_flow(
                    base_mag as f64,
                    quote_mag as f64,
                    bid_tick,
                    ask_tick,
                );
                ((base_mag as f64) / (price - lower_price)) as i128
            }
        }
        .into();
        PoolUpdateEvent {
            block: event.block_height,
            base: event.base,
            quote: event.quote,
            base_flow: event.base_flow,
            quote_flow: event.quote_flow,
            pool_idx: event.pool_idx,
            bid_tick: Some(event.lower_tick),
            ask_tick: Some(event.upper_tick),
            conc_liq,
            is_mint: true,
            is_knockout: true,
            is_bid: event.is_bid,
            is_liq: true,
            ..Default::default()
        }
    }
}

impl From<BurnKnockoutEvent> for PoolUpdateEvent {
    fn from(value: BurnKnockoutEvent) -> Self {
        let ambient_liq = -(value.fee_rewards as i128);
        let conc_liq =
            (((value.base_flow * value.quote_flow) as f64).sqrt() + ambient_liq as f64) as i128;
        PoolUpdateEvent {
            block: value.block_height,
            base: value.base,
            quote: value.quote,
            pool_idx: value.pool_idx,
            bid_tick: Some(value.lower_tick),
            ask_tick: Some(value.upper_tick),
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: ambient_liq.into(),
            conc_liq: conc_liq.into(),
            is_knockout: true,
            is_bid: value.is_bid,
            is_liq: true,
            is_burn: true,
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
            bid_tick: Some(value.lower_tick),
            ask_tick: Some(value.upper_tick),
            base_flow: value.base_flow,
            quote_flow: value.quote_flow,
            ambient_liq: ambient_impact.into(),
            is_knockout: true,
            is_bid: value.is_bid,
            is_liq: true,
            ..Default::default()
        }
    }
}