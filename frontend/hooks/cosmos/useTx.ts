import { DeliverTxResponse, isDeliverTxSuccess, StdFee } from '@cosmjs/stargate';
import { useChain } from '@cosmos-kit/react';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';

interface Msg {
  typeUrl: string;
  value: any;
}

export interface TxOptions {
  fee?: StdFee | null;
  memo?: string;
  onSuccess?: () => void;
  returnError?: boolean;
  simulate?: boolean;
}



export const useTx = (chainName: string) => {
  const { address, getSigningStargateClient, estimateFee } = useChain(chainName);

  const [isSigning, setIsSigning] = useState(false);

  const tx = async (msgs: Msg[], options: TxOptions) => {
    if (!address) {
     
      return options.returnError ? { error: 'Wallet not connected' } : undefined;
    }
    setIsSigning(true);
    let client: SigningStargateClient;
    try {
      client = await getSigningStargateClient();

      const signed = await client.sign(
        address,
        msgs,
        options.fee || (await estimateFee(msgs)),
        options.memo || ''
      );

     
      setIsSigning(true);
      const res: DeliverTxResponse = await client.broadcastTx(
        Uint8Array.from(TxRaw.encode(signed).finish())
      );
      if (isDeliverTxSuccess(res)) {
        if (options.onSuccess) options.onSuccess();
        setIsSigning(false);
       
        return options.returnError ? { error: null } : undefined;
      } else {
        setIsSigning(false);
       
        return options.returnError ? { error: res?.rawLog || 'Unknown error' } : undefined;
      }
    } catch (e: any) {
      console.error('Failed to broadcast or simulate: ', e);
      setIsSigning(false);
     
      return options.returnError ? { error: e.message } : undefined;
    } finally {
      setIsSigning(false);
    }
  };

  return { tx, isSigning, setIsSigning };
};
