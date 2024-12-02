import useTransactionStore from "@/stores/transactionStore";
import { NO_ERROR, NEW_ERROR } from "@/config/interfaces";
import { TransactionStatus } from "@/transactions/interfaces";
import { act } from "@testing-library/react";
import { TRANSACTION_FLOW_MAP } from "@/transactions/flows";
import { signTransaction, waitForTransaction } from "@/transactions/signTx";

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

// Mock transaction signing functions
jest.mock("@/transactions/signTx", () => ({
  signTransaction: jest.fn(),
  waitForTransaction: jest.fn(),
}));

// Mock network utils
jest.mock("@/utils/networks", () => ({
  getNetworkInfoFromChainId: jest.fn(() => ({
    data: {
      name: "Test Network",
      isTestChain: true,
      blockExplorer: {
        getTransactionLink: (hash: string) => `https://test.explorer/${hash}`,
      },
    },
  })),
  getCosmosEIPChainObject: jest.fn(),
  getLayerZeroTransactionlink: jest.fn(),
}));

// Mock analytics utils
jest.mock("@/utils/analytics", () => ({
  getAnalyticsTransactionFlowInfo: jest.fn(() => ({
    data: {
      flowId: "test-flow",
      txType: "TEST",
    },
  })),
}));

// Mock transaction flow map
jest.mock("@/transactions/flows", () => ({
  TRANSACTION_FLOW_MAP: {
    TEST: {
      tx: jest.fn(() =>
        Promise.resolve({
          data: {
            transactions: [
              {
                chainId: 1,
                type: "EVM",
                feTxType: "TEST",
              },
            ],
          },
          error: null,
        })
      ),
    },
  },
}));

