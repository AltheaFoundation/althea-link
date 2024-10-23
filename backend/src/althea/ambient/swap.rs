use clarity::{Address, Uint256};
use serde::{Deserialize, Serialize};
use web30::types::Log;

use crate::althea::{
    abi_util::{parse_address, parse_i128, parse_u128, parse_uint256},
    error::AltheaError,
};

/// Swap is an event emitted when a user performs a swap on Ambient
/// using userCmd on the CrocSwapDex, HotProxy, or LongPath
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct SwapEvent {
    pub block_height: Uint256,
    pub user: Address,
    pub buy: Address,
    pub sell: Address,
    pub pool_idx: Uint256,
    pub qty: u128,
    pub buy_flow: i128,
    pub sell_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct SwapBytes {
    pub pool_idx: Uint256,
    pub qty: u128,
    pub buy_flow: i128,
    pub sell_flow: i128,
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
        let buy_data = &input.topics[2];
        let sell_data = &input.topics[3];
        let user = parse_address(user_data, 0);
        if let Err(e) = user {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid user address: {}",
                e
            )));
        }
        let user = user.unwrap();

        let buy = parse_address(buy_data, 0);
        if let Err(e) = buy {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid buy token address: {}",
                e
            )));
        }
        let buy = buy.unwrap();
        let sell = parse_address(sell_data, 0);
        if let Err(e) = sell {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Invalid sell token address: {}",
                e
            )));
        }
        let sell = sell.unwrap();
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
            user,
            buy,
            sell,
            pool_idx: decoded_bytes.pool_idx,
            qty: decoded_bytes.qty,
            buy_flow: decoded_bytes.buy_flow,
            sell_flow: decoded_bytes.sell_flow,
        })
    }

    /// Decodes the data bytes of Swap
    pub fn decode_data_bytes(input: &[u8]) -> Result<SwapBytes, AltheaError> {
        if input.len() < 6 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for SwapBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // qty
        index_start += 32;
        let qty = parse_u128(input, index_start);

        // buy_flow
        index_start += 32;
        let buy_flow = parse_i128(input, index_start);

        // sell_flow
        index_start += 32;
        let sell_flow = parse_i128(input, index_start);

        Ok(SwapBytes {
            pool_idx,
            qty,
            buy_flow,
            sell_flow,
        })
    }
}
