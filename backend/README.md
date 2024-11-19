# Althea.link backend

This repo serves as the Althea.link backend server via the below APIs. We serve two distinct APIs from this backend, detailed below

## DEBUG API

The debug api is used to inspect state during development

* `/debug/init_pool/` - a POST endpoint expecting the base, quote, and poolIdx triple via JSON and returning the associated pool
* `/debug/init_pools/`- a GET endpoint that returns all discovered pools
* `/debug/all_mint_ranged/`- a GET endpoint that returns all discovered MintRanged events
* `/debug/all_burn_ranged/`- a GET endpoint that returns all discovered BurnRanged events
* `/debug/all_mint_ambient/`- a GET endpoint that returns all discovered MintAmbient events
* `/debug/all_burn_ambient/`- a GET endpoint that returns all discovered BurnAmbient events

## gcgo API

The gcgo API is meant to fulfil the needs of the frontend, and is based off of the graphcache-go repo made for Ambient.

* `/gcgo/user_pool_positions` - a GET endpoint which returns all of a given user's positions on a given pool
* `/gcgo/user_positions` - a GET endpoint which returns all of a given user's positions in the DEX
* `/gcgo/pool_liq_curve` - a GET endpoint which returns the inferred status of a pool's liquidity curve, including the ambient liquidity and the liquidity bumps sorted by tick
* `/gcgo/pool_stats` - a GET endpoint which returns the base and quote TVL, last swap price, and fee rate of a given pool.

## Cosmos API

The Cosmos API returns information on certain Cosmos modules for use with e.g. delegation and governance.

* `/delegations` - a GET endpoint returning all the delegations for a given cosmos bech32 address
* `/proposals` - a GET endpoint returning all the governance proposals currently on chain, with options to query by the current status
* `/validators` - a GET endpoint returning the current validators, with options to filter based on status or operator address