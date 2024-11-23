import {
  CosmosNativeMessage,
  EIP712Message,
  UnsignedCosmosMessages,
} from "@/transactions/interfaces";
import {
  MsgDelegate,
  MsgUndelegate,
} from "@buf/cosmos_cosmos-sdk.bufbuild_es/cosmos/staking/v1beta1/tx_pb.js";
import { Coin } from "@buf/cosmos_cosmos-sdk.bufbuild_es/cosmos/base/v1beta1/coin_pb";
import { DELEGATE_FEE, UNDELEGATE_FEE } from "@/config/consts/fees";
import { generateCosmosEIPTypes } from "@/transactions/cosmos/messages/base";

///
/// Will work for delegation and undelegation
/// Same params for both
///

const MSG_DELEGATE_TYPES = {
  MsgValue: [
    { name: "delegator_address", type: "string" },
    { name: "validator_address", type: "string" },
    { name: "amount", type: "TypeAmount" },
  ],
  TypeAmount: [
    { name: "denom", type: "string" },
    { name: "amount", type: "string" },
  ],
};

// undelegate should be set to true if unbonding
interface MessageDelegateParams {
  delegatorCantoAddress: string;
  validatorAddress: string;
  amount: string;
  denom: string;
  undelegate: boolean;
}

interface MessageMultiDelegateParams {
  delegatorCantoAddress: string;
  messages: {
    validatorAddress: string;
    amount: string;
    denom: string;
    undelegate: boolean;
  }[];
}

/**
 * @notice creates eip712 and cosmos proto messages for delegating
 * @param {MessageDelegateParams} params delegate parameters
 * @returns {UnsignedCosmosMessages} eip and cosmos messages along with types object and fee
 */
export function createMsgsDelegate(
  params: MessageDelegateParams,
): UnsignedCosmosMessages {
  const eipMsg = eip712MsgDelegate(params);
  const cosmosMsg = protoMsgDelegate(params);

  return {
    eipMsg,
    cosmosMsg,
    fee: params.undelegate ? UNDELEGATE_FEE : DELEGATE_FEE,
    typesObject: generateCosmosEIPTypes(MSG_DELEGATE_TYPES),
  };
}

/**
 * @notice creates eip712 and cosmos proto messages for multiple delegations or undelegations
 * @param {MessageMultiDelegateParams[]} paramsArray Array of delegate parameters
 * @returns {UnsignedCosmosMessages[]} Array of eip and cosmos messages along with types object and fee for each delegation
 */
export function createMultiMsgsDelegate(
  paramsArray: MessageMultiDelegateParams[],
): UnsignedCosmosMessages[] {
  return paramsArray.map((params) => {
    const eipMsg = eip712MultiMsgDelegate(params);
    const cosmosMsg = protoMultiMsgDelegate(params);

    return {
      eipMsg,
      cosmosMsg,
      fee: params.messages[0].undelegate ? UNDELEGATE_FEE : DELEGATE_FEE,
      typesObject: generateCosmosEIPTypes(MSG_DELEGATE_TYPES),
    };
  });
}

function eip712MsgDelegate(params: MessageDelegateParams): EIP712Message {
  return {
    type: params.undelegate
      ? "cosmos-sdk/MsgUndelegate"
      : "cosmos-sdk/MsgDelegate",
    value: {
      amount: {
        amount: params.amount,
        denom: params.denom,
      },
      delegator_address: params.delegatorCantoAddress,
      validator_address: params.validatorAddress,
    },
  };
}

function protoMsgDelegate(params: MessageDelegateParams): CosmosNativeMessage {
  const value = new Coin({
    amount: params.amount,
    denom: params.denom,
  });
  const messageParams = {
    amount: value,
    delegatorAddress: params.delegatorCantoAddress,
    validatorAddress: params.validatorAddress,
  };
  const message = params.undelegate
    ? new MsgUndelegate(messageParams)
    : new MsgDelegate(messageParams);
  return {
    message: {
      ...message,
      serializeBinary: () => message.toBinary(),
    },
    path: params.undelegate ? MsgUndelegate.typeName : MsgDelegate.typeName,
  };
}

function eip712MultiMsgDelegate(
  params: MessageMultiDelegateParams,
): EIP712Message[] {
  return params.messages.map((message) => ({
    type: message.undelegate
      ? "cosmos-sdk/MsgUndelegate"
      : "cosmos-sdk/MsgDelegate",
    value: {
      amount: {
        amount: message.amount,
        denom: message.denom,
      },
      delegator_address: params.delegatorCantoAddress,
      validator_address: message.validatorAddress,
    },
  }));
}

function protoMultiMsgDelegate(
  params: MessageMultiDelegateParams,
): CosmosNativeMessage[] {
  return params.messages.map((message) => {
    const value = new Coin({
      amount: message.amount,
      denom: message.denom,
    });
    const messageParams = {
      amount: value,
      delegatorAddress: params.delegatorCantoAddress,
      validatorAddress: message.validatorAddress, // Use current validator address
    };
    const messageType = message.undelegate
      ? new MsgUndelegate(messageParams)
      : new MsgDelegate(messageParams);
    return {
      message: {
        ...messageType,
        serializeBinary: () => messageType.toBinary(),
      },
      path: message.undelegate ? MsgUndelegate.typeName : MsgDelegate.typeName,
    };
  });
}
