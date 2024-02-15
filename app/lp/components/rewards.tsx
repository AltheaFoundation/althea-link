import Text from "@/components/text";
import styles from "../lp.module.scss";
import Icon from "@/components/icon/icon";
import Container from "@/components/container/container";
import Button from "@/components/button/button";

interface Props {
  onClick: () => void;
  value: string;
}

const Rewards = (props: Props) => {
  return (
    <section className={styles.rewards}>
      <div>
        <Text
          font="macan-font"
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
            font="macan-font"
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
              url: "/althea.png",
              size: 24,
            }}
          />
        </Container>
      </div>

      <Button onClick={props.onClick} disabled={Number(props.value) === 0}>
        Claim
      </Button>
    </section>
  );
};

export default Rewards;
