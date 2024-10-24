use clarity::{Address, Uint256};
use serde::{Deserialize, Serialize};
use web30::types::Log;

use crate::althea::{
    abi_util::{parse_address, parse_i128, parse_u128, parse_u16, parse_u8},
    error::AltheaError,
};

/// InitPool is an event emitted when a user has created a new pool on Ambient using the ColdPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct InitPoolEvent {
    pub block_height: Uint256,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub creator: Address,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

// InitPoolEvents have indexed topics and unindexed data bytes. This struct represents solely the unindexed data
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct InitPoolBytes {
    pub price: u128,
    pub user: Address,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

impl InitPoolEvent {
    /// Parse multiple logs into InitPoolEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<InitPoolEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(InitPoolEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single InitPoolEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<InitPoolEvent, AltheaError> {
        // we have three indexed topics so we should find four indexes, the first one being the event's identifier
        // and the three specified indices
        if input.topics.len() < 4 {
            return Err(AltheaError::InvalidEventLogError(
                "Too few topics".to_string(),
            ));
        }
        let base_data = &input.topics[1];
        let quote_data = &input.topics[2];
        let pool_idx_data = &input.topics[3];
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
        let pool_idx = Uint256::from_be_bytes(pool_idx_data);
        let block_height = if let Some(bn) = input.block_number {
            bn
        } else {
            return Err(AltheaError::InvalidEventLogError(
                "Log does not have block number, we only search logs already in blocks?"
                    .to_string(),
            ));
        };

        let decoded_bytes = Self::decode_data_bytes(&input.data)?;

        Ok(InitPoolEvent {
            block_height,
            base,
            quote,
            pool_idx,
            creator: decoded_bytes.user,
            liq: decoded_bytes.liq,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of InitPool
    pub fn decode_data_bytes(input: &[u8]) -> Result<InitPoolBytes, AltheaError> {
        if input.len() < 5 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for InitPoolBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // price
        let mut index_start = 0;
        let price = parse_u128(input, index_start);

        // user
        index_start += 32;
        let user = parse_address(input, index_start);
        if let Err(e) = user {
            return Err(AltheaError::InvalidEventLogError(format!(
                "Bad user address, probably incorrect parsing {:?}",
                e
            )));
        }
        let user = user.unwrap();

        // liq
        index_start += 32;
        let liq: u128 = parse_u128(input, index_start);

        // base_flow
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_flow
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(InitPoolBytes {
            price,
            user,
            liq,
            base_flow,
            quote_flow,
        })
    }
}

/// PoolRevision is an event emitted a pool on Ambient has its specs updated
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct PoolRevisionEvent {
    pub block_height: Uint256,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub fee_rate: u16,
    pub tick_size: u16,
    pub jit_thresh: u8,
    pub knockout: u8,
}

// PoolRevisionEvents have indexed topics and unindexed data bytes. This struct represents solely the unindexed data
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct PoolRevisionBytes {
    pub fee_rate: u16,
    pub tick_size: u16,
    pub jit_thresh: u8,
    pub knockout: u8,
}

impl PoolRevisionEvent {
    /// Parse multiple logs into PoolRevisionEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<PoolRevisionEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(PoolRevisionEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single PoolRevisioneEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<PoolRevisionEvent, AltheaError> {
        // we have three indexed topics so we should find four indexes, the first one being the event's identifier
        // and the three specified indices
        if input.topics.len() < 4 {
            return Err(AltheaError::InvalidEventLogError(
                "Too few topics".to_string(),
            ));
        }
        let base_data = &input.topics[1];
        let quote_data = &input.topics[2];
        let pool_idx_data = &input.topics[3];
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
        let pool_idx = Uint256::from_be_bytes(pool_idx_data);
        let block_height = if let Some(bn) = input.block_number {
            bn
        } else {
            return Err(AltheaError::InvalidEventLogError(
                "Log does not have block number, we only search logs already in blocks?"
                    .to_string(),
            ));
        };

        let decoded_bytes = Self::decode_data_bytes(&input.data)?;

        Ok(PoolRevisionEvent {
            block_height,
            base,
            quote,
            pool_idx,
            fee_rate: decoded_bytes.fee_rate,
            tick_size: decoded_bytes.tick_size,
            jit_thresh: decoded_bytes.jit_thresh,
            knockout: decoded_bytes.knockout,
        })
    }

    /// Decodes the data bytes of ResyncTakeRate
    pub fn decode_data_bytes(input: &[u8]) -> Result<PoolRevisionBytes, AltheaError> {
        if input.len() < 5 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for PoolRevisionBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // fee_rate
        let mut index_start = 0;
        let fee_rate = parse_u16(input, index_start);

        // tick_size
        index_start += 32;
        let tick_size = parse_u16(input, index_start);

        // jit_thresh
        index_start += 32;
        let jit_thresh = parse_u8(input, index_start);

        // knockout
        index_start += 32;
        let knockout = parse_u8(input, index_start);

        Ok(PoolRevisionBytes {
            fee_rate,
            tick_size,
            jit_thresh,
            knockout,
        })
    }
}
