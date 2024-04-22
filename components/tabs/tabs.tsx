"use client";

import { useState } from "react";
import styles from "./tabs.module.scss";
import Text from "../text";
import clsx from "clsx";
import useScreenSize from "@/hooks/helpers/useScreenSize";

interface Props {
  defaultIndex?: number;
  tabs: {
    title: string;
    extraTitle?: React.ReactNode;
    isDisabled?: boolean;
    onClick?: () => void;
    content: React.ReactNode;
    hideOnMobile?: boolean;
  }[];
  height?: string;
  shadows?: boolean;
}
const Tabs = (props: Props) => {
  const [activeTab, setActiveTab] = useState(props.defaultIndex ?? 0);
  const { isMobile } = useScreenSize();

  return (
    <div
      className={styles.container}
      style={{
        boxShadow: props.shadows ? undefined : "none",
        height: props.height,
      }}
    >
      <div className={styles.tabs}>
        {props.tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveTab(index);
              tab.onClick && tab.onClick();
            }}
            disabled={tab.isDisabled}
            className={clsx(
              styles.tab,
              activeTab === index && styles.active,
              activeTab === index && "active",
              index === props.tabs.length - 1 && styles.last,
              index === 0 && styles.first
            )}
            style={isMobile && tab.hideOnMobile ? { display: "none" } : {}}
          >
            <Text font="nm_plex" weight="500" size="sm" theme={"primary-dark"}>
              {tab.title}
            </Text>
            {tab.extraTitle}
          </button>
        ))}
      </div>
      <div className={styles.panel}>
        {props.tabs.map((tab, index) => index === activeTab && tab.content)}
      </div>
    </div>
  );
};

export default Tabs;
