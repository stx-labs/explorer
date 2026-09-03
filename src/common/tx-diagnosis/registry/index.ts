import { contractName } from '../clarity-source';
import type { SemanticTag } from '../tags';
import data from './known-errors.json';

export interface RegistryEntry {
  name?: string;
  tag?: SemanticTag;
  summary: string;
  sender?: string | null;
  developer?: string | null;
}

interface RegistryContract {
  match: { id?: string; namePattern?: string };
  codes: Record<string, RegistryEntry>;
}

const contracts = (data as unknown as { contracts: RegistryContract[] }).contracts;

/** Exact contract id wins over a name pattern. */
export function lookupRegistry(contractId: string, code: string): RegistryEntry | undefined {
  const exact = contracts.find(c => c.match.id === contractId);
  if (exact?.codes[code]) return exact.codes[code];
  const name = contractName(contractId);
  for (const c of contracts) {
    if (c.match.namePattern && new RegExp(c.match.namePattern).test(name) && c.codes[code]) {
      return c.codes[code];
    }
  }
  return undefined;
}
