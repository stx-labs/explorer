import {
  ConstantMatch,
  FunctionBody,
  allFunctionBodies,
  contractCallSites,
  contractCallTargets,
  contractDeployer,
  contractPrincipalsIn,
  excerpt,
  findErrorConstants,
  findFunctionBody,
  firstAssertLine,
  foldAccumulatorUnwrap,
  hasTraitParams,
  nativeAssetCalls,
  reachableFromAny,
  reachableFunctions,
  traitArgPrincipals,
  usageLines,
} from './clarity-source';
import { nativeErrorFor } from './native-errors';
import { RegistryEntry, lookupRegistry } from './registry';
import { SemanticTag, tagForName } from './tags';
import type {
  ContractInfo,
  ContractLoader,
  ErrorCodeInfo,
  FailedContractCallTx,
  SourceRef,
} from './types';

export interface Resolution {
  info: ErrorCodeInfo;
  tag?: SemanticTag;
  registry?: RegistryEntry;
  source?: SourceRef;
  /** Resolution finished without needing more fetches. */
  complete: boolean;
}

export interface ResolveOptions {
  /** Maximum callee contracts to fetch when the code is not defined in the called contract. */
  maxCalleeFetches?: number;
}

const DEFAULT_MAX_FETCHES = 3;

interface Usage {
  body: FunctionBody | null;
  lines: number[];
}

interface Pick {
  match: ConstantMatch;
  usage: Usage;
  /** The constant is thrown somewhere in code the failed call could reach. */
  reachable: boolean;
}

/** Where `name` is thrown among `bodies`, checking `preferred` (the entry point) first. */
function usageIn(
  source: string,
  bodies: FunctionBody[],
  name: string,
  preferred: FunctionBody | null
): Usage {
  const ordered = preferred
    ? [preferred, ...bodies.filter(b => b.name !== preferred.name)]
    : bodies;
  for (const b of ordered) {
    const lines = usageLines(source, b, name);
    if (lines.length) return { body: b, lines };
  }
  return { body: preferred, lines: [] };
}

/**
 * Choose among the constants that define a code. A constant is attributed only when it is the single
 * one thrown in code the call can reach, or the single definition in the contract. Otherwise the code
 * stays ambiguous and the copy says so — never "the check at line N" for a check that may not have run.
 */
function pickConstant(
  source: string,
  matches: ConstantMatch[],
  bodies: FunctionBody[],
  entry: FunctionBody | null
): { pick?: Pick; ambiguous: string[] } {
  const picks: Pick[] = matches.map(match => {
    const usage = usageIn(source, bodies, match.name, entry);
    return { match, usage, reachable: usage.lines.length > 0 };
  });
  const reachable = picks.filter(p => p.reachable);
  if (reachable.length === 1) return { pick: reachable[0], ambiguous: [] };
  if (reachable.length > 1) return { ambiguous: reachable.map(p => p.match.name) };
  if (picks.length === 1) return { pick: picks[0], ambiguous: [] };
  return { ambiguous: picks.map(p => p.match.name) };
}

/** Registry copy is only trusted when it names the same constant the source resolves to. */
function guardRegistry(
  registry: RegistryEntry | undefined,
  resolvedName: string | undefined
): RegistryEntry | undefined {
  if (!registry) return undefined;
  if (registry.name && resolvedName && registry.name !== resolvedName) return undefined;
  return registry;
}

function sourceRefFor(
  contractId: string,
  source: string,
  match: ConstantMatch,
  usage: Usage
): SourceRef {
  const failingLine = usage.lines[0];
  return {
    contractId,
    functionName: usage.body?.name,
    failingLine,
    lines: excerpt(source, failingLine ?? match.line, 2, 1),
    note: failingLine
      ? undefined
      : `Defined at line ${match.line}; not used directly by the called function.`,
  };
}

function ambiguousResolution(
  base: ErrorCodeInfo,
  definedIn: string,
  names: string[],
  registry: RegistryEntry | undefined
): Resolution {
  // A registry entry naming one of the candidates is still just one candidate: do not trust it.
  const reg = registry && registry.name && !names.includes(registry.name) ? registry : undefined;
  return {
    info: { ...base, name: reg?.name, candidateNames: names, definedIn },
    registry: reg,
    tag: reg?.tag,
    complete: true,
  };
}

function bodyForCall(called: ContractInfo | null, fnName: string): FunctionBody | null {
  return called ? findFunctionBody(called.source_code, fnName) : null;
}

/**
 * Synchronous part: the called contract only (already on the page). Returns `complete: false` when
 * a callee fetch might still find the definition.
 */
