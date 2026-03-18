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
