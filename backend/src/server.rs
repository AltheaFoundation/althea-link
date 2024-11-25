use std::sync::Arc;

use crate::althea::endpoints::ambient::{
    pool_liq_curve, pool_stats, query_all_burn_ambient, query_all_burn_ranged,
    query_all_init_pools, query_all_mint_ambient, query_all_mint_ranged, query_pool,
    user_pool_positions, user_positions,
};
use crate::althea::endpoints::cosmos::{
    get_delegations, get_proposals, get_staking_info, get_validators,
};
use crate::althea::endpoints::get_constants;
use crate::Opts;
use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer, Responder};
use deep_space::Contact;
use log::info;
use rustls::pki_types::pem::PemObject;
use rustls::pki_types::PrivateKeyDer;
use rustls::ServerConfig;
use tonic::transport::CertificateDer;

async fn index() -> impl Responder {
    "althea.link"
}

pub async fn start_server(opts: Opts, db: Arc<rocksdb::DB>) {
    let db = web::Data::new(db.clone());

    // Create shared Contact instance
    let contact = Contact::new(
        super::althea::ALTHEA_GRPC_URL,
        super::althea::TIMEOUT,
        super::althea::ALTHEA_PREFIX,
    )
    .expect("Failed to create Contact");
    let contact = web::Data::new(Arc::new(contact));

    let op = opts.clone();
    let server = HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .app_data(contact.clone())
            .app_data(op.clone())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header(),
            )
            .route("/", web::get().to(index))
            .service(get_constants)
            // Cosmos-layer endpoints
            .service(get_validators)
            .service(get_proposals)
            .service(get_delegations)
            .service(get_staking_info)
            // Debug endpoints
            .service(
                web::scope("/debug")
                    .service(query_all_init_pools)
                    .service(query_pool)
                    .service(query_all_mint_ranged)
                    .service(query_all_burn_ranged)
                    .service(query_all_mint_ambient)
                    .service(query_all_burn_ambient),
            )
            // Graphcache-go endpoints
            .service(
                web::scope("/gcgo")
                    .service(user_positions)
                    .service(user_pool_positions)
                    .service(pool_liq_curve)
                    .service(pool_stats),
            )
            .wrap(middleware::Compress::default())
    });

    if opts.https {
        let cert_file = opts
            .cert_file
            .expect("cert_file is required when https is enabled");
        let key_file = opts
            .key_file
            .expect("key_file is required when https is enabled");

        let cert_chain = CertificateDer::pem_file_iter(cert_file)
            .unwrap()
            .map(|cert| cert.unwrap())
            .collect();
        let keys = PrivateKeyDer::from_pem_file(key_file).unwrap();
        let config = ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(cert_chain, keys)
            .unwrap();

        info!("Server starting at https://{}:{}", opts.address, opts.port);
        server
            .bind_rustls_0_23(format!("{}:{}", opts.address, opts.port), config)
            .unwrap()
            .run()
            .await
            .unwrap();
    } else {
        info!("Server starting at http://{}:{}", opts.address, opts.port);
        server
            .bind(format!("{}:{}", opts.address, opts.port))
            .unwrap()
            .run()
            .await
            .unwrap();
    }
}
