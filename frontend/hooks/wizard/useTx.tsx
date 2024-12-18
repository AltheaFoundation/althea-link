import { isDeliverTxSuccess, SignerData, StdFee } from "@cosmjs/stargate";
import { useChain } from "@cosmos-kit/react";
import { cosmos } from "interchain";
import { TxRaw } from "interchain/dist/codegen/cosmos/tx/v1beta1/tx";
import { Event } from "interchain/dist/codegen/tendermint/abci/types";
import { useState } from "react";

interface Msg {
  typeUrl: string;
  value: any;
}

export interface TxOptions {
  fee?: StdFee | null;
  memo?: string;
  onSuccess?: () => void;
}

export enum TxStatus {
  Failed = "Transaction Failed",
  Successful = "Transaction Successful",
  Broadcasting = "Transaction Broadcasting",
}

const txRaw = cosmos.tx.v1beta1.TxRaw;

export const useTx = (chainName: string, explicitSignerData: SignerData) => {
  const { address, getSigningStargateClient, estimateFee } =
    useChain(chainName);
  const [responseEvents, setResponseEvents] = useState<readonly Event[] | null>(
    null
  );
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const tx = async (msgs: Msg[], options: TxOptions) => {
    if (!address) {
      console.error("No address found");
      return;
    }

    let signed: TxRaw;
    let client: Awaited<ReturnType<typeof getSigningStargateClient>>;

    try {
      let fee: StdFee;
      if (options?.fee) {
        fee = options.fee;
        client = await getSigningStargateClient();
      } else {
        try {
          const [_fee, _client] = await Promise.all([
            estimateFee(msgs).catch((err) => {
              console.error("Failed to estimate fee:", err);
              throw err;
            }),
            getSigningStargateClient().catch((err) => {
              console.error("Failed to get signing stargate client:", err);
              throw err;
            }),
          ]);
          fee = _fee;
          client = _client;
        } catch (e: any) {
          console.error(e);
          return;
        }
      }
      signed = await client.sign(
        address,
        msgs,
        fee,
        options.memo ?? "",
        explicitSignerData
      );
    } catch (e: any) {
      console.error(e);
      return;
    }

    if (client && signed) {
      await client
        .broadcastTx(Uint8Array.from(txRaw.encode(signed).finish()))
        .then((res) => {
          //@ts-ignore
          if (isDeliverTxSuccess(res)) {
            if (options.onSuccess) options.onSuccess();
            //@ts-ignore
            setResponseEvents(res?.events);
            setTransactionHash(res?.transactionHash);
          } else {
            console.error(res);
          }
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => Promise.resolve());
    } else {
      console.error("Failed to sign transaction");
    }
  };

  return { tx, responseEvents, transactionHash };
};
