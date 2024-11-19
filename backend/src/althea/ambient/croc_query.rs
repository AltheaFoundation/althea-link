// This file concerns the latest data fetched by invoking the CrocQuery contract

use std::str::FromStr;

use clarity::{abi::encode_call, Address, Uint256};
use serde::{Deserialize, Serialize};
use web30::{client::Web3, types::TransactionRequest};

use crate::althea::{
    abi_util::{parse_u128, parse_u16, parse_u64, parse_u8},
    database::pools::Pool,
    error::AltheaError,
    DEFAULT_QUERIER,
};

// @notice Queries and returns the current state of a liquidity curve for a given pool.
// @param base The base token address
// @param quote The quote token address
// @param poolIdx The pool index
//
// @return The CurveState struct of the underlying pool. */
// function queryCurve (address base, address quote, uint256 poolIdx)
//     public view returns (CurveMath.CurveState memory curve) {
pub const QUERY_CURVE_SIG: &str = "queryCurve(address,address,uint256)";

//    struct CurveState {
//     uint128 priceRoot_;
//     uint128 ambientSeeds_;
//     uint128 concLiq_;
//     uint64 seedDeflator_;
//     uint64 concGrowth_;
// }
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct CurveState {
    pub price_root: u128,
    pub ambient_seeds: u128,
    pub conc_liq: u128,
    pub seed_deflator: u64,
    pub conc_growth: u64,
}

pub async fn get_curve(
    web30: &Web3,
    croc_query: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Result<CurveState, AltheaError> {
    let curve_res = web30
        .simulate_transaction(
            TransactionRequest::quick_tx(
                Address::from_str(DEFAULT_QUERIER).unwrap(),
                croc_query,
                encode_call(
                    QUERY_CURVE_SIG,
                    &[base.into(), quote.into(), pool_idx.into()],
                )?,
            ),
            None,
        )
        .await?;
    let curve = CurveState::from_abi(&curve_res);
    Ok(curve)
}

impl CurveState {
    pub fn from_abi(input: &[u8]) -> Self {
        // The CurveState struct is static, so we can treat the response as its contents being returned directly
        let mut index_start = 0;
        let price_root = parse_u128(input, index_start);
        index_start += 32;
        let ambient_seeds = parse_u128(input, index_start);
        index_start += 32;
        let conc_liq = parse_u128(input, index_start);
        index_start += 32;
        let seed_deflator = parse_u64(input, index_start);
        index_start += 32;
        let conc_growth = parse_u64(input, index_start);

        Self {
            price_root,
            ambient_seeds,
            conc_liq,
            seed_deflator,
            conc_growth,
        }
    }

    pub fn is_zero(&self) -> bool {
        self.price_root == 0
            && self.ambient_seeds == 0
            && self.conc_liq == 0
            && self.seed_deflator == 0
            && self.conc_growth == 0
    }
}

// @notice Queries and returns the total liquidity currently active on the pool's curve
// @param base The base token address
// @param quote The quote token address
// @param poolIdx The pool index
// @return The total sqrt(X*Y) liquidity currently active in the pool */
// function queryLiquidity (address base, address quote, uint256 poolIdx)
//     public view returns (uint128) {
pub const QUERY_LIQUIDITY_SIG: &str = "queryLiquidity(address,address,uint256)";
pub async fn get_liquidity(
    web30: &Web3,
    croc_query: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Result<u128, AltheaError> {
    let liq_res = web30
        .simulate_transaction(
            TransactionRequest::quick_tx(
                Address::from_str(DEFAULT_QUERIER).unwrap(),
                croc_query,
                encode_call(
                    QUERY_LIQUIDITY_SIG,
                    &[base.into(), quote.into(), pool_idx.into()],
                )?,
            ),
            None,
        )
        .await?;
    Ok(parse_u128(&liq_res, 0))
}
// @notice Queries and returns the current price of the pool's curve
// @param base The base token address
// @param quote The quote token address
// @param poolIdx The pool index
// @return Q64.64 square root price of the pool */
// function queryPrice (address base, address quote, uint256 poolIdx)
//     public view returns (uint128) {
pub const QUERY_PRICE_SIG: &str = "queryPrice(address,address,uint256)";
pub async fn get_price(
    web30: &Web3,
    croc_query: Address,
    base: Address,
    quote: Address,
    pool_idx: Uint256,
) -> Result<u128, AltheaError> {
    let price_res = web30
        .simulate_transaction(
            TransactionRequest::quick_tx(
                Address::from_str(DEFAULT_QUERIER).unwrap(),
                croc_query,
                encode_call(
                    QUERY_PRICE_SIG,
                    &[base.into(), quote.into(), pool_idx.into()],
                )?,
            ),
            None,
        )
        .await?;
    Ok(parse_u128(&price_res, 0))
}

// function queryPoolTemplate (uint256 poolIdx) public view returns (PoolSpecs.Pool memory pool)
// struct Pool {
//      uint8 schema_;
//      uint16 feeRate_;
//      uint8 protocolTake_;
//      uint16 tickSize_;
//      uint8 jitThresh_;
//      uint8 knockoutBits_;
//      uint8 oracleFlags_;
//  }
pub const QUERY_TEMPLATE_SIG: &str = "queryPoolTemplate(uint256)";

pub async fn get_template(
    web30: &Web3,
    croc_query: Address,
    pool_idx: Uint256,
) -> Result<Pool, AltheaError> {
    let template_res = web30
        .simulate_transaction(
            TransactionRequest::quick_tx(
                Address::from_str(DEFAULT_QUERIER).unwrap(),
                croc_query,
                encode_call(QUERY_TEMPLATE_SIG, &[pool_idx.into()])?,
            ),
            None,
        )
        .await?;

    let mut start: usize = 0;
    let schema = parse_u8(&template_res, start);
    start += 32;
    let fee_rate = parse_u16(&template_res, start);
    start += 32;
    let protocol_take = parse_u8(&template_res, start);
    start += 32;
    let tick_size = parse_u16(&template_res, start);
    start += 32;
    let jit_thresh = parse_u8(&template_res, start);
    start += 32;
    let knockout_bits = parse_u8(&template_res, start);
    start += 32;
    let oracle_flags = parse_u8(&template_res, start);
    Ok(Pool {
        schema,
        fee_rate,
        protocol_take,
        tick_size,
        jit_thresh,
        knockout_bits,
        oracle_flags,
    })
}
