"use client";
import { useState, ChangeEvent, useMemo } from "react";
import styles from "../swap.module.scss";
import Container from "@/components/container/container";
import TokenDropdown from "@/components/dropdown/dropdown";
import Text from "@/components/text";
import Input from "@/components/input/input";
import Button from "@/components/button/button";
import Icon from "@/components/icon/icon";
import { displayAmount } from "@/utils/formatting";
import InfoPop from "@/components/infopop/infopop";
import BigNumber from "bignumber.js";
import Switch from "@/components/switch/switch";

interface Token {
  symbol: string;
  name: string;
  logoURI: string;
  address: string;
  balance?: string;
  decimals: number;
  price?: string;
}

// Mock data for development
const mockTokens: Token[] = [
  {
    symbol: "ALTHEA",
    name: "Althea",
    logoURI: "/althea.svg",
    address: "0x1234...",
    balance: "1000000000000000000000",
    decimals: 18,
    price: "2000000000000000000",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    logoURI: "/icons/usdc.svg",
    address: "0x5678...",
    balance: "500000000",
    decimals: 6,
    price: "1000000",
  },
  {
    symbol: "USDT",
    name: "Tether",
    logoURI: "/icons/usdt.svg",
    address: "0x9876...",
    balance: "1000000000",
    decimals: 6,
    price: "1000000",
  },
  {
    symbol: "WETH",
    name: "Ethereum",
    logoURI: "/icons/eth.svg",
    address: "0x1234...",
    balance: "1000000000000000000000",
    decimals: 18,
    price: "2000000000000000000000",
  },
  {
    symbol: "GRAVITON",
    name: "Graviton",
    logoURI: "/icons/grav.svg",
    address: "0x1234...",
    balance: "1000000000000000000000",
    decimals: 18,
    price: "500000000000000000",
  },
  {
    symbol: "ALTHEA",
    name: "Althea",
    logoURI: "/althea.svg",
    address: "0x1234...",
    balance: "1000000000000000000000",
    decimals: 18,
    price: "2000000000000000000",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    logoURI: "/icons/usdc.svg",
    address: "0x5678...",
    balance: "500000000",
    decimals: 6,
    price: "1000000",
  },
  {
    symbol: "USDT",
    name: "Tether",
    logoURI: "/icons/usdt.svg",
    address: "0x9876...",
    balance: "1000000000",
    decimals: 6,
    price: "1000000",
  },
  {
    symbol: "WETH",
    name: "Ethereum",
    logoURI: "/icons/eth.svg",
    address: "0x1234...",
    balance: "1000000000000000000000",
    decimals: 18,
    price: "2000000000000000000000",
  },
  {
    symbol: "GRAVITON",
    name: "Graviton",
    logoURI: "/icons/grav.svg",
    address: "0x1234...",
    balance: "1000000000000000000000",
    decimals: 18,
    price: "500000000000000000",
  },
];

const MAX_SLIPPAGE = 50; // Maximum allowed slippage percentage

