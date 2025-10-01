export const TOKENS_WITH_METADATA_NAME_OVERRIDE = [
  'SPQYMRAKZPQPJAADX5JBEFT0FHE3RZZK9F8TYBQ3.dawgpool-stxcity',
];

export function getTokenDisplayName(
  contractName: string | null | undefined,
  metadataName?: string | null
): string {
  return metadataName || contractName || 'FT Token';
}

export function hasMetadataNameDifference(
  contractName: string | null | undefined,
  metadataName: string | null | undefined
): boolean {
  return !!(contractName && metadataName && contractName !== metadataName);
}
