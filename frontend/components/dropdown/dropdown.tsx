import { useState } from "react";
import styles from "./dropdown.module.scss";
import Text from "../text";
import Icon from "../icon/icon";
import Image from "next/image";
import Container from "../container/container";
import Modal from "../modal/modal";
import { displayAmount } from "@/utils/formatting";

interface Token {
  symbol: string;
  name: string;
  logoURI: string;
  address: string;
  balance?: string;
  decimals?: number;
}

interface Props {
  tokens: Token[];
  selectedToken?: Token;
  onSelect: (token: Token) => void;
  label?: string;
  disabled?: boolean;
  showBalance?: boolean;
}

export default function TokenDropdown({
  tokens,
  selectedToken,
  onSelect,
  label,
  disabled,
  showBalance,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        className={`${styles.dropdownButton} ${
          disabled ? styles.disabled : ""
        }`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <Container
          direction="row"
          gap={8}
          center={{ vertical: true }}
          width="100%"
        >
          {selectedToken ? (
            <>
              <Image
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                width={24}
                height={24}
              />
              <Text>{selectedToken.symbol}</Text>
            </>
          ) : (
            <Text>{label || "Select Token"}</Text>
          )}
          <Icon
            icon={{
              url: "/dropdown.svg",
              size: 22,
            }}
            themed
            style={{ filter: "invert(var(--dark-mode))", marginLeft: "auto" }}
          />
        </Container>
      </button>

      <Modal
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchQuery("");
        }}
        title="Select Token"
        width="400px"
      >
        <Container direction="column" gap={16}>
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.tokenList}>
            {filteredTokens.map((token) => (
              <button
                key={token.address}
                className={styles.tokenOption}
                onClick={() => {
                  onSelect(token);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                <Container
                  direction="row"
                  gap={8}
                  center={{ vertical: true }}
                  width="100%"
                >
                  <Image
                    src={token.logoURI}
                    alt={token.symbol}
                    width={24}
                    height={24}
                  />
                  <Text>{token.symbol}</Text>
                  <Text size="sm" className={styles.tokenName}>
                    {token.name}
                  </Text>
                  {showBalance && token.balance && (
                    <Text size="sm" className={styles.balance}>
                      {displayAmount(token.balance, token.decimals ?? 0)}
                    </Text>
                  )}
                </Container>
              </button>
            ))}
          </div>
        </Container>
      </Modal>
    </>
  );
}
