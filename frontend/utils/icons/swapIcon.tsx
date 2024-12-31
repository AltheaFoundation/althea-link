import Image from "next/image";
import styles from "./swapIcon.module.scss";
import { useState } from "react";

interface SwapIconProps {
  fromTokenIcon: string;
  toTokenIcon: string;
  size?: number;
}

export default function SwapIcon({
  fromTokenIcon,
  toTokenIcon,
  size = 40,
}: SwapIconProps) {
  const [fromError, setFromError] = useState(false);
  const [toError, setToError] = useState(false);

  return (
    <div className={styles.swapIcon} style={{ width: size, height: size }}>
      <div className={styles.tokenWrapper}>
        <Image
          src={fromTokenIcon}
          alt="from token"
          width={size * 0.8}
          height={size * 0.8}
          className={styles.fromToken}
          onError={() => setFromError(true)}
          style={{ display: fromError ? "none" : "block" }}
        />
        {fromError && (
          <div
            className={styles.fallbackIcon}
            style={{ width: size * 0.45, height: size * 0.45 }}
          >
            ?
          </div>
        )}
      </div>

      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        className={styles.arrow}
      >
        <path
          d="M5 12H19M19 12L12 5M19 12L12 19"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className={styles.tokenWrapper}>
        <Image
          src={toTokenIcon}
          alt="to token"
          width={size * 0.8}
          height={size * 0.8}
          className={styles.toToken}
          onError={() => setToError(true)}
          style={{ display: toError ? "none" : "block" }}
        />
        {toError && (
          <div
            className={styles.fallbackIcon}
            style={{ width: size * 0.45, height: size * 0.45 }}
          >
            ?
          </div>
        )}
      </div>
    </div>
  );
}
