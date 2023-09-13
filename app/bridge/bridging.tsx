"use client";
import Spacer from "@/components/layout/spacer";
import Selector, { Item } from "@/components/selector/selector";
import Text from "@/components/text";
import { BridgeHookReturn } from "@/hooks/bridge/interfaces/hookParams";
import { TransactionStore } from "@/stores/transactionStore";
import { convertToBigNumber, formatBalance } from "@/utils/tokenBalances.utils";
import { useState } from "react";
import styles from "./bridge.module.scss";
import Button from "@/components/button/button";
import Input from "@/components/input/input";
import Container from "@/components/container/container";
import Image from "next/image";
import Modal from "@/components/modal/modal";
import ConfirmationModal from "./components/confirmationModal";
import { BridgingMethod } from "@/hooks/bridge/interfaces/bridgeMethods";
import { isCosmosNetwork, isEVMNetwork } from "@/utils/networks.utils";
import { GetWalletClientResult } from "wagmi/actions";

interface BridgeProps {
  hook: BridgeHookReturn;
  params: {
    signer: GetWalletClientResult | undefined;
    transactionStore?: TransactionStore;
  };
}
const Bridging = (props: BridgeProps) => {
  // STATES FOR BRIDGE
  const [amount, setAmount] = useState<string>("");

  // transaction that will do the bridging
  async function bridgeTx() {
    // get flow
    const { data, error } = props.hook.bridge.createNewBridgeFlow({
      amount: convertToBigNumber(
        amount,
        props.hook.selections.token?.decimals ?? 18
      ).data.toString(),
    });
    if (error) {
      console.log(error);
      return;
    }
    // add flow to store
    props.params.transactionStore?.addNewFlow({
      txFlow: data,
      signer: props.params.signer,
    });
  }

  // check to see if bridging will be possible with the current parameters
  const { data: canBridge } = props.hook.bridge.canBridge({
    amount: convertToBigNumber(
      amount,
      props.hook.selections.token?.decimals ?? 18
    ).data.toString(),
  });

  // check the amount to see if we can get to confirmation
  /** Will not tell us if the other parameters are okay */
  const checkAmount = (amount: string) =>
    Number(amount) <=
    Number(
      formatBalance(
        props.hook.selections.token?.balance ?? "0",
        props.hook.selections.token?.decimals ?? 18,
        {
          precision: props.hook.selections.token?.decimals ?? 18,
        }
      )
    );

  // if confirmation is open
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  // cosmos address props
  const cosmosProps =
    props.hook.selections.method === BridgingMethod.IBC &&
    props.hook.direction === "out" &&
    props.hook.selections.toNetwork &&
    isCosmosNetwork(props.hook.selections.toNetwork)
      ? {
          cosmosAddress: {
            addressPrefix: props.hook.selections.toNetwork.addressPrefix,
            currentAddress: props.hook.addresses.getReceiver() ?? "",
            setAddress: (address: string) =>
              props.hook.setState("inputCosmosAddress", address),
          },
        }
      : {};
  return (
    <>
      <Modal
        open={isConfirmationModalOpen}
        width="30rem"
        height="min-content"
        onClose={() => {
          setIsConfirmationModalOpen(false);
        }}
      >
        {/* <TransactionModal /> */}
        <ConfirmationModal
          {...cosmosProps}
          token={{
            name: props.hook.selections.token?.symbol ?? "",
            url: props.hook.selections.token?.icon ?? "",
          }}
          imgUrl={
            props.hook.direction === "in"
              ? props.hook.selections.fromNetwork?.icon ?? ""
              : props.hook.selections.toNetwork?.icon ?? ""
          }
          addresses={{
            from: props.hook.addresses.getSender(),
            to: props.hook.addresses.getReceiver(),
            name:
              props.hook.direction === "in"
                ? props.hook.selections.fromNetwork?.name ?? null
                : props.hook.selections.toNetwork?.name ?? null,
          }}
          fromNetwork={props.hook.selections.fromNetwork?.name ?? ""}
          toNetwork={props.hook.selections.toNetwork?.name ?? ""}
          type={props.hook.direction}
          amount={amount}
          confirmation={{
            onConfirm: () => {
              setIsConfirmationModalOpen(false);
              bridgeTx();
            },
            canConfirm: canBridge ?? false,
          }}
          extraDetails={
            props.hook.selections.toNetwork?.id ===
            "ethereum-via-gravity-bridge" ? (
              <Text size="x-sm">
                To bridge your tokens to Ethereum through Gravity Bridge, first
                ensure that you have an IBC wallet like Keplr.
                <br />
                <br />
                Next, enter your Gravity Bridge address (from Keplr) below and
                confirm.
                <br />
                <br />
                Once completed, you can transfer your tokens from Gravity Bridge
                to Ethereum using the{" "}
                <a
                  style={{ textDecoration: "underline" }}
                  href="https://bridge.blockscape.network/"
                >
                  Gravity Bridge Portal
                </a>
              </Text>
            ) : undefined
          }
        />
      </Modal>
      <section className={styles.container}>
        <div
          className={styles["network-selection"]}
          style={{
            flexDirection:
              props.hook.direction === "in" ? "column" : "column-reverse",
          }}
        >
          <Container width="100%" gap={14}>
            <Text size="sm">
              {`From `}
              {/* {
                <span
                  style={{
                    color: "var(--text-dark-40-color)",
                  }}
                >
                  {props.hook.addresses.getSender()}
                </span>
              } */}
            </Text>

            {props.hook.direction === "in" ? (
              <Selector
                title="SELECT FROM NETWORK"
                activeItem={
                  props.hook.selections.fromNetwork ?? {
                    name: "Select network",
                    icon: "loader.svg",
                    id: "",
                  }
                }
                items={
                  props.hook.direction === "in"
                    ? props.hook.allOptions.networks.filter((network) =>
                        isEVMNetwork(network)
                      )!
                    : []
                }
                groupedItems={[
                  {
                    main: {
                      name: "Cosmos Networks",
                      icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32%402x/color/atom%402x.png",
                      id: "",
                    },
                    items: props.hook.allOptions.networks.filter(
                      (network) => !isEVMNetwork(network)
                    ),
                  },
                ]}
                onChange={
                  props.hook.direction === "in"
                    ? (networkId) => props.hook.setState("network", networkId)
                    : () => false
                }
              />
            ) : (
              <div className={styles["network-box"]}>
                <div className={styles.token}>
                  <Image
                    src={
                      props.hook.selections.fromNetwork?.icon ?? "loader.svg"
                    }
                    alt={props.hook.selections.fromNetwork?.name ?? "loading"}
                    width={30}
                    height={30}
                  />
                  <Text size="md" font="proto_mono">
                    {props.hook.selections.fromNetwork?.name}
                  </Text>
                </div>
              </div>
            )}

            <Text size="sm">
              {`To `}{" "}
              {/* {
                <span
                  style={{
                    color: "var(--text-dark-40-color)",
                  }}
                >
                  {props.hook.addresses.getReceiver()}
                </span>
              } */}
            </Text>
            {props.hook.direction === "out" ? (
              <Selector
                title="SELECT TO NETWORK"
                activeItem={
                  props.hook.selections.toNetwork ?? {
                    name: "Select network",
                    icon: "loader.svg",
                    id: "",
                  }
                }
                items={
                  props.hook.direction === "out"
                    ? props.hook.allOptions.networks
                    : []
                }
                onChange={
                  props.hook.direction === "out"
                    ? (networkId) => props.hook.setState("network", networkId)
                    : () => false
                }
              />
            ) : (
              <div className={styles["network-box"]}>
                <div className={styles.token}>
                  <Image
                    src={props.hook.selections.toNetwork?.icon ?? "loader.svg"}
                    alt={props.hook.selections.toNetwork?.name ?? "loading"}
                    width={30}
                    height={30}
                  />
                  <Text size="md" font="proto_mono">
                    {props.hook.selections.toNetwork?.name}
                  </Text>
                </div>
              </div>
            )}
          </Container>
          <Container width="100%" gap={14}>
            <Text size="sm">Select Token</Text>
            <Container width="100%" direction="row" gap={20}>
              <Selector
                title="SELECT TOKEN"
                activeItem={
                  props.hook.selections.token
                    ? {
                        ...props.hook.selections.token,
                        name:
                          props.hook.selections.token.name.length > 24
                            ? props.hook.selections.token.symbol
                            : props.hook.selections.token.name,
                      }
                    : ({
                        name: "Select Token",
                        icon: "loader.svg",
                        id: "",
                      } as Item)
                }
                items={
                  props.hook.allOptions.tokens.map((token) => ({
                    ...token,
                    name: token.name.length > 24 ? token.symbol : token.name,
                    secondary: formatBalance(
                      token.balance ?? "0",
                      token.decimals,
                      {
                        commify: true,
                      }
                    ),
                  })) ?? []
                }
                onChange={(tokenId) => props.hook.setState("token", tokenId)}
              />
              <Container width="100%">
                <Input
                  type="amount"
                  placeholder="0.0"
                  value={amount}
                  onChange={(val) => {
                    setAmount(val.target.value);
                  }}
                  className={styles["input"]}
                  error={!checkAmount(amount)}
                  errorMessage={
                    Number(
                      formatBalance(
                        props.hook.selections.token?.balance ?? "0",
                        props.hook.selections.token?.decimals ?? 18
                      )
                    ) === 0
                      ? "You have 0 balance"
                      : `"Amount must be less than ${formatBalance(
                          props.hook.selections.token?.balance ?? "0",
                          props.hook.selections.token?.decimals ?? 18,
                          {
                            commify: true,
                            symbol: props.hook.selections.token?.symbol,
                          }
                        )}"`
                  }
                />
                <Button
                  onClick={() => {
                    const token = props.hook.selections.token;
                    if (!token) return;
                    const maxAmount = token.balance ?? "0";
                    console.log(maxAmount)
                    setAmount(formatBalance(maxAmount, token.decimals));
                  }}
                >
                  MAX:{" "}
                </Button>
                <div>
                  token balance:{" "}
                  {formatBalance(
                    props.hook.selections.token?.balance ?? "0",
                    props.hook.selections.token?.decimals ?? 0
                  )}
                </div>
              </Container>
            </Container>
          </Container>
          {/* <Text size="sm">Select Method</Text>
          <Selector
            title="SELECT METHOD"
            activeItem={{
              name: getBridgeMethodInfo(props.hook.selections.method).name,
              id: props.hook.selections.method ?? "0",
              icon: getBridgeMethodInfo(props.hook.selections.method).icon,
            }}
            items={props.hook.allOptions.methods.map((method) => ({
              name: getBridgeMethodInfo(method).name,
              id: method,
              icon: getBridgeMethodInfo(method).icon,
            }))}
            onChange={(method) =>
              props.hook.setters.method(method as BridgingMethod)
            }
          /> */}
        </div>
        <Spacer height="100px" />

        <Spacer height="100px" />
        <Button
          width="fill"
          onClick={() => {
            setIsConfirmationModalOpen(true);
          }}
          disabled={!checkAmount(amount) || Number(amount) <= 0}
        >
          {props.hook.direction === "in" ? "BRIDGE IN" : "BRIDGE OUT"}
        </Button>
      </section>
    </>
  );
};

export default Bridging;
