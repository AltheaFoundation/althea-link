import { BaseNetwork } from "@/config/interfaces";
import * as ALL_NETWORKS from "@/config/networks";

export const TEST_BRIDGE_NETWORKS: BaseNetwork[] = [
  ALL_NETWORKS.AVALANCHE_TESTNET,
  ALL_NETWORKS.FANTOM_TESTNET,
  ALL_NETWORKS.GOERLI_TESTNET,
  ALL_NETWORKS.MUMBAI_TESTNET,
  ALL_NETWORKS.OPTIMISM_TESTNET,
];

export const MAIN_BRIDGE_IN_NETWORKS: BaseNetwork[] = [
  ALL_NETWORKS.ETH_MAINNET,
  ALL_NETWORKS.AKASH,
  ALL_NETWORKS.COMDEX,
  ALL_NETWORKS.COSMOS_HUB,
  ALL_NETWORKS.CRESCENT,
  ALL_NETWORKS.EVMOS,
  ALL_NETWORKS.GRAVITY_BRIDGE,
  ALL_NETWORKS.INJECTIVE,
  ALL_NETWORKS.KAVA,
  ALL_NETWORKS.OSMOSIS,
  ALL_NETWORKS.PERSISTENCE,
  ALL_NETWORKS.QUICKSILVER,
  ALL_NETWORKS.SENTINEL,
  ALL_NETWORKS.SOMMELIER,
  ALL_NETWORKS.STRIDE,
];
export const MAIN_BRIDGE_OUT_NETWORKS: BaseNetwork[] = [
  ...MAIN_BRIDGE_IN_NETWORKS,
  ALL_NETWORKS.ETHEREUM_VIA_GRAVITY_BRIDGE,
];