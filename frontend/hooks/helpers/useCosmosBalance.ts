import { useQuery } from "react-query";

export const useCosmosBalance = (address: string) => {
  return useQuery(["cosmosBalance", address], async () => {
    const response = await fetch(
      `http://testnet.althea.net:1317/cosmos/bank/v1beta1/balances/${address}/by_denom/aalthea`
    );
    const data = await response.json();
    return data;
  });
};

export const useTotalBondedTokens = () => {
  return useQuery(["totalBondedTokens"], async () => {
    const response = await fetch(
      "http://testnet.althea.net:1317cosmos/staking/v1beta1/pool"
    );
    const data = await response.json();
    return data.pool.bonded_tokens;
  });
};
