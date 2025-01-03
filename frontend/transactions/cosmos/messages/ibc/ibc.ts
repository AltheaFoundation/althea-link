import {
  CosmosNativeMessage,
  EIP712Message,
  UnsignedCosmosMessages,
} from "@/transactions/interfaces";
import { MsgTransfer } from "@buf/cosmos_ibc.bufbuild_es/ibc/applications/transfer/v1/tx_pb.js";
import { Height } from "@buf/cosmos_ibc.bufbuild_es/ibc/core/client/v1/client_pb.js";
import { Coin } from "@buf/cosmos_cosmos-sdk.bufbuild_es/cosmos/base/v1beta1/coin_pb";
import { IBC_FEE } from "@/config/consts/fees";
import { generateCosmosEIPTypes } from "../base";

const IBC_MSG_TYPES = {
  MsgValue: [
    { name: "source_port", type: "string" },
    { name: "source_channel", type: "string" },
    { name: "token", type: "TypeToken" },
    { name: "sender", type: "string" },
    { name: "receiver", type: "string" },
    { name: "timeout_height", type: "TypeTimeoutHeight" },
    { name: "timeout_timestamp", type: "uint64" },
  ],
  TypeToken: [
    { name: "denom", type: "string" },
    { name: "amount", type: "string" },
  ],
  TypeTimeoutHeight: [
    { name: "revision_number", type: "uint64" },
    { name: "revision_height", type: "uint64" },
  ],
};
interface MessageIBCOutParams {
  // Channel
  sourcePort: string;
  sourceChannel: string;
  // Token
  amount: string;
  denom: string;
  // Addresses
  cosmosReceiver: string;
  cosmosSender: string;
  // Timeout
  revisionNumber: number;
  revisionHeight: number;
  timeoutTimestamp: string;
  // Memo
  memo: string;
}

/**
 * @notice creates eip712 and cosmos proto messages for sending IBC out
 * @param {MessageIBCOutParams} params IBC out parameters
 * @returns {UnsignedCosmosMessages} eip and cosmos messages along with types object and fee
 */
export function createMsgsIBCTransfer(
  params: MessageIBCOutParams,
): UnsignedCosmosMessages {
  const eipMsg = eip712MsgIBCTransfer(params);
  const cosmosMsg = protoMsgIBCTransfer(params);
  return {
    eipMsg,
    cosmosMsg,
    fee: IBC_FEE,
    typesObject: generateCosmosEIPTypes(IBC_MSG_TYPES),
  };
}

function eip712MsgIBCTransfer(params: MessageIBCOutParams): EIP712Message {
  return {
    type: "cosmos-sdk/MsgTransfer",
    value: {
      receiver: params.cosmosReceiver,
      sender: params.cosmosSender,
      source_channel: params.sourceChannel,
      source_port: params.sourcePort,
      timeout_height: {
        revision_height: params.revisionHeight.toString(),
        revision_number: params.revisionNumber.toString(),
      },
      timeout_timestamp: params.timeoutTimestamp,
      token: {
        amount: params.amount,
        denom: params.denom,
      },
    },
  };
}

function protoMsgIBCTransfer(params: MessageIBCOutParams): CosmosNativeMessage {
  const token = new Coin({
    denom: params.denom,
    amount: params.amount,
  });
  const height = new Height({
    revisionNumber: BigInt(params.revisionNumber),
    revisionHeight: BigInt(params.revisionHeight),
  });
  const message = new MsgTransfer({
    sourcePort: params.sourcePort,
    sourceChannel: params.sourceChannel,
    token,
    sender: params.cosmosSender,
    receiver: params.cosmosReceiver,
    timeoutHeight: height,
    timeoutTimestamp: BigInt(parseInt(params.timeoutTimestamp, 10)),
  });
  // add serializeBinary function for signing package
  return {
    message: { ...message, serializeBinary: () => message.toBinary() },
    path: MsgTransfer.typeName,
  };
}
