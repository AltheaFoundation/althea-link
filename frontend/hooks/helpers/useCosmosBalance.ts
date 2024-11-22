import { useQuery } from "react-query";

export const useCosmosBalance = (address: string) => {
    return useQuery(["cosmosBalance", address], async () => {
        const response = await fetch(`http://testnet.althea.net:1317cosmos/bank/v1beta1/balances/${address}/by_denom/aalthea`);
        const data = await response.json();
        return data;
    });
}