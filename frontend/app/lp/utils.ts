import { CantoDexTransactionParams } from "@/transactions/pairs/cantoDex";
import { AmbientTransactionParams } from "@/transactions/pairs/ambient";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import useLP from "@/hooks/pairs/lpCombo/useLP";
import { useState, useEffect } from "react";
import { fetchBlockNumber } from "@wagmi/core";
import { CANTO_MAINNET_EVM } from "@/config/networks";

export default function usePool() {
  const { txStore, signer, chainId } = useCantoSigner();
  const connectedEthAccount = signer?.account.address ?? "";
  // all pairs (ambient and cantoDex)
  const mockCantoDexPairs = [
    {
      symbol: "MockToken1-CANTO",
      clmData: {
        userDetails: {
          chainId: 1,
          cTokenAddress: "0xMockAddress1",
          balanceOfCToken: "1000",
          balanceOfUnderlying: "500",
          borrowBalance: "200",
          rewards: "10",
          isCollateral: true,
          supplyBalanceInUnderlying: "700",
          underlyingAllowance: "1000",
        },
      },
    },
    {
      symbol: "MockToken2-CANTO",
      clmData: {
        userDetails: {
          chainId: 1,
          cTokenAddress: "0xMockAddress2",
          balanceOfCToken: "2000",
          balanceOfUnderlying: "1500",
          borrowBalance: "300",
          rewards: "20",
          isCollateral: false,
          supplyBalanceInUnderlying: "1200",
          underlyingAllowance: "1500",
        },
      },
    },
  ];

  const mockAmbientPools = [
    {
      address: "0xMockPoolAddress1",
      symbol: "MockPool1-ABC",
      logoURI: "",
      base: {
        dist: "0.04",
        supply: "0.06",
      },
      quote: {
        dist: "0.04",
        supply: "0.06",
      },
      poolIdx: 1,
      stable: true,
      rewardsLedger: "0xRewardsLedger1",
      stats: {
        latestTime: 1622540000,
        baseTvl: "1000",
        quoteTvl: "2000",
        baseVolume: "300",
        quoteVolume: "600",
        baseFees: "10",
        quoteFees: "20",
        lastPriceSwap: "1.5",
        lastPriceLiq: "1.45",
        lastPriceIndic: "1.47",
        feeRate: 0.003,
      },
      userPositions: [
        {
          chainId: "1",
          base: "100",
          quote: "200",
          poolIdx: 1,
          bidTick: 5000,
          askTick: 10000,
          isBid: true,
          user: "0xUserAddress1",
          timeFirstMint: 1622540000,
          latestUpdateTime: 1622545000,
          lastMintTx: "0xLastMintTx1",
          firstMintTx: "0xFirstMintTx1",
          positionType: "ambient",
          ambientLiq: "500",
          concLiq: "0",
          rewardLiq: "10",
          liqRefreshTime: 1622550000,
          aprDuration: 30,
          aprPostLiq: "0.2",
          aprContributedLiq: "0.15",
          aprEst: 0.25,
          positionId: "Pos1",
        },
      ],
      userRewards: "50",
      totals: {
        noteTvl: "1500",
        apr: {
          poolApr: "0.12",
          base: {
            dist: "0.03",
            supply: "0.05",
          },
          quote: {
            dist: "0.04",
            supply: "0.06",
          },
        },
      },
    },
    {
      address: "0xMockPoolAddress2",
      symbol: "MockPool1-ABC",
      logoURI: "",
      base: {
        dist: "0.04",
        supply: "0.06",
      },
      quote: {
        dist: "0.04",
        supply: "0.06",
      },
      poolIdx: 1,
      stable: true,
      rewardsLedger: "0xRewardsLedger1",
      stats: {
        latestTime: 1622540000,
        baseTvl: "1000",
        quoteTvl: "2000",
        baseVolume: "300",
        quoteVolume: "600",
        baseFees: "10",
        quoteFees: "20",
        lastPriceSwap: "1.5",
        lastPriceLiq: "1.45",
        lastPriceIndic: "1.47",
        feeRate: 0.003,
      },
      userPositions: [
        {
          chainId: "1",
          base: "100",
          quote: "200",
          poolIdx: 1,
          bidTick: 5000,
          askTick: 10000,
          isBid: true,
          user: "0xUserAddress1",
          timeFirstMint: 1622540000,
          latestUpdateTime: 1622545000,
          lastMintTx: "0xLastMintTx1",
          firstMintTx: "0xFirstMintTx1",
          positionType: "ambient",
          ambientLiq: "500",
          concLiq: "0",
          rewardLiq: "10",
          liqRefreshTime: 1622550000,
          aprDuration: 30,
          aprPostLiq: "0.2",
          aprContributedLiq: "0.15",
          aprEst: 0.25,
          positionId: "Pos1",
        },
      ],
      userRewards: "50",
      totals: {
        noteTvl: "1500",
        apr: {
          poolApr: "0.12",
          base: {
            dist: "0.03",
            supply: "0.05",
          },
          quote: {
            dist: "0.04",
            supply: "0.06",
          },
        },
      },
    },
  ];

  function useLPMock() {
    return {
      isLoading: false,
      pairs: {
        allCantoDex: mockCantoDexPairs,
        userCantoDex: mockCantoDexPairs, // Adjust based on your testing needs
        allAmbient: mockAmbientPools,
        userAmbient: mockAmbientPools, // Adjust based on your testing needs
      },
      rewards: {
        cantoDex: "100",
        ambient: "200",
        total: "300",
      },
      selection: {
        pair: null,
        setPair: () => {},
      },
      transactions: {
        // Mock transaction methods or provide stubs as needed
      },
    };
  }
  const fakePairs = useLPMock();
  const { isLoading, pairs, rewards, selection, transactions } = useLP({
    chainId,
    userEthAddress: connectedEthAccount,
  });
  /** general selection */
  const { pair: selectedPair, setPair } = selection;

  //   all pairs filtered by type
  const [filteredPairs, setFilteredPairs] = useState<string>("all");

  /** CANTO DEX */
  const sortedCantoDexPairs = pairs.allCantoDex.sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );
  function validateCantoDexTx(params: Partial<CantoDexTransactionParams>) {
    return transactions.validateCantoDexLPParams({
      chainId,
      ethAccount: connectedEthAccount,
      pair: selectedPair,
      ...params,
    } as CantoDexTransactionParams);
  }
  function sendCantoDexTxFlow(params: Partial<CantoDexTransactionParams>) {
    const flow = transactions.newCantoDexLPFlow({
      chainId,
      ethAccount: connectedEthAccount,
      pair: selectedPair,
      ...params,
    } as CantoDexTransactionParams);
    txStore?.addNewFlow({
      txFlow: flow,
      ethAccount: connectedEthAccount,
      onSuccessCallback: () => selection.setPair(null),
    });
  }

  /** AMBIENT */

  function validateAmbientTxParams(params: Partial<AmbientTransactionParams>) {
    return transactions.validateAmbientPoolTxParams({
      chainId,
      ethAccount: connectedEthAccount,
      pool: selectedPair,
      ...params,
    } as AmbientTransactionParams);
  }
  function sendAmbientTxFlow(params: Partial<AmbientTransactionParams>) {
    const flow = transactions.newAmbientPoolTxFlow({
      chainId,
      ethAccount: connectedEthAccount,
      pool: selectedPair,
      ...params,
    } as AmbientTransactionParams);

    txStore?.addNewFlow({
      txFlow: flow,
      ethAccount: connectedEthAccount,
      onSuccessCallback: () => selection.setPair(null),
    });
  }

  /** AMBIENT REWARDS TIMER */
  const [rewardTime, setRewardTime] = useState(0n);
  const getRewardsTime = async (): Promise<bigint> => {
    let remTime = 0n;
    const blocksInEpoch = BigInt(104272);
    const blockDuration = 5.8;
    let prevBlockNumber = BigInt(7841750);
    let remBlocksInEpoch = BigInt(104272);
    try {
      const blockNumber = await fetchBlockNumber({
        chainId: CANTO_MAINNET_EVM.chainId,
      });
      if (blockNumber) {
        const noOfWeeksToBeAdded =
          (blockNumber - prevBlockNumber) / blocksInEpoch;
        prevBlockNumber = prevBlockNumber + noOfWeeksToBeAdded * blocksInEpoch;
        remBlocksInEpoch = prevBlockNumber + blocksInEpoch - blockNumber;
        remTime = remBlocksInEpoch * BigInt(blockDuration * 1000);
      }
    } catch (err) {
      console.error(err);
    }
    return BigInt(Date.now()) + remTime;
  };
  useEffect(() => {
    async function setRewards() {
      try {
        setRewardTime(await getRewardsTime());
      } catch (err) {
        console.error(err);
      }
    }
    setRewards();
  }, []);

  /** REWARDS */

  function sendClaimRewardsFlow() {
    const flow = transactions.newClaimRewardsFlow();
    txStore?.addNewFlow({
      txFlow: flow,
      ethAccount: connectedEthAccount,
      onSuccessCallback: () => selection.setPair(null),
    });
  }

  const pairNames = {
    all: "All Pairs",
    stable: "Stable Pairs",
    volatile: "Volatile Pairs",
  };

  return {
    isLoading,
    fakePairs,
    rewards,
    rewardTime,
    filteredPairs,
    setFilteredPairs,
    selectedPair,
    setPair,
    sortedCantoDexPairs,
    validateCantoDexTx,
    sendCantoDexTxFlow,
    validateAmbientTxParams,
    sendAmbientTxFlow,
    sendClaimRewardsFlow,
    pairNames,
  };
}
