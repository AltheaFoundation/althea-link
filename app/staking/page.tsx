"use client";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import useStaking from "@/hooks/staking/useStaking";
import styles from "./staking.module.scss";
import Text from "@/components/text";
import Spacer from "@/components/layout/spacer";
import Container from "@/components/container/container";
import Button from "@/components/button/button";
import Icon from "@/components/icon/icon";
import { MultiStakingModal } from "./components/multiStakingModal/MultiStakingModal";
import {
  convertToBigNumber,
  displayAmount,
  formatBalance,
  truncateNumber,
} from "@/utils/formatting/balances.utils";
import { formatPercent } from "@/utils/formatting";
import Table from "@/components/table/table";

import {
  GenerateMyStakingTableRow,
  GenerateUnbondingDelegationsTableRow,
  GenerateValidatorTableRow,
} from "./components/validatorTableRow";
import { useMemo, useState } from "react";
import { StakingModal } from "./components/stakingModal/StakingModal";
import { Validator } from "@/hooks/staking/interfaces/validators";
import Modal from "@/components/modal/modal";
import {
  StakingTransactionParams,
  StakingTxTypes,
} from "@/transactions/staking";
import { NEW_ERROR, Validation } from "@/config/interfaces";
import ToggleGroup from "@/components/groupToggle/ToggleGroup";
import { GetWalletClientResult } from "wagmi/actions";
import Input from "@/components/input/input";
import { PAGE_NUMBER } from "@/config/consts/config";
import { Pagination } from "@/components/pagination/Pagination";
import { levenshteinDistance } from "@/utils/staking/searchUtils";
import { WalletClient } from "wagmi";
import Analytics from "@/provider/analytics";

import LoadingComponent from "@/components/animated/loader";

