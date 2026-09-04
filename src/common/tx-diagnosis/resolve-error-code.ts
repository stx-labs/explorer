import {
  ConstantMatch,
  FunctionBody,
  allFunctionBodies,
  contractCallSites,
  contractDeployer,
  excerpt,
  findErrorConstants,
  findFunctionBody,
  firstAssertLine,
  foldAccumulatorUnwrap,
  hasTraitParams,
  literalErrSites,
  propagatingNativeCallSites,
  reachableFromAny,
  reachableFunctions,
  resolvedContractCalls,
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
  NativeCandidate,
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
    info: { ...base, name: undefined, candidateNames: names, definedIn: definedIn || undefined },
    registry: undefined,
    tag: undefined,
    complete: true,
  };
}

interface NativeKind {
  fn: string;
  meaning: string;
  sender: string;
  tag: SemanticTag;
}

interface NativeAssessment {
  /** Distinct built-ins in reachable code that can return the code, in source order. */
  kinds: NativeKind[];
  siteCount: number;
  literalSites: number[];
  /** Reachable `contract-call?` sites that could have returned the code first. */
  calleeSites: number;
}

/**
 * The Clarity built-ins in reachable code whose own error code equals `code`, counting only call
 * sites that return that code to the caller (`try!` or a bare call). A single kind at a single
 * site, with no literal response and no callee, is a certain cause; anything more is a candidate.
 */
function assessNative(
  code: string,
  reachable: FunctionBody[],
  source: string,
  deployer: string
): NativeAssessment | null {
  if (!/^u[1-4]$/.test(code)) return null;
  const sites = propagatingNativeCallSites(reachable).filter(s => nativeErrorFor(s.fn, code));
  if (!sites.length) return null;
  const kinds = Array.from(new Set(sites.map(s => s.fn))).map(fn => {
    const native = nativeErrorFor(fn, code)!;
    return { fn, meaning: native.meaning, sender: native.sender, tag: native.tag };
  });
  return {
    kinds,
    siteCount: sites.length,
    literalSites: literalErrSites(source, reachable, code),
    calleeSites: reachable.flatMap(b => contractCallSites(b.text, deployer)).length,
  };
}

/** The tag every candidate built-in agrees on, or none when they point at different causes. */
function sharedNativeTag(fns: string[], code: string): SemanticTag | undefined {
  const tags = Array.from(new Set(fns.map(fn => nativeErrorFor(fn, code)?.tag).filter(Boolean)));
  return tags.length === 1 ? tags[0] : undefined;
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

  // Native fallback: built-ins in reachable code produce the code. A single one is the cause only
  // when nothing else reachable can return the code; otherwise it is a candidate until callees are
  // ruled out (and stays one when a literal response or a second site exists). Several kinds are
  // always candidates: the network does not record which step failed.
  if (body) {
    const native = assessNative(code, reachable, source, contractDeployer(contractId));
    if (native) {
      const [first] = native.kinds;
      const single = native.kinds.length === 1;
      const certain =
        single &&
        native.siteCount === 1 &&
        native.literalSites.length === 0 &&
        native.calleeSites === 0;
      return {
        info: {
          ...base,
          nativeFunction: first.fn,
          nativeMeaning: first.meaning,
          nativeSender: first.sender,
          nativeTentative: !certain,
          nativeSiteCount: native.siteCount,
          literalSites: native.literalSites,
          nativeCandidates: single
            ? undefined
            : native.kinds.map(k => ({ fn: k.fn, meaning: k.meaning })),
        },
        registry,
        tag:
          registry?.tag ??
          sharedNativeTag(
            native.kinds.map(k => k.fn),
            code
          ),
        complete: certain,
      };
    }
  }

  return { info: base, registry, tag: registry?.tag, complete: false };
}

/**
 * Callee contracts reached by a literal `contract-call?` or by a trait variable whose binding can
 * be carried from the entry point through ordinary helper calls. Principals merely present in
 * argument data are deliberately excluded: naming a contract is not evidence that it was called.
 */
export function calleeCandidates(tx: FailedContractCallTx, called: ContractInfo | null): string[] {
  if (!called) return [];
  const contractId = tx.contract_call.contract_id;
  const argReprs = (tx.contract_call.function_args ?? []).map(a => a.repr ?? '');
  return resolvedContractCalls(
    called.source_code,
    tx.contract_call.function_name,
    argReprs,
    contractDeployer(contractId)
  )
    .map(c => c.contractId)
    .filter(c => c !== contractId);
}

/**
 * Functions of `calleeId` the failed call can enter through resolved literal or trait call sites.
 */
