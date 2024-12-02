const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.URL.createObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = jest.fn();
}

// Add fetch mock
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock wagmi hooks
jest.mock("wagmi", () => ({
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
}));

// Mock viem
jest.mock("viem", () => {
  class BaseError extends Error {
    name = "BaseError";
    details;

    constructor(message) {
      super(message);
      this.details = message;
    }
  }

  const mock = {
    createPublicClient: jest.fn(),
    http: jest.fn(),
    custom: jest.fn(),
    parseEther: jest.fn(),
    formatEther: jest.fn(),
    parseUnits: jest.fn(),
    formatUnits: jest.fn(),
    BaseError,
  };

  mock.default = mock;
  return mock;
});

// Mock gravity-bridge
jest.mock("@gravity-bridge/address-converter", () => ({
  ethToGravityAddress: jest.fn(),
  gravityToEthAddress: jest.fn(),
}));

// Mock the analytics module
jest.mock("@/provider/analytics", () => ({
  actions: {
    events: {
      transactionFlows: {
        generateTransactionsError: jest.fn(),
        started: jest.fn(),
        transaction: jest.fn(),
        success: jest.fn(),
      },
    },
  },
}));