export default function SwapBox() {
  const [fromToken, setFromToken] = useState<Token | undefined>(mockTokens[0]);
  const [toToken, setToToken] = useState<Token | undefined>(mockTokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState("0.01");
  const [priceImpact, setPriceImpact] = useState("0.00");
  const [isRotated, setIsRotated] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isGasless, setIsGasless] = useState(false);

  // Calculate minimum amount received based on slippage
  const minimumReceived = useMemo(() => {
    if (!toAmount || !toToken) return "0";
    const slippageMultiplier = BigNumber(1).minus(
      BigNumber(slippage).dividedBy(100)
    );
    return BigNumber(toAmount).multipliedBy(slippageMultiplier).toString();
  }, [toAmount, slippage, toToken]);

  const handleSlippageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Validate and update slippage
    if (value && !isNaN(Number(value))) {
      const numValue = Number(value);
      if (numValue >= 0 && numValue <= MAX_SLIPPAGE) {
        setSlippage(value);
      }
    } else {
      setSlippage("0.01");
    }
  };

  const handleSwitch = () => {
    setIsRotated(!isRotated);
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const calculateAmount = (
    value: string,
    from: Token,
    to: Token,
    isFromToken: boolean
  ) => {
    if (!from || !to || !value) return "0";

    // Convert prices to normal numbers by dividing by their respective decimals
    const fromPrice = BigNumber(from.price || "0").dividedBy(
      BigNumber(10).pow(from.decimals)
    );
    const toPrice = BigNumber(to.price || "0").dividedBy(
      BigNumber(10).pow(to.decimals)
    );

    if (isFromToken) {
      // Calculate to amount: (fromAmount * fromTokenPrice) / toTokenPrice
      return BigNumber(value)
        .multipliedBy(fromPrice)
        .dividedBy(toPrice)
        .toString();
    }
    // Calculate from amount: (toAmount * toTokenPrice) / fromTokenPrice
    return BigNumber(value)
      .multipliedBy(toPrice)
      .dividedBy(fromPrice)
      .toString();
  };

  const handleFromAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromAmount(value);

    if (fromToken && toToken) {
      const calculatedAmount = calculateAmount(value, fromToken, toToken, true);
      setToAmount(calculatedAmount);

      // Calculate price impact
      const impact = BigNumber(value || "0")
        .multipliedBy(fromToken.price || "0")
        .dividedBy(100)
        .toString();
      setPriceImpact(Number(impact).toFixed(2));
    } else {
      setToAmount("0");
      setPriceImpact("0.00");
    }
  };

  const handleToAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToAmount(value);

    if (fromToken && toToken) {
      const calculatedAmount = calculateAmount(
        value,
        toToken,
        fromToken,
        false
      );
      setFromAmount(calculatedAmount);

      // Calculate price impact based on the new from amount
      const impact = BigNumber(calculatedAmount || "0")
        .multipliedBy(fromToken.price || "0")
        .dividedBy(100)
        .toString();
      setPriceImpact(Number(impact).toFixed(2));
    } else {
      setFromAmount("0");
      setPriceImpact("0.00");
    }
  };

  const handleTokenSelect = (token: Token, isFromToken: boolean) => {
    if (isFromToken) {
      setFromToken(token);
    } else {
      setToToken(token);
    }
  };

  return (
    <Container className={styles.swapBox} direction="column" gap={20}>
      <Container direction="column" gap={10}>
        <Container gap="auto" direction="row">
          <Text size="sm" theme="secondary-light">
            From
          </Text>
          {fromToken && (
            <Text size="sm" theme="secondary-light">
              {displayAmount(fromToken.balance ?? "0", fromToken.decimals)}{" "}
              {fromToken.symbol.toUpperCase()}
            </Text>
          )}
        </Container>
        <Container
          style={{
            width: "100%",
            justifyContent: "space-between",
            flexDirection: "row",
            alignItems: "center",
            paddingTop: "12px",
            paddingBottom: "12px",
          }}
        >
          <Container className={styles.amountContainer}>
            <Input
              type="number"
              value={fromAmount}
              onChange={handleFromAmountChange}
              placeholder="0.0"
              className={styles.amountInput}
              style={{ maxWidth: "180px", height: "48px" }}
            />
            <Text
              size="sm"
              theme="secondary-dark"
              className={styles.dollarValue}
            >
              $
              {fromAmount && fromToken?.price
                ? BigNumber(fromAmount)
                    .multipliedBy(
                      BigNumber(fromToken.price).dividedBy(
                        BigNumber(10).pow(fromToken.decimals)
                      )
                    )
                    .toFixed(2)
                : "0.00"}
            </Text>
          </Container>
          <Container gap={10} className={styles.tokenSelector}>
            <TokenDropdown
              tokens={mockTokens}
              selectedToken={fromToken}
              onSelect={(token) => handleTokenSelect(token, true)}
              showBalance
            />
          </Container>
        </Container>
      </Container>

      <Container style={{ position: "relative" }}>
        <div className={styles.divider} />
        <button
          onClick={handleSwitch}
          className={`${styles.switchButton} ${
            isRotated ? styles.rotated : ""
          }`}
        >
          <Icon
            icon={{
              url: "/dropdown.svg",
              size: 22,
            }}
            themed
            style={{ filter: "invert(var(--dark-mode))" }}
          />
        </button>
      </Container>

      <Container direction="column" gap={10}>
        <Container gap="auto" direction="row">
          <Text size="sm" theme="secondary-light">
            To
          </Text>
          {toToken && (
            <Text size="sm" theme="secondary-light">
              {displayAmount(toToken.balance ?? "0", toToken.decimals)}{" "}
              {toToken.symbol.toUpperCase()}
            </Text>
          )}
        </Container>
        <Container
          style={{
            width: "100%",
            justifyContent: "space-between",
            flexDirection: "row",
            alignItems: "center",
            paddingTop: "12px",
            paddingBottom: "12px",
          }}
        >
          <Container className={styles.amountContainer}>
            <Input
              type="number"
              value={toAmount}
              onChange={handleToAmountChange}
              placeholder="0.0"
              className={styles.amountInput}
              style={{ maxWidth: "180px", height: "48px" }}
            />

            <Text
              size="sm"
              theme="secondary-dark"
              className={styles.dollarValue}
            >
              $
              {toAmount && toToken?.price
                ? BigNumber(toAmount)
                    .multipliedBy(
                      BigNumber(toToken.price).dividedBy(
                        BigNumber(10).pow(toToken.decimals)
                      )
                    )
                    .toFixed(2)
                : "0.00"}
            </Text>
          </Container>
          <Container gap={10} className={styles.tokenSelector}>
            <TokenDropdown
              tokens={mockTokens}
              selectedToken={toToken}
              onSelect={(token) => handleTokenSelect(token, false)}
              showBalance
            />
          </Container>
        </Container>
      </Container>
      <div style={{ width: "100%", marginTop: "12px" }}>
        <Button
          disabled={!fromToken || !toToken || !fromAmount || !toAmount}
          onClick={() => {}}
          color="primary"
          width="fill"
        >
          {isGasless ? "Sign Gasless" : "Swap"}
        </Button>
      </div>
      <Container>
        {fromToken && toToken && (
          <Container direction="column">
            <Container
              direction="row"
              gap={10}
              style={{
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Container direction="row" gap={8} center={{ vertical: true }}>
                <Switch checked={isGasless} onChange={setIsGasless} />
                <Text size="sm" theme="secondary-light">
                  Gasless
                </Text>
                <InfoPop>
                  <Text size="sm">
                    You&apos;ll need to tip the relayer from your DEX balance.
                  </Text>
                </InfoPop>
              </Container>

              <div
                className={styles.detailsHeader}
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              >
                <Text size="sm" theme="secondary-light">
                  Show Details
                </Text>
                <Icon
                  icon={{
                    url: "/dropdown.svg",
                    size: 22,
                  }}
                  themed
                  className={`${styles.switchButton} ${
                    isDetailsExpanded ? styles.rotated : ""
                  }`}
                  style={{ filter: "invert(var(--dark-mode))" }}
                />
              </div>
            </Container>

            <Container
              direction="column"
              gap={10}
              className={`${styles.details} ${
                isDetailsExpanded ? styles.expanded : ""
              }`}
            >
              <Container gap="auto" direction="row">
                <Container direction="row" gap={4} center={{ vertical: true }}>
                  <Text size="sm" theme="secondary-light">
                    Price Impact
                  </Text>
                  <InfoPop>
                    <Text size="sm">
                      The difference between the market price and estimated
                      price due to trade size.
                    </Text>
                  </InfoPop>
                </Container>
                <Text
                  size="sm"
                  theme="secondary-light"
                  className={Number(priceImpact) > 1 ? styles.error : undefined}
                >
                  {priceImpact}%
                </Text>
              </Container>
              <Container gap="auto" direction="row">
                <Container direction="row" gap={4} center={{ vertical: true }}>
                  <Text size="sm" theme="secondary-light">
                    Slippage Tolerance
                  </Text>
                  <InfoPop>
                    <Text size="sm">
                      Your transaction will revert if the price changes
                      unfavorably by more than this percentage.
                    </Text>
                  </InfoPop>
                </Container>
                <Container
                  className={styles.customSlippage}
                  direction="row"
                  gap={4}
                  center={{ vertical: true }}
                >
                  <Input
                    type="number"
                    value={slippage}
                    onChange={handleSlippageChange}
                    placeholder="0.5"
                    className={styles.slippageInput}
                    min={0}
                    max={MAX_SLIPPAGE}
                    step={0.1}
                  />
                </Container>
              </Container>
              {Number(slippage) > 5 && (
                <Text size="sm" theme="secondary-light">
                  High slippage tolerance. Your transaction may be frontrun.
                </Text>
              )}
              <Container gap="auto" direction="row">
                <Container direction="row" gap={4} center={{ vertical: true }}>
                  <Text size="sm" theme="secondary-light">
                    Minimum Received
                  </Text>
                  <InfoPop>
                    <Text size="sm">
                      The minimum amount you will receive after slippage or your
                      transaction will revert.
                    </Text>
                  </InfoPop>
                </Container>
                <Text size="sm" theme="secondary-light">
                  {displayAmount(minimumReceived, toToken?.decimals ?? 18, {
                    precision: 6,
                  })}{" "}
                  {toToken?.symbol}
                </Text>
              </Container>
            </Container>
          </Container>
        )}
      </Container>
    </Container>
  );
}
