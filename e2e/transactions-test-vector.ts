// Use immutable mainnet records. Testnet is periodically reset, which made every testnet vector
// return 404 and turned this smoke suite into a network-lifetime check rather than a page test.
export const txs = {
  mainnet: {
    coinbase: ['0xa1d9f5d4d1a2d0cdeaaa8316507596feeca97d62c3596f937205425222989528'],
    token_transfer: ['0x44c64a8975bdd4b2f6eef4b0d1ac1203ce6f67fe0e4490289495727de8f311f3'],
    contract_call: [
      '0xa176909e4681cf41cf8662ce51ffcf109fb2fdb2aeae6bb8425d236241debe3f',
      '0xf9bd54f478cd5a519a43ecb65f4ca9c11525852527ea25e4c7b2e1bf7a5444e4',
    ],
    smart_contract: ['SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.alex-reserve-pool'],
    poison_microblock: [],
  },
};
