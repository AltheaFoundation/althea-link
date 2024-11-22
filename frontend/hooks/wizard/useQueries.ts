import { useQuery } from "react-query";

const fetchBalance = async (address: string) => {
  const response = await fetch(
    `https://nodes.chandrastation.com/api/althea/cosmos/bank/v1beta1/balances/${address}`
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const useBalance = (address: string) => {
  return useQuery(["balance", address], () => fetchBalance(address), {
    enabled: !!address,
  });
};

const fetchAccountInfo = async (address: string) => {
  const response = await fetch(
    `https://nodes.chandrastation.com/api/althea/cosmos/auth/v1beta1/accounts/${address}`
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  let baseAccount;
  if (!data.account.base_account) {
    baseAccount = data.account;
  } else {
    baseAccount = data.account.base_account;
  }
  return {
    account_number: baseAccount.account_number,
    sequence: baseAccount.sequence,
  };
};

export const useAccountInfo = (address: string) => {
  return useQuery(["accountInfo", address], () => fetchAccountInfo(address), {
    enabled: !!address,
  });
};
