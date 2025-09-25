export function isUint128(value: number | bigint): boolean {
  // we could also add a check for maxUint128
  // const maxUint128 = BigInt('340282366920938463463374607431768211455'); // 2^128 - 1
  // value <= Number(maxUint128);
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function isStringNumber(value: string): boolean {
  return !isNaN(Number(value));
}

export function bigintPow(base: bigint, exp: number): bigint {
  let result = BigInt(1);
  for (let i = 0; i < exp; i++) result = result * base;
  return result;
}
