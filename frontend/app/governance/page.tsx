"use client";

import { useMemo } from "react";
import { Proposal } from "@/hooks/gov/interfaces/proposal";
import useProposals from "@/hooks/gov/useProposals";
import ProposalTable from "./components/ProposalTable/ProposalTable";
import styles from "./gov.module.scss";
import Text from "@/components/text";
import Spacer from "@/components/layout/spacer";

import useCantoSigner from "@/hooks/helpers/useCantoSigner";

import Container from "@/components/container/container";

import Image from "next/image";
import useScreenSize from "@/hooks/helpers/useScreenSize";
const loadingGif = "/loading.gif";

export default function GovernancePage() {
  const { chainId } = useCantoSigner();
  const { isMobile } = useScreenSize();
  const { proposals, isProposalsLoading } = useProposals({ chainId: chainId });

  //console.log(isMobile);

  const sorted_proposals = useMemo(
    () =>
      proposals.sort(
        (a: Proposal, b: Proposal) => b.proposal_id - a.proposal_id
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposals.length]
  );

  return isProposalsLoading ? (
    <div className={styles.loaderContainer}>
      <Image alt="Loading icon" src={loadingGif} height={100} width={100} />
    </div>
  ) : (
    <div>
      <div className={styles.container}>
        <Container
          width="100%"
          className={styles.header}
          direction={isMobile ? "column" : "row"}
          style={{ justifyContent: "space-between" }}
        >
          <div>
            <Text font="macan-font" className={styles.title}>
              GOVERNANCE
            </Text>
          </div>
        </Container>

        <Spacer height="32px" />

        <ProposalTable proposals={sorted_proposals} isMobile={isMobile} />
        <Spacer height="40px" />
      </div>
    </div>
  );
}
