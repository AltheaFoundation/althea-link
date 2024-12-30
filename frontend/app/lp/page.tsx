"use client";
import Spacer from "@/components/layout/spacer";
import Modal from "@/components/modal/modal";
import Table from "@/components/table/table";
import {
  GeneralAmbientPairRow,
  UserAmbientPairRow,
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
import Analytics from "@/provider/analytics";
import { getAnalyticsAmbientLiquidityPoolInfo } from "@/utils/analytics";
import useScreenSize from "@/hooks/helpers/useScreenSize";
import { useChain } from "@cosmos-kit/react";
import { WalletWizardModal } from "@/components/walletWizard/wizardModal";
import ToastWizard from "@/components/walletWizard/wizardToast";
import { useState, useEffect } from "react";

export default function Page() {
  const {
    pairs,
    rewards,
    filteredPairs,
    setFilteredPairs,
    selectedPair,
    setPair,
    validateAmbientTxParams,
    sendAmbientTxFlow,
    sendClaimRewardsFlow,
    pairNames,
    rewardTime,
  } = usePool();

  const [isWalletWizardOpen, setIsWalletWizardOpen] = useState(false);
  const [showToast, setShowToast] = useState(true);
  const { address } = useChain("althea");

  // Initialize showToast from localStorage only when there's no address
  useEffect(() => {
    if (!address) {
      const toastClosed = localStorage.getItem("wizardToastClosed");
      if (toastClosed === null) {
        setShowToast(true);
      } else {
        setShowToast(false);
      }
    } else {
      // If address is connected, always show toast
      setShowToast(true);
    }
  }, [address]); // Re-run when address changes

  const handleCloseToast = () => {
    setShowToast(false);
    // Only store in localStorage if there's no address
    if (!address) {
      localStorage.setItem("wizardToastClosed", "true");
    }
  };

  //   if mobile only
  // if (!window.matchMedia("(min-width: 768px)").matches) {
  //   return <DesktopOnly />;
  // }
  const { isMobile } = useScreenSize();
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
        {selectedPair && isAmbientPool(selectedPair) && (
          <AmbientModal
            pool={selectedPair}
            sendTxFlow={sendAmbientTxFlow}
            verifyParams={validateAmbientTxParams}
            isMobile
          />
        )}
      </Modal>

      <Container
        direction={isMobile ? "column" : "row"}
        gap={isMobile ? 10 : "auto"}
        width="100%"
      >
        <Text size="x-lg" font="nm_plex" className={styles.title}>
          POOLS
        </Text>
        <Rewards
          onClick={sendClaimRewardsFlow}
          value={displayAmount(rewards.total, 18, {
            precision: 4,
          })}
        />
      </Container>
      <Spacer height="30px" />
      {pairs.userAmbient.length > 0 && (
        <>
          <Table
            title="Your Pairs"
            headerFont="macan-font"
            headers={[
              { value: "Pair", ratio: 2 },
              { value: "APR", ratio: 1 },
              { value: "Pool Share", ratio: 1, hideOnMobile: true },
              { value: "Value", ratio: 1 },
              { value: "Rewards", ratio: 1, hideOnMobile: true },
              { value: "Edit", ratio: 1, hideOnMobile: true },
            ]}
            onRowsClick={
              isMobile
                ? [
                    ...pairs.userAmbient.map((pool) => () => {
                      Analytics.actions.events.liquidityPool.manageLPClicked(
                        // @ts-ignore
                        getAnalyticsAmbientLiquidityPoolInfo(pool)
                      );
                      setPair(pool.address);
                      // interface BaseAmbientPool {
                      //   address: string; // this address will never be used for transactions, just for identification in hook
                      //   symbol: string;
                      //   logoURI: string;
                      //   base: AmbientPoolToken;
                      //   quote: AmbientPoolToken;
                      //   poolIdx: number;
                      //   stable: boolean;
                      //   rewardsLedger: string;
                      // }
                      // interface AmbientPool extends BaseAmbientPool {
                      //   stats: {
                      //     latestTime: number;
                      //     baseTvl: string;
                      //     quoteTvl: string;
                      //     baseVolume: string;
                      //     quoteVolume: string;
                      //     baseFees: string;
                      //     quoteFees: string;
                      //     lastPriceSwap: string;
                      //     lastPriceLiq: string;
                      //     lastPriceIndic: string;
                      //     feeRate: number;
                      //   };
                      //   userPositions: AmbientUserPosition[];
                      //   userRewards: string;
                      //   totals: {
                      //     noteTvl: string;
                      //     apr: {
                      //       poolApr: string;
                      //       // each token could have underlying apr from the lending market
                      //       base?: {
                      //         dist: string;
                      //         supply: string;
                      //       };
                      //       quote?: {
                      //         dist: string;
                      //         supply: string;
                      //       };
                      //     };
                      //   };
                      // }
                    }),
                  ]
                : undefined
            }
            content={[
              ...pairs.userAmbient.map((pool) =>
                UserAmbientPairRow({
                  // @ts-ignore
                  pool,
                  onManage: (poolAddress) => {
                    Analytics.actions.events.liquidityPool.manageLPClicked(
                      // @ts-ignore
                      getAnalyticsAmbientLiquidityPoolInfo(pool)
                    );
                    setPair(poolAddress);
                  },
                  rewardTime: rewardTime,
                  isMobile,
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
          <Container
            width={!isMobile ? "400px" : "100%"}
            style={isMobile ? { paddingBottom: "1rem" } : {}}
          >
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
        headerFont="macan-font"
        headers={[
          { value: "Pair", ratio: 2 },
          { value: "APR", ratio: 1 },
          { value: "TVL", ratio: 1 },
          { value: "Type", ratio: 1, hideOnMobile: true },
          { value: "Action", ratio: 1, hideOnMobile: true },
        ]}
        onRowsClick={
          isMobile
            ? [
                ...pairs.allAmbient
                  .filter(
                    (pool) =>
                      filteredPairs === "all" ||
                      (filteredPairs === "stable" && pool.stable) ||
                      (filteredPairs === "volatile" && !pool.stable)
                  )
                  .map((pool) => () => {
                    Analytics.actions.events.liquidityPool.addLPClicked({
                      lpType: "AMBIENT",
                      ambientLp: pool.symbol,
                    });
                    setPair(pool.address);
                  }),
              ]
            : undefined
        }
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
                // @ts-ignore
                pool,
                onAddLiquidity: (poolAddress) => {
                  Analytics.actions.events.liquidityPool.addLPClicked({
                    lpType: "AMBIENT",
                    ambientLp: pool.symbol,
                  });
                  setPair(poolAddress);
                },
                isMobile,
              })
            ),
        ]}
      />
      <Spacer height="40px" />
      <div id="modal-root">
        {showToast && address && (
          <ToastWizard
            isVisible={true}
            onOpenModal={() => setIsWalletWizardOpen(true)}
            onClose={handleCloseToast}
          />
        )}
        <WalletWizardModal
          isOpen={isWalletWizardOpen}
          onOpen={setIsWalletWizardOpen}
        />
      </div>
    </div>
  );
}
