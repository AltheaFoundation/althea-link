use clarity::{Address, Uint256};
use serde::{Deserialize, Serialize};
use web30::types::Log;

use crate::althea::{
    abi_util::{parse_address, parse_bool, parse_i128, parse_i32, parse_u128, parse_uint256},
    error::AltheaError,
};

/// MintKnockout is an event emitted when a user has created a new one-sided Knockout liquidity position on Ambient
/// using the KnockoutLiqPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct MintKnockoutEvent {
    pub block_height: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub is_bid: bool,
    pub lower_tick: i32,
    pub upper_tick: i32,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct MintKnockoutBytes {
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub is_bid: bool,
    pub lower_tick: i32,
    pub upper_tick: i32,
}
impl MintKnockoutEvent {
    /// Parse multiple logs into MintKnockoutEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<MintKnockoutEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(MintKnockoutEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single MintKnockoutEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<MintKnockoutEvent, AltheaError> {
        // we have three indexed topics so we should find four indexes, the first one being the event's identifier
        // and the three specified indices
        if input.topics.len() < 4 {
            return Err(AltheaError::InvalidEventLogError(
                "Too few topics".to_string(),
            ));
        }
        let user_data = &input.topics[1];
        let base_data = &input.topics[2];
        let quote_data = &input.topics[3];
        let user = parse_address(user_data, 0);
        if let Err(e) = user {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid user address: {}",
                e
            )));
        }
        let user = user.unwrap();

        let base = parse_address(base_data, 0);
        if let Err(e) = base {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid base token address: {}",
                e
            )));
        }
        let base = base.unwrap();
        let quote = parse_address(quote_data, 0);
        if let Err(e) = quote {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid quote token address: {}",
                e
            )));
        }
        let quote = quote.unwrap();
        let block_height = if let Some(bn) = input.block_number {
            bn
        } else {
            return Err(AltheaError::InvalidEventLogError(
                "Log does not have block number, we only search logs already in blocks?"
                    .to_string(),
            ));
        };

        let decoded_bytes = Self::decode_data_bytes(&input.data)?;

        Ok(MintKnockoutEvent {
            block_height,
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
            lower_tick: decoded_bytes.lower_tick,
            upper_tick: decoded_bytes.upper_tick,
            is_bid: decoded_bytes.is_bid,
        })
    }

    /// Decodes the data bytes of MintKnockout
    pub fn decode_data_bytes(input: &[u8]) -> Result<MintKnockoutBytes, AltheaError> {
        if input.len() < 6 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for MintKnockoutBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // base_flow
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_flow
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        // is_bid
        index_start += 32;
        let is_bid = parse_bool(input, index_start);

        // lower_tick
        index_start += 32;
        let lower_tick = parse_i32(input, index_start);

        // upper_tick
        index_start += 32;
        let upper_tick = parse_i32(input, index_start);

        Ok(MintKnockoutBytes {
            pool_idx,
            base_flow,
            quote_flow,
            lower_tick,
            upper_tick,
            is_bid,
        })
    }
}

/// BurnKnockout is an event emitted when a user removes an in-progress one-sided Knockout liquidity position on Ambient
/// using the KnockoutLiqPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct BurnKnockoutEvent {
    pub block_height: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub lower_tick: i32,
    pub upper_tick: i32,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct BurnKnockoutBytes {
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub lower_tick: i32,
    pub upper_tick: i32,
}
impl BurnKnockoutEvent {
    /// Parse multiple logs into BurnKnockoutEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<BurnKnockoutEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(BurnKnockoutEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single BurnKnockoutEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<BurnKnockoutEvent, AltheaError> {
        // we have three indexed topics so we should find four indexes, the first one being the event's identifier
        // and the three specified indices
        if input.topics.len() < 4 {
            return Err(AltheaError::InvalidEventLogError(
                "Too few topics".to_string(),
            ));
        }
        let user_data = &input.topics[1];
        let base_data = &input.topics[2];
        let quote_data = &input.topics[3];
        let user = parse_address(user_data, 0);
        if let Err(e) = user {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid user address: {}",
                e
            )));
        }
        let user = user.unwrap();

        let base = parse_address(base_data, 0);
        if let Err(e) = base {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid base token address: {}",
                e
            )));
        }
        let base = base.unwrap();
        let quote = parse_address(quote_data, 0);
        if let Err(e) = quote {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid quote token address: {}",
                e
            )));
        }
        let quote = quote.unwrap();
        let block_height = if let Some(bn) = input.block_number {
            bn
        } else {
            return Err(AltheaError::InvalidEventLogError(
                "Log does not have block number, we only search logs already in blocks?"
                    .to_string(),
            ));
        };

        let decoded_bytes = Self::decode_data_bytes(&input.data)?;

        Ok(BurnKnockoutEvent {
            block_height,
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
            lower_tick: decoded_bytes.lower_tick,
            upper_tick: decoded_bytes.upper_tick,
        })
    }

    /// Decodes the data bytes of BurnKnockout
    pub fn decode_data_bytes(input: &[u8]) -> Result<BurnKnockoutBytes, AltheaError> {
        if input.len() < 6 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for BurnKnockoutBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // base_flow
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // base_flow
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        // lower_tick
        index_start += 32;
        let lower_tick = parse_i32(input, index_start);

        // upper_tick
        index_start += 32;
        let upper_tick = parse_i32(input, index_start);

        Ok(BurnKnockoutBytes {
            pool_idx,
            base_flow,
            quote_flow,
            lower_tick,
            upper_tick,
        })
    }
}

