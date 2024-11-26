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
import useScreenSize from "@/hooks/helpers/useScreenSize";
import Container from "@/components/container/container";
import Image from "next/image";
import { useChain } from "@cosmos-kit/react";
import { cosmos } from "interchain";
import { useTx } from "@/hooks/cosmos/useTx";
import { altheaToEth } from "@gravity-bridge/address-converter";
import { useToast } from "@/components/toast";
import { useTotalBondedTokens } from "@/hooks/helpers/useCosmosBalance";
const loadingGif = "/loading.gif";

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

const COSMOS_VOTE_OPTION_MAP = {
  [VoteOption.YES]: 1, // VOTE_OPTION_YES
  [VoteOption.ABSTAIN]: 2, // VOTE_OPTION_ABSTAIN
  [VoteOption.NO]: 3, // VOTE_OPTION_NO
  [VoteOption.VETO]: 4, // VOTE_OPTION_NO_WITH_VETO
};

const calculateQuorumPercentage = (
  totalVotes: number,
  bondedTokens: string
): number => {
  const requiredQuorum = 0.334; // 33.4%
  const bondedTokensInEther = Number(bondedTokens) / 1e18;
  const quorumPercentage = (totalVotes / bondedTokensInEther) * 100;
  return Math.min(100, (quorumPercentage / requiredQuorum) * 100);
};

