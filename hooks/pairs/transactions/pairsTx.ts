import { DEX_REOUTER_ABI } from "@/config/abis";
import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  Transaction,
  TransactionDescription,
  errMsg,
} from "@/config/interfaces";
import {
  PairsTransactionParams,
  PairsTxTypes,
} from "../interfaces/pairsTxTypes";
import { cTokenLendingTx } from "@/hooks/lending/transactions/lending";
import { CTokenLendingTxTypes } from "@/hooks/lending/interfaces/lendingTxTypes";
import { _approveTx, checkTokenAllowance } from "@/utils/evm/erc20.utils";
import { TX_DESCRIPTIONS } from "@/config/consts/txDescriptions";
import { PairWithUserCTokenData } from "../interfaces/pairs";
import { getCLMAddress } from "@/config/consts/addresses";
import { areEqualAddresses } from "@/utils/address.utils";
import { percentOfAmount } from "@/utils/tokens/tokenMath.utils";
import { quoteRemoveLiquidity } from "@/utils/evm/pairs.utils";

export async function lpPairTx(
  params: PairsTransactionParams
): PromiseWithError<Transaction[]> {
  // make sure pair passed through has user details
  if (!params.pair.clmData) {
    return NEW_ERROR("lpPairTx: pair does not have user details");
  }
  // get router address to use for transaction
  const routerAddress = getCLMAddress(params.chainId, "router");
  if (!routerAddress) {
    return NEW_ERROR(
      "lpPairTx: could not get router address for chainId" + params.chainId
    );
  }
  switch (params.txType) {
    case PairsTxTypes.STAKE:
    case PairsTxTypes.UNSTAKE:
      // if this is only a lending action (supply/withdraw), then call on that function instead
      if (
        params.txType === PairsTxTypes.STAKE ||
        params.txType === PairsTxTypes.UNSTAKE
      ) {
        return await cTokenLendingTx({
          chainId: params.chainId,
          ethAccount: params.ethAccount,
          txType:
            params.txType === PairsTxTypes.STAKE
              ? CTokenLendingTxTypes.SUPPLY
              : CTokenLendingTxTypes.WITHDRAW,
          cToken: params.pair.clmData,
          amount: params.amountLP,
        });
      }
    case PairsTxTypes.ADD_LIQUIDITY:
      return await addLiquidityFlow(params, routerAddress);
    case PairsTxTypes.REMOVE_LIQUIDITY:
      return await removeLiquidityFlow(params, routerAddress);
    default:
      return NEW_ERROR("lpPairTx: incorrect tx type passed");
  }
}

/**
 * TRANSACTION FLOWS TO USE FROM MAIN LP FUNCTION
 */
async function addLiquidityFlow(
  params: PairsTransactionParams,
  routerAddress: string
): PromiseWithError<Transaction[]> {
  /** check params */
  // check that the correct tx is being passed
  if (params.txType !== PairsTxTypes.ADD_LIQUIDITY) {
    return NEW_ERROR("addLiquidityFlow: incorrect tx type passed");
  }
  /** create tx list */
  const txList: Transaction[] = [];

  /** Allowance check on tokens for Router */
  const { data: allowanceTxs, error: allowanceError } =
    await _addLiquidityAllowanceTxs(
      params.chainId,
      params.ethAccount,
      params.pair,
      routerAddress,
      params.amounts.amount1,
      params.amounts.amount2
    );
  if (allowanceError) {
    return NEW_ERROR("addLiquidityFlow: " + errMsg(allowanceError));
  }
  // push allowance txs to the list (might be none)
  txList.push(...allowanceTxs);

  /** check which tokens are canto (for choosing correct method on router) */
  const wcantoAddress = getCLMAddress(params.chainId, "wcanto");
  if (!wcantoAddress) {
    return NEW_ERROR(
      "removeLiquidityFlow: could not get wcanto address for chainId" +
        params.chainId
    );
  }
  const [isToken1Canto, isToken2Canto] = [
    areEqualAddresses(params.pair.token1.address, wcantoAddress),
    areEqualAddresses(params.pair.token2.address, wcantoAddress),
  ];

  /** get min amounts for tokens from quoting expected amounts */
  const [amount1Min, amount2Min] = [
    percentOfAmount(params.amounts.amount1, 100 - params.slippage),
    percentOfAmount(params.amounts.amount2, 100 - params.slippage),
  ];
  if (amount1Min.error || amount2Min.error) {
    return NEW_ERROR(
      "addLiquidityFlow: " +
        errMsg(amount1Min.error ?? amount2Min.error) +
        " while calculating min amounts"
    );
  }

  /** add add liquidity tx to list */
  txList.push(
    _addLiquidityTx(
      params.chainId,
      params.ethAccount,
      routerAddress,
      params.pair.token1.address,
      isToken1Canto,
      params.pair.token2.address,
      isToken2Canto,
      params.pair.stable,
      params.amounts.amount1,
      params.amounts.amount2,
      amount1Min.data,
      amount2Min.data,
      params.deadline,
      TX_DESCRIPTIONS.ADD_LIQUIDITY(
        params.pair,
        params.amounts.amount1,
        params.amounts.amount2
      )
    )
  );

  return NO_ERROR(txList);
}

