import fs from 'node:fs';
import path from 'node:path';

import type { FailedContractCallTx } from '../../../src/common/tx-diagnosis/types';

/** Repository root (this file lives in scripts/tx-diagnosis/lib, compiled under .build). */
export function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(file: string, data: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export interface SampledCase {
  tx: FailedContractCallTx;
  /** Why this transaction was picked (sampler stratum or an explicit id). */
  origin: 'recent' | 'explicit';
}

export interface CasesFile {
  apiUrl: string;
  sampledAt: string;
  cases: SampledCase[];
}
