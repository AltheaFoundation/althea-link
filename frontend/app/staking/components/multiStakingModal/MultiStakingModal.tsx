"use client";
import Container from "@/components/container/container";
import Spacer from "@/components/layout/spacer";
import {
  UnbondingDelegation,
  Validator,
  ValidatorWithDelegations,
} from "@/hooks/staking/interfaces/validators";
import styles from "./MultiStakingModal.module.scss";
import Text from "@/components/text";

import { displayAmount } from "@/utils/formatting/balances.utils";
import Button from "@/components/button/button";
import { useMemo, useState, useCallback, useEffect } from "react";
import { StakingTxTypes } from "@/transactions/staking";
import { StakingTabs } from "../stakingTab/MultiStakeTabs";

import Amount from "@/components/amount/amount";
import { Validation } from "@/config/interfaces";

import {
  CLAIM_STAKING_REWARD_FEE,
  DELEGATE_FEE,
  UNDELEGATE_FEE,
} from "@/config/consts/fees";
import BigNumber from "bignumber.js";

import styled from "styled-components";
import { DelegationRewards } from "@/hooks/staking/interfaces/hookParams";

interface MultiStakingModalParams {
  validators: Validator[];
  delegations: ValidatorWithDelegations[];

  cantoBalance: string;
  txValidation: (
    amount: string,
    selectedTx: StakingTxTypes,
    validators: Validator[]
  ) => Validation;
  onConfirm: (
    amount: string,
    selectedTx: StakingTxTypes,
    validators: Validator[]
  ) => void;
}
interface ValidatorRowProps {
  validator: Validator;
  isSelected: boolean;
  onSelectionChange: (validator: Validator) => void;
}

interface UnbondigRowProps {
  delegations: ValidatorWithDelegations;
  isSelected: boolean;
  onSelectionChange: (delegations: ValidatorWithDelegations) => void;
}

const ValidatorRow: React.FC<ValidatorRowProps> = ({
  validator,
  isSelected,
  onSelectionChange,
}) => {
  return (
    <tr
      key={validator.operator_address}
      className={isSelected ? "selected" : ""}
      onClick={() => onSelectionChange(validator)}
      style={{ cursor: "pointer" }}
    >
      <td>{validator.description.moniker}</td>
      <td>
        {displayAmount(
          BigNumber(validator.commission).multipliedBy(10000).toFixed(2),
          2,
          {
            short: true,
            commify: true,
            precision: 2,
          }
        )}
        %
      </td>
      <td>
        {displayAmount(
          BigNumber(validator.token_ratio).multipliedBy(10000).toFixed(2),
          2,
          {
            short: true,
            commify: true,
            precision: 2,
          }
        )}
        %
      </td>
    </tr>
  );
};

const UnbondingRow: React.FC<UnbondigRowProps> = ({
  delegations,
  isSelected,
  onSelectionChange,
}) => {
  return (
    <>
      <tr
        key={delegations.operator_address}
        className={isSelected ? "selected" : ""}
        onClick={() => onSelectionChange(delegations)}
        style={{ cursor: "pointer" }}
      >
        <td>{delegations.description.moniker}</td>
        <td>
          {displayAmount(
            BigNumber(delegations.userDelegation.balance)
              .multipliedBy(10000)
              .toFixed(2),
            2,
            {
              short: true,
              commify: true,
              precision: 2,
            }
          )}
        </td>
      </tr>
    </>
  );
};