async function removeLiquidityFlow(
  params: PairsTransactionParams,
  routerAddress: string
): PromiseWithError<Transaction[]> {
  /** check params */
  // check that the correct tx is being passed
  if (params.txType !== PairsTxTypes.REMOVE_LIQUIDITY) {
    return NEW_ERROR("removeLiquidityFlow: incorrect tx type passed");
  }
  // check for user details
  if (!params.pair.clmData) {
    return NEW_ERROR("removeLiquidityFlow: pair does not have user details");
  }
  /** create tx list */
  const txList: Transaction[] = [];

  /** Unstake */
  if (params.unstake) {
    // remove LP from clm
    const { data: withdrawTx, error: withdrawError } = await cTokenLendingTx({
      chainId: params.chainId,
      ethAccount: params.ethAccount,
      txType: CTokenLendingTxTypes.WITHDRAW,
      cToken: params.pair.clmData,
      amount: params.amountLP,
    });
    if (withdrawError) {
      return NEW_ERROR("removeLiquidityFlow: " + errMsg(withdrawError));
    }
    txList.push(...withdrawTx);
  }

  /** Remove liquidity */

  /** Allowance check on lpToken for Router */
  const { data: allowance, error: allowanceError } = await checkTokenAllowance(
    params.chainId,
    params.pair.address,
    params.ethAccount,
    routerAddress,
    params.amountLP
  );
  if (allowanceError) {
    return NEW_ERROR("removeLiquidityFlow: " + errMsg(allowanceError));
  }
  // if not enough allowance, add approval tx
  if (!allowance) {
    txList.push(
      _approveTx(
        params.chainId,
        params.pair.address,
        routerAddress,
        params.amountLP,
        TX_DESCRIPTIONS.APPROVE_TOKEN(params.pair.symbol, "Router")
      )
    );
  }

  /** check which tokens are canto (for choosing correct method on router) */
  const wcantoAddress = getCLMAddress(params.chainId, "wcanto");
  if (!wcantoAddress) {
    return NEW_ERROR(
      "removeLiquidityFlow: could not get wcanto address for chainId" +
        params.chainId
    );
  }
  const [isToken1Canto, isToken2Canto] = [
    areEqualAddresses(params.pair.token1.address, wcantoAddress),
    areEqualAddresses(params.pair.token2.address, wcantoAddress),
  ];

  /** get min amounts for tokens from quoting expected amounts */
  const { data: quote, error: quoteError } = await quoteRemoveLiquidity(
    params.chainId,
    routerAddress,
    params.pair.token1.address,
    params.pair.token2.address,
    params.pair.stable,
    params.amountLP
  );
  if (quoteError) {
    return NEW_ERROR("removeLiquidityFlow: " + errMsg(quoteError));
  }
  const [amount1Min, amount2Min] = [
    percentOfAmount(quote.expectedToken1, 100 - params.slippage),
    percentOfAmount(quote.expectedToken2, 100 - params.slippage),
  ];
  if (amount1Min.error || amount2Min.error) {
    return NEW_ERROR(
      "removeLiquidityFlow: " +
        errMsg(amount1Min.error ?? amount2Min.error) +
        " while calculating min amounts"
    );
  }

  /** add remove liquidity tx to list */
  txList.push(
    _removeLiquidityTx(
      params.chainId,
      params.ethAccount,
      routerAddress,
      params.pair.token1.address,
      isToken1Canto,
      params.pair.token2.address,
      isToken2Canto,
      params.pair.stable,
      params.amountLP,
      amount1Min.data,
      amount2Min.data,
      params.deadline,
      TX_DESCRIPTIONS.REMOVE_LIQUIDITY(params.pair, params.amountLP)
    )
  );
  return NO_ERROR(txList);
}

