import { useEffect, useState } from "react";
import {
  MAIN_BRIDGE_IN_NETWORKS,
  TEST_BRIDGE_NETWORKS,
} from "./config/networks";
import { CANTO_MAINNET_EVM, CANTO_TESTNET_EVM } from "@/config/networks";
import BRIDGE_IN_TOKEN_LIST from "@/config/jsons/bridgeInTokens.json";
import {
  NEW_ERROR,
  NO_ERROR,
  ReturnWithError,
  BaseNetwork,
  ERC20Token,
} from "@/config/interfaces";
import {
  BridgeHookInputParams,
  BridgeHookReturn,
  BridgeHookState,
  BridgeHookTxParams,
  HookSetterParam,
} from "./interfaces/hookParams";
import useAutoSelect from "../helpers/useAutoSelect";
import { BridgeInToken } from "./interfaces/tokens";
import useTokenBalances from "../helpers/useTokenBalances";
import {
  isERC20TokenList,
  isOFTToken,
  isBridgeInToken,
  isBridgeInTokenList,
} from "@/utils/tokens";
import { isValidEthAddress } from "@/utils/address";
import {
  BridgeTransactionParams,
  BridgingMethod,
  newCantoBridgeFlow,
  validateCantoBridgeTxParams,
} from "@/transactions/bridge";