export default function StakingPage() {
  // connected user info
  const { txStore, signer, chainId } = useCantoSigner();

  // staking hook
  const { isLoading, validators, apr, userStaking, selection, transaction } =
    useStaking({
      chainId: chainId,
      userEthAddress: signer?.account.address,
    });

  // handle txs
  function handleRewardsClaimClick(
    signer: GetWalletClientResult | undefined,
    validatorAddresses: string[]
  ) {
    if (signer && signer.account) {
      const newFlow = transaction.newStakingFlow({
        chainId: chainId,
        ethAccount: signer.account.address,
        txType: StakingTxTypes.CLAIM_REWARDS,
        validatorAddresses: validatorAddresses,
      });
      txStore?.addNewFlow({
        txFlow: newFlow,
        ethAccount: signer.account.address,
      });
    }
    return NEW_ERROR("signer not available");
  }

  const stakingTxParams = (
    signer: WalletClient,
    inputAmount: string,
    txType: StakingTxTypes,
    selectedValidators?: Validator[],
    validatorToRedelegate?: Validator | null | undefined
  ): StakingTransactionParams | null => {
    switch (txType) {
      case StakingTxTypes.REDELEGATE:
        if (!selection.validator || !validatorToRedelegate) return null;
        return {
          chainId: chainId,
          ethAccount: signer.account.address,
          txType: StakingTxTypes.REDELEGATE,
          validator: selection.validator,
          newValidatorAddress: validatorToRedelegate.operator_address,
          newValidatorName: validatorToRedelegate.description.moniker,
          amount: (convertToBigNumber(inputAmount, 18).data ?? "0").toString(),
        };
      case StakingTxTypes.DELEGATE:
      case StakingTxTypes.UNDELEGATE:
        if (!selection.validator) return null;
        return {
          chainId: chainId,
          ethAccount: signer.account.address,
          txType: txType,
          validator: selection.validator,
          amount: (convertToBigNumber(inputAmount, 18).data ?? "0").toString(),
          nativeBalance: userStaking?.cantoBalance ?? "0",
        };

      case StakingTxTypes.MULTI_STAKE:
        console.log(
          "Validators in stakingTxParams:",
          selectedValidators,
          inputAmount
        );
        if (!selectedValidators || selectedValidators.length === 0) {
          return null; // Or handle this case as needed
        }
        return {
          chainId: chainId,
          ethAccount: signer.account.address,
          txType: StakingTxTypes.MULTI_STAKE,
          validators: selectedValidators.map((validator) => ({
            validatorAddress: validator.operator_address,
            amount:
              convertToBigNumber(
                (Number(inputAmount) / selectedValidators.length).toString(),
                18
              ).data ?? "0",
          })),
          undelegate: false,
          nativeBalance: userStaking?.cantoBalance ?? "0",
        };
      default:
        return null;
    }
  };
  function handleStakingTxClick(
    inputAmount: string,
    txType: StakingTxTypes,
    validatorToRedelegate?: Validator | null,
    selectedValidators?: Validator[]
  ) {
    if (signer) {
      const txParams = stakingTxParams(
        signer,
        inputAmount,
        txType,
        txType === StakingTxTypes.MULTI_STAKE ? selectedValidators : undefined,
        validatorToRedelegate
      );
      if (txParams) {
        const newFlow = transaction.newStakingFlow(txParams);
        txStore?.addNewFlow({
          txFlow: newFlow,
          ethAccount: signer.account.address,
        });
      }
    }
  }

  function canConfirmTx(
    inputAmount: string,
    txType: StakingTxTypes,
    validatorToRedelegate?: Validator | null,
    selectedValidators?: Validator[]
  ): Validation {
    if (signer) {
      const txParams = stakingTxParams(
        signer,
        inputAmount,
        txType,
        txType === StakingTxTypes.MULTI_STAKE ? selectedValidators : undefined,
        validatorToRedelegate
      );
      if (txParams) {
        return transaction.validateTxParams(txParams);
      }
    }
    return { error: true, reason: "signer not available" };
  }

  // filers and search
  const [currentFilter, setCurrentFilter] = useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const allUserValidatorsAddresses: string[] =
    userStaking && Array.isArray(userStaking.validators)
      ? userStaking.validators.map((validator) => {
          return validator.operator_address;
        })
      : [];

  const { activeValidators, inActiveValidators } = useMemo(() => {
    const unsortedActiveValidators: Validator[] = [];
    const unsortedInActiveValidators: Validator[] = [];

    validators.forEach((validator) => {
      const isJailed = validator.jailed === true;
      const unsortedValidators = isJailed
        ? unsortedInActiveValidators
        : unsortedActiveValidators;

      unsortedValidators.push(validator);
    });

    // Sort active and inactive validators based on tokens
    const sortedActiveValidators = unsortedActiveValidators.sort((a, b) =>
      BigInt(a.tokens) < BigInt(b.tokens) ? 1 : -1
    );
    const sortedInActiveValidators = unsortedInActiveValidators.sort((a, b) =>
      BigInt(a.tokens) < BigInt(b.tokens) ? 1 : -1
    );

    // Add ranks based on the sorted order
    const activeValidators = sortedActiveValidators.map((validator, index) => ({
      ...validator,
      rank: index + 1,
    }));

    const inActiveValidators = sortedInActiveValidators.map(
      (validator, index) => ({
        ...validator,
        rank: index + 1,
      })
    );

    return { activeValidators, inActiveValidators };
  }, [validators]);

  const filteredValidators = useMemo(() => {
    if (searchQuery != "") {
      setCurrentPage(1);
      return currentFilter == "ACTIVE"
        ? [...activeValidators]
            .sort((a, b) => {
              return levenshteinDistance(searchQuery, a.description.moniker) >
                levenshteinDistance(searchQuery, b.description.moniker)
                ? 1
                : -1;
            })
            .filter(
              (e) => levenshteinDistance(searchQuery, e.description.moniker) < 6
            )
        : [...inActiveValidators]
            .sort((a, b) => {
              return levenshteinDistance(searchQuery, a.description.moniker) >
                levenshteinDistance(searchQuery, b.description.moniker)
                ? 1
                : -1;
            })
            .filter(
              (e) => levenshteinDistance(searchQuery, e.description.moniker) < 6
            );
    }
    return currentFilter == "ACTIVE" ? activeValidators : inActiveValidators;
  }, [currentFilter, activeValidators, inActiveValidators, searchQuery]);

  const totalPages = useMemo(
    () => Math.ceil(filteredValidators.length / PAGE_NUMBER),
    [filteredValidators.length]
  );

  const paginatedvalidators: Validator[] = filteredValidators.slice(
    (currentPage - 1) * PAGE_NUMBER,
    currentPage * PAGE_NUMBER
  );
  const hasUserStaked: boolean =
    userStaking && userStaking.validators && userStaking.validators.length > 0
      ? true
      : false;

  const totalStaked: number | undefined = hasUserStaked
    ? userStaking?.validators.reduce((sum, item) => {
        const amountNumber = parseFloat(
          formatBalance(item.userDelegation.balance, 18)
        );
        return sum + amountNumber;
      }, 0)
    : 0;

  const handlePageClick = (index: number) => {
    setCurrentPage(index);
  };

  function handleClick(validator: Validator) {
    selection.setValidator(validator.operator_address);
  }

  const [isMultiStakeModalOpen, setIsMultiStakeModalOpen] = useState(false);

  const openMultiStakeModal = () => {
    setIsMultiStakeModalOpen(true);
  };

  return isLoading ? (
    <div className={styles.loaderContainer}>
      <LoadingComponent size="lg" />
    </div>
  ) : (
    <div className={styles.container}>
      <div>
        <Spacer height="20px" />
      </div>
      <Text size="x-lg" font="macan-font" className={styles.title}>
        STAKING
      </Text>
      <Spacer height="20px" />
      <Container direction="row" gap={20} width="100%">
        <Container gap={20} width="100%">
          {userStaking && userStaking.unbonding.length > 0 && (
            <Table
              title="Unbonding Delegations"
              headerFont="macan-font"
              headers={[
                {
                  value: "Name",
                  ratio: 3,
                },
                {
                  value: "Undelegation",
                  ratio: 2,
                },
                {
                  value: "Completion Time",
                  ratio: 5,
                },
              ]}
              content={[
                ...userStaking.unbonding.map((userStakingElement, index) =>
                  GenerateUnbondingDelegationsTableRow(
                    userStakingElement,
                    index
                  )
                ),
              ]}
            />
          )}
          {hasUserStaked && userStaking && (
            <Table
              title="My Staking"
              headerFont="macan"
              headers={[
                {
                  value: "Name",
                  ratio: 5,
                },
                {
                  value: "My Stake",
                  ratio: 3,
                },
                {
                  value: "Total Stake",
                  ratio: 3,
                },
                {
                  value: "Commission",
                  ratio: 3,
                },
                {
                  value: <div />,
                  ratio: 3,
                },
              ]}
              content={[
                ...userStaking.validators
                  .filter(
                    (e) =>
                      Number(formatBalance(e.userDelegation.balance, 18)) >
                      0.0000001
                  )
                  .sort((a, b) =>
                    b.userDelegation.balance.localeCompare(
                      a.userDelegation.balance
                    )
                  )
                  .map((userStakingElement, index) =>
                    GenerateMyStakingTableRow(userStakingElement, index, () =>
                      handleClick(userStakingElement)
                    )
                  ),
              ]}
            />
          )}
          {validators.length > 0 && (
            <Table
              title={"VALIDATORS"}
              secondary={
                <Container
                  direction="row"
                  gap={20}
                  width="100%"
                  style={{
                    justifyContent: "flex-end",
                  }}
                >
                  <Input
                    height={38}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={"Search..."}
                  />
                  <Container width="200px">
                    <ToggleGroup
                      options={["ACTIVE", "INACTIVE"]}
                      selected={currentFilter}
                      setSelected={(value) => {
                        Analytics.actions.events.staking.tabSwitched(value);
                        setCurrentFilter(value);
                        setCurrentPage(1);
                        setSearchQuery("");
                      }}
                    />
                  </Container>
                </Container>
              }
              headerFont="macan-font"
              headers={[
                {
                  value: "Rank",
                  ratio: 2,
                },
                {
                  value: "Name",
                  ratio: 6,
                },
                {
                  value: "Total Stake",
                  ratio: 4,
                },
                {
                  value: "Commission",
                  ratio: 3,
                },
                {
                  value: <div />,
                  ratio: 4,
                },
              ]}
              content={
                paginatedvalidators.length > 0
                  ? [
                      ...paginatedvalidators.map((validator, index) =>
                        GenerateValidatorTableRow(validator, index, () =>
                          handleClick(validator)
                        )
                      ),
                      <Pagination
                        key="pagination"
                        currentPage={currentPage}
                        totalPages={totalPages}
                        handlePageClick={handlePageClick}
                      />,
                    ]
                  : [
                      <Container
                        key="noData"
                        height="400px"
                        center={{
                          horizontal: true,
                          vertical: true,
                        }}
                      >
                        <Text font="macan-font" size="lg">
                          NO {currentFilter} VALIDATORS FOUND
                        </Text>
                      </Container>,
                    ]
              }
            />
          )}
        </Container>
        <Container className={styles.infoCard}>
          <Container direction="column" width="100%" height="100%">
            <div className={styles.infoBox}>
              <div>
                <Text font="macan">Total Staked </Text>
              </div>
              <Container direction="row" center={{ vertical: true }}>
                <div style={{ marginRight: "5px" }}>
                  <Text font="macan-font" size="title">
                    {totalStaked}
                  </Text>
                </div>
                <p> </p>
                <Icon
                  themed
                  icon={{
                    url: "/althea.png",
                    size: 24,
                  }}
                />
              </Container>
            </div>
            <div className={styles.infoBox}>
              <div>
                <Text font="macan">APR</Text>
              </div>
              <Container direction="row" center={{ vertical: true }}>
                <Text font="macan-font" size="title">
                  {formatPercent((parseFloat(apr) / 100).toString())}
                </Text>
              </Container>
            </div>
            <div className={styles.infoBox}>
              <div>
                <Text font="macan">Rewards</Text>
              </div>
              <Container direction="row" center={{ vertical: true }}>
                <div style={{ marginRight: "5px" }}>
                  <Text font="macan-font" size="title">
                    {displayAmount(
                      userStaking.rewards?.total[0]?.amount &&
                        !isNaN(Number(userStaking.rewards?.total[0]?.amount))
                        ? userStaking.rewards?.total[0]?.amount
                        : "0.00",
                      18,
                      { precision: 2 }
                    )}
                  </Text>
                  <Text> </Text>
                </div>
                <Icon
                  themed
                  icon={{
                    url: "/althea.png",
                    size: 24,
                  }}
                />
              </Container>
            </div>
            <Spacer height="20px" />
            <Button
              width={"fill"}
              height="large"
              onClick={() =>
                handleRewardsClaimClick(signer, allUserValidatorsAddresses)
              }
              disabled={!signer || !hasUserStaked}
            >
              Claim Rewards
            </Button>
            <Spacer height="20px" />
            <Button
              width={"fill"}
              height="large"
              onClick={openMultiStakeModal}
              disabled={!signer}
            >
              Multi Stake
            </Button>
          </Container>
        </Container>
      </Container>

      <Modal
        width="32rem"
        onClose={() => {
          selection.setValidator(null);
        }}
        title="STAKE"
        closeOnOverlayClick={false}
        open={selection.validator != null}
      >
        <StakingModal
          validator={selection.validator}
          cantoBalance={userStaking?.cantoBalance ?? "0"}
          validators={validators}
          onConfirm={(amount, selectedTx, validatorToRedelegate) =>
            handleStakingTxClick(
              amount,
              selectedTx,
              validatorToRedelegate ?? undefined
            )
          }
          txValidation={(amount, selectedTx, validatorToRedelegate) =>
            canConfirmTx(amount, selectedTx, validatorToRedelegate ?? undefined)
          }
        />
      </Modal>
      <Modal
        width="32rem"
        onClose={() => {
          setIsMultiStakeModalOpen(false);
        }}
        title="MULTI STAKE"
        closeOnOverlayClick={false}
        open={isMultiStakeModalOpen}
      >
        <MultiStakingModal
          cantoBalance={userStaking?.cantoBalance ?? "0"}
          validators={validators}
          unbondings={userStaking?.unbonding}
          onConfirm={(amount, selectedTx, selectedValidators) =>
            handleStakingTxClick(
              amount,
              selectedTx,
              undefined,
              selectedValidators
            )
          }
          txValidation={(amount, selectedTx, selectedValidators) =>
            canConfirmTx(amount, selectedTx, undefined, selectedValidators)
          }
        />
      </Modal>
    </div>
  );
}
