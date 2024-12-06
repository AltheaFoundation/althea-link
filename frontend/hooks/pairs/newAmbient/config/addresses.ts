import { CANTO_MAINNET_EVM, CANTO_TESTNET_EVM } from "@/config/networks";

const AMBIENT_ADDRESSES = {
  crocQuery: {
    mainnet: "0xB2F37Ba3CaDEc9aAf43BC716B1B86656be2d06Eb",
    testnet: "0xB2F37Ba3CaDEc9aAf43BC716B1B86656be2d06Eb",
  },
  crocDex: {
    mainnet: "0xD50c0953a99325d01cca655E57070F1be4983b6b",
    testnet: "0xD50c0953a99325d01cca655E57070F1be4983b6b",
  },
} as const;

export function getAmbientAddress(
  chainId: number,
  key: keyof typeof AMBIENT_ADDRESSES
): string | null {
  switch (chainId) {
    case CANTO_MAINNET_EVM.chainId:
      return AMBIENT_ADDRESSES[key].mainnet;
    case CANTO_TESTNET_EVM.chainId:
      return AMBIENT_ADDRESSES[key].testnet;
    default:
      return null;
  }
}
