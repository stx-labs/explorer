/**
 * Lightweight, dependency-free utilities over Clarity source text. Regex + a paren scanner that is
 * aware of `;;` comments and string literals — enough to locate constants, function bodies, usage
 * sites and static callees without a full parser.
 */
import type { FoldMask } from './types';

export interface ConstantMatch {
  name: string;
  /** 1-based line of the definition */
  line: number;
  /** 'A' = `(define-constant NAME (err CODE))`; 'B' = `(define-constant NAME CODE)` used as `(err NAME)` */
  pattern: 'A' | 'B';
  /** `;;` comment lines directly above (and trailing on) the definition */
  comments: string[];
}

export interface FunctionBody {
  name: string;
  kind: 'public' | 'private' | 'read-only';
  /** 0-based char offsets into the source */
  start: number;
  end: number;
  /** 1-based line of the definition */
  line: number;
  text: string;
}

/**
 * A `contract-call?` site. `target` is the literal callee when the source names one; for a trait
 * variable it is null and `variable` carries the variable's name so the caller can map it to the
 * argument that bound it.
 */
export interface CallSite {
  target: string | null;
  fn: string;
  variable?: string;
}

/** A trait-typed parameter and the contract principal the transaction passed for it. */
export interface TraitBinding {
  param: string;
  principal: string;
}

/** A contract and the public functions reached through literal or resolved trait calls. */
export interface ResolvedContractCall {
  contractId: string;
  functions: string[];
}

const NAME = '[A-Za-z0-9_\\-!?+<>=*/]+';
const PRINCIPAL = '(?:SP|SM|ST|SN)[0-9A-Z]{20,41}\\.[A-Za-z0-9_\\-]+';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source.charCodeAt(i) === 10) line++;
  return line;
}

function commentsAbove(lines: string[], lineNo: number): string[] {
  const out: string[] = [];
  let k = lineNo - 2;
  while (k >= 0 && lines[k].trim().startsWith(';;')) {
    out.unshift(lines[k].trim().replace(/^;;\s?/, ''));
    k--;
  }
  const same = lines[lineNo - 1];
  const idx = same.indexOf(';;');
  if (idx >= 0)
    out.push(
      same
        .slice(idx)
        .replace(/^;;\s?/, '')
        .trim()
    );
  return out.filter(Boolean);
}

/**
 * Every constant that defines an error code, in source order. `code` is the Clarity literal as
 * printed in the result, e.g. `u2003`, `"not-allowed"`, `true`. Pattern B (bare value) is only
 * accepted when the constant is actually used as `(err NAME)` somewhere — otherwise plain numeric
 * constants such as `MIN_STEPS u1` would "explain" `(err u1)`.
 *
 * Contracts routinely define one code under several names; callers must decide which (if any) the
 * failed call could have reached rather than taking the first.
 */
export function findErrorConstants(source: string, code: string): ConstantMatch[] {
  const lines = source.split('\n');
  const c = escapeRe(code);
  const out: ConstantMatch[] = [];
  const seen = new Set<string>();
  const a = new RegExp(`\\(define-constant\\s+(${NAME})\\s+\\(err\\s+${c}\\s*\\)\\s*\\)`, 'g');
  let m: RegExpExecArray | null;
  while ((m = a.exec(source))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const line = lineOf(source, m.index);
    out.push({ name: m[1], line, pattern: 'A', comments: commentsAbove(lines, line) });
  }
  const b = new RegExp(`\\(define-constant\\s+(${NAME})\\s+${c}\\s*\\)`, 'g');
  while ((m = b.exec(source))) {
    const name = m[1];
    if (seen.has(name)) continue;
    if (new RegExp(`\\(err\\s+${escapeRe(name)}\\s*\\)`).test(source)) {
      seen.add(name);
      const line = lineOf(source, m.index);
      out.push({ name, line, pattern: 'B', comments: commentsAbove(lines, line) });
    }
  }
  return out.sort((x, y) => x.line - y.line);
}

