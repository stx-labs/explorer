/**
 * Lightweight, dependency-free utilities over Clarity source text. Regex + a paren scanner that is
 * aware of `;;` comments and string literals — enough to locate constants, function bodies, usage
 * sites and static callees without a full parser.
 */

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

const NAME = '[A-Za-z0-9_\\-!?+<>=*/]+';

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
 * Find the constant that defines an error code. `code` is the Clarity literal as printed in the
 * result, e.g. `u2003`, `"not-allowed"`, `true`. Pattern B (bare value) is only accepted when the
 * constant is actually used as `(err NAME)` somewhere — otherwise plain numeric constants such as
 * `MIN_STEPS u1` would "explain" `(err u1)`.
 */
export function findErrorConstant(source: string, code: string): ConstantMatch | null {
  const lines = source.split('\n');
  const c = escapeRe(code);
  const a = new RegExp(`\\(define-constant\\s+(${NAME})\\s+\\(err\\s+${c}\\s*\\)\\s*\\)`);
  const ma = source.match(a);
  if (ma && ma.index !== undefined) {
    const line = lineOf(source, ma.index);
    return { name: ma[1], line, pattern: 'A', comments: commentsAbove(lines, line) };
  }
  const b = new RegExp(`\\(define-constant\\s+(${NAME})\\s+${c}\\s*\\)`, 'g');
  let mb: RegExpExecArray | null;
  while ((mb = b.exec(source))) {
    const name = mb[1];
    const used = new RegExp(`\\(err\\s+${escapeRe(name)}\\s*\\)`).test(source);
    if (used) {
      const line = lineOf(source, mb.index);
      return { name, line, pattern: 'B', comments: commentsAbove(lines, line) };
    }
  }
  return null;
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

/** Every function defined in the contract. */
export function allFunctionBodies(source: string): FunctionBody[] {
  const out: FunctionBody[] = [];
  functionDefinitions(source).forEach((_def, name) => {
    const body = findFunctionBody(source, name);
    if (body) out.push(body);
  });
  return out;
}

/** Statically referenced `contract-call?` targets, `.name` resolved against `deployer`. */
export function contractCallTargets(text: string, deployer: string): string[] {
  const out: string[] = [];
  const re = /\(contract-call\?\s+('?(?:SP|SM|ST|SN)[0-9A-Z]{20,41}\.[a-z0-9\-]+|\.[a-z0-9\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const ref = m[1];
    out.push(ref.startsWith('.') ? `${deployer}${ref}` : ref.replace(/^'/, ''));
  }
  return Array.from(new Set(out));
}

/** Contract principals appearing anywhere in argument reprs (trait args, lists of tuples, …). */
export function contractPrincipalsIn(reprs: string[]): string[] {
  const out = new Set<string>();
  const re = /'?((?:SP|SM|ST|SN)[0-9A-Z]{20,41}\.[a-z0-9\-]+)/g;
  for (const r of reprs) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(r))) out.add(m[1]);
  }
  return Array.from(out);
}

/** Does the function signature declare trait-typed parameters (`<trait>`)? */
export function hasTraitParams(body: FunctionBody): boolean {
  const header = body.text.slice(0, sexprEnd(body.text, body.text.indexOf('(', 1)));
  return /<[A-Za-z0-9_\-]+>/.test(header);
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

/** Native built-in transfer/mint/burn calls wrapped in an error-propagating form inside `body`. */
export function nativeAssetCalls(body: FunctionBody): string[] {
  const re =
    /\((?:try!|unwrap!|unwrap-panic|unwrap-err!)\s+\((stx-transfer\?|stx-transfer-memo\?|stx-burn\?|ft-transfer\?|ft-mint\?|ft-burn\?|nft-transfer\?|nft-mint\?|nft-burn\?)/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body.text))) out.add(m[1]);
  return Array.from(out);
}

export function contractDeployer(contractId: string): string {
  return contractId.split('.')[0];
}

export function contractName(contractId: string): string {
  return contractId.split('.')[1] ?? contractId;
}
