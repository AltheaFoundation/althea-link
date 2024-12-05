use std::sync::Arc;

use actix_web::{get, web, HttpResponse, Responder};
use clarity::Uint256;
use serde::{Deserialize, Serialize};

use crate::Opts;

pub mod ambient;
pub mod cosmos;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FrontendConstants {
    pub dex: String,
    pub query: String,
    pub multicall: String,
    pub tokens: Vec<String>,
    pub templates: Vec<Uint256>,
}

/// Returns all the constants that the frontend needs from one convenient endpoint
///
/// # Query
///
/// A simple GET request
///
/// # Response
///
/// Returns a JSON object with the following fields:
///
/// - `dex`: The address of the CrocSwapDEX contract
/// - `query`: The address of the CrocQuery contract
/// - `multicall`: The address of the Multicall3 contract
/// - `tokens`: A list of the ERC20 tokens for which pools have been deployed
/// - `templates`: A list of the poolIdx values for which pool templates exist
#[get("/constants")]
pub async fn get_constants(opts: web::Data<Opts>) -> impl Responder {
    let constants = FrontendConstants {
        dex: opts.dex_contract.to_string(),
        query: opts.query_contract.to_string(),
        multicall: opts.multicall_contract.to_string(),
        tokens: opts.pool_tokens.iter().map(|t| t.to_string()).collect(),
        templates: opts.pool_templates.iter().map(|t| (*t).into()).collect(),
    };

    HttpResponse::Ok().json(constants)
}
