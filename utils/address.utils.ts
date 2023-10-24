import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  errMsg,
} from "@/config/interfaces";
import { tryFetch } from "./async.utils";
import { CANTO_MAINNET_COSMOS } from "@/config/networks";
import { isAddress as checkHex } from "web3-validator";
import { getCosmosAccount } from "./cosmos/transactions/helpers.utils";
import { getCosmosAPIEndpoint } from "./networks.utils";

/**
 * Convert an eth hex address to bech32 canto address.
 * @param {string} ethAddress The eth address to convert into a canto address
 * @return {string} The converted address
 */
export async function ethToCantoAddress(
  ethAddress: string
): PromiseWithError<string> {
  const { data: apiEndpoint, error: apiEndpointError } = getCosmosAPIEndpoint(
    CANTO_MAINNET_COSMOS.chainId
  );
  if (apiEndpointError) {
    return NEW_ERROR("ethToCantoAddress::" + apiEndpointError.message);
  }
  const { data: result, error } = await tryFetch<{ cosmos_address: string }>(
    apiEndpoint + "/ethermint/evm/v1/cosmos_account/" + ethAddress
  );
  if (error) {
    return NEW_ERROR("ethToCantoAddress::" + error.message);
  }
  if (!isValidCantoAddress(result.cosmos_address)) {
    return NEW_ERROR(
      "ethToCantoAddress: invalid canto address: " + result.cosmos_address
    );
  }
  return NO_ERROR(result.cosmos_address);
}

/**
 *
 * @dev will check the canto address representation of the ethAddress
 * @param {string} ethAddress User eth address
 * @param {string} chainId chainId to check pub key
 * @returns {boolean} true if the user has a pub key on the chain
 */
export async function checkPubKeyETH(
  ethAddress: string,
  chainId: string
): PromiseWithError<boolean> {
  const { data: cantoAddress, error: ethToCantoError } =
    await ethToCantoAddress(ethAddress);
  if (ethToCantoError) {
    return NEW_ERROR("checkPubKey::" + ethToCantoError.message);
  }
  const { data: cosmosAccount, error } = await getCosmosAccount(
    cantoAddress,
    chainId
  );
  if (error) {
    return NEW_ERROR("checkPubKey::" + error.message);
  }
  try {
    return NO_ERROR(
      cosmosAccount["account"]["base_account"]["pub_key"] != null
    );
  } catch (err) {
    return NEW_ERROR("checkPubKey::" + errMsg(err));
  }
}

/**
 *
 * @param {string} cosmosAddress cosmos address to check if public key exists
 * @param {string} chainId chainId to check public key on
 * @returns {boolean} true if the user has a pub key on the chain or error
 */
export async function checkPubKeyCosmos(
  cosmosAddress: string,
  chainId: string
): PromiseWithError<boolean> {
  const { data: cosmosAccount, error } = await getCosmosAccount(
    cosmosAddress,
    chainId
  );
  if (error) {
    return NEW_ERROR("checkPubKeyCosmos::" + error.message);
  }
  try {
    return NO_ERROR(
      cosmosAccount["account"]["base_account"]["pub_key"] != null
    );
  } catch (err) {
    return NEW_ERROR("checkPubKeyCosmos::" + errMsg(err));
  }
}

/**
 * @notice checks if a canto address is valid
 * @param {string} cantoAddress address to check
 * @returns {boolean} if a valid canto address
 */
export function isValidCantoAddress(cantoAddress: string): boolean {
  return cantoAddress.startsWith("canto") && cantoAddress.length === 44;
}

/**
 * @notice checks if an eth address is valid
 * @param {string} ethAddress address to check
 * @returns {boolean} if a valid eth address
 */
export function isValidEthAddress(ethAddress: string): boolean {
  return checkHex(ethAddress);
}

/**
 * @notice checks if two addresses are the same ignoring case
 * @param {string} a address to check
 * @param {string} b address to check
 * @returns {boolean} if addresses are the same
 */
export function areEqualAddresses(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/**
 * @notice checks if a list of addresses includes an address ignoring case
 * @param {string[]} list list of addresses to check
 * @param {string} item address to check
 * @returns {boolean} if list includes address
 */
export function listIncludesAddress(list: string[], item: string): boolean {
  for (const listItem of list) {
    if (areEqualAddresses(listItem, item)) {
      return true;
    }
  }
  return false;
}