/** First constant defining `code`, or null. Prefer `findErrorConstants` when attributing a failure. */
export function findErrorConstant(source: string, code: string): ConstantMatch | null {
  return findErrorConstants(source, code)[0] ?? null;
}

/** All `define-*` function definitions with their kinds and offsets. */
export function functionDefinitions(
  source: string
): Map<string, { kind: FunctionBody['kind']; start: number }> {
  const defs = new Map<string, { kind: FunctionBody['kind']; start: number }>();
  const re = new RegExp(`\\(define-(public|private|read-only)\\s+\\((${NAME})`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (!defs.has(m[2])) defs.set(m[2], { kind: m[1] as FunctionBody['kind'], start: m.index });
  }
  return defs;
}

/**
 * Return the end offset (exclusive) of the s-expression starting at `start`, skipping `;;` comments
 * and string literals. Returns `source.length` when unbalanced.
 */
export function sexprEnd(source: string, start: number): number {
  let depth = 0;
  let i = start;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    if (ch === ';' && source[i + 1] === ';') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < n && source[i] !== '"') {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return n;
}

export function findFunctionBody(source: string, fnName: string): FunctionBody | null {
  const def = functionDefinitions(source).get(fnName);
  if (!def) return null;
  const end = sexprEnd(source, def.start);
  return {
    name: fnName,
    kind: def.kind,
    start: def.start,
    end,
    line: lineOf(source, def.start),
    text: source.slice(def.start, end),
  };
}

/**
 * Functions reachable from `entry` inside the same contract. Edges are both `(name …)` applications
 * and bare `name` tokens (fold / map / filter callbacks).
 */
export function reachableFunctions(source: string, entry: string): FunctionBody[] {
  const defs = functionDefinitions(source);
  const seen = new Map<string, FunctionBody>();
  const todo = [entry];
  while (todo.length) {
    const name = todo.pop()!;
    if (seen.has(name) || !defs.has(name)) continue;
    const body = findFunctionBody(source, name);
    if (!body) continue;
    seen.set(name, body);
    defs.forEach((_def, candidate) => {
      if (candidate === name || seen.has(candidate)) return;
      const re = new RegExp(`(?<![\\w\\-!?])${escapeRe(candidate)}(?![\\w\\-!?])`);
      if (re.test(body.text)) todo.push(candidate);
    });
  }
  return Array.from(seen.values());
}

/** Union of the functions reachable from each of `entries`, deduplicated. */
export function reachableFromAny(source: string, entries: string[]): FunctionBody[] {
  const seen = new Map<string, FunctionBody>();
  for (const e of entries) for (const b of reachableFunctions(source, e)) seen.set(b.name, b);
  return Array.from(seen.values());
}

/** Every function defined in the contract. */
export function allFunctionBodies(source: string): FunctionBody[] {
  const out: FunctionBody[] = [];
  functionDefinitions(source).forEach((_def, name) => {
    const body = findFunctionBody(source, name);
    if (body) out.push(body);
  });
  return out;
}

/** Parameters of a function with their raw type text, in order. */
export function functionParamTypes(body: FunctionBody): { name: string; type: string }[] {
  const headerStart = body.text.indexOf('(', 1);
  if (headerStart < 0) return [];
  const header = body.text.slice(headerStart, sexprEnd(body.text, headerStart));
  const out: { name: string; type: string }[] = [];
  let depth = 0;
  for (let i = 0; i < header.length; i++) {
    const ch = header[i];
    if (ch === '(') {
      depth++;
      if (depth === 2) {
        const end = sexprEnd(header, i);
        const inner = header.slice(i + 1, end - 1).trim();
        const m = inner.match(new RegExp(`^(${NAME})\\s+([\\s\\S]*)$`));
        if (m) out.push({ name: m[1], type: m[2].trim() });
        i = end - 1;
        depth--;
      }
    } else if (ch === ')') depth--;
  }
  return out;
}

