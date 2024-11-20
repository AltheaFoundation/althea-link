# althea.link

This repo contains the majority of source code for the althea.link site including the frontend (`/frontend`), backend (`/backend`), CI-based deployment tasks (`/deploy`) and CI configuration (`/.github`).

Notably the backend only covers the Cosmos interaction layer and Ambient DEX data aggregation layer, it is currently missing certain functionality forked from the Canto backend.

# backend

The backend is written in Rust using `actix` as a web server and `rocksdb` as storage.

The backend spins up a webserver to handle requests and in the background will observe custom Ambient events on the DEX by querying the Althea-L1 blockchain using `web30`. By processing these events it is possible to emulate the behavior of liquidity pools and track the status of positions in the DEX for use by the frontend.