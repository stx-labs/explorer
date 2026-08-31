/**
 * Definitions for the protocol terms the page uses without explaining.
 *
 * Each is stated from the pox-5 contract rather than paraphrased, so the page
 * teaches the mechanism instead of leaving readers to infer it.
 *
 * TODO: link each entry to its section of the PoX-5 glossary on docs.stacks.co
 * once those anchors exist.
 */
export interface GlossaryEntry {
  term: string;
  definition: string;
  /** Empty until the docs anchors exist; the link is hidden when absent. */
  docsUrl: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  bondTerm: {
    term: 'Bond term',
    definition:
      'Every bond runs for the same fixed length: 12 reward cycles from the block it activates. The contract sets this, so no bond is longer or shorter than another.',
    docsUrl: '',
  },
  rewardDistribution: {
    term: 'Reward distribution',
    definition:
      'Bitcoin rewards are paid on a fixed schedule, once every half reward cycle. Because a bond runs 12 cycles, it receives 24 distributions over its term. Every bond pays on the same schedule, whenever it started.',
    docsUrl: '',
  },
  reserve: {
    term: 'Reserve',
    definition:
      'Each distribution pays active bonds first. 15% of whatever remains is held back in the protocol reserve, and the rest goes to STX stackers.',
    docsUrl: '',
  },
  onChainCapacity: {
    term: 'On-chain capacity',
    definition:
      'The most BTC a bond can hold, set by the Stacks Endowment and written on chain when the bond is created. It includes an operational buffer, so it is larger than the amount offered to stakers.',
    docsUrl: '',
  },
  targetRewardRate: {
    term: 'Target reward rate',
    definition:
      'The annual rate a bond aims to pay on the BTC bonded to it. The contract pays a fixed fraction of it at each distribution, so a bond whose blocks arrive faster than average realises slightly more than the target, and slower slightly less.',
    docsUrl: '',
  },
  stxPairing: {
    term: 'STX pairing',
    definition:
      'The minimum STX that must be locked alongside bonded BTC, as a share of its value. A registration below the minimum is not accepted.',
    docsUrl: '',
  },
};
