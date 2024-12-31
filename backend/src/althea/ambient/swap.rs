use clarity::{Address, Uint256};
use serde::{Deserialize, Serialize};
use web30::types::Log;

use crate::althea::{
    abi_util::{parse_address, parse_bool, parse_i128, parse_u128, parse_uint256},
    error::AltheaError,
};

/// Swap is an event emitted when a user performs a swap on Ambient
/// using userCmd on the CrocSwapDex, HotProxy, or LongPath
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct SwapEvent {
    pub block_height: Uint256,
    pub index: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub is_buy: bool,
    pub in_base_qty: bool,
    pub qty: u128,
    pub min_output: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct SwapBytes {
    pub pool_idx: Uint256,
    pub is_buy: bool,
    pub in_base_qty: bool,
    pub qty: u128,
    pub min_output: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}
impl SwapEvent {
    /// Parse multiple logs into SwapEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<SwapEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(SwapEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single SwapEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<SwapEvent, AltheaError> {
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

        Ok(SwapEvent {
            block_height,
            index: input.log_index.unwrap_or_default(),
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            is_buy: decoded_bytes.is_buy,
            in_base_qty: decoded_bytes.in_base_qty,
            qty: decoded_bytes.qty,
            min_output: decoded_bytes.min_output,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of Swap
    pub fn decode_data_bytes(input: &[u8]) -> Result<SwapBytes, AltheaError> {
        if input.len() < 3 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for SwapBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // pool_idx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // is_buy: bool,
        index_start += 32;
        let is_buy = parse_bool(input, index_start);

        // in_base_qty: bool,
        index_start += 32;
        let in_base_qty = parse_bool(input, index_start);

        // qty: u128,
        index_start += 32;
        let qty = parse_u128(input, index_start);

        // min_output: u128,
        index_start += 32;
        let min_output = parse_u128(input, index_start);

        // base_flow: i128,
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_flow: i128,
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(SwapBytes {
            pool_idx,
            is_buy,
            in_base_qty,
            qty,
            min_output,
            base_flow,
            quote_flow,
        })
    }
}
