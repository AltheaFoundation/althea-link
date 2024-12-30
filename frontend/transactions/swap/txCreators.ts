import { eth } from "web3";
import { CROC_SWAP_DEX_ABI } from "@/config/abis/ambient";
import { Transaction } from "@/transactions/interfaces";
import { CantoFETxType } from "@/transactions/interfaces/txDescriptions";
import BigNumber from "bignumber.js";

export function _swapTx(
  chainId: number,
  ethAccount: string,
  crocDexAddress: string,
  baseToken: string,
  quoteToken: string,
  poolIdx: number,
  isBuy: boolean,
  inBaseQty: boolean,
  qty: string,
  tip: string,
  limitPrice: string,
  minOut: string,
  reserveFlags: number,
  description: { title: string; description: string }
): Transaction {
  // Convert parameters to correct types
  const qtyBN = new BigNumber(qty);
  const tipBN = new BigNumber(tip);
  const limitPriceBN = new BigNumber(limitPrice);
  const minOutBN = new BigNumber(minOut);

  // Ensure values don't exceed their type limits
  if (qtyBN.gt(new BigNumber(2).pow(128).minus(1))) {
    throw new Error("Quantity exceeds uint128 limit");
  }
  if (tipBN.gt(new BigNumber(2).pow(16).minus(1))) {
    throw new Error("Tip exceeds uint16 limit");
  }
  if (limitPriceBN.gt(new BigNumber(2).pow(128).minus(1))) {
    throw new Error("Limit price exceeds uint128 limit");
  }
  if (minOutBN.gt(new BigNumber(2).pow(128).minus(1))) {
    throw new Error("Min out exceeds uint128 limit");
  }
  if (reserveFlags > 255) {
    throw new Error("Reserve flags exceeds uint8 limit");
  }

  return {
    description,
    feTxType: CantoFETxType.SWAP,
    chainId: chainId,
    fromAddress: ethAccount,
    type: "EVM",
    target: crocDexAddress,
    abi: CROC_SWAP_DEX_ABI,
    method: "swap",
    params: [
      baseToken,
      quoteToken,
      poolIdx,
      isBuy,
      inBaseQty,
      qtyBN.toFixed(0),
      tipBN.toFixed(0),
      limitPriceBN.toFixed(0),
      minOutBN.toFixed(0),
      reserveFlags,
    ],
    value: "0",
  };
}
