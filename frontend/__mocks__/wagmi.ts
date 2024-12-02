const wagmi = {
  configureChains: jest.fn(),
  createConfig: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  getAccount: jest.fn(),
  getNetwork: jest.fn(),
  watchAccount: jest.fn(),
  watchNetwork: jest.fn(),
  prepareWriteContract: jest.fn(),
  writeContract: jest.fn(),
  waitForTransaction: jest.fn(),
  readContract: jest.fn(),
  fetchBalance: jest.fn(),
  getWalletClient: jest.fn(),
  getPublicClient: jest.fn(),
};

module.exports = wagmi;
