import { FtBasicMetadataResponse } from '@hirosystems/token-metadata-api-client';

export function getTokenDisplayName(
  ftToken: FtBasicMetadataResponse,
  metadataName?: string | null
): string;
export function getTokenDisplayName(
  contractName: string | null | undefined,
  metadataName?: string | null
): string;
export function getTokenDisplayName(
  ftTokenOrContractName: FtBasicMetadataResponse | string | null | undefined,
  metadataName?: string | null
): string {
  if (typeof ftTokenOrContractName === 'object' && ftTokenOrContractName !== null) {
    return metadataName || ftTokenOrContractName.name || 'FT Token';
  }
  return metadataName || ftTokenOrContractName || 'FT Token';
}

export function hasMetadataNameDifference(
  contractName: string | null | undefined,
  metadataName: string | null | undefined
): boolean {
  return !!(contractName && metadataName && contractName !== metadataName);
}
