"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Text from "@/components/text";
import styles from "./proposalModal.module.scss";
import {
  calculateVotePercentages,
  formatProposalStatus,
  formatProposalType,
  formatTime,
} from "@/utils/gov/formatData";
import Icon from "@/components/icon/icon";
import Button from "@/components/button/button";
import useProposals from "@/hooks/gov/useProposals";
import { useState } from "react";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import Splash from "@/components/splash/splash";
import { VoteOption } from "@/transactions/gov";
import { NEW_ERROR } from "@/config/interfaces";
import { VotingInfoBox } from "../components/VotingInfoBox/VotingInfoBox";
import {
  PROPOSAL_QUORUM_VALUE,
  PROPOSAL_VETO_THRESHOLD,
} from "@/config/consts/config";

import Spacer from "@/components/layout/spacer";
import useStaking from "@/hooks/staking/useStaking";
import { VoteBarGraph } from "../components/votingChart/voteGraph";
import LoadingComponent from "@/components/animated/loader";

const VOTE_OPTION_COLORS = {
  [VoteOption.YES]: [
    "var(--vote-box-yes-color)",
    "var(--vote-box-yes-stroke-color)",
  ],
  [VoteOption.NO]: [
    "var(--vote-box-no-color)",
    "var(--vote-box-no-stroke-color)",
  ],
  [VoteOption.VETO]: [
    "var(--vote-box-veto-color)",
    "var(--vote-box-veto-stroke-color)",
  ],
  [VoteOption.ABSTAIN]: [
    "var(--vote-box-abstain-color)",
    "var(--vote-box-abstain-stroke-color)",
  ],
};

