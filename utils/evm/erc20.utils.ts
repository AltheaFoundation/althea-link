import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  errMsg,
  UserTokenBalances,
  Transaction,
  TransactionDescription,
  ERC20Token,
} from "@/config/interfaces";
import BigNumber from "bignumber.js";
import {
  getProviderWithoutSigner,
  getRpcUrlFromChainId,
} from "./helpers.utils";
import { Contract } from "web3";
import { ERC20_ABI } from "@/config/abis";
import { fetchBalance, multicall } from "wagmi/actions";

/**
 * @notice gets all token balances from ethereum chain
 * @param {number} chainId chainId to get balances from
 * @param {ERC20Token[]} tokens tokens to get balances for
 * @param {string} userEthAddress ethereum address to get balances for
 * @returns {PromiseWithError<UserTokenBalances>} balances of all tokens as a string or error
 */
export async function getEVMTokenBalanceList(
  chainId: number,
  tokens: ERC20Token[],
  userEthAddress: string
): PromiseWithError<UserTokenBalances> {
  try {
    const multicallConfig = tokens.map((token) => ({
      address: token.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userEthAddress],
    }));
    const data = await multicall({
      chainId,
      contracts: multicallConfig,
    });
    const balances: UserTokenBalances = {};
    await Promise.all(
      data.map(async (result, index) => {
        if (result.error) {
          balances[tokens[index].id] = "0";
        } else {
          // check to see if we want to add the native balance to the token balance
          if (tokens[index].nativeWrappedToken) {
            const nativeBalance = await fetchBalance({
              address: userEthAddress as `0x${string}`,
              chainId,
            });
            balances[tokens[index].id] = (
              nativeBalance.value + (result.result as bigint)
            ).toString();
          } else {
            balances[tokens[index].id] = (result.result as number).toString();
          }
        }
      })
    );
    return NO_ERROR(balances);
  } catch (err) {
    return NEW_ERROR("getTokenBalanceList::" + errMsg(err));
  }
}

/**
 * @notice gets token balance from ethereum chain
 * @param {number} chainId chainId to get balance from
 * @param {string} tokenAddress token address to get balance for
 * @param {string} account ethereum address to get balance for
 * @returns {PromiseWithError<BigNumber>} balance of token as a string or error
 */
export async function getTokenBalance(
  chainId: number,
  tokenAddress: string,
  account: string
): PromiseWithError<BigNumber> {
  try {
    const { data: rpcUrl, error } = getRpcUrlFromChainId(chainId);
    if (error) {
      throw new Error(error.message);
    }
    const tokenContract = new Contract(
      ERC20_ABI,
      tokenAddress,
      getProviderWithoutSigner(rpcUrl)
    );
    const balance = await tokenContract.methods.balanceOf(account).call();
    return NO_ERROR(new BigNumber(balance as string));
  } catch (err) {
    return NEW_ERROR("getTokenBalance::" + errMsg(err));
  }
}

/**
 * @notice checks token allowance from ethereum chain
 * @param {number} chainId chainId to get allowance from
 * @param {string} tokenAddress token address to get allowance for
 * @param {string} account ethereum account who holds the token
 * @param {string} spender ethereum spender to get allowance for
 * @param {string} amount amount to check allowance for
 * @returns {PromiseWithError<BigNumber>} true if allowance is greater than amount, false otherwise
 */
export async function checkTokenAllowance(
  chainId: number,
  tokenAddress: string,
  account: string,
  spender: string,
  amount: string
): PromiseWithError<boolean> {
  try {
    const { data: rpcUrl, error } = getRpcUrlFromChainId(chainId);
    if (error) {
      throw new Error(error.message);
    }
    const tokenContract = new Contract(
      ERC20_ABI,
      tokenAddress,
      getProviderWithoutSigner(rpcUrl)
    );
    const allowance = await tokenContract.methods
      .allowance(account, spender)
      .call();
    return NO_ERROR(
      new BigNumber(allowance as string).isGreaterThanOrEqualTo(amount)
    );
  } catch (err) {
    return NEW_ERROR("checkTokenAllowance::" + errMsg(err));
  }
}

/**
 * TRANSACTION CREATORS
 * WILL NOT CHECK FOR VALIDITY OF PARAMS, MUST DO THIS BEFORE USING THESE CONSTRUCTORS
 */

export const _approveTx = (
  chainId: number,
  tokenAddress: string,
  spender: string,
  amount: string,
  description: TransactionDescription
): Transaction => ({
  description,
  chainId: chainId,
  type: "EVM",
  target: tokenAddress,
  abi: ERC20_ABI,
  method: "approve",
  params: [spender, amount],
  value: "0",
});
