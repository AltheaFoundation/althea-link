///
/// Hook to get an object of token balances for a given address and available tokens
/// Will return a mappping of token id => balance
///

import { ERC20Token } from "@/config/interfaces/tokens";
import { UserTokenBalances } from "../bridge/interfaces/tokens";
import { useEffect, useState } from "react";
import { getEVMTokenBalanceList } from "@/utils/evm/erc20.utils";
import { getCosmosTokenBalanceList } from "@/utils/cosmos/cosmosBalance.utils";

export default function useTokenBalances(
  chainId: number | string | undefined,
  tokens: ERC20Token[],
  userEthAddress: string | undefined,
  userCosmosAddress: string | undefined
): UserTokenBalances {
  // state for balances of tokens
  const [userTokenBalances, setUserTokenBalances] = useState<UserTokenBalances>(
    {}
  );
  useEffect(() => {
    async function setTokenBalances(): Promise<void> {
      // only set balances if there is a user and the chain is an evm chain
      if (typeof chainId === "number" && userEthAddress) {
        const { data: balances, error: balancesError } =
          await getEVMTokenBalanceList(chainId, tokens, userEthAddress);
        if (balancesError) {
          setUserTokenBalances({});
          console.log(
            "useTokenBalances::setTokenBalances::" + balancesError.message
          );
          return;
        }
        setUserTokenBalances(balances);
      } else if (typeof chainId === "string" && userCosmosAddress) {
        const { data: balances, error: balancesError } =
          await getCosmosTokenBalanceList(chainId, userCosmosAddress);
        if (balancesError) {
          setUserTokenBalances({});
          console.log(
            "useTokenBalances::setTokenBalances::" + balancesError.message
          );
          return;
        }
        setUserTokenBalances(balances);
      } else {
        // remove balance object
        setUserTokenBalances({});
      }
    }
    // timeout will act as debounce, if multiple deps are changed at the same time
    const setAllBalances = setTimeout(() => setTokenBalances(), 1000);
    return () => clearTimeout(setAllBalances);
  }, [chainId, tokens, userEthAddress, userCosmosAddress]);

  return userTokenBalances;
}
