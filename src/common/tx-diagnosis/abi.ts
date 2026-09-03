/** Accept the API's string ABI as well as already-parsed values, and degrade on malformed JSON. */
export function parseContractAbi(abi: unknown): unknown {
  if (typeof abi !== 'string') return abi ?? undefined;
  try {
    return JSON.parse(abi);
  } catch {
    return undefined;
  }
}
