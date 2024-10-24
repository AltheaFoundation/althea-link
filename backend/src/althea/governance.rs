use cosmos_sdk_proto_althea::cosmos::base::query::v1beta1::PageRequest;
use cosmos_sdk_proto_althea::cosmos::gov::v1beta1::{Proposal, QueryProposalsRequest};
use log::info;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProposalInfo {
    pub proposal_id: u64,
    pub content: Option<ProposalContent>,
    pub status: i32,
    pub final_tally_result: Option<TallyResult>,
    pub submit_time: Option<SystemTime>,
    pub deposit_end_time: Option<SystemTime>,
    pub total_deposit: Vec<String>,
    pub voting_start_time: Option<SystemTime>,
    pub voting_end_time: Option<SystemTime>,
    pub last_updated: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProposalContent {
    pub type_url: String,
    pub title: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TallyResult {
    pub yes: String,
    pub abstain: String,
    pub no: String,
    pub no_with_veto: String,
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
    let key = b"proposals";
    match db.get(key).unwrap() {
        Some(data) => {
            let proposals: Vec<ProposalInfo> = bincode::deserialize(&data).unwrap();
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            // Cache for 5 minutes
            if now - proposals[0].last_updated < 300 {
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

impl From<Proposal> for ProposalInfo {
    fn from(p: Proposal) -> Self {
        ProposalInfo {
            proposal_id: p.proposal_id,
            content: p.content.map(|c| ProposalContent {
                type_url: c.type_url,
                title: c.value.to_vec().into_iter().map(|b| b as char).collect(),
                description: String::new(),
            }),
            status: p.status,
            final_tally_result: p.final_tally_result.map(|t| TallyResult {
                yes: t.yes,
                abstain: t.abstain,
                no: t.no,
                no_with_veto: t.no_with_veto,
            }),
            submit_time: p
                .submit_time
                .map(|t| SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(t.seconds as u64)),
            deposit_end_time: p
                .deposit_end_time
                .map(|t| SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(t.seconds as u64)),
            total_deposit: p
                .total_deposit
                .into_iter()
                .map(|c| format!("{}{}", c.amount, c.denom))
                .collect(),
            voting_start_time: p
                .voting_start_time
                .map(|t| SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(t.seconds as u64)),
            voting_end_time: p
                .voting_end_time
                .map(|t| SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(t.seconds as u64)),
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
