const getEthAddressLink = (explorerUrl: string) => (address: string) =>
  `${explorerUrl}/address/${address}`;

const getEthTransactionLink = (explorerUrl: string) => (txnId: string) =>
  `${explorerUrl}/transaction/${txnId}`;

const getCosmosAddressLink = (explorerUrl: string) => (address: string) =>
  `${explorerUrl}/accounts/${address}`;

const getCosmosTransactionLink = (explorerUrl: string) => (txnId: string) =>
  `${explorerUrl}/transaction/${txnId}`;

const checkCosmosAddress = (prefix: string) => (address: string) =>
  address.startsWith(prefix);

const truncateAddress = (address: string) => {
  if (address.startsWith("althea")) {
    return address.slice(0, 7) + "..." + address.slice(-4);
  }
  return address.slice(0, 4) + "..." + address.slice(-4);
};

export {
  getEthAddressLink,
  getEthTransactionLink,
  getCosmosAddressLink,
  getCosmosTransactionLink,
  checkCosmosAddress,
  truncateAddress,
};
