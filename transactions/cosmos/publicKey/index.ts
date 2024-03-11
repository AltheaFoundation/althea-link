import { NEW_ERROR, NO_ERROR, PromiseWithError } from "@/config/interfaces";
import {
  CantoFETxType,
  TX_DESCRIPTIONS,
  Transaction,
  TransactionDescription,
} from "@/transactions/interfaces";
import { getCantoBalance } from "@/utils/cosmos";
import BigNumber from "bignumber.js";
import { createMsgsSend } from "../messages/messageSend";
import { PUB_KEY_BOT_ADDRESS } from "@/config/consts/addresses";
import { getCantoCosmosNetwork } from "@/utils/networks";
import { asyncCallWithRetry, sleep } from "@/utils/async";

export async function generateCantoPublicKeyWithTx(
  chainId: number,
  ethAddress: string,
  altheaAddress: string
): PromiseWithError<Transaction[]> {
  try {
    // get canto cosmos network
    const cantoNetwork = getCantoCosmosNetwork(chainId);

    if (!cantoNetwork) throw new Error("invalid chainId");
    // get current canto balance to see if enough canto for public key gen
    const { data: cantoBalance, error: cantoBalanceError } =
      await getCantoBalance(cantoNetwork.chainId, altheaAddress);
    if (cantoBalanceError) throw cantoBalanceError;

    const enoughCanto = new BigNumber(cantoBalance).gte("300000000000000000");

    // call on api to get canto for the account
    if (!enoughCanto) {
      const CANTO_DUST_BOT_API_URL = process.env.NEXT_PUBLIC_CANTO_DUST_BOT_URL;
      if (!CANTO_DUST_BOT_API_URL) throw new Error("invalid dust bot url");
      const botResponse = await fetch(CANTO_DUST_BOT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canto_address: altheaAddress,
          eth_address: ethAddress,
        }),
      });
      if (!botResponse.ok) throw new Error(await botResponse.text());

      // wait for dust bot to send canto so account will exist on chain
      const { error: sentCantoError } = await asyncCallWithRetry(
        async (): PromiseWithError<boolean> => {
          const { data, error } = await getCantoBalance(
            cantoNetwork.chainId,
            altheaAddress
          );
          if (error) return NEW_ERROR("generateCantoPublicKeyWithTx", error);
          if (new BigNumber(data).lte("300000000000000000")) {
            return NEW_ERROR(
              "generateCantoPublicKeyWithTx",
              "not enough canto"
            );
          }
          return NO_ERROR(true);
        },
        { numTries: 3, sleepTime: 3000 }
      );
      if (sentCantoError) throw sentCantoError;
    }
    return NO_ERROR([
      _generatePubKeyTx(
        chainId,
        ethAddress,
        altheaAddress,
        TX_DESCRIPTIONS.GENERATE_PUBLIC_KEY()
      ),
    ]);
  } catch (err) {
    return NEW_ERROR("generateCantoPublicKeyWithTx", err);
  }
}

const _generatePubKeyTx = (
  chainId: number,
  ethSender: string,
  altheaSender: string,
  description: TransactionDescription
): Transaction => {
  const pubKeyTx = createMsgsSend({
    fromAddress: altheaSender,
    destinationAddress: PUB_KEY_BOT_ADDRESS,
    amount: "1",
    denom: "aalthea",
  });
  return {
    chainId,
    feTxType: CantoFETxType.GENERATE_PUBLIC_KEY_COSMOS,
    fromAddress: ethSender,
    type: "COSMOS",
    description,
    msg: pubKeyTx,
  };
};
