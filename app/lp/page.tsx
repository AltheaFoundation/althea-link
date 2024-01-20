"use client";
import Spacer from "@/components/layout/spacer";
import Modal from "@/components/modal/modal";
import Table from "@/components/table/table";
import {
  GeneralAmbientPairRow,
  GeneralCantoDexPairRow,
  UserAmbientPairRow,
  UserCantoDexPairRow,
} from "./components/pairRow";
import Text from "@/components/text";
import { CantoDexLPModal } from "./components/dexModals/cantoDexLPModal";
import styles from "./lp.module.scss";
import {
  isAmbientPool,
  isCantoDexPair,
} from "@/hooks/pairs/lpCombo/interfaces.ts/pairTypes";
import { AmbientModal } from "./components/ambient/ambientLPModal";
import { displayAmount } from "@/utils/formatting";
import Rewards from "./components/rewards";
import Container from "@/components/container/container";
import ToggleGroup from "@/components/groupToggle/ToggleGroup";
import usePool from "./utils";
import { getPriceFromTick } from "@/utils/ambient";
import Analytics from "@/provider/analytics";
import { useBlockNumber } from "wagmi";
import { useEffect, useState } from "react";
import { CANTO_MAINNET_EVM } from "@/config/networks";
import { TimeDisplayValues } from "@/hooks/pairs/newAmbient/interfaces/timeDisplay";
import {
  getAnalyticsCantoLiquidityPoolInfo,
  getAnalyticsAmbientLiquidityPoolInfo,
} from "@/utils/analytics";

