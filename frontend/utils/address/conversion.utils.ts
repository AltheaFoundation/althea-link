import { NEW_ERROR, NO_ERROR, PromiseWithError } from "@/config/interfaces";
import { CANTO_MAINNET_COSMOS } from "@/config/networks";
import { tryFetch } from "../async";
import { isValidAltheaAddress } from ".";
import { ethToAlthea } from "@gravity-bridge/address-converter";

/**
 * Convert an eth hex address to bech32 canto address.
 * @param {string} ethAddress The eth address to convert into a canto address
 * @return {string} The converted address
 */
export async function ethToAltheaAddress(
  ethAddress: string,
): PromiseWithError<string> {
  try {
    // chainId not important since address conversion is the same
    const apiEndpoint = CANTO_MAINNET_COSMOS.restEndpoint;

    // try to get canto account from eth address

    const altheaAddress = ethToAlthea(ethAddress);

    // check if canto address is valid
    if (!isValidAltheaAddress(altheaAddress))
      throw Error("invalid canto address: " + altheaAddress);

    return NO_ERROR(altheaAddress);
  } catch (err) {
    return NEW_ERROR("ethToAltheaAddress", err);
  }
}
