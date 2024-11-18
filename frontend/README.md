# Althea App

An application to interact with the althea blockchain. This app is a fork of [cantoV3](https://github.com/Plex-Engineer/canto-v3)

## Getting Started

First, create a `.env` file in the root of the project and add the following environment variables:

```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID= # wallet connect
NEXT_PUBLIC_ALTHEA_MAINNET_API_URL= # This is the url of the althea api backend server
NEXT_PUBLIC_ALTHEA_TESTNET_API_URL= # This is the url of the althea api backend server
NEXT_PUBLIC_AMBIENT_API_URL=
NEXT_PUBLIC_CANTO_DUST_BOT_URL=

NEXT_PUBLIC_POSTHOG_HOST= # posthog analytics
NEXT_PUBLIC_POSTHOG_KEY= # posthog analytics
NEXT_PUBLIC_ETH_PRICE_KEY=
```

Second, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Third, clone and follow the instructions in the [api server](https://github.com/chalabi2/althea-api) to run the application backend.

## Backend

The althea api is a fork of [canto-api](https://github.com/chalabi2/althea-api) which is a go client paired with a redis server to store and retrieve data. Run the api server and update the front end environment variables to point to the correct ip:port.