describe("Transaction Store", () => {
  let store: ReturnType<typeof useTransactionStore.getState>;

  beforeEach(() => {
    // Reset the store to initial state
    store = useTransactionStore.getState();
    // Clear all user transactions
    Array.from(store.transactionFlows.keys()).forEach((key) => {
      store.clearTransactions(key);
    });
    // Reset the store to ensure it's completely clean
    store.transactionFlows = new Map();
    localStorage.clear();
    jest.clearAllMocks();

    // Mock transaction flow map for each test
    jest.mocked(TRANSACTION_FLOW_MAP.TEST.tx).mockImplementation(() =>
      Promise.resolve({
        data: {
          transactions: [
            {
              chainId: 1,
              type: "EVM",
              feTxType: "TEST",
            },
          ],
        },
        error: null,
      })
    );
  });

  afterEach(() => {
    // Clean up after each test
    store.transactionFlows = new Map();
    localStorage.clear();
  });

  describe("Basic Store Operations", () => {
    it("should initialize with empty transaction flows", () => {
      const store = useTransactionStore.getState();
      expect(store.transactionFlows.size).toBe(0);
    });

    it("should get empty array for non-existent user", () => {
      const store = useTransactionStore.getState();
      const flows = store.getUserTransactionFlows("nonExistentUser");
      expect(flows).toEqual([]);
    });

    it("should clear transactions for specific user", () => {
      const store = useTransactionStore.getState();
      const mockFlow = {
        id: "testFlow",
        createdAt: Date.now(),
        status: "NONE" as TransactionStatus,
        transactions: [],
        txType: "TEST",
        title: "Test Flow",
        icon: "test-icon",
        params: {},
        analyticsTransactionFlowInfo: {
          flowId: "test-flow",
          txType: "TEST",
        },
      };

      act(() => {
        store.transactionFlows.set("testUser", [mockFlow]);
      });

      store.clearTransactions("testUser");
      expect(store.getUserTransactionFlows("testUser")).toEqual([]);
    });

    it("should clear specific flow for user", () => {
      const store = useTransactionStore.getState();
      const mockFlows = [
        {
          id: "testFlow1",
          createdAt: Date.now(),
          status: "NONE" as TransactionStatus,
          transactions: [],
          txType: "TEST",
          title: "Test Flow 1",
          icon: "test-icon",
          params: {},
          analyticsTransactionFlowInfo: {
            flowId: "test-flow-1",
            txType: "TEST",
          },
        },
        {
          id: "testFlow2",
          createdAt: Date.now(),
          status: "NONE" as TransactionStatus,
          transactions: [],
          txType: "TEST",
          title: "Test Flow 2",
          icon: "test-icon",
          params: {},
          analyticsTransactionFlowInfo: {
            flowId: "test-flow-2",
            txType: "TEST",
          },
        },
      ];

      act(() => {
        store.transactionFlows.set("testUser", mockFlows);
      });

      store.clearTransactions("testUser", "testFlow1");
      const remainingFlows = store.getUserTransactionFlows("testUser");
      expect(remainingFlows.length).toBe(1);
      expect(remainingFlows[0].id).toBe("testFlow2");
    });
  });

  describe("Transaction Flow Management", () => {
    it("should add new flow and maintain limit", async () => {
      const store = useTransactionStore.getState();

      // Create mock flows sequentially
      for (let i = 0; i < 101; i++) {
        await store.addNewFlow({
          ethAccount: "testUser",
          txFlow: {
            txType: "TEST",
            title: `Test Flow ${i + 1}`,
            icon: "test-icon",
            params: {},
          },
        });
      }

      const flows = store.getUserTransactionFlows("testUser");
      expect(flows.length).toBe(100);
      expect(flows[0].title).toBe("Test Flow 2");
      expect(flows[98].title).toBe("Test Flow 100");
      expect(flows[99].title).toBe("Test Flow 101");
    });

    it("should handle transaction signing and status updates", async () => {
      // Mock successful signing
      (signTransaction as jest.Mock).mockResolvedValueOnce({
        data: "0x123",
        error: null,
      });

      // Mock successful transaction
      (waitForTransaction as jest.Mock).mockResolvedValueOnce({
        data: { status: "success" },
        error: null,
      });

      await store.addNewFlow({
        ethAccount: "testUser",
        txFlow: {
          txType: "TEST",
          title: "Test Flow",
          icon: "test-icon",
          params: {},
        },
      });

      const flows = store.getUserTransactionFlows("testUser");
      expect(flows.length).toBe(1);
      expect(flows[0].status).toBe("SUCCESS");
      expect(flows[0].transactions[0].status).toBe("SUCCESS");
      expect(flows[0].transactions[0].hash).toBe("0x123");
    });

    it("should handle transaction signing errors", async () => {
      const store = useTransactionStore.getState();
      const mockError = new Error("Signing failed");

      // Mock failed signing
      (signTransaction as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      await store.addNewFlow({
        ethAccount: "testUser",
        txFlow: {
          txType: "TEST",
          title: "Test Flow",
          icon: "test-icon",
          params: {},
        },
      });

      const flows = store.getUserTransactionFlows("testUser");
      expect(flows.length).toBe(1);
      expect(flows[0].status).toBe("ERROR");
      expect(flows[0].transactions[0].status).toBe("ERROR");
      expect(flows[0].transactions[0].error).toContain("Signing failed");
    });

    it("should handle transaction confirmation errors", async () => {
      const store = useTransactionStore.getState();
      const mockTxHash = "0x123";

      // Mock successful signing but failed confirmation
      (signTransaction as jest.Mock).mockResolvedValueOnce({
        data: mockTxHash,
        error: null,
      });

      (waitForTransaction as jest.Mock).mockResolvedValueOnce({
        data: { status: "failed", error: "Transaction reverted" },
        error: null,
      });

      await store.addNewFlow({
        ethAccount: "testUser",
        txFlow: {
          txType: "TEST",
          title: "Test Flow",
          icon: "test-icon",
          params: {},
        },
      });

      const flows = store.getUserTransactionFlows("testUser");
      expect(flows.length).toBe(1);
      expect(flows[0].status).toBe("ERROR");
      expect(flows[0].transactions[0].status).toBe("ERROR");
      expect(flows[0].transactions[0].hash).toBe(mockTxHash);
    });

    it("should handle bridge status updates", async () => {
      // Mock successful signing
      (signTransaction as jest.Mock).mockResolvedValueOnce({
        data: "0x123",
        error: null,
      });

      // Mock successful transaction
      (waitForTransaction as jest.Mock).mockResolvedValueOnce({
        data: { status: "success" },
        error: null,
      });

      // Override default mock for this test to include bridge
      jest.mocked(TRANSACTION_FLOW_MAP.TEST.tx).mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            transactions: [
              {
                chainId: 1,
                type: "EVM",
                feTxType: "TEST",
                bridge: {
                  status: "PENDING",
                  sourceChain: "ETH",
                  destChain: "COSMOS",
                },
              },
            ],
          },
          error: null,
        })
      );

      await store.addNewFlow({
        ethAccount: "testUser",
        txFlow: {
          txType: "TEST",
          title: "Bridge Flow",
          icon: "test-icon",
          params: {},
        },
      });

      const flow = store.getUserTransactionFlows("testUser")[0];
      store.setTxBridgeStatus("testUser", flow.id, 0, {
        status: "COMPLETED",
      });

      const flows = store.getUserTransactionFlows("testUser");
      expect(flows[0].transactions[0].tx.bridge?.status).toBe("COMPLETED");
    });

    it("should handle extra flows", async () => {
      // Mock successful signing for both flows
      (signTransaction as jest.Mock)
        .mockResolvedValueOnce({
          data: "0x123",
          error: null,
        })
        .mockResolvedValueOnce({
          data: "0x1234",
          error: null,
        });

      // Mock successful transactions for both flows
      (waitForTransaction as jest.Mock)
        .mockResolvedValueOnce({
          data: { status: "success" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { status: "success" },
          error: null,
        });

      // Override default mock for this test to include extra flow
      jest
        .mocked(TRANSACTION_FLOW_MAP.TEST.tx)
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: {
              transactions: [
                {
                  chainId: 1,
                  type: "EVM",
                  feTxType: "TEST",
                },
              ],
              extraFlow: {
                txFlowType: "TEST",
                params: {},
              },
            },
            error: null,
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: {
              transactions: [
                {
                  chainId: 1,
                  type: "EVM",
                  feTxType: "TEST",
                },
              ],
            },
            error: null,
          })
        );

      await store.addNewFlow({
        ethAccount: "testUser",
        txFlow: {
          txType: "TEST",
          title: "Flow with Extra",
          icon: "test-icon",
          params: {},
        },
      });

      const flows = store.getUserTransactionFlows("testUser");
      expect(flows.length).toBe(1);
      expect(flows[0].status).toBe("SUCCESS");
      expect(flows[0].transactions.length).toBe(2);
      expect(flows[0].transactions[0].status).toBe("SUCCESS");
      expect(flows[0].transactions[1].status).toBe("SUCCESS");
    });
  });
});