/** Parameter names of a function, in order: `(define-private (f (a uint) (b (response …))))` → [a, b]. */
export function functionParams(body: FunctionBody): string[] {
  return functionParamTypes(body).map(p => p.name);
}

/**
 * Trait-typed parameters mapped, by position, to the contract principal the transaction passed for
 * each: the callees a dynamic-dispatch function actually reached through those variables.
 */
export function traitBindings(body: FunctionBody, argReprs: string[]): TraitBinding[] {
  const out: TraitBinding[] = [];
  functionParamTypes(body).forEach((p, i) => {
    if (!/^<[^>]+>$/.test(p.type) || !argReprs[i]) return;
    const m = argReprs[i].trim().match(new RegExp(`^'?(${PRINCIPAL})$`));
    if (m) out.push({ param: p.name, principal: m[1] });
  });
  return out;
}

/** Contract principals bound to trait parameters, in parameter order. */
export function traitArgPrincipals(body: FunctionBody, argReprs: string[]): string[] {
  return Array.from(new Set(traitBindings(body, argReprs).map(b => b.principal)));
}

interface LocalFunctionCall {
  fn: string;
  args: string[];
}

/** Split the arguments of one s-expression without interpreting their values. */
function expressionArgs(expression: string): string[] {
  let i = 1;
  while (i < expression.length && /\s/.test(expression[i])) i++;
  while (i < expression.length && !/[\s()]/.test(expression[i])) i++;
  const args: string[] = [];
  while (i < expression.length - 1) {
    while (i < expression.length - 1 && /\s/.test(expression[i])) i++;
    if (expression[i] === ';' && expression[i + 1] === ';') {
      while (i < expression.length && expression[i] !== '\n') i++;
      continue;
    }
    if (i >= expression.length - 1 || expression[i] === ')') break;
    const start = i;
    if (expression[i] === '(') {
      i = sexprEnd(expression, i);
    } else if (expression[i] === '"') {
      i++;
      while (i < expression.length && expression[i] !== '"') {
        if (expression[i] === '\\') i++;
        i++;
      }
      i++;
    } else {
      while (i < expression.length - 1 && !/[\s()]/.test(expression[i])) i++;
    }
    args.push(expression.slice(start, i).trim());
  }
  return args;
}

