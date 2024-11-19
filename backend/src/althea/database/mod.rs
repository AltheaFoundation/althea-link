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
