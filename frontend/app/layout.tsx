"use client";

import "./globals.scss";

import Footer from "@/components/footer/footer";
import NavBar from "@/components/nav_bar/navBar";
import CantoWalletProvider from "@/provider/rainbowProvider";
import localFont from "next/font/local";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ChainProvider, ThemeCustomizationProps } from "@cosmos-kit/react";
import { cosmosAminoConverters, cosmosProtoRegistry } from "interchain";
import { wallets as keplr } from "@cosmos-kit/keplr";
import { wallets as cosmostation } from "@cosmos-kit/cosmostation";

import { wallets as station } from "@cosmos-kit/station";
import { wallets as trust } from "@cosmos-kit/trust";
import { wallets as leap } from "@cosmos-kit/leap";
import { ReactQueryClientProvider } from "@/provider/reactQueryProvider";
import ToastWizard from "@/components/walletWizard/wizardToast";
import { WalletWizardModal } from "@/components/walletWizard/wizardModal";
import { useEffect, useState } from "react";
import { ToastContainer } from "@/components/toast";
import { Chain, AssetList } from "@chain-registry/types";
import { Registry } from "@cosmjs/proto-signing";
import { SigningStargateClientOptions, AminoTypes } from "@cosmjs/stargate";
import { SignerOptions } from "@cosmos-kit/core";
import "@interchain-ui/react/styles";
import WalletConnect from "@/components/wallet_connect/walletConnect";
import StatusText from "@/components/status_text/statusText";
import AddKeplr from "@/components/walletWizard/addKeplr";

const nm_plex = IBM_Plex_Sans({
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--nm-plex",
  subsets: ["latin"],
});