/** Calls to functions defined in this contract, excluding the function-definition header. */
function localFunctionCalls(
  body: FunctionBody,
  definitions: Map<string, { kind: FunctionBody['kind']; start: number }>
): LocalFunctionCall[] {
  const out: LocalFunctionCall[] = [];
  const headerStart = body.text.indexOf('(', 1);
  const scanFrom = headerStart >= 0 ? sexprEnd(body.text, headerStart) : 0;
  for (let i = scanFrom; i < body.text.length; i++) {
    if (body.text[i] === ';' && body.text[i + 1] === ';') {
      while (i < body.text.length && body.text[i] !== '\n') i++;
      continue;
    }
    if (body.text[i] === '"') {
      i++;
      while (i < body.text.length && body.text[i] !== '"') {
        if (body.text[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (body.text[i] !== '(') continue;
    const head = body.text.slice(i + 1).match(new RegExp(`^\\s*(${NAME})(?=\\s|\\))`))?.[1];
    if (!head || !definitions.has(head)) continue;
    const end = sexprEnd(body.text, i);
    out.push({ fn: head, args: expressionArgs(body.text.slice(i, end)) });
  }
  return out;
}

function principalExpression(value: string, bindings: Map<string, string>): string | undefined {
  const direct = bindings.get(value.trim());
  if (direct) return direct;
  return value.trim().match(new RegExp(`^'?(${PRINCIPAL})$`))?.[1];
}

/**
 * Resolve contract calls from an entry point while carrying trait bindings through ordinary helper
 * calls. An argument merely naming a contract is not enough: a target is returned only when a
 * reachable `contract-call?` site names it literally or uses a variable bound to it.
 */
export function resolvedContractCalls(
  source: string,
  entry: string,
  entryArgReprs: string[],
  deployer: string
): ResolvedContractCall[] {
  const definitions = functionDefinitions(source);
  const entryBody = findFunctionBody(source, entry);
  if (!entryBody) return [];

  const initial = new Map(traitBindings(entryBody, entryArgReprs).map(b => [b.param, b.principal]));
  const queue: { fn: string; bindings: Map<string, string> }[] = [{ fn: entry, bindings: initial }];
  const seenStates = new Set<string>();
  const visitedFunctions = new Set<string>();
  const targets = new Map<string, Set<string>>();

  const record = (contractId: string, fn: string) => {
    const functions = targets.get(contractId) ?? new Set<string>();
    functions.add(fn);
    targets.set(contractId, functions);
  };

  while (queue.length) {
    const state = queue.shift()!;
    const stateKey = `${state.fn}:${Array.from(state.bindings.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')}`;
    if (seenStates.has(stateKey)) continue;
    seenStates.add(stateKey);
    visitedFunctions.add(state.fn);
    const body = findFunctionBody(source, state.fn);
    if (!body) continue;

    for (const site of contractCallSites(body.text, deployer)) {
      const contractId = site.target ?? (site.variable ? state.bindings.get(site.variable) : null);
      if (contractId) record(contractId, site.fn);
    }

    for (const call of localFunctionCalls(body, definitions)) {
      const child = findFunctionBody(source, call.fn);
      if (!child) continue;
      const bindings = new Map<string, string>();
      functionParams(child).forEach((param, i) => {
        const principal = call.args[i]
          ? principalExpression(call.args[i], state.bindings)
          : undefined;
        if (principal) bindings.set(param, principal);
      });
      queue.push({ fn: call.fn, bindings });
    }
  }

  // Bare fold/map callbacks cannot carry a statically knowable trait binding, but their literal
  // contract calls are still reachable and safe to report.
  for (const body of reachableFunctions(source, entry)) {
    if (visitedFunctions.has(body.name)) continue;
    for (const site of contractCallSites(body.text, deployer)) {
      if (site.target) record(site.target, site.fn);
    }
  }

  return Array.from(targets, ([contractId, functions]) => ({
    contractId,
    functions: Array.from(functions),
  }));
}

/** Callback names passed to `fold` in the given bodies. */
export function foldCallbackNames(bodies: FunctionBody[]): string[] {
  const out = new Set<string>();
  const re = new RegExp(`\\(fold\\s+(${NAME})\\s`, 'g');
  for (const b of bodies) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(b.text))) out.add(m[1]);
  }
  return Array.from(out);
}

/**
 * Detect the error-masking pattern `(unwrap! <accumulator> CONST)` in a fold callback reachable from
 * `entry`: when an earlier item fails, the next iteration discards its error and returns CONST.
 */
export function foldAccumulatorUnwrap(
  source: string,
  entry: string,
  constName: string
): FoldMask | null {
  const bodies = reachableFunctions(source, entry);
  for (const cb of foldCallbackNames(bodies)) {
    const body = findFunctionBody(source, cb);
    if (!body) continue;
    const acc = functionParams(body)[1];
    if (!acc) continue;
    const re = new RegExp(
      `\\(unwrap(?:-err)?!\\s+${escapeRe(acc)}\\s+${escapeRe(constName)}(?![\\w\\-!?])`
    );
    const m = re.exec(body.text);
    if (m) return { helper: cb, accumulatorParam: acc, line: lineOf(source, body.start + m.index) };
  }
  return null;
}

/** Number of top-level items in a `(list …)` repr, or null when the repr is not a list. */
export function listItemCount(repr: string): number | null {
  const t = repr.trim();
  if (!t.startsWith('(list')) return null;
  let i = 5;
  let count = 0;
  while (i < t.length) {
    const ch = t[i];
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      i++;
      continue;
    }
    if (ch === ')') break;
    if (ch === '(') {
      i = sexprEnd(t, i);
      count++;
      continue;
    }
    while (i < t.length && !/[\s()]/.test(t[i])) i++;
    count++;
  }
  return count;
}

