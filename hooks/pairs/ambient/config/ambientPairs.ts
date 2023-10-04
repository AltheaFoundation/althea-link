import { CANTO_MAINNET_EVM, CANTO_TESTNET_EVM } from "@/config/networks";
import { BaseAmbientPair } from "../interfaces/ambientPairs";

const MAINNET_AMBIENT_PAIRS: BaseAmbientPair[] = [];
const TESTNET_AMBIENT_PAIRS: BaseAmbientPair[] = [
  {
    base: {
      address: "0x04E52476d318CdF739C38BD41A922787D441900c",
      chainId: 7701,
      decimals: 18,
      logoURI: "/tokens/note.svg",
      name: "Collateral Note",
      symbol: "cNote",
    },
    quote: {
      address: "0xc51534568489f47949A828C8e3BF68463bdF3566",
      chainId: 7701,
      decimals: 6,
      logoURI:
        "https://raw.githubusercontent.com/cosmos/chain-registry/master/_non-cosmos/ethereum/images/usdc.svg",
      name: "USDC",
      symbol: "USDC",
    },
    poolIdx: 36000,
  },
];

export function getAmbientPairsFromChainId(chainId: number): BaseAmbientPair[] {
  switch (chainId) {
    case CANTO_MAINNET_EVM.chainId:
      return MAINNET_AMBIENT_PAIRS;
    case CANTO_TESTNET_EVM.chainId:
      return TESTNET_AMBIENT_PAIRS;
    default:
      return [];
  }
}
