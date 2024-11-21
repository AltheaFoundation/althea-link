use crate::althea::cosmos::{
    delegations::fetch_delegations,
    governance::{fetch_proposals, fetch_proposals_filtered},
    staking::fetch_staking_info,
    validators::{fetch_validator_by_address, fetch_validators_filtered},
};
use actix_web::{
    get,
    web::{self},
    HttpResponse, Responder,
};

use deep_space::Address as CosmosAddress;
use deep_space::Contact;
use log::error;
use log::info;
use rocksdb::DB;
use serde::Deserialize;

use std::sync::Arc;

#[derive(Deserialize)]
pub struct ValidatorQuery {
    active: Option<bool>,
    #[serde(rename = "operatorAddress")]
    operator_address: Option<String>,
}

/// Retrieves validators from the Althea chain
///
/// # Query Parameters
///
/// - `active` (optional): Filter validators by their active status
///   - `?active=true` - Returns only active validators
///   - `?active=false` - Returns only inactive validators
///   - `?operatorAddress=althea...` - Returns only the validator with the given operator address
///   - If omitted, returns all validators regardless of status
///
/// # Response
///
/// Returns a JSON array of validator information. If no validators are found matching
/// the criteria, returns a 404 Not Found response.
///
/// # Examples
///
/// - `GET /validators` - Returns all validators
/// - `GET /validators?active=true` - Returns only active validators
/// - `GET /validators?active=false` - Returns only inactive validators
/// - `GET /validators?operatorAddress=althea...` - Returns only the validator with the given operator address
#[get("/validators")]
pub async fn get_validators(
    query: web::Query<ValidatorQuery>,
    db: web::Data<Arc<DB>>,
    contact: web::Data<Arc<Contact>>,
) -> impl Responder {
    info!(
        "Querying validators with filter - active: {:?}, operator_address: {:?}",
        query.active, query.operator_address
    );

    // If operator_address is provided, fetch specific validator
    if let Some(addr) = &query.operator_address {
        match fetch_validator_by_address(&db, &contact, addr).await {
            Ok(Some(validator)) => return HttpResponse::Ok().json(vec![validator]),
            Ok(None) => return HttpResponse::NotFound().body("Validator not found"),
            Err(e) => {
                error!("Error getting validator: {}", e);
                return HttpResponse::InternalServerError().finish();
            }
        }
    }

    // Otherwise use existing logic for filtered validators
    match fetch_validators_filtered(&db, &contact, query.active).await {
        Ok(validators) => {
            if validators.is_empty() {
                HttpResponse::NotFound().body("No validators found")
            } else {
                HttpResponse::Ok().json(validators)
            }
        }
        Err(e) => {
            error!("Error getting validators: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct ProposalQuery {
    status: Option<i32>,
    active: Option<bool>,
}

/// Retrieves proposals from the Althea chain
///
/// # Query Parameters
///
/// You can filter proposals using either `status` or `active` parameter (but not both):
///
/// - `status` (optional): Filter proposals by their status code
///   - `0` - Unspecified
///   - `1` - Deposit Period
///   - `2` - Voting Period
///   - `3` - Passed
///   - `4` - Rejected
///   - `5` - Failed
///
/// - `active` (optional): Filter proposals by their active status
///   - `?active=true` - Returns only active proposals (in deposit or voting period)
///   - `?active=false` - Returns only inactive proposals (passed, rejected, or failed)
///   - If omitted, returns all proposals
///
/// # Response
///
/// Returns a JSON array of proposal information. If no proposals are found matching
/// the criteria, returns a 404 Not Found response.
///
/// # Examples
///
/// - `GET /proposals` - Returns all proposals
/// - `GET /proposals?active=true` - Returns only active proposals
/// - `GET /proposals?active=false` - Returns only inactive proposals
/// - `GET /proposals?status=1` - Returns only proposals in deposit period
/// - `GET /proposals?status=2` - Returns only proposals in voting period
/// - `GET /proposals?status=3` - Returns only passed proposals
/// - `GET /proposals?status=4` - Returns only rejected proposals
/// - `GET /proposals?status=5` - Returns only failed proposals
#[get("/proposals")]
pub async fn get_proposals(
    query: web::Query<ProposalQuery>,
    db: web::Data<Arc<DB>>,
    contact: web::Data<Arc<Contact>>,
) -> impl Responder {
    info!(
        "Querying proposals with filters - status: {:?}, active: {:?}",
        query.status, query.active
    );

    let result = if query.status.is_some() {
        match fetch_proposals(&db, &contact).await {
            Ok(proposals) => Ok(proposals
                .into_iter()
                .filter(|p| p.status_value == query.status.unwrap())
                .collect::<Vec<_>>()),
            Err(e) => Err(e),
        }
    } else {
        fetch_proposals_filtered(&db, &contact, query.active).await
    };

    match result {
        Ok(proposals) => {
            if proposals.is_empty() {
                HttpResponse::NotFound().body("No proposals found")
            } else {
                HttpResponse::Ok().json(proposals)
            }
        }
        Err(e) => {
            error!("Error getting proposals: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[derive(Deserialize)]
pub struct DelegatorQuery {
    address: String,
}

/// Retrieves delegations for a specific address
///
/// # Query Parameters
///
/// - `address`: The delegator's address to query delegations for
///
/// # Response
///
/// Returns a JSON array of delegation information including validator addresses
/// and delegation amounts. If no delegations are found, returns a 404 Not Found response.
///
/// # Example
///
/// - `GET /delegations?address=althea1...` - Returns all delegations for the specified address
#[get("/delegations")]
pub async fn get_delegations(
    query: web::Query<DelegatorQuery>,
    db: web::Data<Arc<DB>>,
    contact: web::Data<Arc<Contact>>,
) -> impl Responder {
    info!("Querying delegations for address: {}", query.address);

    let delegator_address = match CosmosAddress::from_bech32(query.address.clone()) {
        Ok(addr) => addr,
        Err(e) => {
            error!("Invalid address format: {}", e);
            return HttpResponse::BadRequest().body("Invalid address format");
        }
    };

    match fetch_delegations(&db, &contact, delegator_address).await {
        Ok(response) => {
            if response.delegations.is_empty() {
                HttpResponse::Ok().json(serde_json::json!({
                    "delegations": null,
                    "unbondingDelegations": null,
                    "rewards": {
                        "rewards": [],
                        "total": []
                    }
                }))
            } else {
                HttpResponse::Ok().json(response)
            }
        }
        Err(e) => {
            error!("Error fetching delegations: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

/// Retrieves the apr from the Cosmos staking layer
///
/// # Query
///
/// A simple GET request
///
/// # Response
///
/// Returns a JSON object with the following fields:
///
/// - `apr`: The current annual percentage rate for staking rewards
/// - `last_updated`: The timestamp of the last APR update
#[get("/apr")]
pub async fn get_staking_info(db: web::Data<Arc<DB>>) -> impl Responder {
    info!("Fetching staking info");
    match fetch_staking_info(&db).await {
        Ok(info) => HttpResponse::Ok().json(info),
        Err(e) => {
            error!("Error fetching staking info: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