export function calleeEntryFunctions(
  tx: FailedContractCallTx,
  called: ContractInfo | null,
  calleeId: string
): string[] {
  if (!called) return [];
  const fnName = tx.contract_call.function_name;
  const argReprs = (tx.contract_call.function_args ?? []).map(a => a.repr ?? '');
  return (
    resolvedContractCalls(
      called.source_code,
      fnName,
      argReprs,
      contractDeployer(tx.contract_call.contract_id)
    ).find(c => c.contractId === calleeId)?.functions ?? []
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

  const resolved: {
    contractId: string;
    match: ConstantMatch;
    usage: Usage;
    reachable: boolean;
    registry?: RegistryEntry;
    source: SourceRef;
  }[] = [];
  const ambiguous: string[] = [];
  const calleeNatives: NativeCandidate[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const callee = fetched[i];
    if (!callee) continue;
    const entries = calleeEntryFunctions(tx, called, candidates[i]);
    if (!entries.length) continue;
    const bodies = reachableFromAny(callee.source_code, entries);

    const matches = findErrorConstants(callee.source_code, code);
    if (matches.length) {
      const registry = lookupRegistry(candidates[i], code);
      const picked = pickConstant(callee.source_code, matches, bodies, null);
      if (picked.reachableCount > 0) {
        if (!picked.pick) {
          ambiguous.push(...picked.ambiguous.map(name => `${name} in ${candidates[i]}`));
          continue;
        }
        const { match, usage } = picked.pick;
        resolved.push({
          contractId: candidates[i],
          match,
          usage,
          reachable: picked.pick.reachable,
          registry: guardRegistry(registry, match.name),
          source: sourceRefFor(candidates[i], callee.source_code, match, usage),
        });
        continue;
      }
      // Defined, but not thrown in the functions this call enters: not evidence for this callee.
    }

    // No constant explains the code in this callee; a built-in it calls in the entered functions
    // can (a token contract's `ft-transfer?`, a mint's `nft-mint?`).
    const native = assessNative(code, bodies, callee.source_code, contractDeployer(candidates[i]));
    if (native) {
      calleeNatives.push(
        ...native.kinds.map(k => ({
          fn: k.fn,
          meaning: k.meaning,
          contractId: candidates[i],
          functions: entries,
        }))
      );
    }
  }

  if (resolved.length === 1 && ambiguous.length === 0) {
    const only = resolved[0];
    const info: ErrorCodeInfo = {
      ...sync.info,
      name: only.match.name,
      definedIn: only.contractId,
      definitionLine: only.match.line,
      usageLines: only.usage.lines,
      comments: only.match.comments,
      reachable: only.reachable,
      candidatesTried: candidates,
      // The code came from a callee constant, not from the built-in.
      nativeFunction: undefined,
      nativeMeaning: undefined,
      nativeSender: undefined,
      nativeTentative: undefined,
    };
    return {
      info,
      registry: only.registry,
      tag: only.registry?.tag ?? tagForName(only.match.name),
      source: only.source,
      complete: true,
    };
  }

  if (resolved.length > 1 || ambiguous.length) {
    const labels = [...resolved.map(r => `${r.match.name} in ${r.contractId}`), ...ambiguous];
    const res = ambiguousResolution(sync.info, '', labels);
    return { ...res, info: { ...res.info, candidatesTried: candidates } };
  }

  // No constant names the code. What remains are built-ins: the called contract's own (from the
  // synchronous pass) and any inside the callee functions this call enters. With no execution
  // trace none of them is a certain cause — a callee may return the code literally, propagate its
  // own built-in, or obtain it from a contract further down — so the attribution stays hedged
  // whenever a callee was reachable, even if every fetched source was available.
  const own: NativeCandidate[] = sync.info.nativeFunction
    ? (sync.info.nativeCandidates ?? [
        { fn: sync.info.nativeFunction, meaning: sync.info.nativeMeaning ?? '' },
      ])
    : [];
  const natives = [...own, ...calleeNatives];
  const info: ErrorCodeInfo = { ...sync.info, candidatesTried: candidates };
  let tag = sync.tag;
  if (natives.length) {
    const [first] = natives;
    info.nativeFunction = first.fn;
    info.nativeMeaning = first.meaning;
    info.nativeTentative =
      natives.length > 1 ||
      calleeNatives.length > 0 ||
      all.length > 0 ||
      (info.nativeSiteCount ?? 1) > 1 ||
      (info.literalSites?.length ?? 0) > 0;
    info.nativeCandidates = natives.length > 1 || first.contractId ? natives : undefined;
    if (calleeNatives.length) {
      info.nativeSender = undefined;
      tag =
        sync.registry?.tag ??
        sharedNativeTag(
          natives.map(n => n.fn),
          code
        );
    }
  }
  return { ...sync, info, tag, complete: true };
}
