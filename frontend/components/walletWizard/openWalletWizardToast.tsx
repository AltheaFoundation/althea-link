import React from "react";
import Button from "@/components/button/button";
import styles from "./wizardModal.module.scss";
import Container from "../container/container";
import Icon from "../icon/icon";

import Text from "@/components/text";
import { useChain } from "@cosmos-kit/react";
import { truncateAddress } from "@/config/networks/helpers";

interface ToastProps {
  isVisible: boolean;

  onClose: () => void;
}

const OpenWalletWizard: React.FC<ToastProps> = ({ isVisible, onClose }) => {
  const chainContext = useChain("althea");

  const { address, connect, disconnect } = chainContext;
  if (!isVisible) return null;
  return (
    <div className={styles.toastContainer}>
      <Container className={styles.close} onClick={onClose}>
        <Icon
          themed
          icon={{
            url: "/close.svg",
            size: 40,
          }}
          style={{ filter: "invert(var(--dark-mode))" }}
        />
      </Container>
      <div className={styles.toastCaption}>
        <Text>Add Althea to your Cosmos wallet</Text>
      </div>
      <div className={styles.toastButton}>
        <Button
          width={200}
          height={24}
          onClick={address ? disconnect : connect}
        >
          {address ? truncateAddress(address) : "Connect to add Althea"}
        </Button>
      </div>
    </div>
  );
};

export default OpenWalletWizard;
