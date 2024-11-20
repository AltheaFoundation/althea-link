use clarity::Uint256;
use log::debug;

pub mod curve;
pub mod pools;
pub mod positions;
pub mod tracking;

use super::InitPoolEvent;

pub const LATEST_SEARCHED_BLOCK_KEY: &str = "block";
pub fn get_latest_searched_block(db: &rocksdb::DB) -> Option<Uint256> {
    let v = db.get(LATEST_SEARCHED_BLOCK_KEY.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        debug!("No latest searched block");
        return None;
    }
    Some(Uint256::from_be_bytes(&v.unwrap()))
}
pub fn save_latest_searched_block(db: &rocksdb::DB, block: Uint256) {
    debug!("Saving latest searched block {}", block);
    let value = block.to_be_bytes();
    db.put(LATEST_SEARCHED_BLOCK_KEY.as_bytes(), value).unwrap();
}

pub const SYNCING_KEY: &str = "syncing";
pub fn get_syncing(db: &rocksdb::DB) -> bool {
    let v = db.get(SYNCING_KEY.as_bytes()).unwrap();
    #[allow(clippy::question_mark)]
    if v.is_none() {
        debug!("No syncing key");
        return false;
    }
    v.unwrap()[0] == 1
}

pub fn save_syncing(db: &rocksdb::DB, syncing: bool) {
    debug!("Saving syncing {}", syncing);
    let value = if syncing { vec![1] } else { vec![0] };
    db.put(SYNCING_KEY.as_bytes(), value).unwrap();
}
