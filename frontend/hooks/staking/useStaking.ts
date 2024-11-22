import { CANTO_DATA_API_ENDPOINTS, getCantoApiData } from "@/config/api";
import {
  UnbondingDelegation,
  Validator,
  ValidatorWithDelegations,
} from "./interfaces/validators";
import { useQuery } from "react-query";
import {
  DelegationRewards,
  StakingHookInputParams,
  StakingHookReturn,
} from "./interfaces/hookParams";
import { getAllUserStakingData } from "./helpers/userStaking";
import { useState } from "react";
import { useBalance } from "wagmi";
import {
  validateStakingTxParams,
  newStakingFlow,
} from "@/transactions/staking";

export default function useStaking(
  params: StakingHookInputParams,
  options?: { refetchInterval?: number }
): StakingHookReturn {
  ///
  /// INTERNAL HOOKS
  ///

  // query staking data
  const { data: staking, isLoading } = useQuery(
    ["staking", params.chainId, params.userEthAddress],
    async () => {
      const [allValidators, stakingApr, userStaking] = await Promise.all([
        getCantoApiData<Validator[]>(
          params.chainId,
          CANTO_DATA_API_ENDPOINTS.allValidators
        ),
        getCantoApiData<string>(
          params.chainId,
          CANTO_DATA_API_ENDPOINTS.stakingApr
        ),
        getAllUserStakingData(params.chainId, params.userEthAddress),
      ]);

      // check if all validators error
      if (allValidators.error) throw allValidators.error;

      // if user staking data error, return all validators only
      if (userStaking.error) {
        return {
          validators: allValidators.data,
          apr: stakingApr.data ?? "0",
          userStaking: {
            validators: [],
            unbonding: userStaking.data.unbondingDelegations ?? [],
            rewards: userStaking.data.rewards ?? [],
          },
        };
      }

      // combine user delegation data with validator data
      const userValidators: ValidatorWithDelegations[] = [];
      // console.log(userStaking);
      // go through each user delegation
      if (
        userStaking.data.delegations &&
        userStaking.data.delegations.length > 0
      ) {
        userStaking.data.delegations.forEach((delegation) => {
          const validator = allValidators.data.find(
            (val) =>
              val.operator_address === delegation.delegation.validator_address
          );
          const rewards =
            userStaking.data.rewards.rewards
              .find(
                (rew) =>
                  rew.validator_address ===
                  delegation.delegation.validator_address
              )
              ?.reward?.find((bal) => bal.denom === "acanto")?.amount ?? "0";
          if (validator) {
            userValidators.push({
              ...validator,
              userDelegation: {
                balance: delegation.balance.amount,
                rewards: rewards,
              },
            });
          }
        });
      }
      const userUnbondingDelegations: UnbondingDelegation[] = userStaking.data
        .unbondingDelegations
        ? userStaking.data.unbondingDelegations.reduce<UnbondingDelegation[]>(
            (acc, unbondingEntry) => {
              const validator = allValidators.data.find(
                (val) =>
                  val.operator_address === unbondingEntry.validator_address
              );

              // If validator is not found, skip this entry
              if (!validator) {
                return acc;
              }

              // Directly create an UnbondingDelegation object from unbondingEntry
              const unbondingDelegation: UnbondingDelegation = {
                delegator_address: unbondingEntry.delegator_address,
                validator_address: validator.description.moniker, // Keep the address for data integrity
                creation_height: unbondingEntry.creation_height,
                completion_date: unbondingEntry.completion_time, // Make sure this is the correct field
                initial_balance: unbondingEntry.initial_balance,
                balance: unbondingEntry.balance,
              };

              return [...acc, unbondingDelegation];
            },
            [] as UnbondingDelegation[]
          )
        : [];
      return {
        validators: allValidators.data,
        apr: stakingApr.data ?? "0",
        userStaking: {
          validators: userValidators,
          unbonding: userUnbondingDelegations,
          rewards: userStaking.data.rewards,
        },
      };
    },
    {
      onError: (error) => {
        console.error(error);
      },
    }
  );

  // user native token balance
  const { data: userCantoBalance } = useBalance({
    chainId: params.chainId,
    address: params.userEthAddress as `0x${string}`,
  });

  ///
  /// Internal state for user selection
  ///
  const [selectedValidatorAddress, setSelectedValidatorAddress] = useState<
    string | null
  >(null);

  const getValidator = (
    address: string | null
  ): ValidatorWithDelegations | null => {
    if (!address) return null;
    // search for user validator first
    const userValidator = staking?.userStaking?.validators.find(
      (validator) => validator.operator_address === address
    );
    if (userValidator) return userValidator;
    // search for all validators
    const validator = staking?.validators.find(
      (validator) => validator.operator_address === address
    );
    if (validator)
      return { ...validator, userDelegation: { balance: "0", rewards: "0" } };
    return null;
  };

  return {
    isLoading,
    validators: staking?.validators ?? [],
    apr: staking?.apr ?? "0",
    selection: {
      validator: getValidator(selectedValidatorAddress),
      setValidator: setSelectedValidatorAddress,
    },
    transaction: {
      validateTxParams: validateStakingTxParams,
      newStakingFlow,
    },
    userStaking: {
      validators: staking?.userStaking?.validators ?? [],
      unbonding: staking?.userStaking?.unbonding as UnbondingDelegation[],
      cantoBalance: userCantoBalance?.value.toString() ?? "",
      rewards: staking?.userStaking.rewards as DelegationRewards,
    },
  };
}