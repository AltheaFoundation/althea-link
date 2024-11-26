//! Database creation and overall management goes here, database functions more specific to chains go into each chain modules database.rs module

use crate::althea::ambient::croc_query::CurveState;
use crate::althea::ambient::knockout::BurnKnockoutEvent;
use crate::althea::ambient::knockout::MintKnockoutEvent;
use crate::althea::ambient::knockout::WithdrawKnockoutEvent;
use crate::althea::ambient::pools::InitPoolEvent;
use crate::althea::ambient::pools::PoolRevisionEvent;
use crate::althea::ambient::positions::BurnAmbientEvent;
use crate::althea::ambient::positions::BurnRangedEvent;
use crate::althea::ambient::positions::HarvestEvent;
use crate::althea::ambient::positions::MintAmbientEvent;
use crate::althea::ambient::positions::MintRangedEvent;
use crate::althea::ambient::swap::SwapEvent;
use crate::althea::database::curve::LATEST_CURVE_KEY;
use crate::althea::database::pools::Pool;
use crate::althea::database::pools::INIT_POOL_PREFIX;
use crate::althea::database::pools::POOL_TEMPLATE_PREFIX;
use crate::althea::database::pools::REVISION_PREFIX;
use crate::althea::database::pools::SWAP_PREFIX;
use crate::althea::database::positions::ambient::BURN_AMBIENT_PREFIX;
use crate::althea::database::positions::ambient::MINT_AMBIENT_PREFIX;
use crate::althea::database::positions::knockout::BURN_KNOCKOUT_PREFIX;
use crate::althea::database::positions::knockout::MINT_KNOCKOUT_PREFIX;
use crate::althea::database::positions::knockout::WITHDRAW_KNOCKOUT_PREFIX;
use crate::althea::database::positions::ranged::BURN_RANGED_PREFIX;
use crate::althea::database::positions::ranged::HARVEST_PREFIX;
use crate::althea::database::positions::ranged::MINT_RANGED_PREFIX;
use crate::althea::database::tracking::DirtyPoolTracker;
use crate::althea::database::tracking::TrackedPool;
use crate::althea::database::tracking::DIRTY_POOL_PREFIX;
use crate::althea::database::tracking::TRACKED_POOL_PREFIX;
use crate::Opts;
use log::info;
use rocksdb::Options;
use rocksdb::DB;
use std::borrow::Borrow;
use std::time::Instant;

/// Creates a new RocksDB database in the current directory
pub fn open_database(opts: Opts) -> DB {
    let mut db_options = Options::default();
    let num_cpus = num_cpus::get() as i32;
    db_options.increase_parallelism(num_cpus);
    db_options.set_max_open_files(num_cpus);
    db_options.set_max_background_jobs(num_cpus / 2);
    db_options.set_max_subcompactions(16);
    db_options.create_if_missing(true);
    let db = DB::open(&db_options, opts.database_path).expect("Failed to open database");
    if opts.compact {
        compact_db(&db);
    } else if opts.compact_and_halt {
        compact_db(&db);
        info!("Database compaction complete, halting");
        std::process::exit(0);
    }
    db
}

/// manually requests DB compaction this optimizes database performance and may for
/// some reason end up not happening often enough.
pub fn compact_db(db: &DB) {
    let start = Instant::now();
    info!("Starting DB compaction");
    let typed_none: Option<[u8; 1]> = None;
    db.compact_range(typed_none, typed_none);
    info!("DB compaction took: {:?}", start.elapsed());
}

// Clears invalid entries in the database by attempting to deserialize every known entry
pub fn clear_invalid_entries(db: &rocksdb::DB) -> bool {
    let mut deleted = false;
    deleted |= clear_invalid::<CurveState>(db, LATEST_CURVE_KEY.as_bytes());
    deleted |= clear_invalid::<InitPoolEvent>(db, INIT_POOL_PREFIX.as_bytes());
    deleted |= clear_invalid::<Pool>(db, POOL_TEMPLATE_PREFIX.as_bytes());
    deleted |= clear_invalid::<SwapEvent>(db, SWAP_PREFIX.as_bytes());
    deleted |= clear_invalid::<PoolRevisionEvent>(db, REVISION_PREFIX.as_bytes());
    deleted |= clear_invalid::<MintAmbientEvent>(db, MINT_AMBIENT_PREFIX.as_bytes());
    deleted |= clear_invalid::<BurnAmbientEvent>(db, BURN_AMBIENT_PREFIX.as_bytes());
    deleted |= clear_invalid::<MintRangedEvent>(db, MINT_RANGED_PREFIX.as_bytes());
    deleted |= clear_invalid::<BurnRangedEvent>(db, BURN_RANGED_PREFIX.as_bytes());
    deleted |= clear_invalid::<HarvestEvent>(db, HARVEST_PREFIX.as_bytes());
    deleted |= clear_invalid::<MintKnockoutEvent>(db, MINT_KNOCKOUT_PREFIX.as_bytes());
    deleted |= clear_invalid::<BurnKnockoutEvent>(db, BURN_KNOCKOUT_PREFIX.as_bytes());
    deleted |= clear_invalid::<WithdrawKnockoutEvent>(db, WITHDRAW_KNOCKOUT_PREFIX.as_bytes());
    deleted |= clear_invalid::<DirtyPoolTracker>(db, DIRTY_POOL_PREFIX.as_bytes());
    deleted |= clear_invalid::<TrackedPool>(db, TRACKED_POOL_PREFIX.as_bytes());

    deleted
}

fn clear_invalid<T>(db: &rocksdb::DB, prefix: &[u8]) -> bool
where
    T: for<'a> serde::de::Deserialize<'a>,
{
    let mut deleted = false;
    let iter = db.prefix_iterator(prefix);
    for (k, v) in iter.flatten() {
        if !k.starts_with(prefix) {
            break;
        }
        let ptr = v.borrow();
        let error: bool = bincode::deserialize::<T>(ptr).is_err();
        if error {
            deleted = true;
            db.delete(k).unwrap();
        }
    }

    deleted
}

#[test]
fn test_clear_invalid() {
    use clarity::Address;
    let db = open_database(Opts {
        database_path: "test_db".to_string(),
        compact: false,
        compact_and_halt: false,
        reindex: false,
        halt_after_indexing: false,
        dex_contract: Address::default(),
        query_contract: Address::default(),
        multicall_contract: Address::default(),
        pool_tokens: Vec::new(),
        pool_templates: Vec::new(),
        address: "0.0.0.0".parse().unwrap(),
        port: 0,
        https: false,
        cert_file: None,
        key_file: None,
        evm_rpc_url: String::new(),
        cosmos_rpc_url: String::new(),
    });
    let prefix = "test";
    let k = "test1";
    let v = bincode::serialize(&"test").unwrap();
    db.put(k.as_bytes(), v).unwrap();
    clear_invalid::<BurnAmbientEvent>(&db, prefix.as_bytes());
    let value = db.get(k);
    match value {
        Ok(value) => match value {
            Some(value) => {
                println!("Expected None, got {:?}", value);
                panic!("Key not deleted");
            }
            None => println!("Value is None"),
        },
        Err(_) => println!("Key deleted!"),
    }
}
