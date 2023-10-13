"use client";

import Container from "@/components/container/container";
import Text from "@/components/text";
import styles from "./home.module.scss";
import EcoTile from "./components/ecoTile";
import Icon from "@/components/icon/icon";
import Button from "@/components/button/button";
import Link from "next/link";
export default function Home() {
  return (
    <Container
      className={styles.container}
      center={{
        vertical: true,
        horizontal: true,
      }}
    >
      <section className={styles.hero}>
        <Text
          font="rm_mono"
          weight="bold"
          style={{
            fontSize: "3.5rem",
          }}
        >
          CANTO
        </Text>

        <Icon
          icon={{
            url: "/orb.svg",
            size: {
              width: 800,
              height: 400,
            },
          }}
          themed
        />

        <Container direction="row" gap={20}>
          <Link href="/bridge">
            <Button>Bridge To Canto</Button>
          </Link>
          <a href="#ecosystem">
            {" "}
            <Button>Explore Ecosystem</Button>
          </a>
        </Container>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="16"
          viewBox="0 0 28 16"
          fill="none"
        >
          <rect
            x="12.3076"
            y="12.3086"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="9.23096"
            y="9.23047"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="15.3848"
            y="9.23047"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="6.15381"
            y="6.15234"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="18.4614"
            y="6.15234"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="3.07715"
            y="3.07812"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="21.5386"
            y="3.07812"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
          <rect
            x="24.6152"
            width="3.07692"
            height="3.07692"
            fill="var(--primary-90-color)"
          />
        </svg>
      </section>

      <section className={styles.ecosystem} id="ecosystem">
        <Text font="proto_mono" size="title">
          Ecosystem
        </Text>

        <div className={styles["eco-grid"]}>
          <EcoTile
            name="Blank Rasa"
            description="Buy and Sell NFTs"
            image="/ecosystem/blank-rasa.svg"
            link="https://www.blankrasa.com/"
          />

          <EcoTile
            name="Slingshot"
            description="Swap tokens on Canto and 8 other networks"
            image="/ecosystem/slingshot.svg"
            link="https://slingshot.finance/"
          />

          <EcoTile
            name="Cadence Protocol"
            description="Next-gen decentralized perpetuals"
            image="/ecosystem/cad.png"
            link="https://www.cadenceprotocol.io/"
          />

          <EcoTile
            name="Vivacity (coming soon)"
            description="Yet to be announced"
            image="/ecosystem/blankRasa.svg"
            link="https://blankrasa.io/"
          />
        </div>
      </section>
    </Container>
  );
}
