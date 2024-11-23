"use client";
import styles from "./walletconnect.module.scss";
import { useCallback, useEffect, useState } from "react";
import Analytics from "@/provider/analytics";
import { WalletButton } from "@rainbow-me/rainbowkit";
import { useBalance, useAccount, useDisconnect } from "wagmi";
import { usePathname } from "next/navigation";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import { useChain } from "@cosmos-kit/react";
import { truncateAddress } from "@/config/networks/helpers";
import Button from "../button/button";
import Modal from "../modal/modal";
import { altheaToEth } from "@gravity-bridge/address-converter";
import Image from "next/image";
import Text from "../text";
import useScreenSize from "@/hooks/helpers/useScreenSize";
import Icon from "../icon/icon";

export const WalletConnect = ({
  isOpen,
  setIsOpen,
  onClose,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClose: () => void;
}) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const chainContext = useChain("althea");
  const { address, disconnect, walletRepo, isWalletConnected } = chainContext;
  const wallets = walletRepo?.wallets ?? [];
  const onWalletClicked = useCallback(
    (name: string) => {
      walletRepo?.connect(name);
      setTimeout(() => {
        const wallet = walletRepo?.getWallet(name);
        if (wallet?.walletInfo.mode === "wallet-connect") {
        }
      }, 1);
    },
    [walletRepo]
  );
  const browser = wallets.filter((wallet) =>
    ["Keplr", "Cosmostation", "Leap", "Station"].includes(
      wallet.walletInfo.prettyName
    )
  );
  const mobile = wallets.filter((wallet) =>
    [
      "Wallet Connect",
      "Keplr Mobile",
      "Cosmostation Mobile",
      "Leap Mobile",
    ].includes(wallet.walletInfo.prettyName)
  );

  const account = useAccount();
  const isConnected = account.isConnected;
  const { signer } = useCantoSigner();
  const { disconnect: disconnectEvm } = useDisconnect();
  const evmWallets = ["coinbase", "metamask", "rainbow", "walletconnect"];
  const altheaToEthAddress = altheaToEth(
    address ?? "althea1uwqjtgjhjctjc45ugy7ev5prprhehc7wdlsqmq"
  ) as `0x${string}`;
  const balanceAddress = isConnected ? account.address : altheaToEthAddress;
  const balance = useBalance({
    address: balanceAddress,
    watch: true,
    chainId: signer?.chain.id ?? 258432,
  });
  const pathname = usePathname();
  const homeView = pathname === "/";

  useEffect(() => {
    if (signer?.account.address) {
      Analytics.actions.people.registerWallet(signer.account.address);
      Analytics.actions.identify(signer.account.address, {
        account: signer.account.address,
      });
      Analytics.actions.events.connections.walletConnect(true);
    }
  }, [signer]);

  useEffect(() => {
    if (isWalletConnected) {
      onClose();
    }
  }, [isWalletConnected]);

  useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected]);

  const WalletConnectButtons = () => {
    return (
      <>
        <Text size={"x-sm"} weight="500" color="#cfcfcf">
          ETHERMINT {"(ETHEREUM)"}
        </Text>
        {evmWallets.map((wallet) => (
          <WalletButton.Custom key={wallet} wallet={wallet}>
            {({ connect, connected, connector }) => {
              const [iconUrl, setIconUrl] = useState("");

              useEffect(() => {
                async function fetchIconUrl() {
                  if (typeof connector.iconUrl === "function") {
                    const url = await connector.iconUrl();
                    setIconUrl(url);
                  } else {
                    setIconUrl(connector.iconUrl);
                  }
                }

                fetchIconUrl();
              }, [connector]);

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
            }}
          </WalletButton.Custom>
        ))}
      </>
    );
  };

  const { isMobile } = useScreenSize();

  const handleDisconnect = () => {
    if (isConnected) {
      disconnectEvm();
    } else {
      disconnect();
    }

    setIsAccountOpen(false);
  };

  return (
    <div className={`${styles.wallet_connect} ${homeView ? "home" : ""}`}>
      {(isConnected || address) && (
        <div
          className={styles.cosmos_wallet}
          onClick={() => setIsAccountOpen(true)}
        >
          {isConnected && (
            <div className={styles.cosmos_account}>
              {truncateAddress(signer?.account.address ?? "")}
            </div>
          )}
          {address && (
            <div className={styles.cosmos_account}>
              {truncateAddress(address)}
            </div>
          )}
          <Icon
            icon={{
              url: "/althea.svg",
              size: 22,
            }}
            themed
          />
          <div className={styles.cosmos_balance}>
            {balance?.data?.formatted &&
              Number(balance.data.formatted).toFixed(1)}{" "}
            {isMobile ? "" : "ALTHEA"}
          </div>
          <Icon
            icon={{
              url: "/dropdown.svg",
              size: 22,
            }}
            themed
            style={{ filter: "invert(var(--dark-mode))" }}
          />
        </div>
      )}
      {!isConnected && !address && (
        <Button
          color="secondary"
          width={160}
          height={24}
          onClick={() => setIsOpen(true)}
        >
          Connect Wallet
        </Button>
      )}

      <div style={{ position: "absolute" }} id="modal-root">
        {!isMobile && (
          <Modal
            open={isOpen}
            onClose={onClose} // Use onClose prop
            height="auto"
            width="42rem"
            title="Connect a wallet"
            showDivider={true}
            showBackground={true}
          >
            <div className={`${styles.wallet_modal}`}>
              <div className={`${styles.wallet_options}`}>
                <div className={`${styles.wallet_list_container}`}>
                  <div className={`${styles.wallet_list}`}>
                    <WalletConnectButtons />
                    {!isMobile && (
                      <>
                        <Text size={"x-sm"} weight="500" color="#cfcfcf">
                          COSMOS
                        </Text>
                        {browser.map(
                          ({ walletInfo: { name, prettyName, logo } }) => (
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
                              <Text size={"lg"}> {prettyName}</Text>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={`${styles.wallet_text}`}>
                  <Text size={"x-sm"} weight="500" color="#cfcfcf">
                    WALLET INFO
                  </Text>
                  <Text size="sm" font="macan-font">
                    With althea.link you can connect either EVM or Cosmos
                    wallets like MetaMask & Keplr.
                  </Text>
                  <Text size="sm" font="macan-font">
                    Since both Ethermint & Cosmos key types are supported, you
                    can utilize your preferred wallet.
                  </Text>
                  <Text size="sm" font="macan-font">
                    EVM wallets will show you a 0x address, while Cosmos wallets
                    will show you an address that begins with althea1.
                  </Text>
                  <div className={`${styles.divider_horizontal}`} />
                  <Text size="sm" font="macan-font">
                    To learn more about different key types, utilizing different
                    walelts, and other info visit our docs.
                  </Text>
                </div>
              </div>
            </div>
          </Modal>
        )}
        {isMobile && (
          <Modal
            open={isOpen}
            onClose={onClose}
            height="auto"
            width="18rem"
            title="Connect a wallet"
            showDivider={false}
            showBackground={false}
          >
            <div className={`${styles.wallet_modal}`}>
              <div className={`${styles.wallet_options}`}>
                <div className={`${styles.wallet_list_container}`}>
                  <div className={`${styles.wallet_list}`}>
                    <WalletConnectButtons />
                    <Text size={"x-sm"} weight="500" color="#cfcfcf">
                      COSMOS
                    </Text>
                    {mobile.map(
                      ({ walletInfo: { name, prettyName, logo } }) => (
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
                          <Text size={"lg"}> {prettyName}</Text>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        <Modal
          open={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          height="auto"
          backgroundColor="#00254f"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              justifyItems: "center",
              alignContent: "center",
              alignItems: "center",
            }}
          >
            <Image src={"/althea.svg"} width={64} height={64} alt="logo" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {address && (
                <Text size="sm" font="macan-font">
                  {truncateAddress(address)}
                </Text>
              )}
              {signer?.account.address && (
                <Text size="sm" font="macan-font">
                  {truncateAddress(signer?.account.address)}
                </Text>
              )}
              {balance.data?.formatted && (
                <Text
                  style={{ textAlign: "center" }}
                  size="sm"
                  font="macan-font"
                >
                  {Number(balance.data.formatted).toFixed(1)} ALTHEA
                </Text>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "24px",
                justifyContent: "space-between",
                width: "80%",
              }}
            >
              <Button
                icon={{
                  url: "/copy-outline.svg",
                  size: 24,
                  position: "bottom",
                }}
                color="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    address ?? ("" || signer?.account.address) ?? ""
                  );
                }}
                width={190}
                height={64}
              >
                Copy Address
              </Button>
              <Button
                icon={{
                  url: "/exit-outline.svg",
                  size: 24,
                  position: "bottom",
                }}
                color="secondary"
                onClick={() => handleDisconnect()}
                width={190}
                height={64}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export const HiddenWalletConnect = ({
  isOpen,
  setIsOpen,
  onClose,
  isAccountOpen,
  setIsAccountOpen,
  onAccountClose,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClose: () => void;
  isAccountOpen: boolean;
  setIsAccountOpen: (isOpen: boolean) => void;
  onAccountClose: () => void;
}) => {
  const chainContext = useChain("althea");
  const { address, disconnect, walletRepo, isWalletConnected } = chainContext;
  const wallets = walletRepo?.wallets ?? [];
  const onWalletClicked = useCallback(
    (name: string) => {
      walletRepo?.connect(name);
      setTimeout(() => {
        const wallet = walletRepo?.getWallet(name);
        if (wallet?.walletInfo.mode === "wallet-connect") {
        }
      }, 1);
    },
    [walletRepo]
  );
  const browser = wallets.filter((wallet) =>
    ["Keplr", "Cosmostation", "Leap", "Station"].includes(
      wallet.walletInfo.prettyName
    )
  );
  const mobile = wallets.filter((wallet) =>
    [
      "Wallet Connect",
      "Keplr Mobile",
      "Cosmostation Mobile",
      "Leap Mobile",
    ].includes(wallet.walletInfo.prettyName)
  );

  const account = useAccount();
  const isConnected = account.isConnected;
  const { signer } = useCantoSigner();
  const { disconnect: disconnectEvm } = useDisconnect();
  const evmWallets = ["coinbase", "metamask", "rainbow", "walletconnect"];
  const altheaToEthAddress = altheaToEth(
    address ?? "althea1uwqjtgjhjctjc45ugy7ev5prprhehc7wdlsqmq"
  ) as `0x${string}`;
  const balanceAddress = isConnected ? account.address : altheaToEthAddress;
  const balance = useBalance({
    address: balanceAddress,
    watch: true,
    chainId: signer?.chain.id ?? 258432,
  });
  const pathname = usePathname();
  const homeView = pathname === "/";

  useEffect(() => {
    if (signer?.account.address) {
      Analytics.actions.people.registerWallet(signer.account.address);
      Analytics.actions.identify(signer.account.address, {
        account: signer.account.address,
      });
      Analytics.actions.events.connections.walletConnect(true);
    }
  }, [signer]);

  useEffect(() => {
    if (isWalletConnected) {
      onClose();
    }
  }, [isWalletConnected]);

  useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected]);

  const WalletConnectButtons = () => {
    return (
      <>
        <Text size={"x-sm"} weight="500" color="#cfcfcf">
          ETHERMINT {"(ETHEREUM)"}
        </Text>
        {evmWallets.map((wallet) => (
          <WalletButton.Custom key={wallet} wallet={wallet}>
            {({ connect, connected, connector }) => {
              const [iconUrl, setIconUrl] = useState("");

              useEffect(() => {
                async function fetchIconUrl() {
                  if (typeof connector.iconUrl === "function") {
                    const url = await connector.iconUrl();
                    setIconUrl(url);
                  } else {
                    setIconUrl(connector.iconUrl);
                  }
                }

                fetchIconUrl();
              }, [connector]);

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
            }}
          </WalletButton.Custom>
        ))}
      </>
    );
  };

  const { isMobile } = useScreenSize();

  const handleDisconnect = () => {
    if (isConnected) {
      disconnectEvm();
    } else {
      disconnect();
    }

    setIsAccountOpen(false);
  };

  return (
    <div
      className={`${styles.hidden_wallet_connect} ${homeView ? "home" : ""}`}
    >
      <div style={{ position: "absolute" }} id="modal-root">
        {!isMobile && (
          <Modal
            open={isOpen}
            onClose={onClose}
            height="auto"
            width="42rem"
            title="Connect a wallet"
            showDivider={true}
            showBackground={true}
          >
            <div className={`${styles.wallet_modal}`}>
              <div className={`${styles.wallet_options}`}>
                <div className={`${styles.wallet_list_container}`}>
                  <div className={`${styles.wallet_list}`}>
                    <WalletConnectButtons />
                    {!isMobile && (
                      <>
                        <Text size={"x-sm"} weight="500" color="#cfcfcf">
                          COSMOS
                        </Text>
                        {browser.map(
                          ({ walletInfo: { name, prettyName, logo } }) => (
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
                              <Text size={"lg"}> {prettyName}</Text>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={`${styles.wallet_text}`}>
                  <Text size={"x-sm"} weight="500" color="#cfcfcf">
                    WALLET INFO
                  </Text>
                  <Text size="sm" font="macan-font">
                    With althea.link you can connect either EVM or Cosmos
                    wallets like MetaMask & Keplr.
                  </Text>
                  <Text size="sm" font="macan-font">
                    Since both Ethermint & Cosmos key types are supported, you
                    can utilize your preferred wallet.
                  </Text>
                  <Text size="sm" font="macan-font">
                    EVM wallets will show you a 0x address, while Cosmos wallets
                    will show you an address that begins with althea1.
                  </Text>
                  <div className={`${styles.divider_horizontal}`} />
                  <Text size="sm" font="macan-font">
                    To learn more about different key types, utilizing different
                    walelts, and other info visit our docs.
                  </Text>
                </div>
              </div>
            </div>
          </Modal>
        )}
        {isMobile && (
          <Modal
            open={isOpen}
            onClose={onClose}
            height="auto"
            width="18rem"
            title="Connect a wallet"
            showDivider={false}
            showBackground={false}
          >
            <div className={`${styles.wallet_modal}`}>
              <div className={`${styles.wallet_options}`}>
                <div className={`${styles.wallet_list_container}`}>
                  <div className={`${styles.wallet_list}`}>
                    <WalletConnectButtons />
                    <Text size={"x-sm"} weight="500" color="#cfcfcf">
                      COSMOS
                    </Text>
                    {mobile.map(
                      ({ walletInfo: { name, prettyName, logo } }) => (
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
                          <Text size={"lg"}> {prettyName}</Text>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        <Modal
          open={isAccountOpen}
          onClose={onAccountClose}
          height="auto"
          backgroundColor="#00254f"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              justifyItems: "center",
              alignContent: "center",
              alignItems: "center",
            }}
          >
            <Image src={"/althea.svg"} width={64} height={64} alt="logo" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {address && (
                <Text size="sm" font="macan-font">
                  {truncateAddress(address)}
                </Text>
              )}
              {signer?.account.address && (
                <Text size="sm" font="macan-font">
                  {truncateAddress(signer?.account.address)}
                </Text>
              )}
              {balance.data?.formatted && (
                <Text
                  style={{ textAlign: "center" }}
                  size="sm"
                  font="macan-font"
                >
                  {Number(balance.data.formatted).toFixed(1)} ALTHEA
                </Text>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "24px",
                justifyContent: "space-between",
                width: "80%",
              }}
            >
              <Button
                icon={{
                  url: "/copy-outline.svg",
                  size: 24,
                  position: "bottom",
                }}
                color="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    address ?? ("" || signer?.account.address) ?? ""
                  );
                }}
                width={190}
                height={64}
              >
                Copy Address
              </Button>
              <Button
                icon={{
                  url: "/exit-outline.svg",
                  size: 24,
                  position: "bottom",
                }}
                color="secondary"
                onClick={() => handleDisconnect()}
                width={190}
                height={64}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