/** 1-based line of the first `asserts!` inside `body`, or null. */
export function firstAssertLine(source: string, body: FunctionBody): number | null {
  const idx = body.text.indexOf('(asserts!');
  return idx >= 0 ? lineOf(source, body.start + idx) : null;
}

/**
 * `contract-call?` sites in `text`: literal targets (`.name` resolved against `deployer`) and trait
 * variables (`target: null`, the variable in `variable`), with the function called on each.
 */
export function contractCallSites(text: string, deployer: string): CallSite[] {
  const out: CallSite[] = [];
  const re = new RegExp(
    `\\(contract-call\\?\\s+('${PRINCIPAL}|\\.[A-Za-z0-9_\\-]+|${NAME})\\s+(${NAME})`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const ref = m[1];
    if (ref.startsWith("'")) out.push({ target: ref.slice(1), fn: m[2] });
    else if (ref.startsWith('.')) out.push({ target: `${deployer}${ref}`, fn: m[2] });
    else out.push({ target: null, fn: m[2], variable: ref });
  }
  return out;
}

/** Statically referenced `contract-call?` targets, `.name` resolved against `deployer`. */
export function contractCallTargets(text: string, deployer: string): string[] {
  const out: string[] = [];
  for (const site of contractCallSites(text, deployer)) if (site.target) out.push(site.target);
  return Array.from(new Set(out));
}

/** Remove `"…"` / `u"…"` string literals so their contents are not mistaken for code. */
export function stripStringLiterals(text: string): string {
  return text.replace(/u?"(?:[^"\\]|\\.)*"/g, '""');
}

/**
 * Contract principals appearing in argument reprs outside string literals (trait args, lists of
 * tuples, …). These are names the data carries, not proof that the contract was called.
 */
export function contractPrincipalsIn(reprs: string[]): string[] {
  const out = new Set<string>();
  const re = new RegExp(`'?(${PRINCIPAL})`, 'g');
  for (const r of reprs) {
    const text = stripStringLiterals(r);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) out.add(m[1]);
  }
  return Array.from(out);
}

/** Does the function signature declare trait-typed parameters (`<trait>`)? */
export function hasTraitParams(body: FunctionBody): boolean {
  return functionParamTypes(body).some(p => /^<[^>]+>$/.test(p.type));
}

/** 1-based lines inside `body` where `name` is used as an error operand or `(err name)`. */
export function usageLines(source: string, body: FunctionBody, name: string): number[] {
  const lines: number[] = [];
  const re = new RegExp(
    `\\((?:asserts!|unwrap!|unwrap-err!|try!)[^\\n]*?(?<![\\w\\-])${escapeRe(name)}(?![\\w\\-])|\\(err\\s+${escapeRe(name)}\\s*\\)`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(body.text))) {
    lines.push(lineOf(source, body.start + m.index));
  }
  return Array.from(new Set(lines));
}

/** 1-based lines in `bodies` that return the code literally, e.g. `(err u1)` without a constant. */
export function literalErrSites(source: string, bodies: FunctionBody[], code: string): number[] {
  const re = new RegExp(`\\(err\\s+${escapeRe(code)}\\s*\\)`, 'g');
  const out: number[] = [];
  for (const body of bodies) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(body.text))) out.push(lineOf(source, body.start + m.index));
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

/** Lines (1-based) in `body` matching `re`. */
export function siteLines(source: string, body: FunctionBody, re: RegExp): number[] {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = g.exec(body.text))) out.push(lineOf(source, body.start + m.index));
  return Array.from(new Set(out));
}

