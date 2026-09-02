/**
 * Definitions for the protocol terms the page uses without explaining.
 *
 * Each is stated from the pox-5 contract rather than paraphrased, so the page
 * teaches the mechanism instead of leaving readers to infer it, and links to
 * the matching section of the PoX-5 glossary for the fuller treatment.
 */
const DOCS_GLOSSARY = 'https://docs.stacks.co/pox-5/glossary';
export interface GlossaryEntry {
  term: string;
  definition: string;
  /** The link is hidden when absent. */
  docsUrl: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  bondTerm: {
    term: 'Bond term',
    definition:
      'Every bond runs for the same fixed length: 12 reward cycles from the block it activates. The contract sets this, so no bond is longer or shorter than another.',
    docsUrl: `${DOCS_GLOSSARY}#bonding-period`,
  },
  rewardDistribution: {
    term: 'Reward distribution',
    definition:
      'Bitcoin rewards are paid on a fixed schedule, once every half reward cycle. Because a bond runs 12 cycles, it receives 24 distributions over its term.',
    docsUrl: `${DOCS_GLOSSARY}#distribution-cycle`,
  },
  reserve: {
    term: 'Reserve',
    definition:
      'Each distribution pays active bonds first. 15% of what remains is then held back into the protocol reserve (tranche 3 of the reward waterfall) before the rest is distributed to STX stackers.',
    docsUrl: `${DOCS_GLOSSARY}#reserve-fund-tranche-3`,
  },
  onChainCapacity: {
    term: 'On-chain capacity',
    definition:
      'The most BTC a bond can hold, set by the Stacks Endowment and written on chain when the bond is created.',
    docsUrl: `${DOCS_GLOSSARY}#available-capacity-and-capacity-allocation-pox-5`,
  },
  targetRewardRate: {
    term: 'Target reward rate',
    definition:
      'The annual rate a bond aims to pay on the BTC bonded to it. The contract pays a fixed fraction of it at each distribution, so a bond whose blocks arrive faster than average realises slightly more than the target, and slower slightly less.',
    docsUrl: `${DOCS_GLOSSARY}#apy-target`,
  },
  stxPairing: {
    term: 'STX pairing',
    definition:
      'The minimum STX that must be locked alongside bonded BTC, as a share of its value. A registration below the minimum is not accepted.',
    docsUrl: `${DOCS_GLOSSARY}#paired-btc-and-paired-stx`,
  },
};
