/// The following are signatures for events emitted by the Ambient contract.
/// Several of these have been added to only the AltheaFoundation fork of Ambient,
/// all of them have been marked with a NOTE at the beginning of their comments.
/// When parsing events, any `indexed` values are stored in topics[1], [2], or [3] and all other
/// values are stored in the data field of the log according to ABI encoding rules.

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted whenever a swap is performed, exchanging buy tokens for sell tokens.
/// @param user The address of the user performing the swap.
/// @param buy The address of the token being bought.
/// @param sell The address of the token being sold.
/// @param poolIdx The template of the relevant pool.
/// @param buyQty The quantity of buy tokens being exchanged.
/// @param sellQty The quantity of sell tokens being exchanged.
/// event Swap(address indexed user, address indexed buy, address indexed sell, uint256 poolIdx, uint128 buyQty, uint128 sellQty);
pub const SWAP_SIGNATURE: &str = "Swap(address,address,address,uint256,uint128,uint128)";

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted when a concentrated liquidity position is created, or additional liquidity is added to an existing position.
/// @param user The address of the user performing the mint.
/// @param base The address of the base token involved.
/// @param quote The address of the quote token involved.
/// @param poolIdx The template of the relevant pool.
/// @param liq The amount of liquidity (in sqrt(X*Y) terms) being added to the pool.
/// @param bidTick The lower price tick of the range position.
/// @param askTick The upper price tick of the range position.
/// @param baseQty The quantity of base tokens added to the pool.
/// @param quoteQty The quantity of quote tokens added to the pool.
///
/// event MintRanged(address indexed user, address indexed base, address indexed quote, uint256 poolIdx, uint128 liq, int24 bidTick, int24 askTick, uint128 baseQty, uint128 quoteQty);
pub const MINT_RANGED_SIGNATURE: &str =
    "MintRanged(address,address,address,uint256,uint128,int24,int24,uint128,uint128)";

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted when a concentrated liquidity position is burned, removing the liquidity from the pool.
/// @param user The address of the user performing the burn.
/// @param base The address of the base token involved.
/// @param quote The address of the quote token involved.
/// @param poolIdx The template of the relevant pool.
/// @param liq The amount of liquidity (in sqrt(X*Y) terms) being removed from the pool.
/// @param bidTick The lower price tick of the range position.
/// @param askTick The upper price tick of the range position.
/// @param baseQty The quantity of base tokens removed from the pool.
/// @param quoteQty The quantity of quote tokens removed from the pool.
///
/// event BurnRanged(address indexed user, address indexed base, address indexed quote, uint256 poolIdx, uint128 liq, int24 bidTick, int24 askTick, uint128 baseQty, uint128 quoteQty);
pub const BURN_RANGED_SIGNATURE: &str =
    "BurnRanged(address,address,address,uint256,uint128,int24,int24,uint128,uint128)";

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted when a concentrated position's ambient rewards are harvested, removing ambient liquidity from the pool.
/// @param user The address of the user performing the harvest.
/// @param base The address of the base token involved.
/// @param quote The address of the quote token involved.
/// @param poolIdx The template of the relevant pool.
/// @param bidTick The lower price tick of the range position.
/// @param askTick The upper price tick of the range position.
/// @param baseQty The amount of base tokens harvested.
/// @param quoteQty The amount of quote tokens harvested.
///
/// event Harvest(address indexed user, address indexed base, address indexed quote, uint256 poolIdx, int24 bidTick, int24 askTick, uint128 baseQty, uint128 quoteQty);
pub const HARVEST_SIGNATURE: &str =
    "Harvest(address,address,address,uint256,int24,int24,uint128,uint128)";

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted when an ambient (full range) liquidity position is created, or additional liquidity is added to an existing position.
/// @param user The address of the user performing the mint.
/// @param base The address of the base token involved.
/// @param quote The address of the quote token involved.
/// @param poolIdx The template of the relevant pool.
/// @param liq The amount of liquidity (in sqrt(X*Y) terms) being added to the pool.
/// @param baseQty The quantity of base tokens added to the pool.
/// @param quoteQty The quantity of quote tokens added to the pool.
///
/// event MintAmbient(address indexed user, address indexed base, address indexed quote, uint256 poolIdx, uint128 liq, uint128 baseQty, uint128 quoteQty);
pub const MINT_AMBIENT_SIGNATURE: &str =
    "MintAmbient(address,address,address,uint256,uint128,uint128,uint128)";

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted when an ambient (full range) liquidity position is burned, removing the liquidity from the pool.
/// @param user The address of the user performing the mint.
/// @param base The address of the base token involved.
/// @param quote The address of the quote token involved.
/// @param poolIdx The template of the relevant pool.
/// @param liq The amount of liquidity (in sqrt(X*Y) terms) being removed from the pool.
/// @param baseQty The quantity of base tokens removed from the pool.
/// @param quoteQty The quantity of quote tokens removed from the pool.
///
/// event BurnAmbient(address indexed user, address indexed base, address indexed quote, uint256 poolIdx, uint128 liq, uint128 baseQty, uint128 quoteQty);
pub const BURN_AMBIENT_SIGNATURE: &str =
    "BurnAmbient(address,address,address,uint256,uint128,uint128,uint128)";

/// @notice Emitted when governance authority for CrocSwapDex is transfered.
/// @param The authority being transfered to.
/// event AuthorityTransfer (address indexed authority);
pub const AUTHORITY_TRANSFER_SIGNATURE: &str = "AuthorityTransfer(address)";

/// @notice Indicates a new pool liquidity initialization value is set.
/// @param liq The pool initialization value.
/// event SetNewPoolLiq (uint128 liq);
pub const SET_NEW_POOL_LIQ_SIGNATURE: &str = "SetNewPoolLiq(uint128)";

