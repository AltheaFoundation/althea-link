import { CANTO_MAINNET_EVM, CANTO_TESTNET_EVM } from "@/config/networks";
import { BaseAmbientPool } from "../interfaces/ambientPools";

const MAINNET_AMBIENT_POOLS: BaseAmbientPool[] = [
  {
    base: {
      address: "0x0412C7c846bb6b7DC462CF6B453f76D8440b2609",
      chainId: 6633438,
      decimals: 18,
      logoURI: "/icons/weth.svg",
      name: "MAX",
      symbol: "MAX",
    },
    quote: {
      address: "0x30dA8589BFa1E509A319489E014d384b87815D89",
      chainId: 6633438,
      decimals: 18,
      logoURI: "/icons/cNote.svg",
      name: "E2H",
      symbol: "E2H",
      isCToken: false,
    },
    poolIdx: 36000,
    address:
      "0x0412C7c846bb6b7DC462CF6B453f76D8440b2609-0x30dA8589BFa1E509A319489E014d384b87815D89",
    symbol: "MAX / E2H",
    logoURI:
      "https://raw.githubusercontent.com/Plex-Engineer/public-assets/main/icons/tokens/LP/NoteUSDCLP.svg",
    stable: false,
    rewardsLedger: "0x00325777c82C1E3E4B22208Bc1C769f19B2B67Ba",
  },
  {
    base: {
      address: "0x0412C7c846bb6b7DC462CF6B453f76D8440b2609",
      chainId: 6633438,
      decimals: 18,
      logoURI: "/icons/weth.svg",
      name: "MAX",
      symbol: "MAX",
    },
    quote: {
      address: "0x7580bFE88Dd3d07947908FAE12d95872a260F2D8",
      chainId: 6633438,
      decimals: 18,
      logoURI: "/icons/weth.svg",
      name: "WETH",
      symbol: "WETH",
      isCToken: false,
    },
    poolIdx: 36000,
    address:
      "0x0412C7c846bb6b7DC462CF6B453f76D8440b2609-0x7580bFE88Dd3d07947908FAE12d95872a260F2D8",
    symbol: "WETH / ERC20",
    logoURI:
      "https://raw.githubusercontent.com/Plex-Engineer/public-assets/main/icons/tokens/LP/NoteUSDCLP.svg",
    stable: false,
    rewardsLedger: "0x554209512B8d1148eBA7D91cCabf3ea7C790c042",
  },
];
const TESTNET_AMBIENT_POOLS: BaseAmbientPool[] = [
  {
    base: {
      address: "0x04E52476d318CdF739C38BD41A922787D441900c",
      chainId: 7701,
      decimals: 18,
      logoURI: "/icons/cNote.svg",
      name: "Collateral Note",
      symbol: "cNote",
    },
    quote: {
      address: "0xc51534568489f47949A828C8e3BF68463bdF3566",
      chainId: 7701,
      decimals: 6,
      logoURI: "/icons/usdc.svg",
      name: "USDC",
      symbol: "USDC",
    },
    poolIdx: 36000,
    address:
      "0x04E52476d318CdF739C38BD41A922787D441900c-0xc51534568489f47949A828C8e3BF68463bdF3566",
    symbol: "cNoteUSDCLP",
    logoURI: "/icons/cNoteUSDCLP.svg",
    stable: true,
    rewardsLedger: "0x6f5985723EBF98d4A200845C680a7e33bD183a80",
  },
];

export function getAmbientPoolsFromChainId(chainId: number): BaseAmbientPool[] {
  switch (chainId) {
    case CANTO_MAINNET_EVM.chainId:
      return MAINNET_AMBIENT_POOLS;
    case CANTO_TESTNET_EVM.chainId:
      return TESTNET_AMBIENT_POOLS;
    default:
      return [];
  }
}
