import { useQuery } from "react-query";

export const useCosmosBalance = (address: string) => {
    return useQuery(["cosmosBalance", address], async () => {
        const response = await fetch(`https://nodes.chandrastation.com/api/althea/cosmos/bank/v1beta1/balances/${address}/by_denom/aalthea`);
        const data = await response.json();
        return data;
    });
}