export default function useBridgeIn(
  props: BridgeHookInputParams,
): BridgeHookReturn {
  // initial state with props
  const initialState = (testnet: boolean): BridgeHookState => ({
    // all options
    availableNetworks: testnet ? TEST_BRIDGE_NETWORKS : MAIN_BRIDGE_IN_NETWORKS,
    availableTokens: [],
    availableMethods: [],
    // default selections
    toNetwork: testnet ? CANTO_TESTNET_EVM : CANTO_MAINNET_EVM,
    fromNetwork: null,
    selectedToken: null,
    selectedMethod: null,
    // user addresses
    connectedEthAddress: null,
    connectedCosmosAddress: null,
    userInputCosmosAddress: null,
  });

  // state of the entire hook that will be exposed
  const [state, setState] = useState<BridgeHookState>(
    initialState(props.testnet ?? false),
  );

  ///
  /// internal hooks
  ///

  // if the user switches to testnet, we need to reset the state
  useEffect(() => {
    // don't reset connected addresses, just selections
    setState((prevState) => ({
      ...initialState(props.testnet ?? false),
      ...{
        connectedEthAddress: prevState.connectedEthAddress,
        connectedCosmosAddress: prevState.connectedCosmosAddress,
        userInputCosmosAddress: null,
      },
    }));
  }, [props.testnet]);

  // contains object mapping of the token balances
  const userTokenBalances = useTokenBalances(
    state.fromNetwork?.chainId,
    isERC20TokenList(state.availableTokens)
      ? (state.availableTokens.map((token) => {
          if (
            isOFTToken(token) &&
            token.isOFTProxy &&
            token.oftUnderlyingAddress
          ) {
            return {
              ...token,
              address: token.oftUnderlyingAddress,
            };
          }
          return token;
        }) as ERC20Token[])
      : [],
    state.connectedEthAddress,
    state.connectedCosmosAddress,
  );
  // will autoselect the first available network (only network can have default since loaded once)
  useAutoSelect(state.availableNetworks, setNetwork, props.defaults?.networkId);
  // will autoselect the first available token
  useAutoSelect(state.availableTokens, setToken);
  // will autoselect the first available method
  useAutoSelect(state.availableMethods, setMethod);

  ///
  /// internal functions
  ///

  function getNetwork(id: string): ReturnWithError<BaseNetwork> {
    const network = state.availableNetworks.find(
      (network) => network.id === id,
    );
    return network
      ? NO_ERROR(network)
      : NEW_ERROR("useBridgeIn::getNetwork: network not found:" + id);
  }
  function getToken(id: string): ReturnWithError<BridgeInToken> {
    const token = state.availableTokens.find((token) => token.id === id);

    if (!isBridgeInToken(token)) {
      return NEW_ERROR("useBridgeIn::getToken: invalid token type:" + id);
    }
    // check if we have a balance for the token
    const balance = userTokenBalances[token.id];
    if (balance !== undefined) {
      return NO_ERROR({ ...token, balance });
    }
    return NO_ERROR(token);
  }

  ///
  /// internal setter functions (not exposed to parent)
  ///

  // sets network and finds tokens for that network
  function setNetwork(id: string): void {
    //make sure new network was actually selected
    if (state.fromNetwork?.id === id) return;

    const { data: network, error: networkError } = getNetwork(id);
    if (networkError) {
      throw new Error("useBridgeIn::setNetwork::" + networkError.message);
    }
    const tokens =
      BRIDGE_IN_TOKEN_LIST.chainTokenList[
        network.id as keyof typeof BRIDGE_IN_TOKEN_LIST.chainTokenList
      ];

    if (!tokens || tokens.length === 0) {
      throw new Error(
        "useBridgeIn::setNetwork: No tokens available for network: " +
          network.id,
      );
    }
    // check token type to make sure they are all bridgeInTokens
    if (!isBridgeInTokenList(tokens)) {
      throw new Error(
        "useBridgeIn::setNetwork: Invalid token type for network: " +
          network.id,
      );
    }
    setState((prevState) => ({
      ...prevState,
      fromNetwork: network,
      availableTokens: tokens,
      // reset token and method selections
      selectedToken: null,
      availableMethods: [],
      selectedMethod: null,
    }));
  }

  // sets selected token and loads bridging methods for that token
  function setToken(id: string): void {
    //make sure new token was actually selected
    if (state.selectedToken?.id === id) return;

    const { data: token, error: tokenError } = getToken(id);
    if (tokenError) {
      throw new Error("useBridgeIn::setToken::" + tokenError.message);
    }
    const bridgeMethods = token.bridgeMethods;
    if (!bridgeMethods || bridgeMethods.length === 0) {
      throw new Error(
        "useBridgeIn::setToken: No bridging methods available for token: " +
          token.id,
      );
    }
    setState((prevState) => ({
      ...prevState,
      selectedToken: token,
      availableMethods: bridgeMethods,
      // reset method selection
      selectedMethod: null,
    }));
  }

  // sets selected bridging method only it actually exists on the token
  function setMethod(selectMethod: string): void {
    const method = selectMethod as BridgingMethod;
    //make sure new method was actually selected
    if (method === state.selectedMethod) return;

    if (!state.availableMethods.includes(method)) {
      throw new Error("useBridgeIn::setMethod: Invalid method: " + method);
    }
    setState((prevState) => ({
      ...prevState,
      selectedMethod: method,
    }));
  }

  // user address setters
  // pass in address of eth signer for transactions
  function setConnectedEthAddress(address: string): void {
    // check if valid address
    setState((prevState) => ({
      ...prevState,
      connectedEthAddress: isValidEthAddress(address) ? address : null,
    }));
  }
  // make sure this is called from the parent whenever cosmos network is selected
  function setConnectedCosmosAddress(address: string): void {
    // no need to check validity, this will be done inside any cosmos function
    setState((prevState) => ({
      ...prevState,
      connectedCosmosAddress: address,
    }));
  }
  // make sure this is called from the parent whenever cosmos address is changed
  function setUserInputCosmosAddress(address: string): void {
    // never a need to set this for bridging in, will always go to eth address
    return;
  }

  ///
  /// external functions
  ///

  // get the sender based on current tx state
  function getSender(): string | null {
    if (!state.selectedMethod) return null;
    switch (state.selectedMethod) {
      case BridgingMethod.GRAVITY_BRIDGE:
      case BridgingMethod.LAYER_ZERO:
        return state.connectedEthAddress;
      case BridgingMethod.IBC:
        return state.connectedCosmosAddress;
      default:
        return null;
    }
  }

  // get the receiver based on current tx state
  function getReceiver(): string | null {
    if (!state.selectedMethod) return null;
    switch (state.selectedMethod) {
      case BridgingMethod.LAYER_ZERO:
      case BridgingMethod.IBC:
      case BridgingMethod.GRAVITY_BRIDGE:
        return state.connectedEthAddress;
      default:
        return null;
    }
  }

  // this function is exposed to the parent component to set the state
  function generalSetter(paramName: HookSetterParam, id: string): void {
    // checks will be done internally
    switch (paramName) {
      case "network":
        return setNetwork(id);
      case "token":
        return setToken(id);
      case "method":
        return setMethod(id);
      case "ethAddress":
        return setConnectedEthAddress(id);
      case "cosmosAddress":
        return setConnectedCosmosAddress(id);
      case "inputCosmosAddress":
        return setUserInputCosmosAddress(id);
      default:
        throw new Error(
          "useBridgeIn::generalSetter: invalid param: " + paramName,
        );
    }
  }

  const bridgeTxParams = (
    params: BridgeHookTxParams,
  ): BridgeTransactionParams => ({
    method: state.selectedMethod,
    from: {
      chainId: state.fromNetwork?.chainId ?? "",
      account: getSender() ?? "",
    },
    to: {
      chainId: state.toNetwork?.chainId ?? "",
      account: getReceiver() ?? "",
    },
    token: {
      data: getToken(state.selectedToken?.id ?? "").data,
      amount: params.amount,
    },
  });

  return {
    direction: "in",
    testnet: props.testnet ?? false,
    allOptions: {
      networks: state.availableNetworks,
      tokens: state.availableTokens.map((token) => {
        const balance = userTokenBalances[token.id];
        return balance !== undefined ? { ...token, balance } : token;
      }),
      methods: state.availableMethods,
    },
    selections: {
      toNetwork: state.toNetwork,
      fromNetwork: state.fromNetwork,
      token: state.selectedToken ? getToken(state.selectedToken.id).data : null,
      method: state.selectedMethod,
    },
    addresses: {
      getSender,
      getReceiver,
    },
    setState: generalSetter,
    bridge: {
      validateParams: (params) =>
        validateCantoBridgeTxParams(bridgeTxParams(params)),
      newBridgeFlow: (params) => newCantoBridgeFlow(bridgeTxParams(params)),
    },
  };
}