/// @notice Emitted when a new protocol take rate is set.
/// @param takeRate The take rate represents in units of 1/256.      
/// event SetTakeRate (uint8 takeRate);
pub const SET_TAKE_RATE_SIGNATURE: &str = "SetTakeRate(uint8)";

/// @notice Emitted when a new protocol relayer take rate is set.
/// @param takeRate The relayer take rate represents in units of 1/256.
/// event SetRelayerTakeRate (uint8 takeRate);
pub const SET_RELAYER_TAKE_RATE_SIGNATURE: &str = "SetRelayerTakeRate(uint8)";

/// @notice Emitted when a new template is disabled, halting new creation of that pool type.
/// @param poolIdx The pool type index being disabled.
/// event DisablePoolTemplate (uint256 indexed poolIdx);
pub const DISABLE_POOL_TEMPLATE_SIGNATURE: &str = "DisablePoolTemplate(uint256)";

/// @notice Emitted when a new template is written or overwrriten.
/// @param poolIdx The pool type index being disabled.
/// @param feeRate The swap fee rate for the pool (represented in units of 0.0001%)
/// @param tickSize The minimum tick size for range orders in the pool.
/// @param jitThresh The JIT liquiidty TTL time in the pool (represented in 10s of seconds)
/// @param knockout The knockout liquidity paramter bits (see KnockoutLiq library for more detail)
/// @param oracleFlags The permissioned pool oracle flags if this is setup as a permissioned pool.
/// event SetPoolTemplate (uint256 indexed poolIdx, uint16 feeRate, uint16 tickSize,
///                        uint8 jitThresh, uint8 knockout, uint8 oracleFlags);
pub const SET_POOL_TEMPLATE_SIGNATURE: &str =
    "SetPoolTemplate(uint256,uint16,uint16,uint8,uint8,uint8)";

/// NOTE: This event was added to the AltheaFoundation fork of Ambient
/// @notice Emitted when a new pool has been created for a given base and quote token pair using a template index of poolIdx.
/// @param base The base token of the pool.
/// @param quote The quote token of the pool.
/// @param poolIdx The pool's template.
/// @param price The initial price of the pool. Represented as square root price in Q64.64 notation.
/// @param user The address of the user creating the pool.
/// @param liq The initial liquidity of the pool.
/// @param baseQty The initial base token quantity of the pool.
/// @param quoteQty The initial quote token quantity of the pool.
/// event InitPool(address indexed base, address indexed quote, uint256 indexed poolIdx, uint128 price, address user, uint128 liq, uint128 baseQty, uint128 quoteQty);
pub const INIT_POOL_SIGNATURE: &str =
    "InitPool(address,address,uint256,uint128,address,uint128,uint128,uint128)";

/// @notice Emitted when a previously created pool with a pre-existing protocol take rate is re-
///         sychronized to the current dex-wide protocol take rate setting.
/// @param base The base token of the pool.
/// @param quote The quote token of the pool.
/// @param poolIdx The pool type index of the pool.
/// @param takeRate The newly set protocol take rate of the pool.
/// event ResyncTakeRate (address indexed base, address indexed quote,
///                       uint256 indexed poolIdx, uint8 takeRate);
pub const RESYNC_TAKE_RATE_SIGNATURE: &str = "ResyncTakeRate(address,address,uint256,uint8)";

/// @notice Emitted when new minimum thresholds are set for off-grid price improvement liquidity
///         thresholds.
/// @param token The token the thresholds apply to.
/// @param unitTickCollateral The size of commited collateral required to mint positions off-grid
/// @param awayTickTol The maximum distance away an off-grid range can be minted from the current
///                    price tick.
/// event PriceImproveThresh (address indexed token, uint128 unitTickCollateral,
///                           uint16 awayTickTol);
pub const PRICE_IMPROVE_THRESH_SIGNATURE: &str = "PriceImproveThresh(address,uint128,uint16)";

/// @notice Emitted when protocol governance sets a new teasury vault address
/// @param treasury The address the treasury vault is set to
/// @param startTime The earliest time that the vault will be eligible to collect protocol fees.
/// event TreasurySet (address indexed treasury, uint64 indexed startTime);
pub const TREASURY_SET_SIGNATURE: &str = "TreasurySet(address,uint64)";

/// @notice Emitted when accumulated protocol fees are collected by the treasury.
/// @param token The token of the fees being collected.
/// @param recv The vault the collected fees are being paid to.
/// event ProtocolDividend (address indexed token, address indexed recv);
pub const PROTOCOL_DIVIDEND_SIGNATURE: &str = "ProtocolDividend(address,address)";

/// @notice Called when any proxy sidecar contract is upgraded.
/// @param proxy The address of the new proxy smart contract.
/// @param proxyIdx The proxy sidecar index slot the upgrade is applied to.
/// event UpgradeProxy (address indexed proxy, uint16 proxyIdx);
pub const UPGRADE_PROXY_SIGNATURE: &str = "UpgradeProxy(address,uint16)";

/// @notice Called whenever the hot path open is toggled.
/// @param If true indicates the hot-path is open and users can directly call the swap() function
///        If false, the hot path is closed and users must call the proxy contract to swap.
/// event HotPathOpen (bool);
pub const HOT_PATH_OPEN_SIGNATURE: &str = "HotPathOpen(bool)";

/// @notice Called whenever emergency safe mode is toggled
/// @param If true indicates emergency safe mode is turned on
///        If false indicates emergency safe mode is turned off
/// event SafeMode (bool);
pub const SAFE_MODE_SIGNATURE: &str = "SafeMode(bool)";
