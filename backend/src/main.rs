use crate::server::start_server;
use althea::start_ambient_indexer;
use clap::Parser;
use clarity::Address;
use env_logger::Env;
use log::info;
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
}

#[tokio::main]
async fn main() {
    let opts: Opts = Opts::parse();
    openssl_probe::init_ssl_cert_env_vars();
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();
    let db = database::open_database(opts.clone());
    let db = Arc::new(db);

    // Start the background indexer service
    info!("Starting ambient indexer");
    start_ambient_indexer(opts.clone(), db.clone());

    // Start the Actix web server
    info!("Starting web server");
    start_server(opts, db.clone()).await;
}