export default function Page() {
  const {
    pairs,
    rewards,
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
  } = usePool();

  let prevBlockNumber = BigInt(7844908); //need to update after provided
  const blocksInEpoch = BigInt(104272);
  const blockDuration = 5.8;
  let remBlocksInEpoch = BigInt(104272);
  const { data: blockNumber } = useBlockNumber({
    chainId: CANTO_MAINNET_EVM.chainId,
    watch: true,
  });

  const UserAmbientRewardsTimer = (blockNumber: bigint | undefined) => {
    let remTime = 0n;
    if (blockNumber) {
      const noOfWeeksToBeAdded =
        (blockNumber - prevBlockNumber) / blocksInEpoch;
      prevBlockNumber = prevBlockNumber + noOfWeeksToBeAdded * blocksInEpoch;
      remBlocksInEpoch = prevBlockNumber + blocksInEpoch - blockNumber;
      remTime = remBlocksInEpoch * BigInt(blockDuration * 1000);
    }
    return remTime;
  };
  const getTimerObj = (remTime: bigint): string => {
    const stateObj: TimeDisplayValues = {
      days: Number(remTime / BigInt(1000 * 60 * 60 * 24)),
      hours: Number(
        (remTime % BigInt(1000 * 60 * 60 * 24)) / BigInt(1000 * 60 * 60)
      ),
      minutes: Number((remTime % BigInt(1000 * 60 * 60)) / BigInt(1000 * 60)),
      seconds: Number((remTime % BigInt(1000 * 60)) / BigInt(1000)),
    };
    return `${stateObj.days} : ${stateObj.hours} : ${stateObj.minutes} : ${stateObj.seconds}`;
  };
  const [timerObj, setTimerObj] = useState(getTimerObj(0n));
  useEffect(() => {
    let remTime = remBlocksInEpoch * BigInt(blockDuration * 1000);
    if (!blockNumber) {
      setTimerObj("Loading...");
      return;
    }
    remTime = UserAmbientRewardsTimer(blockNumber);
    setInterval(() => {
      if (remTime === 0n) {
        remTime = UserAmbientRewardsTimer(blockNumber);
      }
      remTime = remTime - 1000n;
      setTimerObj(getTimerObj(remTime));
    }, 1000);
  }, [blockNumber != undefined]);
  //main content
  return (
    <div className={styles.container}>
      <Modal
        width="min-content"
        padded={false}
        open={selectedPair !== null}
        onClose={() => setPair(null)}
        closeOnOverlayClick={true}
      >
        {selectedPair && isCantoDexPair(selectedPair) && (
          <CantoDexLPModal
            pair={selectedPair}
            validateParams={validateCantoDexTx}
            sendTxFlow={sendCantoDexTxFlow}
          />
        )}
        {selectedPair && isAmbientPool(selectedPair) && (
          <AmbientModal
            pool={selectedPair}
            sendTxFlow={sendAmbientTxFlow}
            verifyParams={validateAmbientTxParams}
          />
        )}
      </Modal>

      <Container direction="row" gap={"auto"} width="100%">
        <Text size="x-lg" font="proto_mono" className={styles.title}>
          Pools
        </Text>
        <Rewards
          onClick={sendClaimRewardsFlow}
          value={displayAmount(rewards.total, 18, {
            precision: 4,
          })}
        />
      </Container>
      <Spacer height="30px" />
      {pairs.userCantoDex.length + pairs.userAmbient.length > 0 && (
        <>
          <Table
            title="Your Pairs"
            headers={[
              { value: "Pair", ratio: 2 },
              { value: "APR", ratio: 1 },
              { value: "Pool Share", ratio: 1 },
              { value: "Value", ratio: 1 },
              { value: "Rewards", ratio: 1 },
              { value: "Edit", ratio: 1 },
            ]}
            content={[
              ...pairs.userAmbient.map((pool) =>
                UserAmbientPairRow({
                  pool,
                  onManage: (poolAddress) => {
                    Analytics.actions.events.liquidityPool.manageLPClicked(
                      getAnalyticsAmbientLiquidityPoolInfo(pool)
                    );
                    setPair(poolAddress);
                  },
                  rewards: rewards.ambient,
                  rewardsTimer: timerObj,
                })
              ),
              ...pairs.userCantoDex.map((pair) =>
                UserCantoDexPairRow({
                  pair,

                  onManage: (pairAddress) => {
                    Analytics.actions.events.liquidityPool.manageLPClicked(
                      getAnalyticsCantoLiquidityPoolInfo(pair)
                    );
                    setPair(pairAddress);
                  },
                })
              ),
            ]}
          />
          <Spacer height="20px" />
        </>
      )}

      <Table
        //@ts-ignore
        title={pairNames[filteredPairs]}
        secondary={
          <Container width="400px">
            <ToggleGroup
              options={["all", "stable", "volatile"]}
              selected={filteredPairs}
              setSelected={(value) => {
                Analytics.actions.events.liquidityPool.tabSwitched(value);
                setFilteredPairs(value);
              }}
            />
          </Container>
        }
        headers={[
          { value: "Pair", ratio: 2 },
          { value: "APR", ratio: 1 },
          { value: "TVL", ratio: 1 },
          { value: "Type", ratio: 1 },
          { value: "Action", ratio: 1 },
        ]}
        content={[
          ...pairs.allAmbient
            .filter(
              (pool) =>
                filteredPairs === "all" ||
                (filteredPairs === "stable" && pool.stable) ||
                (filteredPairs === "volatile" && !pool.stable)
            )
            .map((pool) =>
              GeneralAmbientPairRow({
                pool,
                onAddLiquidity: (poolAddress) => {
                  Analytics.actions.events.liquidityPool.addLPClicked({
                    lpType: "AMBIENT",
                    ambientLp: pool.symbol,
                  });
                  setPair(poolAddress);
                },
              })
            ),
          ...sortedCantoDexPairs
            .filter(
              (pair) =>
                filteredPairs === "all" ||
                (filteredPairs === "stable" && pair.stable) ||
                (filteredPairs === "volatile" && !pair.stable)
            )
            .map((pair) =>
              GeneralCantoDexPairRow({
                pair,
                onAddLiquidity: (pairAddress) => {
                  Analytics.actions.events.liquidityPool.addLPClicked({
                    lpType: "CANTO",
                    cantoLp: pair.symbol,
                  });
                  setPair(pairAddress);
                },
              })
            ),
        ]}
      />
      <Spacer height="40px" />
    </div>
  );
}
