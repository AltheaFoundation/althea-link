"use client";

import "./globals.scss";

import Footer from "@/components/footer/footer";
import NavBar from "@/components/nav_bar/navBar";
import CantoWalletProvider from "@/provider/rainbowProvider";
import localFont from "next/font/local";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ChainProvider } from "@cosmos-kit/react";
import { cosmosAminoConverters, cosmosProtoRegistry } from "interchain";
import { wallets as keplr } from "@cosmos-kit/keplr";
import { wallets as cosmostation } from "@cosmos-kit/cosmostation";
import { ToastContainer } from "@/components/toast";
import { wallets as station } from "@cosmos-kit/station";
import { wallets as trust } from "@cosmos-kit/trust";
import { wallets as leap } from "@cosmos-kit/leap";
import { ReactQueryClientProvider } from "@/provider/reactQueryProvider";

import { Chain } from "@chain-registry/types";
import { Registry } from "@cosmjs/proto-signing";
import { SigningStargateClientOptions, AminoTypes } from "@cosmjs/stargate";
import { SignerOptions } from "@cosmos-kit/core";
import "@interchain-ui/react/styles";
import { WalletConnect } from "@/components/wallet_connect/walletConnect";
import StatusText from "@/components/status_text/statusText";
import useScreenSize from "@/hooks/helpers/useScreenSize";
import { althea, altheaAssets } from "@/provider/chainRegistry";
import { modalThemeOverrides } from "@/provider/cosmosKitModal";
import { useState } from "react";

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
  const { isMobile } = useScreenSize();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

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
          chains={[althea]}
          assetLists={[altheaAssets]}
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
                rpc: ["https://nodes.chandrastation.com/rpc/althea/"],
                rest: ["https://nodes.chandrastation.com/api/althea//"],
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: isMobile ? "center" : "space-between",
                      alignItems: "center",
                      alignContent: "center",
                      justifyItems: "center",
                      position: "sticky",
                      bottom: 0,
                      marginBottom: isMobile ? "0px" : "24px",
                      marginRight: isMobile ? "auto" : "0px",
                      marginLeft: isMobile ? "auto" : "0px",
                      marginTop: isMobile ? "0px" : "24px",
                      padding: isMobile ? "0px 0px" : "20px 32px",
                    }}
                  >
                    {isMobile ? (
                      <div />
                    ) : (
                      <>
                        <StatusText />
                        <WalletConnect
                          setIsOpen={setIsWalletModalOpen}
                          isOpen={isWalletModalOpen}
                          onClose={() => setIsWalletModalOpen(false)}
                        />
                      </>
                    )}
                  </div>

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
