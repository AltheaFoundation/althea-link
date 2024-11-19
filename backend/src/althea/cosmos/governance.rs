use bincode;
use chrono;
use cosmos_sdk_proto_althea::cosmos::base::query::v1beta1::PageRequest;
use cosmos_sdk_proto_althea::cosmos::distribution::v1beta1::CommunityPoolSpendProposal;
use cosmos_sdk_proto_althea::cosmos::gov::v1beta1::TextProposal;
use cosmos_sdk_proto_althea::cosmos::gov::v1beta1::{Proposal, QueryProposalsRequest};
use cosmos_sdk_proto_althea::cosmos::params::v1beta1::ParameterChangeProposal;
use cosmos_sdk_proto_althea::cosmos::upgrade::v1beta1::{
    CancelSoftwareUpgradeProposal, SoftwareUpgradeProposal,
};
use cosmos_sdk_proto_althea::ibc::core::client::v1::ClientUpdateProposal;

use deep_space::utils::decode_any;
use deep_space::Contact;
use log::{error, info};
use prost_types::Any;
use rocksdb::DB;
use serde::{Deserialize, Serialize};

use crate::althea::CACHE_DURATION;

use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::sleep;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProposalInfo {
    pub proposal_id: u64,
    pub content: Option<ProposalContent>,
    pub status: i32,
    pub final_tally_result: Option<TallyResult>,
    pub submit_time: Option<String>,
    pub deposit_end_time: Option<String>,
    pub total_deposit: Vec<String>,
    pub voting_start_time: Option<String>,
    pub voting_end_time: Option<String>,
    pub last_updated: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProposalContent {
    pub type_url: String,
    pub title: String,
    pub description: String,
    pub changes: Option<Vec<ParamChange>>,
    pub recipient: Option<String>,
    pub amount: Option<Vec<Coin>>,
    pub plan: Option<UpgradePlan>,
    pub subject_client_id: Option<String>,
    pub substitute_client_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TallyResult {
    pub yes: String,
    pub abstain: String,
    pub no: String,
    pub no_with_veto: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParamChange {
    pub subspace: String,
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpgradePlan {
    pub name: String,
    pub height: i64,
    pub info: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerializableTextProposal {
    pub title: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerializableParameterChangeProposal {
    pub title: String,
    pub description: String,
    pub changes: Vec<ParamChange>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coin {
    pub amount: String,
    pub denom: String,
}

impl ProposalInfo {
    pub fn is_active(&self) -> bool {
        self.status == 2
    }
}

pub async fn fetch_proposals(
    db: &rocksdb::DB,
    contact: &deep_space::Contact,
) -> Result<Vec<ProposalInfo>, Box<dyn std::error::Error>> {
    info!("Fetching proposals");
    let cached = get_cached_proposals(db);
    if let Some(proposals) = cached {
        return Ok(proposals);
    }

    let request = QueryProposalsRequest {
        proposal_status: 0,
        voter: String::new(),
        depositor: String::new(),
        pagination: Some(PageRequest {
            key: Vec::new(),
            offset: 0,
            limit: 1000,
            count_total: true,
            reverse: false,
        }),
    };

    let proposals = contact.get_governance_proposals(request).await?;
    let all_proposals: Vec<ProposalInfo> = proposals
        .proposals
        .into_iter()
        .map(ProposalInfo::from)
        .collect();

    cache_proposals(db, &all_proposals);
    info!(
        "Successfully fetched and stored {} proposals",
        all_proposals.len()
    );
    Ok(all_proposals)
}

fn get_cached_proposals(db: &rocksdb::DB) -> Option<Vec<ProposalInfo>> {
    const PROPOSALS_CACHE_KEY: &[u8] = b"proposals";
    match db.get(PROPOSALS_CACHE_KEY).unwrap() {
        Some(data) => {
            let proposals: Vec<ProposalInfo> = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Cache for 5 minutes
            if now - proposals[0].last_updated < CACHE_DURATION {
                Some(proposals)
            } else {
                None
            }
        }
        None => None,
    }
}

fn cache_proposals(db: &rocksdb::DB, proposals: &[ProposalInfo]) {
    let key = b"proposals";
    let encoded = bincode::serialize(proposals).unwrap();
    db.put(key, encoded).unwrap();
}

// This enum is just used internally for decoding
enum ProposalContentType {
    TextProposal(TextProposal),
    ParameterChangeProposal(ParameterChangeProposal),
    CancelSoftwareUpgradeProposal(CancelSoftwareUpgradeProposal),
    CommunityPoolSpendProposal(CommunityPoolSpendProposal),
    SoftwareUpgradeProposal(SoftwareUpgradeProposal),
    ClientUpdateProposal(ClientUpdateProposal),
}

fn decode_proposal_content(input: Any) -> ProposalContentType {
    match input.type_url.as_str() {
        "/cosmos.params.v1beta1.ParameterChangeProposal" => {
            ProposalContentType::ParameterChangeProposal(decode_any(input).unwrap())
        }
        "/cosmos.gov.v1beta1.TextProposal" => {
            ProposalContentType::TextProposal(decode_any(input).unwrap())
        }
        "/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal" => {
            ProposalContentType::CancelSoftwareUpgradeProposal(decode_any(input).unwrap())
        }
        "/cosmos.distribution.v1beta1.CommunityPoolSpendProposal" => {
            ProposalContentType::CommunityPoolSpendProposal(decode_any(input).unwrap())
        }
        "/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal" => {
            ProposalContentType::SoftwareUpgradeProposal(decode_any(input).unwrap())
        }
        "/ibc.core.client.v1.ClientUpdateProposal" => {
            ProposalContentType::ClientUpdateProposal(decode_any(input).unwrap())
        }
        _ => {
            panic!("Unknown proposal content type: {}", input.type_url);
        }
    }
}

impl From<Proposal> for ProposalInfo {
    fn from(p: Proposal) -> Self {
        let content = p.content.map(|c| {
            let type_url = c.type_url.clone();
            let decoded = decode_proposal_content(c.clone());
            match decoded {
                ProposalContentType::TextProposal(text) => ProposalContent {
                    type_url,
                    title: text.title,
                    description: text.description,
                    changes: None,
                    recipient: None,
                    amount: None,
                    plan: None,
                    subject_client_id: None,
                    substitute_client_id: None,
                },
                ProposalContentType::ParameterChangeProposal(param) => ProposalContent {
                    type_url,
                    title: param.title,
                    description: param.description,
                    changes: Some(
                        param
                            .changes
                            .into_iter()
                            .map(|c| ParamChange {
                                subspace: c.subspace,
                                key: c.key,
                                value: c.value,
                            })
                            .collect(),
                    ),
                    recipient: None,
                    amount: None,
                    plan: None,
                    subject_client_id: None,
                    substitute_client_id: None,
                },
                ProposalContentType::CancelSoftwareUpgradeProposal(cancel) => ProposalContent {
                    type_url,
                    title: cancel.title,
                    description: cancel.description,
                    changes: None,
                    recipient: None,
                    amount: None,
                    plan: None,
                    subject_client_id: None,
                    substitute_client_id: None,
                },
                ProposalContentType::CommunityPoolSpendProposal(spend) => ProposalContent {
                    type_url,
                    title: spend.title,
                    description: spend.description,
                    changes: None,
                    recipient: Some(spend.recipient),
                    amount: Some(
                        spend
                            .amount
                            .into_iter()
                            .map(|c| Coin {
                                amount: c.amount,
                                denom: c.denom,
                            })
                            .collect(),
                    ),
                    plan: None,
                    subject_client_id: None,
                    substitute_client_id: None,
                },
                ProposalContentType::SoftwareUpgradeProposal(upgrade) => ProposalContent {
                    type_url,
                    title: upgrade.title,
                    description: upgrade.description,
                    changes: None,
                    recipient: None,
                    amount: None,
                    plan: upgrade.plan.map(|p| UpgradePlan {
                        name: p.name,
                        height: p.height,
                        info: p.info,
                    }),
                    subject_client_id: None,
                    substitute_client_id: None,
                },
                ProposalContentType::ClientUpdateProposal(client_update) => ProposalContent {
                    type_url,
                    title: client_update.title,
                    description: client_update.description,
                    changes: None,
                    recipient: None,
                    amount: None,
                    plan: None,
                    subject_client_id: Some(client_update.subject_client_id),
                    substitute_client_id: Some(client_update.substitute_client_id),
                },
            }
        });

        ProposalInfo {
            proposal_id: p.proposal_id,
            content,
            status: p.status,
            final_tally_result: p.final_tally_result.map(|t| TallyResult {
                yes: t.yes,
                abstain: t.abstain,
                no: t.no,
                no_with_veto: t.no_with_veto,
            }),
            submit_time: p.submit_time.map(|t| {
                chrono::DateTime::from_timestamp(t.seconds, 0)
                    .unwrap()
                    .to_rfc3339_opts(chrono::SecondsFormat::Nanos, true)
            }),
            deposit_end_time: p.deposit_end_time.map(|t| {
                chrono::DateTime::from_timestamp(t.seconds, 0)
                    .unwrap()
                    .to_rfc3339_opts(chrono::SecondsFormat::Nanos, true)
            }),
            total_deposit: p
                .total_deposit
                .into_iter()
                .map(|c| format!("{}{}", c.amount, c.denom))
                .collect(),
            voting_start_time: p.voting_start_time.map(|t| {
                chrono::DateTime::from_timestamp(t.seconds, 0)
                    .unwrap()
                    .to_rfc3339_opts(chrono::SecondsFormat::Nanos, true)
            }),
            voting_end_time: p.voting_end_time.map(|t| {
                chrono::DateTime::from_timestamp(t.seconds, 0)
                    .unwrap()
                    .to_rfc3339_opts(chrono::SecondsFormat::Nanos, true)
            }),
            last_updated: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

pub async fn fetch_proposals_filtered(
    db: &rocksdb::DB,
    contact: &deep_space::Contact,
    active_only: Option<bool>,
) -> Result<Vec<ProposalInfo>, Box<dyn std::error::Error>> {
    let proposals = fetch_proposals(db, contact).await?;

    Ok(match active_only {
        Some(true) => proposals.into_iter().filter(|p| p.is_active()).collect(),
        Some(false) => proposals.into_iter().filter(|p| !p.is_active()).collect(),
        None => proposals,
    })
}

pub fn start_proposal_cache_refresh_task(db: Arc<DB>, contact: Contact) {
    tokio::spawn(async move {
        loop {
            // Check if cache needs refresh
            if get_cached_proposals(&db).is_none() {
                info!("Proposal cache expired, refreshing...");
                match fetch_proposals(&db, &contact).await {
                    Ok(_) => info!("Successfully refreshed proposal cache"),
                    Err(e) => error!("Failed to refresh proposal cache: {}", e),
                }
            }

            // Sleep for the cache duration before refreshing again
            sleep(tokio::time::Duration::from_secs(CACHE_DURATION)).await;
        }
    });
}

impl ProposalContent {
    pub fn get_decoded_value(&self) -> Result<String, Box<dyn std::error::Error>> {
        match self.type_url.as_str() {
            "/cosmos.gov.v1beta1.TextProposal" => Ok(format!(
                "Title: {}\nDescription: {}",
                self.title, self.description
            )),
            "/cosmos.params.v1beta1.ParameterChangeProposal" => {
                let changes_str = self
                    .changes
                    .as_ref()
                    .map(|changes| {
                        changes
                            .iter()
                            .map(|c| {
                                format!(
                                    "Subspace: {}, Key: {}, Value: {}",
                                    c.subspace, c.key, c.value
                                )
                            })
                            .collect::<Vec<_>>()
                            .join("\n")
                    })
                    .unwrap_or_default();

                Ok(format!(
                    "Title: {}\nDescription: {}\nChanges:\n{}",
                    self.title, self.description, changes_str
                ))
            }
            "/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal" => Ok(format!(
                "Title: {}\nDescription: {}",
                self.title, self.description
            )),
            "/cosmos.distribution.v1beta1.CommunityPoolSpendProposal" => {
                let amount_str = self
                    .amount
                    .as_ref()
                    .map(|amounts| {
                        amounts
                            .iter()
                            .map(|c| format!("{}{}", c.amount, c.denom))
                            .collect::<Vec<_>>()
                            .join(", ")
                    })
                    .unwrap_or_default();

                Ok(format!(
                    "Title: {}\nDescription: {}\nRecipient: {}\nAmount: {}",
                    self.title,
                    self.description,
                    self.recipient.as_deref().unwrap_or(""),
                    amount_str
                ))
            }
            "/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal" => {
                let plan_str = self
                    .plan
                    .as_ref()
                    .map(|p| {
                        format!(
                            "\nPlan:\n  Name: {}\n  Height: {}\n  Info: {}",
                            p.name, p.height, p.info
                        )
                    })
                    .unwrap_or_default();

                Ok(format!(
                    "Title: {}\nDescription: {}{}",
                    self.title, self.description, plan_str
                ))
            }
            "/ibc.core.client.v1.ClientUpdateProposal" => Ok(format!(
                "Title: {}\nDescription: {}\nSubject Client ID: {}\nSubstitute Client ID: {}",
                self.title,
                self.description,
                self.subject_client_id.as_deref().unwrap_or(""),
                self.substitute_client_id.as_deref().unwrap_or("")
            )),
            _ => Err("Unknown proposal type".into()),
        }
    }
}

impl From<TextProposal> for SerializableTextProposal {
    fn from(tp: TextProposal) -> Self {
        SerializableTextProposal {
            title: tp.title,
            description: tp.description,
        }
    }
}

impl From<ParameterChangeProposal> for SerializableParameterChangeProposal {
    fn from(pcp: ParameterChangeProposal) -> Self {
        SerializableParameterChangeProposal {
            title: pcp.title,
            description: pcp.description,
            changes: pcp
                .changes
                .into_iter()
                .map(|c| ParamChange {
                    subspace: c.subspace,
                    key: c.key,
                    value: c.value,
                })
                .collect(),
        }
    }
}