export function resolveErrorCodeSync(
  code: string,
  tx: FailedContractCallTx,
  called: ContractInfo | null
): Resolution {
  const contractId = tx.contract_call.contract_id;
  const fnName = tx.contract_call.function_name;
  const registry = lookupRegistry(contractId, code);
  const body = bodyForCall(called, fnName);
  const dynamicDispatch = body ? hasTraitParams(body) : false;

  const base: ErrorCodeInfo = {
    code,
    dynamicDispatch,
    candidatesTried: [],
    name: registry?.name,
  };

  if (!called) {
    return { info: base, registry, tag: registry?.tag, complete: false };
  }

  const source = called.source_code;
  const reachable = body ? reachableFunctions(source, fnName) : allFunctionBodies(source);
  const matches = findErrorConstants(source, code);
  if (matches.length) {
    const { pick, ambiguous } = pickConstant(source, matches, reachable, body);
    if (!pick) return ambiguousResolution(base, contractId, ambiguous, registry);

    const { match, usage } = pick;
    const reg = guardRegistry(registry, match.name);
    const foldMask = pick.reachable
      ? (foldAccumulatorUnwrap(source, fnName, match.name) ?? undefined)
      : undefined;
    const firstAssert = body ? firstAssertLine(source, body) : null;
    const siteBeforeOtherChecks =
      pick.reachable && usage.body === body && firstAssert !== null
        ? usage.lines[0] < firstAssert
        : undefined;
    const info: ErrorCodeInfo = {
      ...base,
      name: match.name,
      definedIn: contractId,
      definitionLine: match.line,
      usageLines: usage.lines,
      comments: match.comments,
      reachable: pick.reachable,
      foldMask,
      siteBeforeOtherChecks,
    };
    return {
      info,
      registry: reg,
      tag: reg?.tag ?? tagForName(match.name),
      source: sourceRefFor(contractId, source, match, usage),
      complete: true,
    };
  }

  // Native fallback is only conclusive when a single built-in could have produced the code.
  if (body && /^u[1-4]$/.test(code)) {
    const natives = nativeAssetCalls(reachable).filter(fn => nativeErrorFor(fn, code));
    if (natives.length === 1) {
      const native = nativeErrorFor(natives[0], code)!;
      return {
        info: { ...base, nativeFunction: natives[0], nativeMeaning: native.meaning },
        registry,
        tag: registry?.tag ?? 'insufficient',
        complete: false, // a callee may still define it; native stays as fallback
      };
    }
  }

  return { info: base, registry, tag: registry?.tag, complete: false };
}

/**
 * Candidate callee contracts, most likely first: contracts passed for the function's trait
 * parameters, then `contract-call?` targets in code the call reaches, then any other principal in
 * the arguments (route lists, tuples), then targets referenced elsewhere in the contract.
 */
export function calleeCandidates(tx: FailedContractCallTx, called: ContractInfo | null): string[] {
  const contractId = tx.contract_call.contract_id;
  const deployer = contractDeployer(contractId);
  const argReprs = (tx.contract_call.function_args ?? []).map(a => a.repr ?? '');
  let traitTargets: string[] = [];
  let reachableTargets: string[] = [];
  let anywhere: string[] = [];
  if (called) {
    const body = findFunctionBody(called.source_code, tx.contract_call.function_name);
    if (body) traitTargets = traitArgPrincipals(body, argReprs);
    const bodies = reachableFunctions(called.source_code, tx.contract_call.function_name);
    reachableTargets = bodies.flatMap(b => contractCallTargets(b.text, deployer));
    anywhere = contractCallTargets(called.source_code, deployer);
  }
  const fromArgs = contractPrincipalsIn(argReprs);
  return Array.from(new Set(traitTargets.concat(reachableTargets, fromArgs, anywhere))).filter(
    c => c !== contractId
  );
}

/**
 * Functions of `calleeId` the failed call can enter: literal `contract-call?` sites naming it, plus
 * every trait-variable site (the trait function is known even when the contract is chosen at runtime).
 */
export function calleeEntryFunctions(
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  calleeId: string
): string[] {
  if (!called) return [];
  const deployer = contractDeployer(tx.contract_call.contract_id);
  const sites = reachableFunctions(called.source_code, tx.contract_call.function_name).flatMap(b =>
    contractCallSites(b.text, deployer)
  );
  return Array.from(
    new Set(sites.filter(s => s.target === calleeId || s.target === null).map(s => s.fn))
  );
}

/**
 * Asynchronous part: fetch up to `maxCalleeFetches` callee contracts and look for the definition
 * there, restricted to the callee functions the call can enter. Falls back to the sync result
 * (native / registry / unresolved).
 */
export async function resolveErrorCode(
  code: string,
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  load: ContractLoader,
  options: ResolveOptions = {}
): Promise<Resolution> {
  const sync = resolveErrorCodeSync(code, tx, called);
  if (sync.complete) return sync;

  const max = options.maxCalleeFetches ?? DEFAULT_MAX_FETCHES;
  const candidates = calleeCandidates(tx, called).slice(0, max);
  const fetched = await Promise.all(
    candidates.map(async id => {
      try {
        return await load(id);
      } catch {
        return null;
      }
    })
  );

  for (let i = 0; i < candidates.length; i++) {
    const callee = fetched[i];
    if (!callee) continue;
    const matches = findErrorConstants(callee.source_code, code);
    if (!matches.length) continue;

    const entries = calleeEntryFunctions(tx, called, candidates[i]);
    let bodies = entries.length ? reachableFromAny(callee.source_code, entries) : [];
    if (!bodies.length) bodies = allFunctionBodies(callee.source_code);
    const tried = candidates.slice(0, i + 1);
    const registry = sync.registry ?? lookupRegistry(candidates[i], code);
    const { pick, ambiguous } = pickConstant(callee.source_code, matches, bodies, null);
    if (!pick) {
      const res = ambiguousResolution(sync.info, candidates[i], ambiguous, registry);
      return { ...res, info: { ...res.info, candidatesTried: tried } };
    }
    const { match, usage } = pick;
    const reg = guardRegistry(registry, match.name);
    const info: ErrorCodeInfo = {
      ...sync.info,
      name: match.name,
      definedIn: candidates[i],
      definitionLine: match.line,
      usageLines: usage.lines,
      comments: match.comments,
      reachable: pick.reachable,
      candidatesTried: tried,
    };
    return {
      info,
      registry: reg,
      tag: reg?.tag ?? tagForName(match.name),
      source: sourceRefFor(candidates[i], callee.source_code, match, usage),
      complete: true,
    };
  }

  return {
    ...sync,
    info: { ...sync.info, candidatesTried: candidates },
    complete: true,
  };
}