/** Numbered excerpt around a line. */
export function excerpt(
  source: string,
  line: number,
  before = 2,
  after = 1
): { n: number; code: string }[] {
  const lines = source.split('\n');
  const from = Math.max(1, line - before);
  const to = Math.min(lines.length, line + after);
  const out: { n: number; code: string }[] = [];
  for (let n = from; n <= to; n++) out.push({ n, code: lines[n - 1].replace(/\t/g, '  ') });
  return out;
}

/** Numbered lines of whole function bodies, in source order, capped at `maxLines` in total. */
export function functionSourceLines(
  source: string,
  bodies: FunctionBody[],
  maxLines: number
): { lines: { n: number; code: string }[]; truncated: boolean } {
  const all = source.split('\n');
  const out: { n: number; code: string }[] = [];
  let truncated = false;
  for (const body of [...bodies].sort((a, b) => a.start - b.start)) {
    const from = body.line;
    const to = from + body.text.split('\n').length - 1;
    for (let n = from; n <= to; n++) {
      if (out.length >= maxLines) {
        truncated = true;
        return { lines: out, truncated };
      }
      out.push({ n, code: all[n - 1].replace(/\t/g, '  ') });
    }
    if (out.length < maxLines) out.push({ n: to + 1, code: '' });
  }
  return { lines: out, truncated };
}

const NATIVE_ASSET_CALL =
  /\((stx-transfer\?|stx-transfer-memo\?|stx-burn\?|ft-transfer\?|ft-mint\?|ft-burn\?|nft-transfer\?|nft-mint\?|nft-burn\?)[\s)]/g;
/** The form immediately enclosing a call, e.g. `(try! (stx-transfer? …))` → `try!`. */
const ENCLOSING_FORM =
  /\((try!|unwrap!|unwrap-panic|unwrap-err!|match|is-ok|is-err|default-to)\s*$/;

export interface NativeCallSite {
  fn: string;
  index: number;
  /** `try!`, `unwrap!`, …, or `bare` when the call's response is returned as it is. */
  wrapper: string;
}

/** Every native transfer/mint/burn call in `bodies`, one entry per site, with its enclosing form. */
export function nativeAssetCallSites(bodies: FunctionBody | FunctionBody[]): NativeCallSite[] {
  const list = Array.isArray(bodies) ? bodies : [bodies];
  const out: NativeCallSite[] = [];
  for (const body of list) {
    const re = new RegExp(NATIVE_ASSET_CALL.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body.text))) {
      const before = body.text.slice(0, m.index).replace(/\s+$/, '');
      out.push({
        fn: m[1],
        index: body.start + m.index,
        wrapper: before.match(ENCLOSING_FORM)?.[1] ?? 'bare',
      });
    }
  }
  return out;
}

/**
 * Native call sites whose own error code can become the function's result: `try!` re-raises it
 * and a bare call returns it as it is. `unwrap!` substitutes its fallback, `unwrap-panic` aborts,
 * and `match` / `is-ok` / `default-to` handle the response explicitly, so none of those can
 * return the built-in's code to the caller.
 */
export function propagatingNativeCallSites(
  bodies: FunctionBody | FunctionBody[]
): NativeCallSite[] {
  return nativeAssetCallSites(bodies).filter(s => s.wrapper === 'try!' || s.wrapper === 'bare');
}

/** Distinct native built-ins called in an error-propagating form inside `bodies`. */
export function nativeAssetCalls(bodies: FunctionBody | FunctionBody[]): string[] {
  return Array.from(new Set(nativeAssetCallSites(bodies).map(s => s.fn)));
}

export function contractDeployer(contractId: string): string {
  return contractId.split('.')[0];
}

export function contractName(contractId: string): string {
  return contractId.split('.')[1] ?? contractId;
}
