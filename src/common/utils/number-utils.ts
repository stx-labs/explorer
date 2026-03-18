const MAX_UINT128 = BigInt('340282366920938463463374607431768211455'); // 2^128 - 1

export function isUint128(value: number | bigint | string): boolean {
  try {
    const bigVal = BigInt(value);
    return bigVal >= BigInt(0) && bigVal <= MAX_UINT128;
  } catch {
    return false;
  }
}

export function isStringNumber(value: string): boolean {
  return !isNaN(Number(value));
}

export function bigintPow(base: bigint, exp: number): bigint {
  let result = BigInt(1);
  for (let i = 0; i < exp; i++) result = result * base;
  return result;
}
