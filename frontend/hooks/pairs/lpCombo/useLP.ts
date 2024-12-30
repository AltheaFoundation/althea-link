import { useState } from "react";
import { areEqualAddresses } from "@/utils/address";
import {
  NEW_ERROR,
  NO_ERROR,
  ReturnWithError,
  Validation,
} from "@/config/interfaces";

import { LPPairType } from "./interfaces.ts/pairTypes";
import useAmbientPools from "../newAmbient/useAmbientPools";

import { AmbientPool } from "../newAmbient/interfaces/ambientPools";
import { NewTransactionFlow, TransactionFlowType } from "@/transactions/flows";

import { AmbientTransactionParams } from "@/transactions/pairs/ambient";

import { getCantoCoreAddress } from "@/config/consts/addresses";

interface UseLPProps {
  chainId: number;
  userEthAddress?: string;
}

interface UseLPReturn {
  isLoading: boolean;
  pairs: {
    allAmbient: AmbientPool[];
    userAmbient: AmbientPool[];
  };
  rewards: {
    ambient: string;
    total: string;
  };
  selection: {
    pair: LPPairType | null;
    setPair: (pairAddress: string | null) => void;
  };
  transactions: {
    newAmbientPoolTxFlow: (
      txParams: AmbientTransactionParams
    ) => NewTransactionFlow;
    validateAmbientPoolTxParams: (
      txParams: AmbientTransactionParams
    ) => Validation;
    newClaimRewardsFlow: () => NewTransactionFlow;
  };
}

// combination of canto dex and ambient pools
export default function useLP(props: UseLPProps): UseLPReturn {
  // grab data from canto dex and ambient

  const ambient = useAmbientPools(props);

  // get user pairs

  const userAmbientPairs = ambient.ambientPools.filter(
    (pool) => pool.userPositions.length > 0 || pool.userRewards !== "0"
  );

  // create list with all pairs
  const allPairs: LPPairType[] = [...ambient.ambientPools];

  ///
  /// SELECTED PAIR STATE
  ///

  // state for the pair so that balances can always update
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);

  // get the pair from the pair list with balances
  function getPair(address: string): ReturnWithError<LPPairType> {
    const pair = allPairs.find((pair) =>
      areEqualAddresses(pair.address, address)
    );

    return pair ? NO_ERROR(pair) : NEW_ERROR("Pair not found");
  }

  ///
  /// TRANSACTIONS
  ///

  // claim rewards flow
  function newClaimComboRewardsFlow(): NewTransactionFlow {
    const userParams = {
      chainId: props.chainId,
      ethAccount: props.userEthAddress ?? "",
    };
    // need wCanto for importing token
    const wCantoAddress = getCantoCoreAddress(props.chainId, "walthea");

    // get ambient pools that have rewards
    const ambientRewardsPools = [];
    for (const pool of ambient.ambientPools) {
      if (pool.userRewards !== "0") {
        ambientRewardsPools.push({
          estimatedRewards: pool.userRewards,
          rewardsLedgerAddress: pool.rewardsLedger,
          poolName: `${pool.base.symbol}-${pool.quote.symbol}`,
        });
      }
    }
    return {
      title: "Claim Rewards",
      icon: "/icons/canto.svg",
      txType: TransactionFlowType.LP_COMBO_CLAIM_REWARDS_TX,
      params: {
        ambientParams: { ...userParams, rewards: ambientRewardsPools },
      },
      tokenMetadata: wCantoAddress
        ? [
            {
              chainId: props.chainId,
              address: wCantoAddress,
              symbol: "wCANTO",
              decimals: 18,
              icon: "https://raw.githubusercontent.com/cosmos/chain-registry/master/canto/images/canto.svg",
            },
          ]
        : undefined,
    };
  }

  return {
    isLoading: ambient.isLoading,
    pairs: {
      allAmbient: ambient.ambientPools,
      userAmbient: userAmbientPairs,
    },
    rewards: {
      ambient: ambient.totalRewards,
      total: ambient.totalRewards,
    },
    selection: {
      pair: getPair(selectedPairId ?? "").data,
      setPair: (pairAddress: string | null) => setSelectedPairId(pairAddress),
    },
    transactions: {
      newAmbientPoolTxFlow: ambient.transaction.newAmbientPoolTxFlow,
      validateAmbientPoolTxParams: ambient.transaction.validateParams,

      newClaimRewardsFlow: newClaimComboRewardsFlow,
    },
  };
}
