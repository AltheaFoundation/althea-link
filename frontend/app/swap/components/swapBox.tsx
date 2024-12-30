"use client";
import { useState, ChangeEvent, useMemo, useEffect } from "react";
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
import { AmbientPool } from "@/hooks/pairs/newAmbient/interfaces/ambientPools";
import useCantoSigner from "@/hooks/helpers/useCantoSigner";
import { SwapTxType } from "@/transactions/swap/types";
import useStore from "@/stores/useStore";
import useTransactionStore from "@/stores/transactionStore";
import { TransactionFlowType } from "@/transactions/flows";
import { Token } from "@/utils/tokens/tokenTypes.utils";

const MAX_SLIPPAGE = 50; // Maximum allowed slippage percentage
const PRICE_PRECISION = 18; // Ambient uses 18 decimal precision for prices

export default function SwapBox({
  pairs,
}: {
  pairs: {
    allAmbient: AmbientPool[];
    userAmbient: AmbientPool[];
  };
}) {
  // Transform pool data into available tokens
  const availableTokens = useMemo(() => {
    const tokens = new Map<string, Token>();

    pairs.allAmbient.forEach((pair) => {
      // Add base token
      tokens.set(pair.base.address, {
        symbol: pair.base.symbol,
        name: pair.base.name,
        logoURI: pair.base.logoURI,
        address: pair.base.address,
        balance: pair.base.balance,
        decimals: pair.base.decimals,
        price: pair.stats.lastPriceSwap, // Price in quote tokens per base token
      });

      // Add quote token
      tokens.set(pair.quote.address, {
        symbol: pair.quote.symbol,
        name: pair.quote.name,
        logoURI: pair.quote.logoURI,
        address: pair.quote.address,
        balance: pair.quote.balance,
        decimals: pair.quote.decimals,
        // For quote tokens, price is inverse of lastPriceSwap
        price: new BigNumber(1).dividedBy(pair.stats.lastPriceSwap).toString(),
      });
    });

    return Array.from(tokens.values());
  }, [pairs]);

  // Update initial state to use first available tokens
  const [fromToken, setFromToken] = useState<Token | undefined>(undefined);
  const [toToken, setToToken] = useState<Token | undefined>(undefined);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState("0.01");
  const [priceImpact, setPriceImpact] = useState("0.00");
  const [isRotated, setIsRotated] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isGasless, setIsGasless] = useState(true);

  useEffect(() => {
    if (availableTokens.length > 1) {
      setFromToken(availableTokens[0]);
      setToToken(availableTokens[1]);
    }
  }, [availableTokens]);

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

    const currentPair = getCurrentPair();
    if (!currentPair) return "0";

    const amount = new BigNumber(value);
    const price = new BigNumber(currentPair.stats.lastPriceSwap);

    // Convert input value to wei based on token decimals
    const amountWei = amount.multipliedBy(
      new BigNumber(10).pow(from.decimals ?? 18)
    );

    let resultWei;
    const isBaseToQuote = from.address === currentPair.base.address;

    if (isFromToken) {
      if (isBaseToQuote) {
        // Converting from base to quote
        resultWei = amountWei.multipliedBy(price);
      } else {
        // Converting from quote to base
        resultWei = amountWei.dividedBy(price);
      }
    } else {
      if (isBaseToQuote) {
        // Converting to quote from base
        resultWei = amountWei.multipliedBy(price);
      } else {
        // Converting to base from quote
        resultWei = amountWei.dividedBy(price);
      }
    }

    // Convert result back from wei to display value using the target token's decimals
    return resultWei
      .dividedBy(new BigNumber(10).pow(to.decimals ?? 18))
      .toFixed(to.decimals ?? 18);
  };

  // Calculate price impact based on pool TVL
  const calculatePriceImpact = (amount: string, pair: AmbientPool) => {
    if (!amount || !pair) return "0";

    const swapAmount = new BigNumber(amount);
    const poolTVL = new BigNumber(pair.stats.baseTvl);

    // Simple price impact calculation: (swap amount / TVL) * 100
    return swapAmount.dividedBy(poolTVL).multipliedBy(100).toString();
  };

  // Find the relevant pair for the current token combination
  const getCurrentPair = () => {
    return pairs.allAmbient.find(
      (pair) =>
        (pair.base.address === fromToken?.address &&
          pair.quote.address === toToken?.address) ||
        (pair.quote.address === fromToken?.address &&
          pair.base.address === toToken?.address)
    );
  };

  // Update handleFromAmountChange to use real pool data
  const handleFromAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromAmount(value);

    if (fromToken && toToken) {
      const currentPair = getCurrentPair();
      if (currentPair) {
        const calculatedAmount = calculateAmount(
          value,
          fromToken,
          toToken,
          true
        );
        setToAmount(calculatedAmount);

        // Calculate price impact using pool TVL
        const impact = calculatePriceImpact(value, currentPair);
        setPriceImpact(Number(impact).toFixed(2));
      }
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

      const currentPair = getCurrentPair();
      if (currentPair) {
        // Calculate price impact based on the new from amount
        const impact = calculatePriceImpact(calculatedAmount, currentPair);
        setPriceImpact(Number(impact).toFixed(2));
      } else {
        setPriceImpact("0.00");
      }
    }
  };

  const handleTokenSelect = (token: Token, isFromToken: boolean) => {
    if (isFromToken) {
      setFromToken(token);
      // Reset amount when changing tokens
      setFromAmount("");
      setToAmount("");
    } else {
      setToToken(token);
      setFromAmount("");
      setToAmount("");
    }
  };

  const { txStore, signer, chainId } = useCantoSigner();

  const calculateLimitPrice = (
    currentPrice: string,
    slippagePercent: string,
    isBuy: boolean
  ): string => {
    // Convert price to square root price (sqrt(P))
    const sqrtPrice = new BigNumber(currentPrice).sqrt();
    const slippage = new BigNumber(slippagePercent).dividedBy(100);

    // For buys: limitPrice = sqrtPrice * (1 + slippage)
    // For sells: limitPrice = sqrtPrice * (1 - slippage)
    const multiplier = isBuy
      ? BigNumber(1).plus(slippage)
      : BigNumber(1).minus(slippage);

    // Convert to Q64.64 fixed-point format
    return sqrtPrice
      .multipliedBy(multiplier)
      .multipliedBy(new BigNumber(2).pow(64))
      .toFixed(0);
  };

  const validateSwap = (
    fromToken?: Token,
    toToken?: Token,
    fromAmount?: string,
    currentPair?: AmbientPool,
    signer?: any
  ): boolean => {
    if (!fromToken || !toToken || !fromAmount || !currentPair || !signer) {
      return false;
    }

    const amount = new BigNumber(fromAmount);
    if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
      return false;
    }

    // Check if user has enough balance
    const balance = new BigNumber(fromToken.balance ?? "0");
    if (balance.isLessThan(amount)) {
      return false;
    }

    return true;
  };

  const isBuyingBase = useMemo(() => {
    const currentPair = getCurrentPair();
    if (!currentPair || !fromToken || !toToken) return true;
    return toToken.address === currentPair.base.address;
  }, [getCurrentPair, fromToken, toToken]);

  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || !signer || !chainId) return;

    const currentPair = getCurrentPair();
    if (!currentPair) return;

    // Convert amounts to wei
    const amountWei = new BigNumber(fromAmount)
      .multipliedBy(new BigNumber(10).pow(fromToken.decimals ?? 18))
      .toFixed(0);

    const minOutWei = new BigNumber(minimumReceived)
      .multipliedBy(new BigNumber(10).pow(toToken.decimals ?? 18))
      .toFixed(0);

    // Determine if we're swapping base or quote token
    const isAmountBase = fromToken.address === currentPair.base.address;

    // Get the current price in the correct direction
    const currentPrice = isAmountBase
      ? currentPair.stats.lastPriceSwap
      : new BigNumber(1).dividedBy(currentPair.stats.lastPriceSwap).toString();

    console.log("Swap Debug:", {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount: {
        display: fromAmount,
        wei: amountWei,
      },
      minOut: {
        display: minimumReceived,
        wei: minOutWei,
      },
      price: {
        current: currentPrice,
        sqrt: new BigNumber(currentPrice).sqrt().toString(),
        limit: calculateLimitPrice(currentPrice, slippage, isBuyingBase),
      },
      direction: {
        isAmountBase,
        isBuyingBase,
      },
      pool: {
        base: currentPair.base.symbol,
        quote: currentPair.quote.symbol,
        poolIdx: currentPair.poolIdx,
      },
    });

    // Calculate limit price with the new square root price method
    const limitPrice = calculateLimitPrice(
      currentPrice,
      slippage,
      isBuyingBase
    );

    // Create and add transaction flow
    await txStore?.addNewFlow({
      ethAccount: signer.account.address,
      txFlow: {
        title: `Swap ${fromToken.symbol} for ${toToken.symbol}`,
        txType: TransactionFlowType.SWAP_TX,
        icon: "swap",
        params: {
          chainId,
          ethAccount: signer.account.address,
          pool: currentPair,
          fromToken,
          toToken,
          amount: amountWei,
          isAmountBase,
          limitPrice,
          minOut: minOutWei,
          txType: SwapTxType.SWAP,
          tip: isGasless ? "1000" : "0",
          reserveFlags: 0,
        },
      },
    });
  };

  const formatDisplayAmount = (amount: string, decimals: number = 18) => {
    const bn = new BigNumber(amount);
    if (bn.isZero()) return "0";

    // If the number is very small (less than 0.000001), use scientific notation
    if (bn.isGreaterThan(0) && bn.isLessThan(0.000001)) {
      return bn.toExponential(6);
    }

    // Otherwise format with up to 6 decimal places
    return bn.toFormat(Math.min(6, decimals), {
      groupSize: 3,
      groupSeparator: ",",
      decimalSeparator: ".",
    });
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
              {displayAmount(
                fromToken.balance ?? "0",
                fromToken.decimals ?? 18
              )}{" "}
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
                ? formatDisplayAmount(
                    BigNumber(fromAmount)
                      .multipliedBy(fromToken.price)
                      .toString()
                  )
                : "0.00"}
            </Text>
          </Container>
          <Container gap={10} className={styles.tokenSelector}>
            <TokenDropdown
              tokens={availableTokens}
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
              {displayAmount(toToken.balance ?? "0", toToken.decimals ?? 18)}{" "}
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
                ? formatDisplayAmount(
                    BigNumber(toAmount).multipliedBy(toToken.price).toString()
                  )
                : "0.00"}
            </Text>
          </Container>
          <Container gap={10} className={styles.tokenSelector}>
            <TokenDropdown
              tokens={availableTokens}
              selectedToken={toToken}
              onSelect={(token) => handleTokenSelect(token, false)}
              showBalance
            />
          </Container>
        </Container>
      </Container>
      <div style={{ width: "100%", marginTop: "12px" }}>
        <Button
          onClick={isGasless ? () => {} : handleSwap}
          disabled={
            !validateSwap(
              fromToken,
              toToken,
              fromAmount,
              getCurrentPair(),
              signer
            )
          }
          color="primary"
          width="fill"
        >
          {isGasless ? "Swap Gasless" : "Swap"}
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
