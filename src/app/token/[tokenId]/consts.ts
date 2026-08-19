import { NetworkModes } from '@/common/types/network';

const SBTC_DEPLOYER_ADDRESSES: Record<NetworkModes, string> = {
  [NetworkModes.Mainnet]: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
  [NetworkModes.Testnet]: 'SN3VMHXEN64ZZF71JQ5VESXDWTR301XTTXGF4J8F1',
};

const SBTC_NETWORK_MODES = [NetworkModes.Mainnet, NetworkModes.Testnet] as const;

export const getSbtcContractId = (networkMode: NetworkModes) =>
  `${SBTC_DEPLOYER_ADDRESSES[networkMode] ?? SBTC_DEPLOYER_ADDRESSES[NetworkModes.Mainnet]}.sbtc-token`;

export const getSbtcAssetId = (networkMode: NetworkModes) =>
  `${getSbtcContractId(networkMode)}::sbtc-token`;

const SBTC_CONTRACT_IDS = SBTC_NETWORK_MODES.map(getSbtcContractId);
const SBTC_ASSET_IDS = SBTC_NETWORK_MODES.map(getSbtcAssetId);

/** True for the official sBTC token contract of any network */
export const isSbtcContractId = (contractId?: string) =>
  !!contractId && SBTC_CONTRACT_IDS.includes(contractId);

/** True for the official sBTC asset identifier of any network */
export const isSbtcAssetId = (assetId?: string) => !!assetId && SBTC_ASSET_IDS.includes(assetId);

/** The network a given contract id is the official sBTC token for, if any */
export const getSbtcNetworkMode = (contractId?: string): NetworkModes | undefined =>
  SBTC_NETWORK_MODES.find(networkMode => getSbtcContractId(networkMode) === contractId);

export const SBTC_DECIMALS = 8;
export const DROID_CONTRACT_ADDRESS = 'SP2EEV5QBZA454MSMW9W3WJNRXVJF36VPV17FFKYH.DROID';
const zsbtcContractAddress = 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.zsbtc-token';
const zestSbtcVaultContractAddress = 'SP1A27KFY4XERQCCRCARCYD1CC5N7M6688BSYADJ7.v0-vault-sbtc';
export const usdcxContractAddress = 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx';
export const RISKY_TOKENS = [
  'SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.granite-btc',
  'SP37WN2BYHKZ90T1ATHTCNG8EFYHS3B49KNGS02ZK.rstSTX',
  'SP37WN2BYHKZ90T1ATHTCNG8EFYHS3B49KNGS02ZK.RALEX',
  'SP37WN2BYHKZ90T1ATHTCNG8EFYHS3B49KNGS02ZK.rALEX',
  'SP3RWKPJ8PJ27MGQ6ZK6SSDYZRTF4CF5AK8KZTXE4.bitflow',
  'SP32Z0ZT2KS49B3ERXNG002NWTDC9BA2SYT1EPSS0.zststx',
];
export const RISKY_NFTS = [
  'SP37WN2BYHKZ90T1ATHTCNG8EFYHS3B49KNGS02ZK.ALEX-voucher',
  'SP37WN2BYHKZ90T1ATHTCNG8EFYHS3B49KNGS02ZK.stSTXvoucher',
];
export const RISKY_NFT_RULES = [
  /\.StacksDao$/, // Exact match for contract names ending with .StacksDao (case sensitive)
];
export const LEGIT_SBTC_DERIVATIVES = [zsbtcContractAddress, zestSbtcVaultContractAddress];
export const VERIFIED_TOKENS = [
  DROID_CONTRACT_ADDRESS,
  zsbtcContractAddress,
  zestSbtcVaultContractAddress,
  ...SBTC_CONTRACT_IDS,
  usdcxContractAddress,
];