const rm_mono = IBM_Plex_Mono({
  variable: "--rm-mono",
  style: "normal",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const nm_macan = localFont({
  src: "../fonts/macan.ttf",
  weight: "400",
  style: "normal",
  variable: "--nm-macan",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isWalletWizardOpen, setIsWalletWizardOpen] = useState(false);
  const [showToast, setShowToast] = useState(true);

  const signerOptions: SignerOptions = {
    // @ts-ignore
    signingStargate: (
      _chain: string | Chain
    ): SigningStargateClientOptions | undefined => {
      // @ts-ignore
      const mergedRegistry = new Registry([...cosmosProtoRegistry]);
      const mergedAminoTypes = new AminoTypes({
        ...cosmosAminoConverters,
      });
      return {
        aminoTypes: mergedAminoTypes,
        // @ts-ignore
        registry: mergedRegistry,
      };
    },
  };

  // MIGRATION TOOL DISABLED
  // const openWalletWizard = () => {
  //   setIsWalletWizardOpen(true);
  //   setShowToast(false);
  // };

  // const closeWalletWizard = () => {
  //   setIsWalletWizardOpen(false);
  //   setShowToast(true);
  // };

  const modalThemeOverrides: ThemeCustomizationProps = {
    modalContentStyles: {
      backgroundColor: "#001833",
      opacity: 1,
    },
    overrides: {
      "connect-modal": {
        bg: {
          light: "rgba(0, 0, 0, 0)",
          dark: "rgba(32, 32, 32, 0)",
        },
        activeBg: {
          light: "rgba(0, 0, 0, 0)",
          dark: "rgba(255, 255, 255, 0.9)",
        },
        color: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
        focusedBg: {
          light: "rgba(0, 0, 0, 0)",
          dark: "rgba(32, 32, 32, 0)",
        },
        disabledBg: {
          light: "rgba(0, 0, 0, 0)",
          dark: "rgba(32, 32, 32, 0)",
        },
      },

      "clipboard-copy-text": {
        bg: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
      },
      "connect-modal-qr-code-shadow": {
        bg: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
      },
      button: {
        bg: {
          light: "#1c508c",
          dark: "#1c508c",
        },
      },
      "connect-modal-head-title": {
        bg: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
      },
      "connect-modal-wallet-button-label": {
        bg: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
      },
      "connect-modal-wallet-button-sublogo": {
        bg: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
      },
      "connect-modal-qr-code-loading": {
        bg: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
      },
      "connect-modal-wallet-button": {
        bg: {
          light: "rgba(45, 47, 61, 0.9)",
          dark: "rgba(45, 47, 61, 0.9)",
        },
        hoverBg: {
          light: "#1c508c",
          dark: "#1c508c",
        },
        borderColor: { light: "black", dark: "black" },
        hoverBorderColor: {
          light: "black",
          dark: "black",
        },
        activeBorderColor: {
          light: "#FFFFFF",
          dark: "#FFFFFF",
        },
        color: {
          light: "#ffffff",
          dark: "#FFFFFF",
        },
        focusedBorderColor: { light: "#FFFFFF", dark: "#FFFFFF" },
      },
      "connect-modal-qr-code": {
        bg: {
          light: "#add3ff",
          dark: "#0077ff",
        },
        color: {
          light: "#0077ff",
          dark: "#add3ff",
        },
      },
      "connect-modal-install-button": {
        bg: {
          light: "#F0F0F0",
          dark: "#fcfcfc",
        },
      },
      "connect-modal-qr-code-error": {
        bg: {
          light: "#FFEEEE",
          dark: "#FFFFFF",
        },
      },
      "connect-modal-qr-code-error-button": {
        bg: {
          light: "#FFCCCC",
          dark: "#552222",
        },
      },
    },
  };

  const altheatestnet: Chain = {
    chain_name: "althea",
    status: "live",
    network_type: "mainnet",
    website: "https://althea.net/",
    pretty_name: "Althea",
    chain_id: "althea_6633438-1",
    bech32_prefix: "althea",
    daemon_name: "althea",
    node_home: "$HOME/.althea",
    slip44: 118,
    apis: {
      rest: [
        {
          address: "http://testnet.althea.net:1317/",
          provider: "Chandra Station",
        },
      ],
      rpc: [
        {
          address: "http://testnet.althea.net:26657",
          provider: "Chandra Station",
        },
      ],
    },
    fees: {
      fee_tokens: [
        {
          denom: "aalthea",
          fixed_min_gas_price: 100000000000,
          low_gas_price: 100000000000,
          average_gas_price: 100000000000,
          high_gas_price: 300000000000,
        },
      ],
    },
    staking: {
      staking_tokens: [
        {
          denom: "aalthea",
        },
      ],
    },
    logo_URIs: {
      png: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.png",
      svg: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.svg",
    },
    images: [
      {
        png: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.png",
        svg: "https://github.com/chalabi2/althea-appV2/blob/staging/public/althea.svg",
      },
    ],
    codebase: {
      git_repo: "https://github.com/AltheaFoundation/althea-L1",
      recommended_version: "v1.3.0",
      compatible_versions: ["v1.3.0"],
      binaries: {
        "linux/amd64":
          "https://github.com/AltheaFoundation/althea-L1/releases/download/v1.3.0/althea-linux-amd64",
      },
      versions: [
        {
          name: "v1",
          recommended_version: "v1.3.0",
          compatible_versions: ["v1.3.0"],
        },
      ],
      genesis: {
        genesis_url:
          "https://github.com/AltheaFoundation/althea-L1-docs/blob/main/althea-l1-mainnet-genesis.json",
      },
    },
  };
  const altheatestnetAssets: AssetList = {
    chain_name: "althea",
    assets: [
      {
        description: "Althea native token",
        denom_units: [
          {
            denom: "aalthea",
            exponent: 0,
          },
          {
            denom: "althea",
            exponent: 18,
          },
        ],
        base: "aalthea",
        name: "Althea Token",
        display: "althea",
        symbol: "ALTHEA",
      },
    ],
  };

  return (
    <html lang="en">
      {/* <head>
        <link
          rel="icon"
          href="/icon?<generated>"
          type="image/png"
          sizes="32x32"
        />
      </head> */}
      {/* <!-- Primary Meta Tags --> */}
      <title>Althea Link</title>
      <meta name="title" content="Althea Link | liquid infrastructure " />
      <meta
        name="description"
        content="Althea is your gateway to cross-chain liquid infrastructure"
      />

      {/* <!-- Open Graph / Facebook --> */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://althea.link" />
      <meta property="og:title" content="Althea Link" />
      <meta
        property="og:description"
        content="Althea is your gateway to cross-chain liquid infrastructure"
      />
      <meta property="og:image" content="https://althea.link/meta.jpg" />

      {/* <!-- Twitter --> */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://althea.link" />
      <meta property="twitter:title" content="althea.link" />
      <meta
        property="twitter:description"
        content="Althea is your gateway to cross-chain liquid infrastructure"
      />
      <meta property="twitter:image" content="https://althea.link/meta.jpg" />

      <body
        className={"dark"}
        style={
          {
            "--nm-plex": nm_plex.style.fontFamily,
            "--nm-macan": nm_macan.style.fontFamily,
            "--rm-mono": rm_mono.style.fontFamily,
          } as React.CSSProperties
        }
      >
        <div id="toast-root"></div>
        <ChainProvider
          chains={[altheatestnet]}
          assetLists={[altheatestnetAssets]}
          // @ts-ignore
          wallets={[...keplr, ...cosmostation, ...trust, ...station, ...leap]}
          signerOptions={signerOptions}
          logLevel="NONE"
          modalTheme={modalThemeOverrides}
          walletConnectOptions={{
            signClient: {
              projectId: process.env
                .NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
              relayUrl: "wss://relay.walletconnect.org",
              metadata: {
                name: "Althea",
                description: "Althea App",
                url: "https://althea.zone/",
                icons: [],
              },
            },
          }}
          endpointOptions={{
            isLazy: true,
            endpoints: {
              altheatestnet: {
                rpc: ["http://testnet.althea.net:26657"],
                rest: ["http://testnet.althea.net:1317/"],
              },
            },
          }}
        >
          <CantoWalletProvider>
            <ReactQueryClientProvider>
              <ToastContainer>
                <div className="body">
                  {/* <InfoBar
                values={[
                  {
                    name: "contracts w/ CSR enabled:",
                    value: "$1,210.56",
                    change: "+2% $23.4",
                    isPositive: true,
                  },
                  {
                    name: "CANTO price:",
                    value: "$1,210.56",
                    change: "+22%",
                    isPositive: true,
                  },
                  {
                    name: "TVL:",
                    value: "$1,210.56",
                    change: "-1.2%",
                    isPositive: false,
                  },
                  {
                    name: "Market Cap:",
                    value: "$1,435,438.56",
                    change: "-34.2%",
                    isPositive: false,
                  },
                ]}
              /> */}
                  <NavBar />

                  {children}

                  <div id="modal-root">
                    {showToast && (
                      <AddKeplr
                        isVisible={showToast}
                        onClose={() => setShowToast(false)}
                      />
                    )}
                    {/* <WalletWizardModal
                      balance={10}
                      isOpen={isWalletWizardOpen}
                      onOpen={setIsWalletWizardOpen}
                      onClose={closeWalletWizard}
                    /> */}
                  </div>
                  <WalletConnect />
                  <StatusText />
                  <Footer />
                </div>
              </ToastContainer>
            </ReactQueryClientProvider>
          </CantoWalletProvider>
        </ChainProvider>
      </body>
    </html>
  );
}