export default function Page() {
  // signer information
  const { txStore, signer, chainId } = useCantoSigner();
  // get proposals
  const { proposals, isProposalsLoading, newVoteFlow } = useProposals({
    chainId: chainId,
  });

  const { isMobile } = useScreenSize();
  // transaction
  const { address } = useChain("althea");

  const { tx, isSigning, setIsSigning } = useTx("althea");
  const toast = useToast();

  async function castVote(proposalId: number, voteOption: VoteOption | null) {
    if (!voteOption) {
      return NEW_ERROR("Please select a vote option");
    }

    // If cosmos address exists, use cosmos signing
    if (address) {
      try {
        setIsSigning(true);
        const { vote } = cosmos.gov.v1beta1.MessageComposer.withTypeUrl;

        const msg = vote({
          proposalId: BigInt(proposalId),
          voter: address,
          option: COSMOS_VOTE_OPTION_MAP[voteOption],
        });

        const fee = {
          amount: [{ denom: "aalthea", amount: "60000000000000000" }],
          gas: "600000",
        };

        await tx([msg], {
          fee,
          onSuccess: () => {
            setIsSigning(false);
            toast.add({
              toastID: new Date().getTime().toString(),
              primary: "Vote submitted successfully",
              state: "success",
              duration: 5000,
            });
          },
        });
      } catch (error) {
        console.error("Voting failed:", error);
        toast.add({
          toastID: new Date().getTime().toString(),
          primary: "Vote failed: " + (error as Error).message,
          state: "failure",
          duration: 5000,
        });
      } finally {
        setIsSigning(false);
      }
    }
    // Otherwise use ETH signing
    else if (signer) {
      const newFlow = newVoteFlow({
        chainId: chainId,
        ethAccount: signer.account.address,
        proposalId: proposalId,
        proposal: proposals.find((p) => p.proposal_id === Number(proposalId)),
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

  const { data: totalBondedTokens } = useTotalBondedTokens();

  const [selectedVote, setSelectedVote] = useState<VoteOption | null>(null);

  if (isProposalsLoading) {
    return (
      <div className={styles.loaderContainer}>
        <Image alt="Loading icon" src={loadingGif} height={100} width={100} />
      </div>
    );
  }

  if (!id) {
    return (
      <div className={styles.noProposalContainer}>
        <Text font="nm_plex">Proposal ID is missing</Text>
        <Text font="nm_plex">Proposal ID is missing</Text>
      </div>
    );
  }

  const proposal = proposals.find((p) => p.proposal_id === Number(proposalId));

  if (!proposal) {
    return (
      <div className={styles.noProposalContainer}>
        <Text font="nm_plex">No proposal found with the ID {proposalId} </Text>
      </div>
    );
  }

  const isActive = proposal.status == 2;

  const votesData = calculateVotePercentages(proposal.final_tally_result);

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

  const totalVotes = Object.values(votesData).reduce(
    (sum, vote) => sum + Number(vote.amount),
    0
  );

  const quorumPercentage = totalBondedTokens
    ? calculateQuorumPercentage(totalVotes, totalBondedTokens)
    : 0;

  return isProposalsLoading ? (
    <div className={styles.loaderContainer}>
      <Image alt="Loading icon" src={loadingGif} height={100} width={100} />
    </div>
  ) : (
    <div className={styles.container}>
      <div className={styles.proposalHeaderContainer}>
        <div className={styles.headerCard}>
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
                style={{ filter: "invert(var(--dark-mode))" }}
                themed
              />
            </div>
          </div>
          <div
            style={{
              borderRight: proposal.status == 2 ? "none" : "1px solid",
              padding: "10px",
            }}
          >
            <Text>#{proposal.proposal_id}</Text>
          </div>

          {!(proposal.status == 2) && (
            <div style={{ padding: "10px" }} className={styles.headerColumn2}>
              <div className={styles.circleContainer}>
                <div
                  className={styles.circle}
                  style={{
                    backgroundColor: proposal.status == 3 ? "green" : "red",
                  }}
                />
              </div>
              <div>
                <Text>{formatProposalStatus(proposal.status.toString())}</Text>
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            margin: "0px 0px 8px 0px",
            //maxWidth: isMobile ? "350px" : "",
          }}
        >
          <Text font="macan" size="x-lg">
            {proposal.content.title}
          </Text>
        </div>

        <div>
          <Text opacity={0.8}>{proposal.content.description}</Text>
        </div>
      </div>
      <div className={styles.proposalInfoContainer}>
        <div
          className={styles.graphAndVoteContainer}
          style={{
            minWidth: isMobile ? "unset" : "500px",
            width: isMobile ? "100%" : "70%",
          }}
        >
          {isActive && (
            <div className={styles.votingOptionsContainer}>
              <div className={styles.detailsHeader}>
                <Text font="macan">Select an option to vote</Text>
              </div>
              <div
                className={styles.votingBox}
                style={{
                  height: "100%",
                  padding: "20px 20px 20px 20px",
                }}
              >
                <Container
                  direction={isMobile ? "column" : "row"}
                  style={{
                    paddingBottom: " 16px",
                    justifyContent: "space-between",
                  }}
                >
                  <Container
                    style={{
                      width: isMobile ? "100%" : "50%",
                      marginRight: isMobile ? "" : "16px",
                      paddingBottom: isMobile ? "16px" : "0px",
                    }}
                  >
                    <VoteBox option={VoteOption.YES} />{" "}
                  </Container>
                  <Container style={{ width: isMobile ? "100%" : "50%" }}>
                    <VoteBox option={VoteOption.NO} />{" "}
                  </Container>
                </Container>

                <Container
                  direction={isMobile ? "column" : "row"}
                  style={{
                    paddingBottom: " 16px",
                    justifyContent: "space-between",
                  }}
                >
                  <Container
                    style={{
                      width: isMobile ? "100%" : "50%",
                      marginRight: isMobile ? "" : "16px",
                      paddingBottom: isMobile ? "16px" : "0px",
                    }}
                  >
                    <VoteBox option={VoteOption.VETO} />{" "}
                  </Container>
                  <Container style={{ width: isMobile ? "100%" : "50%" }}>
                    <VoteBox option={VoteOption.ABSTAIN} />{" "}
                  </Container>
                </Container>

                <Container>
                  <div className={styles.VotingButton}>
                    <Button
                      width={200}
                      disabled={!isActive || selectedVote == null || isSigning}
                      onClick={() =>
                        castVote(proposal.proposal_id, selectedVote)
                      }
                    >
                      {isSigning ? "SIGNING..." : "SUBMIT VOTE"}
                    </Button>
                  </div>
                </Container>
                {/* {isMobile && (
                  <div className={styles.proposalInfoRow1}>
                    <VoteBox option={VoteOption.YES} />{" "}
                    <VoteBox option={VoteOption.NO} />{" "}
                    <VoteBox option={VoteOption.VETO} />{" "}
                    <VoteBox option={VoteOption.ABSTAIN} />
                  </div>
                )} */}
              </div>
            </div>
          )}

          <div className={styles.graphContainer}>
            <VoteBarGraph
              yes={Number(votesData[VoteOption.YES].amount)}
              no={Number(votesData[VoteOption.NO].amount)}
              abstain={Number(votesData[VoteOption.ABSTAIN].amount)}
              veto={Number(votesData[VoteOption.VETO].amount)}
              size={422}
              isMobile={isMobile}
            />
          </div>
          <div>
            <Spacer height="20px" />
          </div>
        </div>
        <div
          className={styles.proposalCardContainer2}
          style={{
            minWidth: isMobile ? "unset" : "360px",
            width: isMobile ? "100%" : "30%",
            height: isMobile ? "440px" : "500px",
          }}
        >
          <div className={styles.detailsHeader}>
            <Text font="macan">Proposal Details</Text>
          </div>
          <div className={styles.proposalInfoBox}>
            <div className={styles.proposalInfo}>
              <div style={{ paddingBottom: "8px" }}>
                <Text
                  font="macan-font"
                  opacity={0.3}
                  size={isMobile ? "md" : "x-sm"}
                >
                  Type
                </Text>
              </div>
              <div>
                <Text font="macan" size={isMobile ? "md" : "x-sm"}>
                  {formatProposalType(proposal.content.type_url)}
                </Text>
              </div>
            </div>
            <div className={styles.proposalInfo}>
              <div style={{ paddingBottom: "8px" }}>
                <Text
                  font="macan-font"
                  opacity={0.3}
                  size={isMobile ? "md" : "x-sm"}
                >
                  Veto
                </Text>
              </div>
              <div className={styles.displayAmount}>
                <Text font="macan" size={isMobile ? "md" : "x-sm"}>
                  {PROPOSAL_VETO_THRESHOLD}
                </Text>
              </div>
            </div>
            <div className={styles.proposalInfo}>
              <div style={{ paddingBottom: "8px" }}>
                <Text
                  font="macan-font"
                  opacity={0.3}
                  size={isMobile ? "md" : "x-sm"}
                >
                  Quorum{" "}
                </Text>
              </div>
              <div className={styles.quorumContainer}>
                <Text font="macan" size={isMobile ? "md" : "x-sm"}>
                  {PROPOSAL_QUORUM_VALUE}
                </Text>
                <Text
                  font="macan"
                  size={isMobile ? "md" : "x-sm"}
                  className={styles.quorumPercentage}
                >
                  ({quorumPercentage.toFixed(1)}% reached)
                </Text>
              </div>
            </div>
            <div className={styles.proposalInfoTimeLine}>
              <div style={{ marginBottom: "10px" }}>
                <Text
                  font="macan-font"
                  opacity={0.3}
                  size={isMobile ? "md" : "x-sm"}
                >
                  Voting Timeline
                </Text>
              </div>
              <div className={styles.timeLine}>
                <div className={styles.circleContainer}>
                  <div className={styles.circle} />
                </div>
                <div className={styles.txt}>
                  <Text font="macan-font" size={isMobile ? "md" : "x-sm"}>
                    Created on
                  </Text>
                </div>
                <div>
                  <Text font="macan-font" size={isMobile ? "md" : "x-sm"}>
                    {formatTime(proposal.submit_time.toString())}
                  </Text>
                </div>
              </div>
              <div className={styles.separator} />
              <div className={styles.timeLine}>
                <div className={styles.circleContainer}>
                  <div className={styles.circle} />
                </div>
                <div className={styles.txt}>
                  <Text font="macan-font" size={isMobile ? "md" : "x-sm"}>
                    Voting Ended on{" "}
                  </Text>
                </div>
                <div>
                  <Text font="macan-font" size={isMobile ? "md" : "x-sm"}>
                    {formatTime(proposal.voting_end_time.toString())}
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