export default function Page() {
  // signer information
  const { txStore, signer, chainId } = useCantoSigner();
  // get proposals
  const { proposals, isProposalsLoading, newVoteFlow } = useProposals({
    chainId: chainId,
  });

  const { userStaking } = useStaking({
    chainId: chainId,
    userEthAddress: signer?.account.address,
  });
  // transaction
  function castVote(proposalId: number, voteOption: VoteOption | null) {
    if (signer) {
      if (!voteOption) {
        return NEW_ERROR("Please select a vote option");
      }
      const newFlow = newVoteFlow({
        chainId: chainId,
        ethAccount: signer.account.address,
        proposalId: proposalId,
        voteOption: voteOption,
      });
      txStore?.addNewFlow({
        txFlow: newFlow,
        ethAccount: signer.account.address,
      });
    }
  }

  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const proposalId = Number(id);
  const router = useRouter();

  const [selectedVote, setSelectedVote] = useState<VoteOption | null>(null);

  if (isProposalsLoading) {
    return (
      <div className={styles.loaderContainer}>
        <LoadingComponent size="lg" />
      </div>
    );
  }

  if (!id) {
    return (
      <div className={styles.noProposalContainer}>
        <Text font="macan-font">Proposal ID is missing</Text>
        <Text font="macan-font">Proposal ID is missing</Text>
      </div>
    );
  }

  const proposal = proposals.find((p) => p.proposal_id === Number(proposalId));

  if (!proposal) {
    return (
      <div className={styles.noProposalContainer}>
        <Text font="macan-font">
          No proposal found with the ID {proposalId}{" "}
        </Text>
      </div>
    );
  }

  const isActive = formatProposalStatus(proposal.status) == "ACTIVE";

  const votesData = calculateVotePercentages(proposal.final_vote);

  const VoteBox = ({ option }: { option: VoteOption }) => (
    <VotingInfoBox
      key={option}
      amount={votesData[option].amount}
      value={option}
      isSelected={selectedVote == option}
      color={VOTE_OPTION_COLORS[option][0]}
      onClick={() => setSelectedVote(option)}
      borderColor={VOTE_OPTION_COLORS[option][1]}
    />
  );

  return isProposalsLoading ? (
    <div className={styles.loaderContainer}>
      <LoadingComponent size="lg" />
    </div>
  ) : (
    <div className={styles.proposalContainer}>
      <div className={styles.proposalHeaderContainer}>
        <div
          className={styles.backButtonContainer}
          onClick={() => {
            router.push("/governance");
          }}
        >
          <div className={styles.backButton}>
            <Icon
              icon={{
                url: "/dropdown.svg",
                size: 22,
              }}
              themed
            />
          </div>
        </div>
        <div className={styles.headerCard}>
          <div
            style={{
              borderRight:
                proposal.status == "PROPOSAL_STATUS_VOTING_PERIOD"
                  ? "none"
                  : "1px solid",
              padding: "10px",
            }}
          >
            <Text>#{proposal.proposal_id}</Text>
          </div>
          {!(proposal.status == "PROPOSAL_STATUS_VOTING_PERIOD") && (
            <div style={{ padding: "10px" }} className={styles.headerColumn2}>
              <div className={styles.circleContainer}>
                <div
                  className={styles.circle}
                  style={{
                    backgroundColor:
                      proposal.status == "PROPOSAL_STATUS_PASSED"
                        ? "green"
                        : "red",
                  }}
                />
              </div>
              <div>
                <Text>{formatProposalStatus(proposal.status)}</Text>
              </div>
            </div>
          )}
        </div>
        <div style={{ margin: "0px 0px 8px 0px" }}>
          <Text font="proto_mono" size="x-lg">
            {proposal.title}
          </Text>
        </div>

        <div>
          <Text opacity={0.4}>{proposal.description}</Text>
        </div>
      </div>
      <div className={styles.proposalInfoContainer}>
        <div className={styles.graphAndVoteContainer}>
          {isActive && (
            <div className={styles.proposalCardContainer1}>
              <div className={styles.detailsHeader}>
                <Text font="proto_mono">Select an option to vote</Text>
              </div>
              <div
                className={styles.votingBox}
                style={
                  isActive
                    ? {
                        height: "100%",
                        padding: "10px 0px 0px 0px",
                      }
                    : {
                        height: "100%",
                        padding: "0px 0px 20px 0px",
                      }
                }
              >
                <div className={styles.proposalInfoRow1}>
                  <VoteBox option={VoteOption.YES} />
                  <VoteBox option={VoteOption.NO} />
                </div>

                <div className={styles.proposalInfoRow1}>
                  <VoteBox option={VoteOption.VETO} />
                  <VoteBox option={VoteOption.ABSTAIN} />
                </div>

                <div className={styles.proposalInfoRow1}>
                  <div className={styles.VotingButton}>
                    <Button
                      width={200}
                      disabled={
                        !isActive ||
                        !(userStaking.validators.length > 0) ||
                        selectedVote == null
                      }
                      onClick={() =>
                        castVote(proposal.proposal_id, selectedVote)
                      }
                    >
                      SUBMIT VOTE
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div>
            <Spacer height="30px" />
          </div>

          <div className={styles.graphContainer}>
            <VoteBarGraph
              yes={Number(votesData[VoteOption.YES].amount)}
              no={Number(votesData[VoteOption.NO].amount)}
              abstain={Number(votesData[VoteOption.ABSTAIN].amount)}
              veto={Number(votesData[VoteOption.VETO].amount)}
              size={422}
            />
          </div>
          <div>
            <Spacer height="50px" />
          </div>
        </div>
        <div className={styles.proposalCardContainer2}>
          <div className={styles.detailsHeader}>
            <Text font="proto_mono">Proposal Details</Text>
          </div>
          <div className={styles.proposalInfoBox}>
            <div className={styles.proposalInfo}>
              <div>
                <Text font="rm_mono" opacity={0.3} size="x-sm">
                  Type
                </Text>
              </div>
              <div>
                <Text font="proto_mono" size="x-sm">
                  {formatProposalType(proposal.type_url)}
                </Text>
              </div>
            </div>
            <div className={styles.proposalInfo}>
              <div>
                <Text font="rm_mono" opacity={0.3} size="x-sm">
                  Veto
                </Text>
              </div>
              <div className={styles.displayAmount}>
                <Text font="proto_mono" size="x-sm">
                  {PROPOSAL_VETO_THRESHOLD}
                </Text>
                {/* <div className={styles.icon}>
                  <Image
                    src="/tokens/canto.svg"
                    width={16}
                    height={16}
                    alt="canto"
                    style={{
                      filter: "invert(var(--dark-mode))",
                    }}
                  />
                </div> */}
              </div>
            </div>
            <div className={styles.proposalInfo}>
              <div>
                <Text font="rm_mono" opacity={0.3} size="x-sm">
                  Quorum{" "}
                </Text>
              </div>
              <div>
                <Text font="proto_mono" size="x-sm">
                  {PROPOSAL_QUORUM_VALUE}
                </Text>
              </div>
            </div>
            <div className={styles.proposalInfoTimeLine}>
              <div style={{ marginBottom: "10px" }}>
                <Text font="rm_mono" opacity={0.3} size="x-sm">
                  Voting Timeline
                </Text>
              </div>
              <div className={styles.timeLine}>
                <div className={styles.circleContainer}>
                  <div className={styles.circle} />
                </div>
                <div className={styles.txt}>
                  <Text font="rm_mono" size="x-sm">
                    Proposal Created on
                  </Text>
                </div>
                <div>
                  <Text font="rm_mono" size="x-sm">
                    {formatTime(proposal.submit_time)}
                  </Text>
                </div>
              </div>
              <div className={styles.separator} />
              <div className={styles.timeLine}>
                <div className={styles.circleContainer}>
                  <div className={styles.circle} />
                </div>
                <div className={styles.txt}>
                  <Text font="rm_mono" size="x-sm">
                    Voting Ended on{" "}
                  </Text>
                </div>
                <div>
                  <Text font="rm_mono" size="x-sm">
                    {formatTime(proposal.voting_end_time)}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
