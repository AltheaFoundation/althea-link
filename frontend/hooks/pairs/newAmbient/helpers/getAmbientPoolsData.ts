import {
  AmbientPoolStatsReturn,
  PoolPositionsReturn,
  queryAmbientPoolStats,
  queryPoolPositions,
  queryUserAmbientRewards,
} from "./ambientApi";
import { getAmbientPoolsFromChainId } from "../config/ambientPools";
import { AmbientPool, BaseAmbientPool } from "../interfaces/ambientPools";
import { NEW_ERROR, NO_ERROR, PromiseWithError } from "@/config/interfaces";
import { convertTokenAmountToNote } from "@/utils/math";
import BigNumber from "bignumber.js";
import { getCantoCoreAddress } from "@/config/consts/addresses";
import { getTokenPriceInUSDC } from "@/utils/tokens";

// const for creating all queries to pool
const poolQueries = (
  chainId: number,
  pool: BaseAmbientPool,
  userEthAddress?: string
): [
  PromiseWithError<AmbientPoolStatsReturn>,
  PromiseWithError<PoolPositionsReturn>,
  PromiseWithError<string>, // rewards
] => [
  queryAmbientPoolStats(
    chainId,
    pool.base.address,
    pool.quote.address,
    pool.poolIdx
  ),
  userEthAddress
    ? queryPoolPositions(
        chainId,
        userEthAddress,
        pool.base.address,
        pool.quote.address,
        pool.poolIdx
      )
    : Promise.resolve(
        NO_ERROR({ data: [], provenance: { hostname: "", serveTime: 0 } })
      ),
  userEthAddress
    ? queryUserAmbientRewards(chainId, userEthAddress, pool.rewardsLedger)
    : Promise.resolve(NO_ERROR("0")),
];

export async function getAllAmbientPoolsData(
  chainId: number,
  userEthAddress?: string
): PromiseWithError<AmbientPool[]> {
  const pools = getAmbientPoolsFromChainId(chainId);
  const poolData = await Promise.all(
    pools.map((pool) => Promise.all(poolQueries(chainId, pool, userEthAddress)))
  );
  if (
    poolData.some((data) => data[0].error || data[1].error || data[2].error)
  ) {
    return NEW_ERROR("getAllAmbientPoolsData: error fetching data");
  }
  // get wcanto price
  const wcantoAddress = getCantoCoreAddress(chainId, "wcanto");
  if (!wcantoAddress) {
    return NEW_ERROR("getAllAmbientPoolsData: chainId not supported");
  }
  const { data: cantoPrice } = await getTokenPriceInUSDC(wcantoAddress, 18);

  // combine user data with pool to create final object with correct types
  return NO_ERROR(
    poolData.map((dataArray, idx) => {
      const stats = dataArray[0].data;
      const userPositions = dataArray[1].data?.data ?? [];
      const rewards = dataArray[2].data;

      // convert into strings without scientific notation
      const statsObj = {
        latestTime: stats.latest_time,
        baseTvl: new BigNumber(stats.base_tvl).toString(),
        quoteTvl: new BigNumber(stats.quote_tvl).toString(),
        baseVolume: new BigNumber(stats.base_volume).toString(),
        quoteVolume: new BigNumber(stats.quote_volume).toString(),
        baseFees: new BigNumber(stats.base_fees).toString(),
        quoteFees: new BigNumber(stats.quote_fees).toString(),
        lastPriceSwap: new BigNumber(stats.last_price_swap).toString(),
        lastPriceLiq: new BigNumber(stats.last_price_liq).toString(),
        lastPriceIndic: new BigNumber(stats.last_price_indic).toString(),
        feeRate: stats.fee_rate,
      };
      const userPosArray = (userPositions ?? [])
        .map((pos) => ({
          ...pos,
          ambientLiq: new BigNumber(pos.ambientLiq || "0").toString(),
          concLiq: new BigNumber(pos.concLiq || "0").toString(),
          rewardLiq: new BigNumber(pos.rewardLiq || "0").toString(),
          aprPostLiq: new BigNumber(pos.aprPostLiq || "0").toString(),
          aprContributedLiq: new BigNumber(
            pos.aprContributedLiq || "0"
          ).toString(),
        }))
        .filter((pos) => pos?.concLiq !== "0");

      // get tvl of pool
      const { data: baseTvl } = convertTokenAmountToNote(
        statsObj.baseTvl,
        new BigNumber(10).pow(36 - pools[idx].base.decimals).toString()
      );
      const { data: quoteTvl } = convertTokenAmountToNote(
        statsObj.quoteTvl,
        new BigNumber(10).pow(36 - pools[idx].quote.decimals).toString()
      );
      const tvl = baseTvl?.plus(quoteTvl ?? "0").toString() ?? "0";
      return {
        ...pools[idx],
        stats: statsObj,
        userPositions: userPosArray,
        userRewards: rewards,
        totals: {
          noteTvl: tvl,
          apr: {
            poolApr: ambientAPR("225000000000000000", tvl, cantoPrice ?? "0"),
          },
        },
      };
    })
  );
}

// will be formatted
function ambientAPR(
  cantoPerBlock: string,
  tvlNote: string,
  priceCanto: string
) {
  // seconds per day / seconds per block
  const blockPerDay = new BigNumber(86400).dividedBy(5.8);
  // days per year * blocks per day
  const blocksPerYear = blockPerDay.multipliedBy(365);
  // calculate apr (canto per year * price canto/ tvl of pool in Note)
  const apr = blocksPerYear
    .multipliedBy(cantoPerBlock)
    .multipliedBy(priceCanto)
    .dividedBy(tvlNote);
  return apr.multipliedBy(100).toString();
}
