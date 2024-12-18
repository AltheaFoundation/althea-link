import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  errMsg,
} from "@/config/interfaces";
import { tryFetch } from "@/utils/async";
import { newContractInstance } from "@/utils/evm";
import { isCantoChainId } from "@/utils/networks";
import { AMBIENT_REWARD_LEDGER_ABI } from "@/config/abis";

const MAINNET_AMBIENT_API_URL = process.env.NEXT_PUBLIC_AMBIENT_API_URL;
// get url from chainId
const AMBIENT_API_URL = (chainId: number) => {
  return chainId === 7701 ? "" : MAINNET_AMBIENT_API_URL;
};

/**
 * @notice Gets data from Canto Ambient API
 * @param {number} chainId chainId to get data for
 * @param {string} endpointSuffix endpoint to get data from
 * @returns {PromiseWithError<T>} Optimistic response type
 */
async function getAmbientApiData<T>(
  chainId: number,
  endpointSuffix: string
): PromiseWithError<T> {
  if (!isCantoChainId(chainId) || chainId === 7701) {
    return NEW_ERROR("getAmbientApiData: chainId not supported");
  }
  // get response from api
  const { data, error } = await tryFetch<T>(
    AMBIENT_API_URL(chainId) + endpointSuffix
  );

  if (error) {
    return NEW_ERROR("getAmbientApiData: " + errMsg(error));
  }
  return NO_ERROR(data);
}

const chainIdToHex = (chainId: number) => {
  return "0x" + chainId.toString(16);
};

// exported endpoints
export interface AmbientPoolStatsReturn {
  base_tvl: number;
  quote_tvl: number;
  last_price_swap: number;
  fee_rate: number;
  init_time: number;
  latest_time: number;
  base_volume: number;
  quote_volume: number;
  base_fees: number;
  quote_fees: number;
  last_price_liq: number;
  last_price_indic: number;
}

export function queryAmbientPoolStats(
  chainId: number,
  base: string,
  quote: string,
  poolIdx: number
): PromiseWithError<AmbientPoolStatsReturn> {
  return getAmbientApiData<AmbientPoolStatsReturn>(
    chainId,
    `/gcgo/pool_stats?chainId=${chainIdToHex(
      chainId
    )}&base=${base}&quote=${quote}&poolIdx=${poolIdx}`
  );
}

export interface LiquidityCurveReturn {
  data: {
    ambientLiq: number;
    liquidityBumps: {
      bumpTick: number;
      liquidityDelta: number;
      knockoutBidLiq: number;
      knockoutAskLiq: number;
      knockoutBidWidth: number;
      knockoutAskWidth: number;
      latestUpdateTime: number;
    }[];
  };
  error?: string;
}
export function queryAmbientPoolLiquidityCurve(
  chainid: number,
  base: string,
  quote: string,
  poolIdx: number
): PromiseWithError<LiquidityCurveReturn> {
  return getAmbientApiData<LiquidityCurveReturn>(
    chainid,
    `/gcgo/pool_liq_curve?chainId=${chainIdToHex(
      chainid
    )}&base=${base}&quote=${quote}&poolIdx=${poolIdx}`
  );
}

interface SinglePositionReturn {
  data: {
    chainId: string;
    base: string;
    quote: string;
    poolIdx: number;
    bidTick: number;
    askTick: number;
    isBid: boolean;
    user: string;
    timeFirstMint: number;
    latestUpdateTime: number;
    lastMintTx: string;
    firstMintTx: string;
    positionType: "concentrated" | "ambient";
    ambientLiq: number;
    concLiq: number;
    rewardLiq: number;
    liqRefreshTime: number;
    aprDuration: number;
    aprPostLiq: number;
    aprContributedLiq: number;
    aprEst: number;
    positionId: string;
  };
  provenance: {
    hostname: string;
    serveTime: number;
  };
}
export function querySinglePosition(
  chainId: number,
  userEthAddress: string,
  base: string,
  quote: string,
  poolIdx: number,
  lowerTick: number,
  upperTick: number
): PromiseWithError<SinglePositionReturn> {
  return getAmbientApiData<SinglePositionReturn>(
    chainId,
    `/gcgo/position_stats?chainId=${chainIdToHex(
      chainId
    )}&user=${userEthAddress}&base=${base}&quote=${quote}&pool_idx=${poolIdx}&bid_tick=${lowerTick}&ask_tick=${upperTick}`
  );
}

export interface PoolPosition {
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

export type PoolPositionsReturn = PoolPosition[];

export function queryPoolPositions(
  chainId: number,
  userEthAddress: string,
  base: string,
  quote: string,
  poolIdx: number
): PromiseWithError<PoolPositionsReturn> {
  return getAmbientApiData<PoolPositionsReturn>(
    chainId,
    `/gcgo/user_pool_positions?chainId=${chainIdToHex(
      chainId
    )}&user=${userEthAddress}&base=${base}&quote=${quote}&pool_idx=${poolIdx}`
  );
}

export function queryAllUserPositions(
  chainId: number,
  userEthAddress: string
): PromiseWithError<PoolPositionsReturn> {
  return getAmbientApiData<PoolPositionsReturn>(
    chainId,
    `/gcgo/user_positions?chainId=${chainIdToHex(
      chainId
    )}&user=${userEthAddress}`
  );
}

export async function queryUserAmbientRewards(
  chainId: number,
  userEthAddress: string,
  ledgerAddress: string
): PromiseWithError<string> {
  try {
    // get ambient rewards ledger contract
    const { data: rewardsLedger, error } = newContractInstance<
      typeof AMBIENT_REWARD_LEDGER_ABI
    >(chainId, ledgerAddress, AMBIENT_REWARD_LEDGER_ABI);
    if (error) throw error;
    // get rewards
    const rewards = await rewardsLedger.methods
      .getUnclaimedRewards(userEthAddress)
      .call();
    return NO_ERROR(rewards.toString());
  } catch (err) {
    // rewards ledger may return a revert if user has no rewards so return zero in case of error
    return NO_ERROR("0");
  }
}
