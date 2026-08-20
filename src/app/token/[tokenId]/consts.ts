import { NetworkModeUrlMap } from '@/common/constants/network';
import { Network, NetworkModes } from '@/common/types/network';

const SBTC_DEPLOYERS: Record<NetworkModes, string> = {
  [NetworkModes.Mainnet]: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
  [NetworkModes.Testnet]: 'SN3VMHXEN64ZZF71JQ5VESXDWTR301XTTXGF4J8F1',
};

export const SBTC_DECIMALS = 8;

export const MAINNET_SBTC_CONTRACT_ADDRESS = `${SBTC_DEPLOYERS[NetworkModes.Mainnet]}.sbtc-token`;

export function getSbtcNetworkMode(network: Network | undefined): NetworkModes | undefined {
  if (!network?.mode) return undefined;
  return network.url === NetworkModeUrlMap[network.mode] ? network.mode : undefined;
}

export function getSbtcContractAddress(networkMode: NetworkModes | undefined) {
  return networkMode ? `${SBTC_DEPLOYERS[networkMode]}.sbtc-token` : undefined;
}

export function getSbtcAssetId(networkMode: NetworkModes | undefined) {
  const contractAddress = getSbtcContractAddress(networkMode);
  return contractAddress ? `${contractAddress}::sbtc-token` : undefined;
}

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

const VERIFIED_TOKENS = [
  DROID_CONTRACT_ADDRESS,
  zsbtcContractAddress,
  zestSbtcVaultContractAddress,
  usdcxContractAddress,
];

export function getVerifiedTokens(networkMode: NetworkModes | undefined) {
  const sbtcContractAddress = getSbtcContractAddress(networkMode);
  return sbtcContractAddress ? [...VERIFIED_TOKENS, sbtcContractAddress] : VERIFIED_TOKENS;
}
