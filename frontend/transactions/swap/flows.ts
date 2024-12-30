import { NewTransactionFlow, TransactionFlowType } from "@/transactions/flows";
import { SwapTransactionParams } from "./types";

export const newSwapTxFlow = (
  txParams: SwapTransactionParams
): NewTransactionFlow => ({
  title: `Swap ${txParams.fromToken.symbol} to ${txParams.toToken.symbol}`,
  icon: txParams.toToken.logoURI,
  txType: TransactionFlowType.SWAP_TX,
  params: txParams,
});
