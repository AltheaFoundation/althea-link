import { useCallback, useEffect, useState, useMemo } from "react";
import { WalletButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { useChain } from "@cosmos-kit/react";
import Button from "../button/button";
import Text from "../text";
import Image from "next/image";
import styles from "../wallet_connect/walletconnect.module.scss";

interface WizardWalletConnectProps {
  walletType: "cosmos" | "evm";
  onAddressSelect: (address: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const WizardWalletConnect: React.FC<WizardWalletConnectProps> = ({
  walletType,
  onAddressSelect,
  isOpen,
  setIsOpen,
}) => {
  // Cosmos wallet handling
  const chainContext = useChain("althea");
  const { address, walletRepo } = chainContext;
  const wallets = walletRepo?.wallets ?? [];

  const browser = wallets.filter((wallet) =>
    ["Keplr", "Cosmostation", "Leap", "Station"].includes(
      wallet.walletInfo.prettyName
    )
  );

  const onWalletClicked = useCallback(
    (name: string) => {
      walletRepo?.connect(name);
    },
    [walletRepo]
  );

  // EVM wallet handling
  const { address: evmAddress } = useAccount();
  const evmWallets = ["coinbase", "metamask", "rainbow", "walletconnect"];

  // Effect to handle address updates
  useEffect(() => {
    if (walletType === "cosmos" && address) {
      onAddressSelect(address);
      setIsOpen(false);
    }
    if (walletType === "evm" && evmAddress) {
      onAddressSelect(evmAddress);
      setIsOpen(false);
    }
  }, [walletType, address, evmAddress, onAddressSelect, setIsOpen]);

  const WalletButtonItem = ({
    wallet,
    connector,
    connect,
  }: {
    wallet: string;
    connector: any;
    connect: () => void;
  }) => {
    const [iconUrl, setIconUrl] = useState("");

    useEffect(() => {
      if (connector.iconUrl) {
        const url =
          typeof connector.iconUrl === "function"
            ? connector.iconUrl()
            : connector.iconUrl;
        Promise.resolve(url).then(setIconUrl);
      }
    }, [connector.iconUrl]);

    const formattedWalletName =
      wallet.charAt(0).toUpperCase() + wallet.slice(1);

    return (
      <div className={styles.wallet_item} onClick={connect}>
        {iconUrl && (
          <Image
            width={32}
            height={32}
            src={iconUrl}
            alt={`${formattedWalletName} Icon`}
          />
        )}
        <Text size={"lg"}>{formattedWalletName}</Text>
      </div>
    );
  };

  return (
    <div className={styles.wallet_list}>
      {walletType === "cosmos" ? (
        <>
          <Text size={"x-sm"} weight="500" color="#cfcfcf">
            COSMOS
          </Text>
          {browser.map(({ walletInfo: { name, prettyName, logo } }) => (
            <div
              key={name}
              className={styles.wallet_item}
              onClick={() => onWalletClicked(name)}
            >
              <Image
                width={32}
                height={32}
                src={logo?.toString() ?? ""}
                alt={prettyName}
              />
              <Text size={"lg"}>{prettyName}</Text>
            </div>
          ))}
        </>
      ) : (
        <>
          <Text size={"x-sm"} weight="500" color="#cfcfcf">
            ETHERMINT {"(ETHEREUM)"}
          </Text>
          {evmWallets.map((wallet) => (
            <WalletButton.Custom key={wallet} wallet={wallet}>
              {({ connect, connector }) => (
                <WalletButtonItem
                  wallet={wallet}
                  connector={connector}
                  connect={connect}
                />
              )}
            </WalletButton.Custom>
          ))}
        </>
      )}
    </div>
  );
};
