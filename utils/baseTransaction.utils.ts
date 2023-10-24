import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  Transaction,
} from "@/config/interfaces";
import {
  GetWalletClientResult,
  getWalletClient,
  switchNetwork,
} from "wagmi/actions";
import { performEVMTransaction } from "./evm/performEVMTx";
import {
  performCosmosTransactionEIP,
  waitForCosmosTx,
} from "./cosmos/transactions/performCosmosTx";
import { waitForTransaction as evmWait } from "wagmi/actions";
import { performKeplrTx } from "./keplr/performKeplrTx";

/**
 * @notice performs a single transaction
 * @dev will know if EVM or COSMOS tx to perform
 * @param {Transaction} tx transaction to perform
 * @param {GetWalletClientResult} signer signer to perform tx with
 * @returns {PromiseWithError<string>} txHash of transaction or error
 */
export async function performSingleTransaction(
  tx: Transaction,
  signer: GetWalletClientResult
): PromiseWithError<string> {
  switch (tx.type) {
    case "EVM":
      // perform evm tx
      return await performEVMTransaction(tx, signer);
    case "COSMOS":
      // perform cosmos tx
      return await performCosmosTransactionEIP(tx, signer);
    case "KEPLR":
      // perform keplr tx
      return await performKeplrTx(tx);
    default:
      return NEW_ERROR(
        "useTransactionStore::performSingleTransaction: unknown tx type"
      );
  }
}

/**
 * @notice checks if the transaction was successful/confirmed
 * @dev will know if EVM or COSMOS tx to check
 * @param {string} txType type of transaction
 * @param {number} chainId chainId of transaction
 * @param {string} hash hash of transaction
 * @returns {PromiseWithError<{status: string, error: any}>} status of transaction or error
 */
export async function waitForTransaction(
  txType: "EVM" | "COSMOS" | "KEPLR",
  chainId: number | string,
  hash: string
): PromiseWithError<{
  status: string;
  error: any;
}> {
  switch (txType) {
    case "EVM":
      const receipt = await evmWait({
        chainId: chainId as number,
        hash: hash as `0x${string}`,
        confirmations: 2,
      });
      return NO_ERROR({
        status: receipt.status,
        error: receipt.logs,
      });
    case "COSMOS":
    case "KEPLR":
      return waitForCosmosTx(chainId, hash);
    default:
      return NEW_ERROR("waitForTransaction: unknown tx type: " + txType);
  }
}

/**
 * @notice checks if the signer is on the right chain and tries to switch if not
 * @dev for EVM wallets
 * @param {GetWalletClientResult} signer EVM signing wallet client
 * @param {number} chainId chainId signer should be on
 * @returns {PromiseWithError<GetWalletClientResult>} new signer if switch was made or error
 */
export async function checkOnRightChain(
  signer: GetWalletClientResult,
  chainId: number
): PromiseWithError<GetWalletClientResult> {
  if (!signer) {
    return NEW_ERROR("checkOnRightChain: no signer");
  }
  if (signer.chain.id !== chainId) {
    try {
      // attempt to switch chains
      const network = await switchNetwork({ chainId });
      if (!network || network.id !== chainId) {
        return NEW_ERROR("checkOnRightChain: error switching chains");
      }
      const newSigner = await getWalletClient({ chainId });
      if (!newSigner) {
        // still some error getting the signer
        return NEW_ERROR("checkOnRightChain: error switching chains");
      }
      return NO_ERROR(newSigner);
    } catch (error) {
      return NEW_ERROR("checkOnRightChain: error switching chains");
    }
  }
  return NO_ERROR(signer);
}