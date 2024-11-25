import Text from "../text";
import Icon from "../icon/icon";
import styles from "./qrcode.module.scss";

export const QRCode = ({
  onReturn,
  qrUri,
  name,
}: {
  onReturn: () => void;
  qrUri?: string;
  name?: string;
}) => {
  return (
    <div className={styles.qr_container}>
      <div className={styles.header}>
        <button className={styles.back_button} onClick={onReturn}>
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
        </button>
        <Text size="lg" weight="500">
          {name}
        </Text>
      </div>

      <div className={styles.qr_content}>
        {qrUri ? (
          <Text size="sm">No QR code available</Text>
        ) : (
          <Text size="sm">No QR code available</Text>
        )}
        <Text size="sm" className={styles.scan_text}>
          Scan with your {name} mobile app
        </Text>
      </div>
    </div>
  );
};
