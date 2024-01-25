import Icon from "@/components/icon/icon";
import styles from "./item.module.scss";
import Text from "@/components/text";

type ItemProps = {
  name: string | React.ReactNode;
  value: string;
  symbol?: React.ReactNode;
  theme?:
    | "primary-light"
    | "primary-dark"
    | "secondary-light"
    | "secondary-dark"
    | undefined;
};

const Item = ({ name, value, theme, symbol }: ItemProps) => (
  <div className={styles.item}>
    {typeof name === "string" ? (
      <Text
        className={styles.title}
        color="#ddd"
        size="sm"
        opacity={0.5}
        font="proto_mono"
      >
        {name}
      </Text>
    ) : (
      name
    )}
    <Text color="#ddd" size="x-lg" font="proto_mono">
      {symbol && (
        <span className={styles.symbol}>
          {
            <Icon
              icon={{
                url: "/tokens/note.svg",
                size: 17,
              }}
              color="primary"
              style={{
                filter: "invert(1)",
              }}
            />
          }
        </span>
      )}
      {value}
    </Text>
  </div>
);

export default Item;