export const MultiStakingModal = (props: MultiStakingModalParams) => {
  const [inputAmount, setInputAmount] = useState("");

  const maxAmount = props.cantoBalance;

  const [selectedValidators, setSelectedValidators] = useState<Validator[]>([]);

  const [selectedUnbonding, setSelectedUnbonding] = useState<
    ValidatorWithDelegations[]
  >([]);

  const [selectedTx, setSelectedTx] = useState<StakingTxTypes>(
    StakingTxTypes.MULTI_STAKE
  );
  const [activeTab, setActiveTab] = useState<"delegate" | "undelegate">(
    "delegate"
  );

  const feeMap = (txType: StakingTxTypes) => {
    switch (txType) {
      case StakingTxTypes.MULTI_STAKE:
        return DELEGATE_FEE.amount;
      case StakingTxTypes.MULTI_UNSTAKE:
        return UNDELEGATE_FEE.amount;
      case StakingTxTypes.CLAIM_REWARDS:
        return CLAIM_STAKING_REWARD_FEE.amount;
      default:
        return "0";
    }
  };

  const handleValidatorSelection = useCallback((validator: Validator) => {
    setSelectedValidators((prev: Validator[]) => {
      if (prev.includes(validator)) {
        return prev.filter(
          (v) => v.operator_address !== validator.operator_address
        );
      }
      return [...prev, validator];
    });
  }, []);

  const handleConfirm = () => {
    const amounts: { [key: string]: string } = selectedValidators.reduce(
      (acc, validator) => {
        acc[validator.operator_address as string] = new BigNumber(inputAmount)
          .dividedBy(selectedValidators.length)
          .toFixed(18)
          .toString();
        return acc;
      },
      {} as { [key: string]: string }
    );
  };

  const isValid = useMemo(() => {
    return (
      selectedValidators.length > 0 &&
      parseFloat(inputAmount) > 0 &&
      parseFloat(props.cantoBalance) >= parseFloat(inputAmount)
    );
  }, [props.cantoBalance, inputAmount, selectedValidators.length]);

  const delegateTable = (
    <ValidatorTable>
      <table>
        <thead>
          <tr>
            <th>Moniker</th>
            <th>Commission</th>
            <th>Voting Power</th>
          </tr>
        </thead>
        <tbody>
          {props.validators
            .filter(
              (validator) =>
                validator.status === "BOND_STATUS_BONDED" && !validator.jailed
            )
            .map((validator) => (
              <ValidatorRow
                key={validator.operator_address}
                validator={validator}
                isSelected={selectedValidators.includes(validator)}
                onSelectionChange={handleValidatorSelection}
              />
            ))}
        </tbody>
      </table>
    </ValidatorTable>
  );

  const undelegateTable = (
    <ValidatorTable>
      <table>
        <thead>
          <tr>
            <th>Moniker</th>
            <th>Staked</th>
          </tr>
        </thead>
        <tbody>
          {props.delegations && props.delegations.length > 0 ? (
            props.delegations.map((delegation) => (
              <UnbondingRow
                key={delegation.operator_address}
                delegations={delegation}
                isSelected={selectedUnbonding.includes(delegation)}
                onSelectionChange={handleValidatorSelection}
              />
            ))
          ) : (
            <tr>
              <td colSpan={2} style={{ textAlign: "center" }}>
                No Tokens Staked
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ValidatorTable>
  );

  const handleTabChange = (tab: "delegate" | "undelegate") => {
    setActiveTab(tab);
    setInputAmount("");
    if (tab == "delegate") {
      setSelectedTx(StakingTxTypes.MULTI_STAKE);
    }
    if (tab == "undelegate") {
      setSelectedTx(StakingTxTypes.MULTI_UNSTAKE);
    }
  };

  return (
    <Container className={styles.modalContainer}>
      <Spacer />
      <Container className={styles.spacer}>
        <Spacer></Spacer>
      </Container>

      <Spacer height="20px"></Spacer>

      <StakingTabs handleTabChange={handleTabChange} activeTab={activeTab} />
      <Spacer height="20px"></Spacer>
      {activeTab === "delegate" ? delegateTable : null}
      {activeTab === "undelegate" ? undelegateTable : null}

      <Spacer height="20px"></Spacer>
      <div className={styles.modalInfoRow}>
        <div>
          <Text>Enter Amount</Text>
        </div>
        <div className={styles.modalInfoRow2}></div>
      </div>

      <div>
        <Amount
          IconUrl={"/althea.svg"}
          title={"Althea"}
          symbol={"ALTHEA"}
          onChange={(val) => {
            setInputAmount(val.target.value);
          }}
          decimals={18}
          value={inputAmount}
          min={"0"}
          max={maxAmount}
        />
      </div>
      <Spacer height="10px" />
      <div style={{ width: "100%" }} className={styles.modalInfoRow}>
        <Text size="x-sm" color="#EE4B2B">
          Please Note: Undelegation period is 21 days
        </Text>
      </div>
      <Spacer height="20px" />
      <div>
        <Text size="x-sm" font="macan-font">
          GAS FEES :{" "}
          {displayAmount(feeMap(selectedTx), 18, {
            short: false,
            commify: false,
          })}{" "}
          ALTHEA
        </Text>
      </div>
      <Spacer height="20px"></Spacer>
      <div className={styles.buttonContainer}>
        <Button
          width="fill"
          onClick={() => {
            props.onConfirm(inputAmount, selectedTx, selectedValidators);
          }}
          disabled={!isValid}
        >
          {selectedTx}
        </Button>
      </div>
    </Container>
  );
};

const ValidatorTable = styled.div`
  width: 100%;
  max-height: 250px;
  overflow-y: auto;
  margin: 10px 0;
  border-radius: 4px;

  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  table {
    font:
      400 14px/20px "Macan",
      sans-serif;
    width: 100%;
    color: var(--darken-color);
    border-collapse: collapse;

    table-layout: fixed;
  }

  thead {
    text-align: center;
    background-color: var(--primary-light-color);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  th,
  td {
    padding: 12px 15px;
    text-align: center;
    border-bottom: 1px solid var(--highlights);
  }

  th {
    font-weight: 600;
  }

  tbody tr:hover {
  }

  tbody tr.selected {
    background-color: var(--background-color-start);
  }
`;
