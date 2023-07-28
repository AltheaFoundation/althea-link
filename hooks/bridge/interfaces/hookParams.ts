import { BaseNetwork } from "@/config/interfaces/networks";
import { BridgeToken, BridgingMethod } from "./tokens";
import { PromiseWithError } from "@/config/interfaces/errors";
import { Transaction } from "@/config/interfaces/transactions";

export interface BridgeHookInputParams {
  testnet?: boolean;
  defaults?: {
    networkId?: string;
  };
}

export interface BridgeHookReturn {
  testnet: boolean;
  allOptions: {
    networks: BaseNetwork[];
    tokens: BridgeToken[];
    methods: BridgingMethod[];
  };
  selections: {
    toNetwork: BaseNetwork | null;
    fromNetwork: BaseNetwork | null;
    token: BridgeToken | null;
    method: BridgingMethod | null;
  };
  setters: {
    network: (id: string) => void;
    token: (id: string) => void;
    method: (method: BridgingMethod) => void;
  };
  bridge: () => PromiseWithError<Transaction[]>;
}

export interface BridgeHookState {
  // all options
  availableNetworks: BaseNetwork[];
  availableTokens: BridgeToken[];
  availableMethods: BridgingMethod[];
  // default selections
  toNetwork: BaseNetwork | null;
  fromNetwork: BaseNetwork | null;
  selectedToken: BridgeToken | null;
  selectedMethod: BridgingMethod | null;
}
