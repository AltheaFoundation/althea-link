import { CANTO_MAINNET_EVM, CANTO_TESTNET_EVM } from "@/config/networks";
import useTransactionStore, { TransactionStore } from "@/stores/transactionStore";
import useStore from "@/stores/useStore";
import { useWalletClient } from "wagmi";
import { GetWalletClientResult } from "wagmi/actions";
import { useChain } from "@cosmos-kit/react";
import { useTx } from "@/hooks/cosmos/useTx";

export default function useCantoSigner(): {
  txStore: TransactionStore | undefined;
  signer: GetWalletClientResult | undefined;
  keplrSigner: ReturnType<typeof useTx> | undefined;
  chainId: number;
  isKeplr: boolean;
} {
  const txStore = useStore(useTransactionStore, (state) => state);
  const { data: signer } = useWalletClient();
  const { address } = useChain("althea");
  const keplrSigner = useTx("althea", {
    accountNumber: 0, 
    sequence: 0, 
    chainId: "althea_258432-1", 
  });

  // set chain id to althea 
  const chainId =
    signer?.chain.id === CANTO_TESTNET_EVM.chainId
      ? CANTO_TESTNET_EVM.chainId
      : CANTO_MAINNET_EVM.chainId;

  const isKeplr = !!address;

  return {
    txStore,
    signer: isKeplr ? undefined : signer,
    keplrSigner: isKeplr ? keplrSigner : undefined,
    chainId,
    isKeplr,
  };
}