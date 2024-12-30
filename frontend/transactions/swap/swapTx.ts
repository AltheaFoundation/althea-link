import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  Validation,
} from "@/config/interfaces";
import { TX_PARAM_ERRORS } from "@/config/consts/errors";
import { SwapTransactionParams, SwapTxType } from "./types";
import { TxCreatorFunctionReturn } from "@/transactions/interfaces";
import { getAmbientAddress } from "@/hooks/pairs/newAmbient/config/addresses";
import { _swapTx } from "./txCreators";
import { createApprovalTxs } from "@/transactions/erc20";
import { isValidEthAddress } from "@/utils/address";
import { TX_DESCRIPTIONS } from "@/transactions/interfaces/txDescriptions";
import { percentOfAmount } from "@/utils/math";

export async function swapTx(
  txParams: SwapTransactionParams
): PromiseWithError<TxCreatorFunctionReturn> {
  try {
    console.log("Swap Transaction Parameters:", {
      chainId: txParams.chainId,
      ethAccount: txParams.ethAccount,
      pool: {
        base: txParams.pool.base.symbol,
        quote: txParams.pool.quote.symbol,
        poolIdx: txParams.pool.poolIdx,
      },
      amount: txParams.amount,
      isAmountBase: txParams.isAmountBase,
      limitPrice: txParams.limitPrice,
      minOut: txParams.minOut,
      tip: txParams.tip,
      reserveFlags: txParams.reserveFlags,
    });

    const validation = validateSwapTxParams(txParams);
    if (validation.error) throw new Error(validation.reason);

    // get croc dex address
    const crocDexAddress = getAmbientAddress(txParams.chainId, "crocDex");
    if (!crocDexAddress)
      throw new Error(TX_PARAM_ERRORS.PARAM_INVALID("chainId"));

    console.log("Using CrocDex address:", crocDexAddress);

    // determine if buying or selling base token
    const isBuy = txParams.isAmountBase;

    // create tx list for approvals and swap
    const txList = [];

    // check if we need approval for the token being spent
    const spendToken = txParams.isAmountBase
      ? txParams.pool.quote
      : txParams.pool.base;

    // add 10% to approval amount for price changes
    const { data: approvalAmount, error: approvalError } = percentOfAmount(
      txParams.amount,
      110
    );
    if (approvalError) throw approvalError;

    console.log("Approval amount:", approvalAmount);

    // create approval transactions if needed
    const { data: allowanceTxs, error: allowanceTxsError } =
      await createApprovalTxs(
        txParams.chainId,
        txParams.ethAccount,
        [
          {
            address: spendToken.address,
            symbol: spendToken.symbol,
          },
        ],
        [approvalAmount],
        { address: crocDexAddress, name: "Ambient" }
      );
    if (allowanceTxsError) throw allowanceTxsError;

    // add allowance txs to list
    txList.push(...allowanceTxs);

    // add swap tx
    const swapTransaction = _swapTx(
      txParams.chainId,
      txParams.ethAccount,
      crocDexAddress,
      txParams.pool.base.address,
      txParams.pool.quote.address,
      txParams.pool.poolIdx,
      isBuy,
      txParams.isAmountBase,
      txParams.amount,
      txParams.tip ?? "0",
      txParams.limitPrice,
      txParams.minOut,
      txParams.reserveFlags ?? 0,
      TX_DESCRIPTIONS.SWAP(
        txParams.pool,
        txParams.amount,
        txParams.isAmountBase
      )
    );

    console.log("Final swap transaction:", swapTransaction);

    txList.push(swapTransaction);

    return NO_ERROR({ transactions: txList });
  } catch (err) {
    console.error("Swap transaction error:", err);
    return NEW_ERROR("swapTx", err);
  }
}

const invalidParams = (reason: string): Validation => ({
  error: true,
  reason,
});

export function validateSwapTxParams(
  txParams: SwapTransactionParams
): Validation {
  // check eth account
  if (!isValidEthAddress(txParams.ethAccount)) {
    return invalidParams(TX_PARAM_ERRORS.PARAM_INVALID("ethAccount"));
  }

  // check amount
  if (Number(txParams.amount) <= 0) {
    return invalidParams(
      TX_PARAM_ERRORS.AMOUNT_TOO_LOW(
        "0",
        txParams.isAmountBase
          ? txParams.pool.base.symbol
          : txParams.pool.quote.symbol
      )
    );
  }

  // check if user has enough balance
  const token = txParams.isAmountBase
    ? txParams.pool.base
    : txParams.pool.quote;
  if (Number(txParams.amount) > Number(token.balance ?? "0")) {
    return invalidParams(
      TX_PARAM_ERRORS.AMOUNT_TOO_HIGH(token.balance ?? "0", token.symbol)
    );
  }

  // check limit price
  if (Number(txParams.limitPrice) <= 0) {
    return invalidParams(TX_PARAM_ERRORS.PARAM_INVALID("limitPrice"));
  }

  // check min output
  if (Number(txParams.minOut) <= 0) {
    return invalidParams(TX_PARAM_ERRORS.PARAM_INVALID("minOut"));
  }

  return { error: false };
}
