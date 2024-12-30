"use client";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import styles from "./swap.module.scss";
import Text from "@/components/text";
import Spacer from "@/components/layout/spacer";
import Container from "@/components/container/container";
import useScreenSize from "@/hooks/helpers/useScreenSize";
import SwapBox from "./components/swapBox";
import usePool from "../lp/utils";

export default function SwapPage() {
  const { txStore, signer, chainId } = useCantoSigner();
  const { isMobile } = useScreenSize();
  const { pairs } = usePool();

  return (
    <div className={styles.container}>
      <div>
        <Spacer height="20px" />
      </div>
      <Text size="x-lg" font="macan-font" className={styles.title}>
        SWAP
      </Text>
      <Spacer height="20px" />
      <Container
        style={{ flexDirection: "column", alignItems: "center" }}
        gap={20}
        width="100%"
      >
        <Container className={styles.swapCard}>
          <SwapBox pairs={pairs} />
        </Container>
      </Container>
    </div>
  );
}
