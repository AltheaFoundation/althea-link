import React, { useState, useEffect } from "react";
import Modal from "@/components/modal/modal";
import Text from "@/components/text";
import Button from "@/components/button/button";
import styles from "./wizardModal.module.scss";

import { ethToAlthea } from "@gravity-bridge/address-converter";
import { Coin, SignerData, StdFee, coins } from "@cosmjs/stargate";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";

import { useAccountInfo, useBalance } from "@/hooks/wizard/useQueries";
import { shiftDigits } from "../utils/shiftDigits";
import { cosmos } from "interchain";
import Icon from "../icon/icon";

import Image from "next/image";
const loadingGif = "/loading.gif";
import { useChain } from "@cosmos-kit/react";
import { useTx } from "@/hooks/wizard/useTx";
import BigNumber from "bignumber.js";
import Link from "next/link";
import { WizardWalletConnect } from "./wizardWalletConnect";
import { useDisconnect as useEvmDisconnect } from "wagmi";
import { truncateAddress } from "@/config/networks/helpers";

interface WalletWizardModalProps {
  isOpen: boolean;
  onOpen: (isOpen: boolean) => void;
}

export const WalletWizardModal: React.FC<WalletWizardModalProps> = ({
  isOpen,
  onOpen,
}) => {
  const [metamaskAddress, setMetamaskAddress] = useState("");

  const [isSigning, setIsSigning] = useState(false);
  const [isError, setIsError] = useState(false);

  const metamaskToCosmosAddress = ethToAlthea(metamaskAddress);
  const { address } = useChain("althea");

  const accountInfoData = useAccountInfo(address ?? "");

  const explicitSignerData: SignerData = {
    accountNumber: accountInfoData.data?.account_number,
    sequence: accountInfoData.data?.sequence,
    chainId: "althea_6633438-1",
  };

  const { tx, transactionHash } = useTx("althea", explicitSignerData);

  const balanceData = useBalance(address ?? "");

  const keplrBalance = balanceData.data?.balances[0]?.amount ?? "0";

  const sendTokens = async () => {
    setIsSigning(true);
    try {
      const feeAmount = new BigNumber("300000000000000000");

      const fee: StdFee = {
        amount: coins("3000000000000000000000", "aalthea"),
        gas: "200000",
      };

      const keplrBalanceBN = new BigNumber(keplrBalance);
      if (!keplrBalanceBN.isInteger()) {
        throw new Error("Balance is not an integer");
      }

      const sendAmount = keplrBalanceBN.minus(feeAmount);
      if (sendAmount.isLessThanOrEqualTo(0) || !sendAmount.isInteger()) {
        throw new Error(
          "Insufficient balance after fee deduction or result is not an integer"
        );
      }

      const msgSend = cosmos.bank.v1beta1.MessageComposer.withTypeUrl.send({
        fromAddress: address ?? "",
        toAddress: metamaskToCosmosAddress,
        amount: coins(sendAmount.toFixed(), "aalthea"),
      });

      await tx([msgSend], {
        fee,
        onSuccess: () => {
          setIsSigning(false);
        },
      });
    } catch (error) {
      setIsSigning(false);
      setIsError(true);
      console.error("Failed to send tokens:", error);
    }
  };

  const { signer } = useCantoSigner();

  useEffect(() => {
    const address = signer?.account.address;
    if (address) {
      setMetamaskAddress(address);
    }
  }, [signer]);

  const showNextStep = address && metamaskAddress;

  const [cosmosAddress, setCosmosAddress] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [isCosmosModalOpen, setIsCosmosModalOpen] = useState(false);
  const [isEvmModalOpen, setIsEvmModalOpen] = useState(false);

  const { disconnect: disconnectEvm } = useEvmDisconnect();
  const chainContext = useChain("althea");
  const { disconnect: disconnectCosmos } = chainContext;

  useEffect(() => {
    if (!isOpen) {
      if (cosmosAddress) {
        disconnectCosmos();
        setCosmosAddress("");
      }
      if (evmAddress) {
        disconnectEvm();
        setEvmAddress("");
      }
    }
  }, [isOpen, cosmosAddress, evmAddress, disconnectCosmos, disconnectEvm]);

  const handleDisconnect = (type: "cosmos" | "evm") => {
    if (type === "cosmos") {
      disconnectCosmos();
      setCosmosAddress("");
    } else {
      disconnectEvm();
      setEvmAddress("");
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => onOpen(false)}
      height="auto"
      width="48rem"
    >
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <Text size="lg" font="macan-font" weight="bold">
            Token Migration Wizard
          </Text>
          <Text size="sm" font="macan-font" color="var(--text-secondary)">
            This wizard will help you migrate your ALTHEA tokens from your
            Cosmos wallet to an EVM wallet. First, connect your source Cosmos
            wallet containing the tokens, then connect your destination EVM
            wallet to receive them.
          </Text>
        </div>

        <div className={styles.buttonGroup}>
          <div className={styles["wallet-connect"]}>
            <Text size="md" font="macan-font" weight="bold">
              Source Wallet
            </Text>
            <Button
              color="secondary"
              onClick={() =>
                cosmosAddress
                  ? handleDisconnect("cosmos")
                  : setIsCosmosModalOpen(true)
              }
            >
              {cosmosAddress
                ? `Disconnect ${truncateAddress(cosmosAddress)}`
                : "Connect Cosmos Wallet"}
            </Button>
          </div>

          <Icon
            className={styles["pagination"]}
            style={{ filter: "invert(var(--dark-mode))" }}
            icon={{
              url: "/paginationRight.svg",
              size: {
                width: 30,
                height: 15,
              },
            }}
          />

          <div className={styles["wallet-connect"]}>
            <Text size="md" font="macan-font" weight="bold">
              Destination Wallet
            </Text>
            <Button
              color="secondary"
              onClick={() =>
                evmAddress ? handleDisconnect("evm") : setIsEvmModalOpen(true)
              }
            >
              {evmAddress
                ? `Disconnect ${truncateAddress(evmAddress)}`
                : "Connect EVM Wallet"}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={isCosmosModalOpen}
        onClose={() => setIsCosmosModalOpen(false)}
        height="auto"
        width="24rem"
        title="Connect Cosmos Wallet"
      >
        <WizardWalletConnect
          walletType="cosmos"
          onAddressSelect={setCosmosAddress}
          isOpen={isCosmosModalOpen}
          setIsOpen={setIsCosmosModalOpen}
        />
      </Modal>

      <Modal
        open={isEvmModalOpen}
        onClose={() => setIsEvmModalOpen(false)}
        height="auto"
        width="24rem"
        title="Connect EVM Wallet"
      >
        <WizardWalletConnect
          walletType="evm"
          onAddressSelect={setEvmAddress}
          isOpen={isEvmModalOpen}
          setIsOpen={setIsEvmModalOpen}
        />
      </Modal>

      {cosmosAddress && evmAddress && !transactionHash && (
        <>
          <div className={styles["migration"]}>
            <Text className="text" size="lg" font="macan-font">
              Migrating your ALTHEA tokens
            </Text>
            <Text className="text" size="sm" font="macan-font">
              Please review the details below before migrating your tokens.
            </Text>

            <div className={styles["address-blocks"]}>
              <Text weight="bold" size="sm" font="macan-font">
                From:
              </Text>
              <Text size="sm" font="macan-font">
                {address}
              </Text>
            </div>
            <div className={styles["address-blocks"]}>
              <Text weight="bold" size="sm" font="macan-font">
                To:
              </Text>
              <Text size="sm" font="macan-font">
                {metamaskAddress}
              </Text>
            </div>
            <div className={styles["amount"]}>
              <Text
                weight="bold"
                size="sm"
                font="macan-font"
                className={styles["amount-label"]}
              >
                Amount:
              </Text>
              <Text size="sm" font="macan-font">
                {shiftDigits(keplrBalance, -18)}
              </Text>
              <Icon
                className={styles["amountIcon"]}
                icon={{
                  url: "/althea.svg",
                  size: {
                    width: 20,
                    height: 20,
                  },
                }}
              />
            </div>

            <Button
              disabled={keplrBalance <= 50000000000000000}
              onClick={sendTokens}
              width={100}
            >
              {isError ? (
                "Failed"
              ) : isSigning ? (
                <Image
                  alt="Loading icon"
                  src={loadingGif}
                  height={50}
                  width={50}
                />
              ) : (
                "Migrate"
              )}
            </Button>
          </div>
        </>
      )}
      {transactionHash && (
        <div className={styles["successMessage"]}>
          <Text size="lg" font="macan-font">
            Transaction Successful!
          </Text>
          <Text size="sm" font="macan-font">
            Your tokens are on their way.
          </Text>
          <Text size="sm" font="macan-font">
            Link to transaction:
          </Text>
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href={`https://althea.explorers.guru/transaction/${transactionHash}`}
          >
            {" "}
            <Text size="sm" font="macan-font">
              {transactionHash.split("").slice(0, 6).join("")}...
            </Text>
          </Link>

          <Button onClick={() => onOpen(false)}>Close</Button>
        </div>
      )}
    </Modal>
  );
};
