/**
 * All user-facing copy for the "Why it failed" card lives here. Structure and tone follow the
 * design sprint (2026-09-03): second person, plain words, confidence expressed as wording
 * (because / most likely because / we couldn't determine), sender vs developer separated,
 * identifiers as chips (DetailRef).
 */
import { contractName, listItemCount } from './clarity-source';
import type { Classification } from './classify';
import type { Resolution } from './resolve-error-code';
import type { SemanticTag } from './tags';
import type {
  Confidence,
  Correlations,
  DetailRef,
  Evidence,
  Fact,
  FailedContractCallTx,
  RichPart,
  RuntimeFinding,
} from './types';
import { describeConditionCode } from './vm-error';

// ---------------------------------------------------------------------------------------------
// Detail refs
// ---------------------------------------------------------------------------------------------

export function truncateMiddle(value: string, start = 6, end = 5): string {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export const ref = {
  address: (a: string): DetailRef => ({
    kind: 'address',
    label: truncateMiddle(a, 6, 5),
    value: a,
    href: `/address/${a}`,
  }),
  contract: (id: string): DetailRef => ({
    kind: 'contract',
    label: contractName(id),
    value: id,
    href: `/txid/${id}`,
  }),
  fn: (name: string): DetailRef => ({ kind: 'function', label: name, value: name }),
  tx: (id: string): DetailRef => ({
    kind: 'tx',
    label: truncateMiddle(id, 6, 4),
    value: id,
    href: `/txid/${id}`,
  }),
  constant: (name: string): DetailRef => ({ kind: 'constant', label: name, value: name }),
  value: (v: string): DetailRef => ({ kind: 'value', label: v, value: v }),
  asset: (assetId: string): DetailRef => ({
    kind: 'asset',
    label: assetName(assetId),
    value: assetId,
  }),
};

/** `SP….sbtc-token::sbtc-token` → `sbtc-token`; `STX` stays. */
export function assetName(assetId: string): string {
  if (assetId === 'STX' || /\.STX::STX$/.test(assetId)) return 'STX';
  const idx = assetId.indexOf('::');
  return idx >= 0 ? assetId.slice(idx + 2) : contractName(assetId);
}

export function formatStx(microStx: string | number): string {
  const n = Number(microStx) / 1e6;
  if (!isFinite(n)) return String(microStx);
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export function formatInt(v: string | number): string {
  const n = typeof v === 'string' ? Number(v.replace(/^u/, '')) : v;
  return isFinite(n) ? n.toLocaleString('en-US') : String(v);
}

// ---------------------------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------------------------

export function invariantFor(tx: FailedContractCallTx, movedAsset?: string): string {
  const fee = formatStx(tx.fee_rate);
  const payer =
    tx.sponsored && tx.sponsor_address
      ? ` (paid by the sponsor ${truncateMiddle(tx.sponsor_address)})`
      : '';
  const tail = movedAsset ? `No ${assetName(movedAsset)} moved.` : 'Nothing else moved.';
  return `Only the ${fee} STX fee was spent${payer}. ${tail}`;
}

function hedge(confidence: Confidence): string {
  return confidence === 'high'
    ? 'because'
    : confidence === 'medium'
      ? 'most likely because'
      : 'possibly because';
}

/** The first list-typed argument and its item count, for batch calls. */
function batchArg(tx: FailedContractCallTx): { name: string; count: number } | undefined {
  for (const a of tx.contract_call.function_args ?? []) {
    const count = listItemCount(a.repr ?? '');
    if (count !== null) return { name: a.name, count };
  }
  return undefined;
}

/**
 * A call sent in allow mode without post-conditions has no wallet-side safety net: worth one line
 * of evidence (and a developer note), never a headline — it did not cause the failure.
 */
function postConditionEvidence(tx: FailedContractCallTx, reached: boolean): Evidence | undefined {
  const nPc = tx.post_conditions?.length ?? 0;
  if (nPc)
    return {
      id: 'post_conditions',
      label: 'post-conditions',
      value: `${nPc} post-condition${nPc > 1 ? 's' : ''}${reached ? '' : ' (not reached)'}`,
    };
  if (tx.post_condition_mode === 'allow')
    return { id: 'post_conditions', label: 'post-conditions', value: 'allow mode · none set' };
  return undefined;
}

const ALLOW_MODE_NOTE =
  'The call was sent in allow mode with no post-conditions, so a successful call could have moved any asset; deny mode with explicit post-conditions is safer.';

function withAllowModeNote(tx: FailedContractCallTx, note?: string): RichPart[] | undefined {
  const unsafe = tx.post_condition_mode === 'allow' && !(tx.post_conditions?.length ?? 0);
  if (!unsafe) return note ? [note] : undefined;
  return [note ? `${note} ${ALLOW_MODE_NOTE}` : ALLOW_MODE_NOTE];
}

// ---------------------------------------------------------------------------------------------
// Tag copy for explicit contract errors
// ---------------------------------------------------------------------------------------------

interface TagCopy {
  headline: string;
  sender: string;
  developer?: string;
}

function tagCopy(tag: SemanticTag | undefined, name: string | undefined): TagCopy | undefined {
  const n = name ? `“${name}”` : 'an error';
  switch (tag) {
    case 'slippage':
      return {
        headline:
          'The trade would have returned less than the minimum you set, so it was cancelled.',
        sender:
          'This usually means prices moved between quote and execution. Retry with a higher slippage tolerance or a smaller amount.',
        developer:
          'Quote closer to submission or widen the minimum; consider a deadline so stale quotes fail fast.',
      };
    case 'oracle':
      return {
        headline:
          "The contract couldn't get a usable price from its oracle, so the call was cancelled.",
        sender: 'Not caused by you. Try again later or contact the app.',
        developer: 'Check the oracle feed freshness and any fallback configuration.',
      };
    case 'expired':
      return {
        headline: 'The transaction was mined after the deadline the app set for it.',
        sender: 'Retry — the new transaction gets a fresh deadline.',
      };
    case 'taken':
      return {
        headline: `What you asked for is already taken (${n}), so the call was rejected.`,
        sender:
          'Retrying with the same inputs cannot succeed. Choose a different one, or acquire it from its current holder through the app.',
        developer:
          'Check availability with a read-only call before broadcasting, and branch on the state you find instead of sending the claim regardless.',
      };
    case 'already':
      return {
        headline: `The contract reported this was already done (${n}), so nothing was changed.`,
        sender:
          'Nothing to do — the existing state stays in place. Check the app for the current status.',
      };
    case 'too_early':
      return {
        headline: `This can't be done yet — the contract enforces a waiting period (${n}).`,
        sender: 'Wait for the period to pass and try again.',
      };
    case 'insufficient':
      return {
        headline: `You didn't have enough balance for this call (${n}).`,
        sender: 'Top up the balance the app needs and retry.',
      };
    case 'health':
      return {
        headline:
          'This would leave your position under-collateralised, so the contract refused it.',
        sender: 'Borrow less or add collateral, then retry.',
      };
    case 'unauthorized':
      return {
        headline: `Your account isn't allowed to call this (${n}).`,
        sender:
          'This action is restricted — usually to the contract owner or an admin role. Nothing to retry.',
        developer: 'Check the caller checks in the contract and which account the app signs with.',
      };
    case 'paused':
      return {
        headline: `This function is currently disabled or paused (${n}).`,
        sender: 'Try again later or check the app for announcements.',
      };
    case 'dust':
      return {
        headline: `The amount is below the minimum the contract accepts (${n}).`,
        sender: 'Use a larger amount.',
      };
    case 'signature':
      return {
        headline: `The signatures in this call were rejected (${n}).`,
        sender: 'This is usually an operator-side problem; retry with fresh signatures.',
        developer: 'Check signer uniqueness, message freshness and the signing payload.',
      };
    case 'not_found':
      return {
        headline: `The contract expected something that wasn't there (${n}).`,
        sender:
          'Reload the app and try once more. If it fails the same way again, the data the app used is wrong or stale — not unlucky timing.',
        developer:
          'A lookup returned none — check ids, pools or positions passed in the arguments.',
      };
    case 'limit':
      return {
        headline: `A limit in the contract was exceeded (${n}).`,
        sender: 'Reduce the amount or wait, then retry.',
      };
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------------------------
// Per-class builders
// ---------------------------------------------------------------------------------------------

export interface Built {
  headline: string;
  senderAction: string;
  invariant: string;
  whatHappened: Fact[];
  developerNote?: RichPart[];
  evidence: Evidence[];
  confidence: Confidence;
}

function callFacts(tx: FailedContractCallTx): { fn: DetailRef; contract: DetailRef } {
  return {
    fn: ref.fn(tx.contract_call.function_name),
    contract: ref.contract(tx.contract_call.contract_id),
  };
}

/**
 * Link to a source line: the page's own Source tab for the called contract, or the callee's page
 * when the constant lives in another contract (the Source tab only ever shows the called one).
 */
function sourceLink(
  res: Resolution | undefined,
  calledContractId: string,
  line?: number
): Fact['link'] | undefined {
  const n = line ?? res?.source?.failingLine ?? res?.info.definitionLine;
  if (!res?.source || !n) return undefined;
  const target = res.source.contractId;
  const label = `Line ${n} in ${contractName(target)}`;
  return target === calledContractId
    ? { label, href: `?tab=sourceCode&line=${n}` }
    : { label, href: `/txid/${target}?tab=sourceCode&line=${n}` };
}

export function buildContractError(
  tx: FailedContractCallTx,
  cls: Classification,
  res: Resolution | undefined,
  masked?: { pcSummary: string }
): Built {
  const { fn, contract } = callFacts(tx);
  const code = cls.errorCode ?? cls.resultRepr;
  const name = res?.info.name;
  const registry = res?.registry;
  const native = res?.info.nativeFunction ? res.info : undefined;
  const foldMask = res?.info.foldMask;
  const ambiguous = res?.info.candidateNames;
  // Defined once, but not thrown anywhere the call reaches: likely, not certain.
  const unreachable = !!name && res?.info.reachable === false;
  const tag = res?.tag;
  const copy = tagCopy(tag, name);
  const batch = batchArg(tx);

  let confidence: Confidence =
    name || registry ? 'high' : native ? (native.nativeTentative ? 'low' : 'medium') : 'low';
  let headline: string;
  let senderAction: string;
  let developer: string | undefined;

  if (ambiguous?.length) {
    // Several constants share the code; the network does not record which check fired.
    headline = `The contract rejected this call with error ${code}, which it defines under ${ambiguous.length} names — the network doesn't record which check failed.`;
    senderAction =
      'The app can tell you which condition failed; the candidate checks are listed below.';
    confidence = 'low';
  } else if (foldMask) {
    // The code is a placeholder written by the fold helper; the real error is not on chain.
    const items = batch ? `one of the ${formatInt(batch.count)} items` : 'one of the items';
    headline =
      registry?.summary ??
      `${items[0].toUpperCase()}${items.slice(1)} in this call failed, but the contract only recorded a placeholder error (${name ?? code}) in its place — the real cause is not on chain.`;
    senderAction =
      registry?.sender ??
      'The whole call was cancelled and nothing moved. Retry with fewer items; if it fails again, the app can find the failing item by submitting them one at a time.';
    developer =
      registry?.developer ??
      `${foldMask.helper} unwraps the fold accumulator (${foldMask.accumulatorParam}) with ${name ?? code}, which discards the failing item's error. Bisect the list or replay items individually at block ${formatInt(tx.block_height - 1)}; consider carrying the failing index and code through the accumulator.`;
    confidence = 'medium';
  } else if (registry) {
    headline = registry.summary;
    senderAction = registry.sender ?? copy?.sender ?? 'Retry; if it repeats, contact the app.';
    developer = registry.developer ?? copy?.developer ?? undefined;
  } else if (native && native.nativeTentative) {
    // The built-in is one way this code can arise; a callee or another site is not ruled out.
    headline = `The contract rejected this call with error ${code} — possibly because ${native.nativeMeaning}, though another step in the call can return the same code.`;
    senderAction =
      'Check the balance the app used; if it was sufficient, the app can tell you which step failed.';
    confidence = 'low';
  } else if (native) {
    headline = `This call failed because ${native.nativeMeaning}.`;
    senderAction = 'Check the balance or details the app used and retry.';
  } else if (copy && tag !== 'unknown') {
    headline = copy.headline;
    senderAction = copy.sender;
    developer = copy.developer;
  } else {
    headline = name
      ? `The contract rejected this call with the error “${name}” (${code}).`
      : `The contract rejected this call with error ${code}.`;
    senderAction = name
      ? 'The app can tell you what this error means; the check that failed is linked below.'
      : "The app can tell you what this code means; the contract's source is linked below.";
    confidence = name ? 'medium' : 'low';
  }
  if (unreachable && confidence === 'high') confidence = 'medium';

  const facts: Fact[] = [];
  const line = res?.source?.failingLine;
  const sites = res?.info.usageLines ?? [];
  const where =
    res?.info.definedIn && res.info.definedIn !== tx.contract_call.contract_id
      ? [' — defined in ', ref.contract(res.info.definedIn)]
      : [];

  if (foldMask && name) {
    facts.push({
      parts: [
        fn,
        ' on ',
        contract,
        batch
          ? ` processed the ${formatInt(batch.count)} items in “${batch.name}” one after another; one of them failed.`
          : ' processed its items one after another; one of them failed.',
      ],
    });
    facts.push({
      parts: [
        'The helper ',
        ref.fn(foldMask.helper),
        ` (line ${foldMask.line}) unwraps the running result with `,
        ref.constant(name),
        ', so the failing item’s own error was replaced by ',
        ref.value(`(err ${code})`),
        '. Which item failed, and why, is not recorded on chain.',
      ],
      link: sourceLink(res, tx.contract_call.contract_id, foldMask.line),
    });
  } else {
    facts.push({
      parts: [fn, ' on ', contract, ' ran and stopped at a check that failed.'],
    });
    if (ambiguous?.length) {
      facts.push({
        parts: ['It returned ', ref.value(`(err ${code})`), ' — one of:'],
        chips: ambiguous.map(ref.constant),
      });
    } else if (name) {
      facts.push({
        parts: [
          line ? `The check at line ${line} returned ` : 'It returned ',
          ref.value(`(err ${code})`),
          ' — ',
          ref.constant(name),
          ...where,
          unreachable
            ? ` — defined at line ${res?.info.definitionLine}, but not thrown in any code this call reaches directly, so this attribution is likely rather than certain.`
            : '.',
        ],
        link: sourceLink(res, tx.contract_call.contract_id),
      });
      if (sites.length > 1) {
        facts.push({
          parts: [
            `“${name}” is raised at ${sites.length} places in the code this call reaches (lines ${sites.join(', ')}); the network doesn't record which one fired.`,
          ],
        });
      }
      if (res?.info.siteBeforeOtherChecks) {
        facts.push({
          parts: [
            "This check runs before the function's other checks, so those were never evaluated.",
          ],
        });
      }
    } else if (native && native.nativeTentative) {
      facts.push({
        parts: [
          'The built-in ',
          ref.fn(native.nativeFunction!),
          ' returns ',
          ref.value(`(err ${code})`),
          ` when ${native.nativeMeaning}. It is one of the steps in this call that can produce this code, and the network doesn't record which step failed.`,
        ],
      });
    } else if (native) {
      facts.push({
        parts: [
          'The built-in ',
          ref.fn(native.nativeFunction!),
          ' returned ',
          ref.value(`(err ${code})`),
          `: ${native.nativeMeaning}.`,
        ],
      });
    } else {
      facts.push({
        parts: [
          'It returned ',
          ref.value(`(err ${code})`),
          ' — a code the contract does not name.',
        ],
      });
    }
  }
  if (res?.info.comments?.length) {
    // Third-party text from the contract source: attributed, never presented as a conclusion.
    facts.push({
      parts: [
        `Comment next to this constant in the contract source (on-chain text, unverified): “${res.info.comments.join(' ')}”`,
      ],
      onChain: true,
    });
  }
  if (masked) {
    facts.push({
      parts: [
        `Because the call failed, none of the expected transfers happened, so the post-condition “${masked.pcSummary}” failed too.`,
      ],
    });
  }

  const evidence: Evidence[] = [{ id: 'tx_result', label: 'tx_result', value: cls.resultRepr }];
  if (name)
    evidence.push({ id: 'constant', label: name, value: line ? `${name} · line ${line}` : name });
  if (foldMask)
    evidence.push({ id: 'masked', label: 'masked', value: `masked by ${foldMask.helper}` });
  if (ambiguous?.length)
    evidence.push({
      id: 'ambiguous',
      label: 'candidates',
      value: `${ambiguous.length} candidate constants`,
    });
  if (tag) evidence.push({ id: 'tag', label: 'tag', value: tag });
  if (native)
    evidence.push({
      id: 'native',
      label: native.nativeFunction!,
      value: native.nativeTentative
        ? `${native.nativeFunction} · one candidate`
        : native.nativeMeaning!,
    });
  if (batch)
    evidence.push({
      id: 'batch',
      label: 'batch',
      value: `${formatInt(batch.count)} items in ${batch.name}`,
    });
  const pcEvidence = postConditionEvidence(tx, false);
  if (pcEvidence) evidence.push(pcEvidence);

  return {
    headline,
    senderAction,
    invariant: invariantFor(tx),
    whatHappened: facts,
    developerNote: withAllowModeNote(tx, developer),
    evidence,
    confidence,
  };
}

const RUNTIME_COPY: Record<string, { headline: string; likely?: string }> = {
  ArithmeticUnderflow: {
    headline:
      "A calculation inside the contract went below zero, which Clarity doesn't allow, so the call was cancelled.",
    likely:
      'In swap and liquidity contracts this usually means the state changed after the app quoted you — refresh the app and retry; if it repeats, use a smaller amount.',
  },
  ArithmeticOverflow: {
    headline:
      'A calculation exceeded the largest number Clarity allows, so the call was cancelled.',
    likely: 'Usually an amount or multiplier that is too large — check the values the app used.',
  },
  DivisionByZero: {
    headline: 'The contract tried to divide by zero, so the call was cancelled.',
    likely: 'Often an empty pool or a zero balance — retry later or with different parameters.',
  },
  UnwrapFailure: {
    headline: "The contract expected a value that wasn't there, so the call was cancelled.",
    likely:
      'A missing entry or a failed inner call — usually an app bug or stale state; reload the app and retry.',
  },
  SupplyOverflow: {
    headline: "Minting would push the token's supply past its cap, so the call was cancelled.",
  },
  SupplyUnderflow: {
    headline: "Burning would take the token's supply below zero, so the call was cancelled.",
  },
  PoxAlreadyLocked: {
    headline: 'Your STX are already locked for stacking, so this call was rejected.',
    likely: 'Nothing to do — the existing lock stays in place.',
  },
  DefunctPoxContract: {
    headline: 'This stacking contract is no longer active.',
    likely: 'Use the current PoX contract through an up-to-date app.',
  },
  NoSuchToken: {
    headline: "The contract referred to a token that doesn't exist, so the call was cancelled.",
  },
  BadBlockHeight: {
    headline:
      'The contract looked up a block height that is out of range, so the call was cancelled.',
  },
  MaxStackDepthReached: {
    headline: 'The contract recursed too deeply, so the call was cancelled.',
  },
};

export function buildRuntimePanic(
  tx: FailedContractCallTx,
  cls: Classification,
  rt: RuntimeFinding
): Built {
  const { fn, contract } = callFacts(tx);
  const copy = RUNTIME_COPY[rt.variant] ?? {
    headline: `The contract hit an internal error (${rt.variant}), so the call was cancelled.`,
  };
  const n = rt.calleeCandidates.length;
  const confidence: Confidence =
    rt.candidateLines.length === 1 && n === 0 ? 'medium' : n > 4 ? 'low' : 'medium';

  const facts: Fact[] = [
    {
      parts: [
        fn,
        ' on ',
        contract,
        n ? ` ran and called ${n} other contract${n > 1 ? 's' : ''}.` : ' ran.',
      ],
    },
  ];
  const detail = rt.detail ? ` (${rt.detail})` : '';
  if (n) {
    facts.push({
      parts: [
        `The failure was a ${rt.variant}${detail}. Clarity stops the whole transaction on the first one. It happened in this contract or one of the ${n} it called:`,
      ],
      chips: rt.calleeCandidates.map(ref.contract),
    });
  } else if (rt.candidateLines.length === 1) {
    facts.push({
      parts: [
        `The failure was a ${rt.variant}${detail}, at line ${rt.candidateLines[0]} of `,
        contract,
        '.',
      ],
      link: {
        label: `Line ${rt.candidateLines[0]} in Source code`,
        href: `?tab=sourceCode&line=${rt.candidateLines[0]}`,
      },
    });
  } else {
    facts.push({ parts: [`The failure was a ${rt.variant}${detail}.`] });
  }
  const named = rt.argumentPrincipals?.length ?? 0;
  if (named) {
    facts.push({
      parts: [
        `The arguments also name ${named} other contract${named > 1 ? 's' : ''} that may have been reached:`,
      ],
      chips: rt.argumentPrincipals!.map(ref.contract),
    });
  }
  facts.push({
    parts: [
      "The network doesn't keep a trace for failed calls, so the exact expression can't be pinpointed from here.",
    ],
  });

  const evidence: Evidence[] = [
    { id: 'tx_result', label: 'tx_result', value: cls.resultRepr },
    { id: 'vm_error', label: 'vm_error', value: rt.variant },
  ];
  if (n)
    evidence.push({
      id: 'callees',
      label: 'contracts called',
      value: `${n} contract${n > 1 ? 's' : ''} called`,
    });
  const pcEvidence = postConditionEvidence(tx, false);
  if (pcEvidence) evidence.push(pcEvidence);

  return {
    headline: copy.headline,
    senderAction: copy.likely ?? 'Retry; if it repeats, contact the app with this transaction id.',
    invariant: invariantFor(tx),
    whatHappened: facts,
    developerNote: withAllowModeNote(
      tx,
      `Reproduce in Clarinet simnet with mainnet data at block ${formatInt(tx.block_height - 1)} to get the stack trace.`
    ),
    evidence,
    confidence,
  };
}

export function buildAnalysisError(tx: FailedContractCallTx, cls: Classification): Built {
  const { fn, contract } = callFacts(tx);
  const message = cls.vmError?.kind === 'analysis' ? cls.vmError.message : cls.subkind;
  const noSuchContract = /NoSuchContract/i.test(message);
  const badFn = /BadFunctionName|NoSuchPublicFunction|UndefinedFunction/i.test(message);
  const trait = /Trait/i.test(message);
  const headline = noSuchContract
    ? "The app called a contract that doesn't exist on this network."
    : badFn
      ? "The app called a function that doesn't exist on this contract."
      : trait
        ? "A contract passed to this call doesn't implement the interface the function requires."
        : 'The call failed a type check at runtime, so it was cancelled.';
  return {
    headline,
    senderAction:
      'Nothing you can fix — this is an app bug (wrong contract id or version). Report it to the app.',
    invariant: invariantFor(tx),
    whatHappened: [
      {
        parts: [
          fn,
          ' on ',
          contract,
          ' could not run: ',
          ref.value(message.length > 120 ? `${message.slice(0, 117)}…` : message),
        ],
      },
    ],
    developerNote: [
      'Check the contract id / version the app targets on this network and the trait implementations it passes.',
    ],
    evidence: [
      { id: 'tx_result', label: 'tx_result', value: cls.resultRepr },
      { id: 'vm_error', label: 'vm_error', value: message },
    ],
    confidence: 'high',
  };
}

export function buildPostCondition(tx: FailedContractCallTx, cls: Classification): Built {
  const { fn, contract } = callFacts(tx);
  const pc = cls.postCondition!;
  const sender = tx.sender_address;
  const assetLabel = pc.asset ? assetName(pc.asset) : 'the asset';
  const okRepr = cls.resultRepr;
  const pcLink =
    pc.index !== undefined
      ? {
          label: `Post-condition #${pc.index + 1}`,
          href: `?tab=postConditions&highlight=${pc.index}`,
        }
      : { label: 'Post-conditions', href: '?tab=postConditions' };
  const evidence: Evidence[] = [
    { id: 'tx_result', label: 'tx_result', value: okRepr },
    { id: 'mode', label: 'mode', value: `mode ${tx.post_condition_mode}` },
  ];

  switch (pc.problem) {
    case 'principal_mismatch': {
      const others = pc.principals ?? (pc.principal ? [pc.principal] : []);
      evidence.push({
        id: 'pc',
        label: 'post-condition',
        value:
          pc.index !== undefined
            ? `pc[${pc.index}].principal ≠ sender`
            : `${others.length} post-conditions name other principals`,
      });
      const allowFact: Fact =
        others.length === 1
          ? {
              parts: [
                'The post-condition allows that movement only from ',
                ref.address(others[0]),
                ' — not the sender. In deny mode, any movement that is not covered fails the transaction.',
              ],
              link: pcLink,
            }
          : {
              parts: [
                `The ${others.length} post-conditions on ${assetLabel} allow that movement only from other accounts — not the sender. In deny mode, any movement that is not covered fails the transaction.`,
              ],
              chips: others.map(ref.address),
              link: pcLink,
            };
      return {
        headline: `The post-condition names a different account than the one that signed, so the ${assetLabel} transfer was rolled back.`,
        senderAction:
          "Make sure the app's connected account matches the one you sign with, then reconnect the wallet and retry.",
        invariant: invariantFor(tx, pc.asset),
        whatHappened: [
          {
            parts: [
              fn,
              ' on ',
              contract,
              ` moved ${assetLabel} from `,
              ref.address(sender),
              ' and returned ',
              ref.value(okRepr),
              '.',
            ],
          },
          allowFact,
        ],
        developerNote: [
          'Build post-conditions with ',
          ref.constant('Pc.origin()'),
          ', or the address that will sign at submit time — never a cached one.',
        ],
        evidence,
        confidence: 'high',
      };
    }
    case 'asset_unchecked': {
      evidence.push({
        id: 'pc',
        label: 'post-condition',
        value: `no post-condition covers ${assetLabel}`,
      });
      const mover =
        pc.movedBy === sender
          ? 'your account'
          : pc.movedBy
            ? `${truncateMiddle(pc.movedBy)}`
            : 'an account';
      return {
        headline: `The app didn't declare that ${assetLabel} would move, so the wallet's safety check rejected the transaction.`,
        senderAction:
          'Retry from an updated version of the app; there is nothing else you can change.',
        invariant: invariantFor(tx, pc.asset),
        whatHappened: [
          {
            parts: [
              fn,
              ' on ',
              contract,
              ` moved ${assetLabel} from ${mover} and returned `,
              ref.value(okRepr),
              '.',
            ],
          },
          {
            parts: [
              `None of the ${tx.post_conditions.length} post-condition${tx.post_conditions.length === 1 ? '' : 's'} covers ${assetLabel}. In deny mode, any movement that is not covered fails the transaction.`,
            ],
            link: pcLink,
          },
        ],
        developerNote: [
          'Add a post-condition covering ',
          ref.asset(pc.asset ?? assetLabel),
          pc.movedBy ? [' for ', ref.address(pc.movedBy)] : '',
          '.',
        ].flat(),
        evidence,
        confidence: 'high',
      };
    }
    case 'amount_not_met': {
      const cond = pc.conditionCode ? describeConditionCode(pc.conditionCode as never) : '';
      evidence.push({
        id: 'pc',
        label: 'post-condition',
        value: `expected ${cond} ${pc.expected}, actual ${pc.actual}`,
      });
      return {
        headline: `The app said ${cond} ${formatInt(pc.expected!)} ${assetLabel} would leave ${pc.principal === sender ? 'your account' : truncateMiddle(pc.principal ?? '')}, but ${formatInt(pc.actual!)} would have — the safety check stopped it.`,
        senderAction: 'Retry; if it repeats, the app is quoting the amount wrong.',
        invariant: invariantFor(tx, pc.asset),
        whatHappened: [
          {
            parts: [
              fn,
              ' on ',
              contract,
              ' returned ',
              ref.value(okRepr),
              `, moving ${formatInt(pc.actual!)} ${assetLabel} from `,
              ref.address(pc.principal ?? sender),
              '.',
            ],
          },
          {
            parts: [`The post-condition required ${cond} ${formatInt(pc.expected!)}.`],
            link: pcLink,
          },
        ],
        developerNote: [
          'Set the condition with headroom (for example ',
          ref.constant('willSendLte'),
          ') and check token decimals and fees on transfer.',
        ],
        evidence,
        confidence: 'high',
      };
    }
    case 'nft':
      evidence.push({ id: 'pc', label: 'post-condition', value: 'NFT movement not covered' });
      return {
        headline:
          "The post-condition didn't cover the NFT that moved, so the transaction was rolled back.",
        senderAction: 'Retry from an updated version of the app.',
        invariant: invariantFor(tx, pc.asset),
        whatHappened: [
          {
            parts: [
              fn,
              ' on ',
              contract,
              ' returned ',
              ref.value(okRepr),
              `, moving an NFT (${assetLabel}).`,
            ],
          },
          {
            parts: ['The post-conditions did not cover that NFT (or named a different asset id).'],
            link: pcLink,
          },
        ],
        developerNote: ['Check the NFT asset id and value in the post-condition.'],
        evidence,
        confidence: 'high',
      };
    case 'stacking': {
      // SIP-040 stacking / PoX-action conditions.
      const who = pc.principal === sender ? 'your account' : truncateMiddle(pc.principal ?? '');
      evidence.push({
        id: 'pc',
        label: 'post-condition',
        value: pc.conditionCode
          ? `stacking condition ${pc.conditionCode}`
          : 'stacking action not covered',
      });
      const detail =
        pc.expected !== undefined && pc.actual !== undefined
          ? `The condition required ${describeConditionCode(pc.conditionCode ?? '')} ${formatInt(pc.expected)} STX to be stacked by ${who}; ${formatInt(pc.actual)} would have been.`
          : pc.conditionCode
            ? `The condition on the PoX action by ${who} (${pc.conditionCode}) did not hold${pc.actual ? ` (performed=${pc.actual})` : ''}.`
            : pc.actual
              ? `${who} would have stacked ${formatInt(pc.actual)} STX, and no post-condition covers stacking.`
              : `${who} performed a PoX action that no post-condition covers.`;
      return {
        headline:
          "A stacking post-condition set by the app didn't hold, so the transaction was rolled back.",
        senderAction:
          'Retry from an updated version of the app; the stacking amount or action it declared did not match what the contract did.',
        invariant: invariantFor(tx),
        whatHappened: [
          { parts: [fn, ' on ', contract, ' returned ', ref.value(okRepr), '.'] },
          { parts: [detail], link: pcLink },
        ],
        developerNote: [
          'Check the SIP-040 stacking post-condition the app attaches (amount condition or PoX action) against what the contract actually does.',
        ],
        evidence,
        confidence: 'high',
      };
    }
    default:
      return {
        headline:
          "The contract succeeded, but a post-condition set by the app didn't hold, so the transaction was rolled back.",
        senderAction: 'Retry; if it repeats, contact the app.',
        invariant: invariantFor(tx),
        whatHappened: [
          { parts: [fn, ' on ', contract, ' returned ', ref.value(okRepr), '.'] },
          {
            parts: [
              tx.vm_error
                ? `The network reported: ${tx.vm_error}`
                : 'The post-condition check failed.',
            ],
            link: pcLink,
          },
        ],
        evidence,
        confidence: 'medium',
      };
  }
}

/** A `vm_error` the parser does not recognise (or none at all): report, never guess. */
export function buildUnknownVmError(tx: FailedContractCallTx, cls: Classification): Built {
  const { fn, contract } = callFacts(tx);
  const message = tx.vm_error ?? null;
  const facts: Fact[] = [{ parts: [fn, ' on ', contract, ' was cancelled by the network.'] }];
  facts.push(
    message
      ? {
          parts: [
            'The network reported: ',
            ref.value(message.length > 160 ? `${message.slice(0, 157)}…` : message),
          ],
        }
      : { parts: ['The network recorded no error text for this call.'] }
  );
  const evidence: Evidence[] = [{ id: 'tx_result', label: 'tx_result', value: cls.resultRepr }];
  if (message) evidence.push({ id: 'vm_error', label: 'vm_error', value: message });
  return {
    headline: message
      ? "The network reported an error this explorer doesn't recognise, so the call was cancelled."
      : 'The call was cancelled, and the network recorded no error text.',
    senderAction: 'Retry once; if it fails the same way, contact the app with this transaction id.',
    invariant: invariantFor(tx),
    whatHappened: facts,
    developerNote: [
      `Reproduce in Clarinet simnet with mainnet data at block ${formatInt(tx.block_height - 1)}; the raw vm_error is below.`,
    ],
    evidence,
    confidence: 'low',
  };
}

/** Summary of a post-condition for the masked-error note, e.g. `pool sends at least 960,464 sbtc-token`. */
export function summarizePostCondition(cls: Classification): string {
  const pc = cls.postCondition;
  const v = cls.vmError;
  if (v?.kind === 'pc_amount') {
    return `${truncateMiddle(v.principal)} sends ${describeConditionCode(v.code)} ${formatInt(v.expected)} ${assetName(v.asset)}`;
  }
  if (pc?.asset) return `${assetName(pc.asset)} post-condition`;
  return 'post-condition';
}

/** Facts appended after correlations resolve. */
export function correlationFacts(
  tx: FailedContractCallTx,
  related: Correlations,
  cls: Classification
): Fact[] {
  const facts: Fact[] = [];
  if (related.pcPrincipalTxCount && cls.postCondition?.principal) {
    facts.push({
      parts: [
        ref.address(cls.postCondition.principal),
        ` is an active account (${formatInt(related.pcPrincipalTxCount)} transactions). Check whether it is another account in your wallet.`,
      ],
    });
  }
  if (related.balanceAtParent) {
    facts.push({
      parts: [
        `At the time, your ${assetName(related.balanceAtParent.asset)} balance was ${formatStx(related.balanceAtParent.balance)}.`,
      ],
    });
  }
  if (related.retriedSuccessfullyIn) {
    const later = ref.tx(related.retriedSuccessfullyIn);
    if (related.retryUsedSameArgs === true) {
      facts.push({
        parts: [
          'You retried with the same inputs and it succeeded in ',
          later,
          ' — the failure was temporary.',
        ],
      });
    } else if (related.retryUsedSameArgs === false) {
      facts.push({
        parts: [
          'A later call to the same function with different inputs succeeded in ',
          later,
          '. That is not a retry of this call — the failure was specific to these inputs.',
        ],
      });
    } else {
      facts.push({
        parts: ['A later call to the same function from your account succeeded in ', later, '.'],
      });
    }
  }
  return facts;
}

export { hedge };
