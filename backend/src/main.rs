use crate::server::start_server;
use althea::{
    database::{get_version, save_version},
    start_ambient_indexer,
};
use clap::Parser;
use clarity::Address;
use env_logger::Env;
use log::{debug, info};
use shadow_rs::{shadow, Format};
use std::{net::IpAddr, sync::Arc};

pub mod althea;
pub mod database;
pub mod server;
pub mod tls;

#[derive(Parser, Clone)]
#[clap(version = "1.0", author = "Christian Borst")]
pub struct Opts {
    /// The address of the CrocSwapDEX contract
    #[clap(short, long)]
    dex_contract: Address,

    /// The address of the CrocQuery contract
    #[clap(short, long)]
    query_contract: Address,

    /// The address of the Multicall3 contract
    #[clap(short, long)]
    multicall_contract: Address,

    /// The ERC20 tokens for which pools have been deployed
    #[clap(short, long, value_delimiter = ',')]
    pool_tokens: Vec<Address>,

    /// The poolIdx values for which pool templates exist
    #[clap(short = 't', long, value_delimiter = ',')]
    pool_templates: Vec<u64>,

    /// The address to bind to
    #[clap(short, long, default_value = "0.0.0.0")]
    address: IpAddr,

    #[clap(long, default_value = "8080")]
    port: u16,

    #[clap(long, default_value = "false")]
    https: bool,

    #[clap(long, requires("https"))]
    cert_file: Option<String>,

    #[clap(long, requires("https"))]
    key_file: Option<String>,

    #[clap(long, default_value = "backend_db_path")]
    database_path: String,

    /// If true the database will be reindexed checking all avaialble data before returning to
    /// normal operation
    #[clap(short, long, default_value = "false")]
    reindex: bool,

    /// If true the database will be reindexed checking all avaialble data then the server will halt
    #[clap(long, default_value = "false", requires("reindex"))]
    halt_after_indexing: bool,

    /// If true the database will be compacted on startup
    #[clap(short, long, default_value = "false")]
    compact: bool,

    /// If true the database will be compacted on startup then the server will halt
    #[clap(long, default_value = "false")]
    compact_and_halt: bool,

    /// If true, will force the use of a database whose version does not match the current commit hash
    #[clap(short = 'f', long, default_value = "false")]
    force_use_database: bool,
}

shadow!(build_mdta);

#[tokio::main]
async fn main() {
    let opts: Opts = Opts::parse();
    openssl_probe::init_ssl_cert_env_vars();
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();
    let db = database::open_database(opts.clone());
    let db = Arc::new(db);

    check_version(&db, opts.clone(), build_mdta::COMMIT_HASH.to_string());

    // Start the background indexer service
    info!("Starting ambient indexer");
    start_ambient_indexer(opts.clone(), db.clone());

    // Start the Actix web server
    info!("Starting web server");
    start_server(opts, db.clone()).await;
}

fn check_version(db: &rocksdb::DB, opts: Opts, commit_hash: String) {
    let db_version = get_version(db);

    if commit_hash.is_empty() && !opts.force_use_database {
        panic!("No build commit hash found, run with -f to force use of database");
    }
    if let Some(db_version) = db_version {
        debug!("Previous version found: {}", db_version);
        if db_version != commit_hash {
            if opts.force_use_database {
                info!("Forcing use of database with old version {db_version}");
            } else {
                panic!(
                    "Database version {db_version} does not match current commit hash {commit_hash}"
                );
            }
        }
    } else {
        debug!("No previous version found");
    }

    save_version(db, &commit_hash);
}
