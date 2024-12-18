export interface BaseAmbientPool {
  address: string; // this address will never be used for transactions, just for identification in hook
  symbol: string;
  logoURI: string;
  base: AmbientPoolToken;
  quote: AmbientPoolToken;
  poolIdx: number;
  stable: boolean;
  rewardsLedger: string;
}
interface AmbientPoolToken {
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
  balance?: string;
  isCToken?: boolean;
}

export interface AmbientPool extends BaseAmbientPool {
  stats: {
    latestTime: number;
    baseTvl: string;
    quoteTvl: string;
    baseVolume: string;
    quoteVolume: string;
    baseFees: string;
    quoteFees: string;
    lastPriceSwap: string;
    lastPriceLiq: string;
    lastPriceIndic: string;
    feeRate: number;
  };
  userPositions: AmbientUserPosition[];
  userRewards: string;
  totals: {
    noteTvl: string;
    apr: {
      poolApr: string;
      // each token could have underlying apr from the lending market
      base?: {
        dist: string;
        supply: string;
      };
      quote?: {
        dist: string;
        supply: string;
      };
    };
  };
}
export interface AmbientUserPosition {
  chainId: string;
  base: string;
  quote: string;
  pool_idx: number;
  bid_tick: number;
  ask_tick: number;
  is_bid: boolean;
  user: string;
  time_first_mint: number;
  latest_update_time: number;
  last_mint_tx: string;
  first_mint_tx: string;
  position_type: "concentrated" | "ambient";
  ambient_liq: number;
  conc_liq: number;
  reward_liq: number;
  liq_refresh_time: number;
  apr_duration: number;
  apr_post_liq: number;
  apr_contributed_liq: number;
  apr_est: number;
  position_id: string;
}
