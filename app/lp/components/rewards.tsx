import Text from "@/components/text";
import styles from "../lp.module.scss";
import Icon from "@/components/icon/icon";
import Container from "@/components/container/container";
import Button from "@/components/button/button";
import { useEffect, useState } from "react";
import useScreenSize from "@/hooks/helpers/useScreenSize";

interface Props {
  onClick: () => void;
  value: string;
}

const Rewards = (props: Props) => {
  const [isMobile, setIsMobile] = useState(false);
  const screen = useScreenSize();
  useEffect(() => {
    setIsMobile(screen.width < 768);
  }, [screen.width]);
  return (
    <section className={styles.rewards}>
      <div>
        <Text
          font="proto_mono"
          size="lg"
          style={{
            color: "#000",
          }}
        >
          Rewards
        </Text>

        <Container
          direction="row"
          gap={6}
          center={{
            vertical: true,
          }}
        >
          <Text
            font="proto_mono"
            size="x-lg"
            style={{
              fontSize: "36px",
              color: "#000",
            }}
          >
            {props.value}
          </Text>
          <Icon
            icon={{
              url: "/tokens/canto.svg",
              size: 24,
            }}
          />
        </Container>
      </div>
      <Button
        width={isMobile ? "fill" : undefined}
        onClick={props.onClick}
        disabled={Number(props.value) === 0}
      >
        Claim
      </Button>
    </section>
  );
};

export default Rewards;
