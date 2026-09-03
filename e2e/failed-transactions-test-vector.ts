/**
 * Confirmed failed contract calls on mainnet, one per diagnosis class. Transactions are immutable,
 * so these stay valid; the expected headline fragments come from the deterministic engine's copy.
 */
export const failedTxs: {
  txid: string;
  description: string;
  headlineIncludes: string;
}[] = [
  {
    // Genuine post-condition rollback: the post-condition names another account than the signer.
    txid: '0x22b61b960238b6e2a5c9749f61ed3f87084fac2002e8d4cd7b02339b3400d0f1',
    description: 'post-condition principal mismatch (sBTC withdrawal)',
    headlineIncludes: 'different account than the one that signed',
  },
  {
    // Explicit contract error resolved to ERR_MINIMUM_RECEIVED (slippage).
    txid: '0x613608087c1134d22aa031001643ff252338f5be04d81550bf0b9bfb7071c653',
    description: 'contract error — slippage on a dlmm swap',
    headlineIncludes: 'less than the minimum you set',
  },
  {
    // Runtime panic (ArithmeticUnderflow) — no trace available.
    txid: '0xe075bd312cebfb981297cce5fba4ee5ec9e48461454fe99c81e9eda0f39b15f5',
    description: 'runtime underflow in a dlmm liquidity withdrawal',
    headlineIncludes: 'went below zero',
  },
];
