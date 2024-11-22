import { Chain, AssetList } from "@chain-registry/types";

export const althea: Chain = {
  chain_name: "althea",
  status: "live",
  network_type: "mainnet",
  website: "https://althea.net/",
  pretty_name: "Althea",
  chain_id: "althea_6633438-1",
  bech32_prefix: "althea",
  daemon_name: "althea",
  node_home: "$HOME/.althea",
  slip44: 118,
  apis: {
    rest: [
      {
        address: "http://testnet.althea.net:1317",
        provider: "Chandra Station",
      },
    ],
    rpc: [
      {
        address: "http://testnet.althea.net:26657",
        provider: "Chandra Station",
      },
    ],
  },
  fees: {
    fee_tokens: [
      {
        denom: "aalthea",
        fixed_min_gas_price: 100000000000,
        low_gas_price: 100000000000,
        average_gas_price: 100000000000,
        high_gas_price: 300000000000,
      },
    ],
  },
  staking: {
    staking_tokens: [
      {
        denom: "aalthea",
      },
    ],
  },
  logo_URIs: {
    png: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.png",
    svg: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.svg",
  },
  images: [
    {
      png: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.png",
      svg: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.svg",
    },
  ],
  codebase: {
    git_repo: "https://github.com/AltheaFoundation/althea-L1",
    recommended_version: "v1.3.0",
    compatible_versions: ["v1.3.0"],
    binaries: {
      "linux/amd64":
        "https://github.com/AltheaFoundation/althea-L1/releases/download/v1.3.0/althea-linux-amd64",
    },
    versions: [
      {
        name: "v1",
        recommended_version: "v1.3.0",
        compatible_versions: ["v1.3.0"],
      },
    ],
    genesis: {
      genesis_url:
        "https://github.com/AltheaFoundation/althea-L1-docs/blob/main/althea-l1-mainnet-genesis.json",
    },
  },
};
export const altheaAssets: AssetList = {
  chain_name: "althea",
  assets: [
    {
      description: "Althea native token",
      denom_units: [
        {
          denom: "aalthea",
          exponent: 0,
        },
        {
          denom: "althea",
          exponent: 18,
        },
      ],
      base: "aalthea",
      name: "Althea Token",
      display: "althea",
      symbol: "ALTHEA",
    },
  ],
};
