use clarity::{Address, Uint256};
use serde::{Deserialize, Serialize};
use web30::types::Log;

use crate::althea::{
    abi_util::{parse_address, parse_i128, parse_i32, parse_u128, parse_uint256},
    error::AltheaError,
};

/// MintRanged is an event emitted when a user has created a new Concentrated liquidity position on Ambient
/// using the WarmPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct MintRangedEvent {
    pub block_height: Uint256,
    pub index: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct MintRangedBytes {
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}
impl MintRangedEvent {
    /// Parse multiple logs into MintRangedEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<MintRangedEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(MintRangedEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single MintRangedEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<MintRangedEvent, AltheaError> {
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

        Ok(MintRangedEvent {
            block_height,
            index: input.log_index.unwrap_or_default(),
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            bid_tick: decoded_bytes.bid_tick,
            ask_tick: decoded_bytes.ask_tick,
            liq: decoded_bytes.liq,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of MintRanged
    pub fn decode_data_bytes(input: &[u8]) -> Result<MintRangedBytes, AltheaError> {
        if input.len() < 6 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for MintRangedBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // liq
        index_start += 32;
        let liq = parse_u128(input, index_start);

        // bid_tick
        index_start += 32;
        let bid_tick = parse_i32(input, index_start);

        // ask_tick
        index_start += 32;
        let ask_tick = parse_i32(input, index_start);

        // base_qty
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_qty
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(MintRangedBytes {
            pool_idx,
            liq,
            bid_tick,
            ask_tick,
            base_flow,
            quote_flow,
        })
    }
}

/// BurnRanged is an event emitted when a user has terminated a  Concentrated liquidity position on Ambient
/// using the WarmPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct BurnRangedEvent {
    pub block_height: Uint256,
    pub index: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct BurnRangedBytes {
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}
impl BurnRangedEvent {
    /// Parse multiple logs into BurnRangedEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<BurnRangedEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(BurnRangedEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single BurnRangedEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<BurnRangedEvent, AltheaError> {
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

        Ok(BurnRangedEvent {
            block_height,
            index: input.log_index.unwrap_or_default(),
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            bid_tick: decoded_bytes.bid_tick,
            ask_tick: decoded_bytes.ask_tick,
            liq: decoded_bytes.liq,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of BurnRanged
    pub fn decode_data_bytes(input: &[u8]) -> Result<BurnRangedBytes, AltheaError> {
        if input.len() < 6 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for BurnRangedBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // liq
        index_start += 32;
        let liq = parse_u128(input, index_start);

        // bid_tick
        index_start += 32;
        let bid_tick = parse_i32(input, index_start);

        // ask_tick
        index_start += 32;
        let ask_tick = parse_i32(input, index_start);

        // base_qty
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_qty
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(BurnRangedBytes {
            pool_idx,
            liq,
            bid_tick,
            ask_tick,
            base_flow,
            quote_flow,
        })
    }
}

/// Harvest is an event emitted when a user collects rewards on a Concentrated liquidity position on Ambient
/// using the WarmPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct HarvestEvent {
    pub block_height: Uint256,
    pub index: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub base_flow: i128,
    pub quote_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct HarvestBytes {
    pub pool_idx: Uint256,
    pub bid_tick: i32,
    pub ask_tick: i32,
    pub base_flow: i128,
    pub quote_flow: i128,
}
impl HarvestEvent {
    /// Parse multiple logs into HarvestEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<HarvestEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(HarvestEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single HarvestEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<HarvestEvent, AltheaError> {
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

        Ok(HarvestEvent {
            block_height,
            index: input.log_index.unwrap_or_default(),
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            bid_tick: decoded_bytes.bid_tick,
            ask_tick: decoded_bytes.ask_tick,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of Harvest
    pub fn decode_data_bytes(input: &[u8]) -> Result<HarvestBytes, AltheaError> {
        if input.len() < 5 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for HarvestBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // bid_tick
        index_start += 32;
        let bid_tick = parse_i32(input, index_start);

        // ask_tick
        index_start += 32;
        let ask_tick = parse_i32(input, index_start);

        // base_qty
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_qty
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(HarvestBytes {
            pool_idx,
            bid_tick,
            ask_tick,
            base_flow,
            quote_flow,
        })
    }
}
/// MintAmbient is an event emitted when a user has created a new full-range (ambient) liquidity position on Ambient
/// using the WarmPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct MintAmbientEvent {
    pub block_height: Uint256,
    pub index: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct MintAmbientBytes {
    pub pool_idx: Uint256,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}
impl MintAmbientEvent {
    /// Parse multiple logs into MintAmbientEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<MintAmbientEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(MintAmbientEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single MintAmbientEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<MintAmbientEvent, AltheaError> {
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

        Ok(MintAmbientEvent {
            block_height,
            index: input.log_index.unwrap_or_default(),
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            liq: decoded_bytes.liq,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of MintAmbient
    pub fn decode_data_bytes(input: &[u8]) -> Result<MintAmbientBytes, AltheaError> {
        if input.len() < 4 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for MintAmbientBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // liq
        index_start += 32;
        let liq = parse_u128(input, index_start);

        // base_qty
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_qty
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(MintAmbientBytes {
            pool_idx,
            liq,
            base_flow,
            quote_flow,
        })
    }
}

/// BurnAmbient is an event emitted when a user has terminated a full-range (ambient) liquidity position on Ambient
/// using the WarmPath userCmd
/// Note: This event was added to our fork to avoid the need to analyze ethereum traces to find function calls
#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct BurnAmbientEvent {
    pub block_height: Uint256,
    pub index: Uint256,
    pub user: Address,
    pub base: Address,
    pub quote: Address,
    pub pool_idx: Uint256,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct BurnAmbientBytes {
    pub pool_idx: Uint256,
    pub liq: u128,
    pub base_flow: i128,
    pub quote_flow: i128,
}
impl BurnAmbientEvent {
    /// Parse multiple logs into BurnAmbientEvents
    pub fn from_logs(input: &[Log]) -> Result<Vec<BurnAmbientEvent>, AltheaError> {
        let mut res = Vec::new();
        for item in input {
            res.push(BurnAmbientEvent::from_log(item)?);
        }
        Ok(res)
    }

    // Parse a single BurnAmbientEvent from a Log - this must decode the data bytes as well, not just the indexed topics
    pub fn from_log(input: &Log) -> Result<BurnAmbientEvent, AltheaError> {
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

        Ok(BurnAmbientEvent {
            block_height,
            index: input.log_index.unwrap_or_default(),
            user,
            base,
            quote,
            pool_idx: decoded_bytes.pool_idx,
            liq: decoded_bytes.liq,
            base_flow: decoded_bytes.base_flow,
            quote_flow: decoded_bytes.quote_flow,
        })
    }

    /// Decodes the data bytes of BurnAmbient
    pub fn decode_data_bytes(input: &[u8]) -> Result<BurnAmbientBytes, AltheaError> {
        if input.len() < 4 * 32 {
            return Err(AltheaError::InvalidEventLogError(
                "too short for BurnAmbientBytes".to_string(),
            ));
        }
        // all the data is static, so each field is in a 32 byte slice (per abi-encoding)

        // poolIdx
        let mut index_start = 0;
        let pool_idx = parse_uint256(input, index_start);

        // liq
        index_start += 32;
        let liq = parse_u128(input, index_start);

        // base_qty
        index_start += 32;
        let base_flow = parse_i128(input, index_start);

        // quote_qty
        index_start += 32;
        let quote_flow = parse_i128(input, index_start);

        Ok(BurnAmbientBytes {
            pool_idx,
            liq,
            base_flow,
            quote_flow,
        })
    }
}
