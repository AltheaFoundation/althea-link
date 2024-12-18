import { CosmosNetwork } from "@/config/interfaces";
import {
  checkCosmosAddress,
  getCosmosAddressLink,
  getCosmosTransactionLink,
} from "../helpers";

const gravityBridgeBlockExplorer = "https://www.mintscan.io/gravity-bridge";

export const GRAVITY_BRIDGE: CosmosNetwork = {
  id: "gravity-bridge-3",
  chainId: "gravity-bridge-3",
  icon: "/icons/grav.svg",
  name: "Gravity Bridge",
  isTestChain: false,
  rpcUrl: "https://nodes.chandrastation.com/rpc/gravity/",
  restEndpoint: "https://nodes.chandrastation.com/api/gravity/",
  addressPrefix: "gravity",
  checkAddress: function (address) {
    return checkCosmosAddress(this.addressPrefix)(address);
  },
  nativeCurrency: {
    name: "Graviton",
    baseName: "ugraviton",
    symbol: "GRAV",
    decimals: 6,
  },
  blockExplorer: {
    url: gravityBridgeBlockExplorer,
    getAddressLink: getCosmosAddressLink(gravityBridgeBlockExplorer),
    getTransactionLink: getCosmosTransactionLink(gravityBridgeBlockExplorer),
  },
  extraEndpoints: ["https://gravity-api.polkachu.com"],
};
