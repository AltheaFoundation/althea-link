import { CosmosNetwork } from "@/config/interfaces";
import {
  checkCosmosAddress,
  getCosmosAddressLink,
  getCosmosTransactionLink,
} from "../helpers";

const gravityBridgeBlockExplorer = "https://www.mintscan.io/noble";

export const NOBLE: CosmosNetwork = {
  id: "noble-1",
  chainId: "noble-1",
  icon: "/icons/noble.jpg",
  name: "Noble",
  isTestChain: false,
  rpcUrl: "https://noble-rpc.polkachu.com",
  restEndpoint: "https://noble-api.polkachu.com",
  addressPrefix: "noble",
  checkAddress: function (address) {
    return checkCosmosAddress(this.addressPrefix)(address);
  },
  nativeCurrency: {
    name: "USDC",
    baseName: "uusdc",
    symbol: "USDC",
    decimals: 6,
  },
  blockExplorer: {
    url: gravityBridgeBlockExplorer,
    getAddressLink: getCosmosAddressLink(gravityBridgeBlockExplorer),
    getTransactionLink: getCosmosTransactionLink(gravityBridgeBlockExplorer),
  },
  extraEndpoints: ["https://noble-api.polkachu.com"],
};
