export interface Proposal {
  proposal_id: number;
  content: {
    type_url: string;
    title: string;
    description: string;
  };
  status: ProposalStatus;
  final_tally_result: {
    yes: string;
    abstain: string;
    no: string;
    no_with_veto: string;
  };
  submit_time: string;
  deposit_end_time: string;
  total_deposit: string[];
  voting_start_time: string;
  voting_end_time: string;
  last_updated: number;
}

type ProposalStatus = 1 | 2 | 3 | 4 | 5;
// where:
// 1 = Deposit Period
// 2 = Voting Period
// 3 = Passed
// 4 = Rejected
// 5 = Failed
