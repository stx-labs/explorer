/** Minimal argv parsing: `--key value`, `--flag`, repeated keys collect into arrays. */
export interface Args {
  flags: Set<string>;
  values: Map<string, string[]>;
}

export function parseArgs(argv: string[]): Args {
  const flags = new Set<string>();
  const values = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      values.set(key, [...(values.get(key) ?? []), next]);
      i++;
    } else {
      flags.add(key);
    }
  }
  return { flags, values };
}

export function str(args: Args, key: string, fallback: string): string {
  return args.values.get(key)?.[0] ?? fallback;
}

export function num(args: Args, key: string, fallback: number): number {
  const v = args.values.get(key)?.[0];
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function list(args: Args, key: string): string[] {
  return args.values.get(key) ?? [];
}

export function flag(args: Args, key: string): boolean {
  return args.flags.has(key);
}
