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
  literalErrSites,
  nativeAssetCallSites,
  reachableFromAny,
  reachableFunctions,
  traitArgPrincipals,
  traitBindings,
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
  /** The body holding the primary site (the entry point when it has one), for the excerpt. */
  body: FunctionBody | null;
  primaryLine?: number;
  /** Every line in reachable code that throws the constant, ascending. */
  lines: number[];
}

interface Pick {
  match: ConstantMatch;
  usage: Usage;
  /** The constant is thrown somewhere in code the failed call could reach. */
  reachable: boolean;
}

/** Where `name` is thrown across `bodies`; the entry point's first use is the primary site, else the earliest. */
function usageAcross(
  source: string,
  bodies: FunctionBody[],
  name: string,
  preferred: FunctionBody | null
): Usage {
  const hits: { body: FunctionBody; line: number }[] = [];
  for (const b of bodies) {
    for (const line of usageLines(source, b, name)) hits.push({ body: b, line });
  }
  if (preferred && !bodies.some(b => b.name === preferred.name)) {
    for (const line of usageLines(source, preferred, name)) hits.push({ body: preferred, line });
  }
  const inEntry = preferred ? hits.filter(h => h.body.name === preferred.name) : [];
  const primary = (inEntry.length ? inEntry : hits).sort((a, b) => a.line - b.line)[0];
  return {
    body: primary?.body ?? preferred,
    primaryLine: primary?.line,
    lines: Array.from(new Set(hits.map(h => h.line))).sort((a, b) => a - b),
  };
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
): { pick?: Pick; ambiguous: string[]; reachableCount: number } {
  const picks: Pick[] = matches.map(match => {
    const usage = usageAcross(source, bodies, match.name, entry);
    return { match, usage, reachable: usage.lines.length > 0 };
  });
  const reachable = picks.filter(p => p.reachable);
  const reachableCount = reachable.length;
  if (reachable.length === 1) return { pick: reachable[0], ambiguous: [], reachableCount };
  if (reachable.length > 1) return { ambiguous: reachable.map(p => p.match.name), reachableCount };
  if (picks.length === 1) return { pick: picks[0], ambiguous: [], reachableCount };
  return { ambiguous: picks.map(p => p.match.name), reachableCount };
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
  const failingLine = usage.primaryLine;
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

/**
 * The source defines the code under several names and cannot say which one fired. No registry
 * data is used here: an entry naming one candidate would be a guess, and an entry naming something
 * else would contradict the source.
 */
function ambiguousResolution(base: ErrorCodeInfo, definedIn: string, names: string[]): Resolution {
  return {
    info: { ...base, name: undefined, candidateNames: names, definedIn },
    registry: undefined,
    tag: undefined,
    complete: true,
  };
}

interface NativeAssessment {
  fn: string;
  meaning: string;
  siteCount: number;
  literalSites: number[];
  /** Reachable `contract-call?` sites that could have returned the code first. */
  calleeSites: number;
}

/**
 * A Clarity built-in can only be named as the cause when it is the single kind of built-in in
 * reachable code that produces the code; whether it is *certain* also depends on there being no
 * other reachable way to return the same code (callees, second sites, literal responses).
 */
function assessNative(
  code: string,
  reachable: FunctionBody[],
  source: string,
  deployer: string
): NativeAssessment | null {
  if (!/^u[1-4]$/.test(code)) return null;
  const sites = nativeAssetCallSites(reachable).filter(s => nativeErrorFor(s.fn, code));
  const kinds = Array.from(new Set(sites.map(s => s.fn)));
  if (kinds.length !== 1) return null;
  const native = nativeErrorFor(kinds[0], code)!;
  return {
    fn: kinds[0],
    meaning: native.meaning,
    siteCount: sites.length,
    literalSites: literalErrSites(source, reachable, code),
    calleeSites: reachable.flatMap(b => contractCallSites(b.text, deployer)).length,
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
    if (!pick) return ambiguousResolution(base, contractId, ambiguous);

    const { match, usage } = pick;
    const reg = guardRegistry(registry, match.name);
    const foldMask = pick.reachable
      ? (foldAccumulatorUnwrap(source, fnName, match.name) ?? undefined)
      : undefined;
    const firstAssert = body ? firstAssertLine(source, body) : null;
    const siteBeforeOtherChecks =
      pick.reachable &&
      usage.body?.name === body?.name &&
      usage.primaryLine !== undefined &&
      firstAssert !== null
        ? usage.primaryLine < firstAssert
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

  // Native fallback: one kind of built-in in reachable code produces the code. It is the cause only
  // when nothing else reachable can return the code; otherwise it is a candidate until callees are
  // ruled out (and stays one when a literal response or a second site exists).
  if (body) {
    const native = assessNative(code, reachable, source, contractDeployer(contractId));
    if (native) {
      const certain =
        native.siteCount === 1 && native.literalSites.length === 0 && native.calleeSites === 0;
      return {
        info: {
          ...base,
          nativeFunction: native.fn,
          nativeMeaning: native.meaning,
          nativeTentative: !certain,
          nativeSiteCount: native.siteCount,
          literalSites: native.literalSites,
        },
        registry,
        tag: registry?.tag ?? 'insufficient',
        complete: certain,
      };
    }
  }

  return { info: base, registry, tag: registry?.tag, complete: false };
}

/**
 * Candidate callee contracts, most likely first: contracts passed for the function's trait
 * parameters, then `contract-call?` targets in code the call reaches, then any other principal in
 * the arguments (route lists, tuples — data, not proven calls), then targets referenced elsewhere
 * in the contract.
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
 * sites through the trait variables the transaction bound to it. Trait variables bound to *another*
 * contract are excluded; variables that cannot be mapped (e.g. drawn from a list) are kept as
 * possible entries when nothing more specific exists.
 */
export function calleeEntryFunctions(
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  calleeId: string
): string[] {
  if (!called) return [];
  const deployer = contractDeployer(tx.contract_call.contract_id);
  const fnName = tx.contract_call.function_name;
  const argReprs = (tx.contract_call.function_args ?? []).map(a => a.repr ?? '');
  const entry = findFunctionBody(called.source_code, fnName);
  const bindings = entry ? traitBindings(entry, argReprs) : [];
  const boundHere = new Set(bindings.filter(b => b.principal === calleeId).map(b => b.param));
  const boundElsewhere = new Set(bindings.filter(b => b.principal !== calleeId).map(b => b.param));
  const sites = reachableFunctions(called.source_code, fnName).flatMap(b =>
    contractCallSites(b.text, deployer)
  );
  const direct = sites.filter(
    s => s.target === calleeId || (s.variable !== undefined && boundHere.has(s.variable))
  );
  if (direct.length) return Array.from(new Set(direct.map(s => s.fn)));
  const unmapped = sites.filter(s => s.variable !== undefined && !boundElsewhere.has(s.variable));
  return Array.from(new Set(unmapped.map(s => s.fn)));
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
  const all = calleeCandidates(tx, called);
  const candidates = all.slice(0, max);
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
    // With the entry functions known, the constant must be thrown in code they reach; a
    // definition used only elsewhere in the callee is not evidence that this callee failed.
    const restricted = bodies.length > 0;
    if (!bodies.length) bodies = allFunctionBodies(callee.source_code);
    const tried = candidates.slice(0, i + 1);
    const registry = sync.registry ?? lookupRegistry(candidates[i], code);
    const { pick, ambiguous, reachableCount } = pickConstant(
      callee.source_code,
      matches,
      bodies,
      null
    );
    if (restricted && reachableCount === 0) continue;
    if (!pick) {
      const res = ambiguousResolution(sync.info, candidates[i], ambiguous);
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
      // The code came from a callee constant, not from the built-in.
      nativeFunction: undefined,
      nativeMeaning: undefined,
      nativeTentative: undefined,
    };
    return {
      info,
      registry: reg,
      tag: reg?.tag ?? tagForName(match.name),
      source: sourceRefFor(candidates[i], callee.source_code, match, usage),
      complete: true,
    };
  }

  // No callee defines the code. A native candidate stays tentative only if a callee could not be
  // checked, or the contract itself has another way to return the code.
  const unchecked = all.length - candidates.length + fetched.filter(f => !f).length;
  const info: ErrorCodeInfo = { ...sync.info, candidatesTried: candidates };
  if (info.nativeFunction) {
    info.nativeTentative =
      unchecked > 0 || (info.nativeSiteCount ?? 1) > 1 || (info.literalSites?.length ?? 0) > 0;
  }
  return { ...sync, info, complete: true };
}