/// WithdrawKnockout is an event emitted when a user removes a completed Knockout liquidity position on Ambient
/// using the KnockoutLiqPath userCmd. This can be done via claiming the position or by recovering the position,
/// claims give accrued fees to the user while recovers forfeit the fees and return the converted liquidity.
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct WithdrawKnockoutEvent {
    pub block_height: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub lower_tick: i32,
    pub upper_tick: i32,
    pub fee_rewards: u128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct WithdrawKnockoutBytes {
    pub pool_idx: Uint256,
    pub base_flow: i128,
    pub quote_flow: i128,
    pub lower_tick: i32,
    pub upper_tick: i32,
    pub fee_rewards: u128,
}
impl WithdrawKnockoutEvent {
    /// Parse multiple logs into WithdrawKnockoutEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<WithdrawKnockoutEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(WithdrawKnockoutEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single WithdrawKnockoutEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<WithdrawKnockoutEvent, AltheaError> {
        // we have three indexed topics so we should find four indexes, the first one being the event's identifier
        // and the three specified indices
        if input.topics.len() < 4 {
            return Err(AltheaError::InvalidEventLogError(
                "Too few topics".to_string(),
            ));
        }
        let user_data = &input.topics[1];
        let base_data = &input.topics[2];
        let quote_data = &input.topics[3];
        let user = parse_address(user_data, 0);
        if let Err(e) = user {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid user address: {}",
                e
            )));
        }
        let user = user.unwrap();

        let base = parse_address(base_data, 0);
        if let Err(e) = base {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid base token address: {}",
                e
            )));
        }
        let base = base.unwrap();
        let quote = parse_address(quote_data, 0);
        if let Err(e) = quote {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid quote token address: {}",
                e
            )));
        }
        let quote = quote.unwrap();
        let block_height = if let Some(bn) = input.block_number {
            bn
        } else {
            return Err(AltheaError::InvalidEventLogError(
                "Log does not have block number, we only search logs already in blocks?"
                    .to_string(),
            ));
        };

        let decoded_bytes = Self::decode_data_bytes(&input.data)?;

        Ok(WithdrawKnockoutEvent {
            block_height,
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
            lower_tick: decoded_bytes.lower_tick,
            upper_tick: decoded_bytes.upper_tick,
            fee_rewards: decoded_bytes.fee_rewards,
        })
    }

    /// Decodes the data bytes of WithdrawKnockout
    pub fn decode_data_bytes(input: &[u8]) -> Result<WithdrawKnockoutBytes, AltheaError> {
        if input.len() < 6 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for WithdrawKnockoutBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // base_flow
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // base_flow
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        // lower_tick
        index_start += 32;
        let lower_tick = parse_i32(input, index_start);

        // upper_tick
        index_start += 32;
        let upper_tick = parse_i32(input, index_start);

        // fee_rewards
        index_start += 32;
        let fee_rewards = parse_u128(input, index_start);

        Ok(WithdrawKnockoutBytes {
            pool_idx,
            base_flow,
            quote_flow,
            lower_tick,
            upper_tick,
            fee_rewards,
        })
    }
}
