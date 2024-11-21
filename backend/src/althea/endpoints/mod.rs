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

#[get("/constants")]
pub async fn get_constants(opts: web::Data<Arc<Opts>>) -> impl Responder {
    let constants = FrontendConstants {
        dex: opts.dex_contract.to_string(),
        query: opts.query_contract.to_string(),
        multicall: opts.multicall_contract.to_string(),
        tokens: opts.pool_tokens.iter().map(|t| t.to_string()).collect(),
        templates: opts.pool_templates.iter().map(|t| (*t).into()).collect(),
    };

    HttpResponse::Ok().json(constants)
}