/**
 * TRANSACTION CREATORS
 * WILL NOT CHECK FOR VALIDITY OF PARAMS, MUST DO THIS BEFORE USING THESE CONSTRUCTORS
 */
const _addLiquidityTx = (
  chainId: number,
  ethAccount: string,
  routerAddress: string,
  token1Address: string,
  isToken1Canto: boolean,
  token2Address: string,
  isToken2Canto: boolean,
  stable: boolean,
  amount1: string,
  amount2: string,
  amount1Min: string,
  amount2Min: string,
  deadline: number,
  description: TransactionDescription
): Transaction => {
  const cantoInPair = isToken1Canto || isToken2Canto;
  return {
    description,
    chainId: chainId,
    type: "EVM",
    target: routerAddress,
    abi: DEX_REOUTER_ABI,
    method: cantoInPair ? "addLiquidityCANTO" : "addLiquidity",
    params: cantoInPair
      ? [
          isToken1Canto ? token2Address : token1Address,
          stable,
          isToken1Canto ? amount2 : amount1,
          isToken1Canto ? amount2Min : amount1Min,
          isToken1Canto ? amount1Min : amount2Min,
          ethAccount,
          deadline,
        ]
      : [
          token1Address,
          token2Address,
          stable,
          amount1,
          amount2,
          amount1Min,
          amount2Min,
          ethAccount,
          deadline,
        ],
    value: isToken1Canto ? amount1 : isToken2Canto ? amount2 : "0",
  };
};
const _removeLiquidityTx = (
  chainId: number,
  ethAccount: string,
  routerAddress: string,
  token1Address: string,
  isToken1Canto: boolean,
  token2Address: string,
  isToken2Canto: boolean,
  stable: boolean,
  amountLP: string,
  amount1Min: string,
  amount2Min: string,
  deadline: number,
  description: TransactionDescription
): Transaction => {
  const cantoInPair = isToken1Canto || isToken2Canto;
  return {
    description,
    chainId: chainId,
    type: "EVM",
    target: routerAddress,
    abi: DEX_REOUTER_ABI,
    method: cantoInPair ? "removeLiquidityCANTO" : "removeLiquidity",
    params: cantoInPair
      ? [
          isToken1Canto ? token2Address : token1Address,
          stable,
          amountLP,
          isToken1Canto ? amount2Min : amount1Min,
          isToken1Canto ? amount1Min : amount2Min,
          ethAccount,
          deadline,
        ]
      : [
          token1Address,
          token2Address,
          stable,
          amountLP,
          amount1Min,
          amount2Min,
          ethAccount,
          deadline,
        ],
    value: "0",
  };
};
const _addLiquidityAllowanceTxs = async (
  chainId: number,
  ethAccount: string,
  pair: PairWithUserCTokenData,
  routerAddress: string,
  amount1: string,
  amount2: string
): PromiseWithError<Transaction[]> => {
  const txList: Transaction[] = [];
  // both tokens in pair must have approval from router
  const [allowance1, allowance2] = await Promise.all([
    checkTokenAllowance(
      chainId,
      pair.token1.address,
      ethAccount,
      routerAddress,
      amount1
    ),
    checkTokenAllowance(
      chainId,
      pair.token2.address,
      ethAccount,
      routerAddress,
      amount2
    ),
  ]);
  // check for errors
  if (allowance1.error || allowance2.error) {
    return NEW_ERROR(
      "_addLiquidityAllowanceTx" + errMsg(allowance1.error ?? allowance2.error)
    );
  }
  // if either is false, then add approval tx
  if (!allowance1.data) {
    txList.push(
      _approveTx(
        chainId,
        pair.token1.address,
        routerAddress,
        amount1,
        TX_DESCRIPTIONS.APPROVE_TOKEN(pair.token1.symbol, "Router")
      )
    );
  }
  if (!allowance2.data) {
    txList.push(
      _approveTx(
        chainId,
        pair.token2.address,
        routerAddress,
        amount2,
        TX_DESCRIPTIONS.APPROVE_TOKEN(pair.token2.symbol, "Router")
      )
    );
  }
  // return tx list
  return NO_ERROR(txList);
};
