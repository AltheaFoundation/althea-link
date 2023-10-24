import {
  BaseNetwork,
  NewTransactionFlow,
  ReturnWithError,
} from "@/config/interfaces";
import { BridgeToken } from "./tokens";
import { BridgingMethod } from "../interfaces/bridgeMethods";

export interface BridgeHookInputParams {
  testnet?: boolean;
  defaults?: {
    networkId?: string;
  };
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
  // user addresses
  connectedEthAddress: string | null;
  connectedCosmosAddress: string | null;
  // only when ibc out of canto does this need to be set
  userInputCosmosAddress: string | null;
}

export interface BridgeTransactionParams {
  from: {
    chainId: string | number;
    account: string;
  };
  to: {
    chainId: string | number;
    account: string;
  };
  token: {
    data: BridgeToken;
    amount: string;
  };
  method: BridgingMethod | null;
}

export interface BridgeHookTxParams {
  amount: string;
}

export interface BridgeHookReturn {
  direction: "in" | "out";
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
  setState: (param: HookSetterParam, value: any) => void;
  addresses: {
    getSender: () => string | null;
    getReceiver: () => string | null;
  };
  bridge: {
    createNewBridgeFlow: (
      params: BridgeHookTxParams
    ) => ReturnWithError<NewTransactionFlow>;
    canBridge: (params: BridgeHookTxParams) => ReturnWithError<boolean>;
  };
}

export type HookSetterParam =
  | "network"
  | "token"
  | "method"
  | "ethAddress"
  | "cosmosAddress"
  | "inputCosmosAddress";