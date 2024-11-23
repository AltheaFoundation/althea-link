import { NEW_ERROR, NO_ERROR, PromiseWithError } from "@/config/interfaces";
import { getAltheaAccountMetaData } from "../cosmos";

/**
 *
 * @param {string} altheaAddress canto address to check if public key exists
 * @param {string} chainId chainId to check public key on
 * @returns {boolean} true if the user has a pub key on the chain or error
 */
export async function checkCantoPubKey(
  altheaAddress: string,
  chainId: string | number,
): PromiseWithError<boolean> {
  try {
    // get canto account
    const { data: accountMeta, error: accountMetaError } =
      await getAltheaAccountMetaData(altheaAddress, chainId);
    if (accountMetaError) throw accountMetaError;
    // return true if the user has a pub key on the chain
    return NO_ERROR(accountMeta.account.base_account?.pub_key != null);
  } catch (err) {
    return NEW_ERROR("checkCantoPubKey", err);
  }
}
