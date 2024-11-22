import React, { useState, useEffect } from "react";
import Modal from "@/components/modal/modal";
import Text from "@/components/text";
import Button from "@/components/button/button";
import styles from "./wizardModal.module.scss";

import { truncateAddress } from "@/config/networks/helpers";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { ethToAlthea } from "@gravity-bridge/address-converter";
import { Coin, SignerData, StdFee, coins } from "@cosmjs/stargate";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";

import { useAccountInfo, useBalance } from "@/hooks/wizard/useQueries";
import { shiftDigits } from "../utils/shiftDigits";
import { cosmos } from "interchain";
import Icon from "../icon/icon";
import LoadingComponent from "../animated/loader";
import Image from "next/image";
const loadingGif = "/loading.gif";
import { useChain } from "@cosmos-kit/react";
import { useTx } from "@/hooks/wizard/useTx";
import BigNumber from "bignumber.js";
import Link from "next/link";

interface WalletWizardModalProps {
  isOpen: boolean;
  onOpen: (isOpen: boolean) => void;
  balance: any;
  onClose: () => void;
}

export const WalletWizardModal: React.FC<WalletWizardModalProps> = ({
  isOpen,
  onOpen,
  balance,
}) => {
  const [metamaskAddress, setMetamaskAddress] = useState("");

  const [isSigning, setIsSigning] = useState(false);
  const [isError, setIsError] = useState(false);

  const metamaskToCosmosAddress = ethToAlthea(metamaskAddress);
  const chainContext = useChain("althea");

  const { address, connect, disconnect } = chainContext;

  const accountInfoData = useAccountInfo(address ?? "");

  const explicitSignerData: SignerData = {
    accountNumber: accountInfoData.data?.account_number,
    sequence: accountInfoData.data?.sequence,
    chainId: "althea_258432-1",
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

  return (
    <Modal
      open={isOpen}
      onClose={() => onOpen(false)}
      height="auto"
      width="30rem"
    >
      <div className={styles["modalContent"]}>
        {!showNextStep && (
          <>
            {/* Migration source wallets */}
            <Text size="lg" font="macan-font">
              Wallet Wizard
            </Text>
            <Text size="sm" font="macan-font">
              The wallet wizard is a tool to help you migrate your Althea tokens
              from a wallet with an incorrect key type to another wallet with
              the correct key type.
            </Text>
            <Text size="sm" font="macan-font">
              Ethermint chains, like Althea, use the Ethermint key type while
              non Ethermint enabled Cosmos chains use the Cosmos key type. When
              attempting to utilize the Cosmos key type on Althea you will get
              errors.
            </Text>

            <div className={styles["buttonGroup"]}>
              {/* Keplr Connect Button */}

              <div className={styles["wallet-connect"]}>
                <Text size="md" font="macan-font">
                  Migrate From
                </Text>

                <Button
                  width={164}
                  height={24}
                  onClick={address ? disconnect : connect}
                >
                  {address ? truncateAddress(address) : "Connect Wallet"}
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
                <Text size="md" font="macan-font">
                  Migrate to
                </Text>
                {!metamaskAddress && (
                  <ConnectButton
                    key={balance.data?.formatted}
                    chainStatus={"none"}
                  />
                )}
                {metamaskAddress && (
                  <Button width={120} height={34}>
                    {metamaskAddress
                      ? truncateAddress(metamaskAddress)
                      : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
        {showNextStep && !transactionHash && (
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
      </div>
    </Modal>
  );
};
