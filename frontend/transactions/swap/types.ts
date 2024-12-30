import { AmbientPool } from "@/hooks/pairs/newAmbient/interfaces/ambientPools";

import { Token } from "@/utils/tokens/tokenTypes.utils";

export enum SwapTxType {
  SWAP = "Swap",
}

export interface SwapTransactionParams {
  // Chain and account info
  chainId: number;
  ethAccount: string;

  // Pool and token info
  pool: AmbientPool;
  fromToken: Token;
  toToken: Token;

  // Transaction parameters
  amount: string;
  isAmountBase: boolean;
  limitPrice: string;
  minOut: string;

  // Transaction metadata
  txType: SwapTxType;
  tip?: string;
  reserveFlags?: number;
}
