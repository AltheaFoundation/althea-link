import Text from "@/components/text";
import style from "./feeButton.module.scss";
import clsx from "clsx";

interface Props {
  title: string;
  subtext: string;
  subtext2: string;

  tokenSymbol: string;
  tokenAmount: string;
  tokenValueUSD: string;
  onClick?: () => void;
  active?: boolean;
}

const FeeButton = ({
  title,
  subtext,
  subtext2,
  tokenSymbol,
  tokenAmount,
  tokenValueUSD,
  onClick,
  active,
}: Props) => {
  return (
    <div
      className={clsx(style.container, active && style.active)}
      onClick={onClick}
    >
      <Text font="macan-font">{title}</Text>
      <Text
        size="x-sm"
        theme="secondary-dark"
        style={{
          textAlign: "center",
        }}
      >
        {subtext}
      </Text>
      <Text
        size="x-sm"
        theme="secondary-dark"
        style={{
          textAlign: "center",
        }}
      >
        {subtext2}
      </Text>
      <div className={style.divider} />
      <Text font="macan-font">{`${tokenAmount} ${tokenSymbol}`}</Text>
      <Text size="x-sm" theme="secondary-dark">
        {"$" + tokenValueUSD}
      </Text>
    </div>
  );
};

export default FeeButton;
