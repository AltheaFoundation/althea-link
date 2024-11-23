import { ProposalVoteTxParams } from ".";
import { NewTransactionFlow, TransactionFlowType } from "../flows";

export const newVoteFlow = (
  txParams: ProposalVoteTxParams,
): NewTransactionFlow => ({
  title: "Voting",
  icon: "/tokens/althea.svg",
  txType: TransactionFlowType.VOTE_TX,
  params: txParams,
});
