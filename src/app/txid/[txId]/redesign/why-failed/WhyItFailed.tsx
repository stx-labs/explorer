'use client';

import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { ExplorerLink } from '@/common/components/ExplorerLinks';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import {
  Diagnosis,
  FailedContractCallTx,
  copyPromptFor,
  resolvePostConditionPrincipal,
} from '@/common/tx-diagnosis';
import { contractName } from '@/common/tx-diagnosis/clarity-source';
import { assetName, formatInt, truncateMiddle } from '@/common/tx-diagnosis/templates';
import { Button } from '@/ui/Button';
import { Link } from '@/ui/Link';
import { Text } from '@/ui/Text';
import { Box, Flex, Grid, Icon, Stack, useClipboard } from '@chakra-ui/react';
import {
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Check,
  CopySimple,
  XCircle,
} from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';
import { Fragment, useState } from 'react';

import { getPostConditionCellText } from '../post-conditions/post-condition-table-utils';
import { DetailChip, RichText } from './DetailChip';
import { useTxDiagnosis } from './useTxDiagnosis';

// ---------------------------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------------------------

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      textStyle="text-medium-xs"
      color="textSecondary"
      textTransform="uppercase"
      letterSpacing="wider"
    >
      {children}
    </Text>
  );
}

/**
 * Link to a detail: a same-page `?tab=…&line=…` link merged into the current query string, or an
 * absolute explorer path (another contract's source) that keeps the network parameters.
 */
function TabLink({ label, href }: { label: string; href: string }) {
  const sp = useSearchParams();
  const isAbsolute = href.startsWith('/');
  const merged = new URLSearchParams(sp.toString());
  if (!isAbsolute) {
    new URLSearchParams(href.replace(/^\?/, '')).forEach((v, k) => merged.set(k, v));
  }
  const content = (
    <>
      {label}
      <Icon h={3} w={3}>
        <ArrowSquareOut />
      </Icon>
    </>
  );
  const styleProps = {
    variant: 'tableLink' as const,
    textStyle: 'text-regular-xs',
    whiteSpace: 'nowrap' as const,
    display: 'inline-flex' as const,
    alignItems: 'center',
    gap: 1,
  };
  return isAbsolute ? (
    <ExplorerLink href={href} {...styleProps}>
      {content}
    </ExplorerLink>
  ) : (
    <Link href={`?${merged.toString()}`} {...styleProps}>
      {content}
    </Link>
  );
}

function CopyPromptButton({ contextUrl }: { contextUrl: string }) {
  const { copied, copy } = useClipboard({ value: copyPromptFor(contextUrl), timeout: 1500 });
  return (
    <Button
      variant="redesignTertiary"
      size="small"
      onClick={() => copy()}
      aria-label="Copy prompt with link"
      data-test="why-failed-copy-prompt"
    >
      <Flex gap={1.5} alignItems="center">
        <Icon h={3.5} w={3.5}>
          {copied ? <Check weight="bold" /> : <CopySimple weight="bold" />}
        </Icon>
        <Text textStyle="text-medium-xs">{copied ? 'Copied' : 'Copy prompt'}</Text>
      </Flex>
    </Button>
  );
}

function SourceExcerpt({
  source,
  calledContractId,
}: {
  source: NonNullable<Diagnosis['source']>;
  calledContractId: string;
}) {
  const code = source.lines.map(l => l.code).join('\n');
  const line = source.failingLine;
  // The Source tab only shows the called contract; a callee's line opens that contract's page.
  const lineQuery = `tab=sourceCode${line ? `&line=${line}` : ''}`;
  const openHref =
    source.contractId === calledContractId
      ? `?${lineQuery}`
      : `/txid/${source.contractId}?${lineQuery}`;
  return (
    <Stack gap={2}>
      <Flex gap={2} alignItems="center" flexWrap="wrap" justifyContent="space-between">
        <Flex gap={1} alignItems="center" flexWrap="wrap">
          <SectionLabel>{line ? 'Failing check' : 'Entry point'}</SectionLabel>
          <DetailChip
            detail={{
              kind: 'contract',
              label: contractName(source.contractId),
              value: source.contractId,
              href: `/txid/${source.contractId}`,
            }}
          />
          {source.functionName && (
            <>
              <Text textStyle="text-regular-xs" color="textTertiary">
                ·
              </Text>
              <DetailChip
                detail={{
                  kind: 'function',
                  label: source.functionName,
                  value: source.functionName,
                }}
              />
            </>
          )}
          {line && (
            <Text textStyle="text-regular-xs" color="textSecondary">
              line {line}
            </Text>
          )}
        </Flex>
        <TabLink label="Open in Source code" href={openHref} />
      </Flex>
      <Flex alignItems="flex-start" gap={2} w="full" minW={0}>
        <Box
          as="pre"
          flex={1}
          minW={0}
          m={0}
          bg="surfaceHighlight"
          borderRadius="md"
          py={2}
          overflowX="auto"
          textStyle="text-mono-xs"
          data-test="why-failed-source"
        >
          {source.lines.map(l => {
            const failing = l.n === line;
            return (
              <Flex
                key={l.n}
                gap={3}
                px={3}
                py={0.5}
                bg={
                  failing
                    ? { base: 'feedback.red-150', _dark: 'transactionStatus.failed' }
                    : undefined
                }
                borderLeft="3px solid"
                borderColor={failing ? 'error' : 'transparent'}
              >
                <Text
                  as="span"
                  display="inline"
                  textStyle="text-mono-xs"
                  color="textTertiary"
                  minW={8}
                  textAlign="right"
                  userSelect="none"
                >
                  {l.n}
                </Text>
                <Text
                  as="span"
                  display="inline"
                  textStyle="text-mono-xs"
                  color="textPrimary"
                  whiteSpace="pre"
                >
                  {l.code}
                </Text>
              </Flex>
            );
          })}
        </Box>
        <RowCopyButton value={code} ariaLabel="Copy excerpt" />
      </Flex>
      {source.note && (
        <Text textStyle="text-regular-xs" color="textSecondary">
          {source.note}
        </Text>
      )}
    </Stack>
  );
}

function PostConditionRow({
  tx,
  finding,
}: {
  tx: FailedContractCallTx;
  finding: NonNullable<Diagnosis['postCondition']>;
}) {
  if (finding.index === undefined) return null;
  const pc = tx.post_conditions[finding.index];
  if (!pc) return null;
  const principal = resolvePostConditionPrincipal(pc.principal, tx.sender_address);
  const amount = pc.type === 'non_fungible' ? pc.asset_value.repr : formatInt(pc.amount);
  const asset = pc.type === 'stx' ? 'STX' : pc.asset.asset_name;
  const problemText: Record<string, string> = {
    principal_mismatch: 'Principal does not match the signer',
    amount_not_met: `Actual ${finding.actual ? formatInt(finding.actual) : ''} did not satisfy the condition`,
    asset_unchecked: 'No condition covers the asset that moved',
    nft: 'NFT not covered',
    unknown: '',
  };
  return (
    <Stack gap={2}>
      <Flex gap={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <SectionLabel>{`Post-condition #${finding.index + 1}`}</SectionLabel>
        <TabLink
          label="Open Post-conditions"
          href={`?tab=postConditions&highlight=${finding.index}`}
        />
      </Flex>
      <Grid
        templateColumns={{ base: '1fr', md: 'auto 1fr' }}
        gap={2}
        columnGap={4}
        alignItems="center"
        bg="surfaceHighlight"
        borderRadius="md"
        p={3}
        data-test="why-failed-post-condition"
      >
        <Text textStyle="text-regular-xs" color="textSecondary">
          By
        </Text>
        <Flex gap={2} alignItems="center" flexWrap="wrap">
          <DetailChip
            detail={{
              kind: principal.includes('.') ? 'contract' : 'address',
              label: truncateMiddle(principal),
              value: principal,
              href: principal.includes('.') ? `/txid/${principal}` : `/address/${principal}`,
            }}
            emphasis={finding.problem === 'principal_mismatch' ? 'error' : undefined}
          />
          {problemText[finding.problem] && (
            <Text textStyle="text-regular-xs" color="error">
              {problemText[finding.problem]}
            </Text>
          )}
        </Flex>
        <Text textStyle="text-regular-xs" color="textSecondary">
          Condition
        </Text>
        <Text textStyle="text-regular-sm" color="textPrimary">
          {getPostConditionCellText(pc.condition_code, pc.type)}
        </Text>
        <Text textStyle="text-regular-xs" color="textSecondary">
          Amount
        </Text>
        <Flex gap={1.5} alignItems="baseline">
          <Text textStyle="text-mono-sm" color="textPrimary">
            {amount}
          </Text>
          <Text textStyle="text-regular-xs" color="textSecondary">
            {asset}
          </Text>
        </Flex>
        <Text textStyle="text-regular-xs" color="textSecondary">
          Signer
        </Text>
        <Flex>
          <DetailChip
            detail={{
              kind: 'address',
              label: truncateMiddle(tx.sender_address),
              value: tx.sender_address,
              href: `/address/${tx.sender_address}`,
            }}
          />
        </Flex>
      </Grid>
    </Stack>
  );
}

function ArgsList({ args }: { args: Diagnosis['args'] }) {
  if (!args.length) return null;
  return (
    <Stack gap={2}>
      <SectionLabel>Arguments</SectionLabel>
      <Grid
        templateColumns={{ base: '1fr', md: 'auto 1fr auto' }}
        gap={1.5}
        columnGap={4}
        alignItems="center"
        bg="surfaceHighlight"
        borderRadius="md"
        p={3}
      >
        {args.map(a => {
          const label = a.value.length > 96 ? `${a.value.slice(0, 93)}…` : a.value;
          return (
            <Fragment key={a.name}>
              <Text textStyle="text-mono-xs" color="textSecondary">
                {a.name}
              </Text>
              <Flex minW={0}>
                <DetailChip detail={{ kind: 'value', label, value: a.value }} />
              </Flex>
              <Text textStyle="text-regular-xs" color="textTertiary" hideBelow="md">
                {a.type}
              </Text>
            </Fragment>
          );
        })}
      </Grid>
    </Stack>
  );
}

function RawRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex gap={3} alignItems="flex-start">
      <Text textStyle="text-mono-xs" color="textTertiary" minW={20} pt={0.5}>
        {label}
      </Text>
      <Box
        as="pre"
        flex={1}
        minW={0}
        m={0}
        textStyle="text-mono-xs"
        color="textSecondary"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
      >
        {value}
      </Box>
      <RowCopyButton value={value} ariaLabel={`Copy ${label}`} />
    </Flex>
  );
}

function useContextPackUrl(txId: string): string {
  const network = useGlobalContext().activeNetwork;
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_DEPLOYMENT_URL || 'https://explorer.hiro.so';
  const params = new URLSearchParams();
  if (network.mode) params.set('chain', network.mode);
  if (network.isCustomNetwork && network.url) params.set('api', network.url);
  const qs = params.toString();
  return `${origin}/txid/${txId}/context.md${qs ? `?${qs}` : ''}`;
}

// ---------------------------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------------------------

export function WhyItFailed({ tx }: { tx: FailedContractCallTx }) {
  const [expanded, setExpanded] = useState(false);
  const { diagnosis, isEnriching } = useTxDiagnosis(tx, { expanded });
  const contextUrl = useContextPackUrl(tx.tx_id);
  const d = diagnosis;

  return (
    <Stack
      gap={0}
      borderRadius="redesign.xl"
      border="1px solid"
      borderColor="redesignBorderSecondary"
      overflow="hidden"
      role="region"
      aria-label="Why this transaction failed"
      data-test="why-failed"
      data-diagnosis-class={d.class}
    >
      {/* Tier 0 — synchronous, above the fold */}
      <Flex
        gap={3}
        px={5}
        py={4}
        bg={{ base: 'feedback.red-150', _dark: 'transactionStatus.failed' }}
        alignItems="flex-start"
      >
        <Icon h={4} w={4} color="iconError" mt={1} flexShrink={0}>
          <XCircle weight="bold" />
        </Icon>
        <Stack gap={2} flex={1}>
          <Text textStyle="text-medium-md" color="textPrimary" data-test="why-failed-headline">
            {d.headline}
          </Text>
          <Text textStyle="text-regular-sm" color="textPrimary" data-test="why-failed-action">
            {d.senderAction}
          </Text>
          <Flex gap={4} alignItems="center" flexWrap="wrap" justifyContent="space-between">
            <Text textStyle="text-regular-xs" color="textSecondary">
              {d.invariant}
            </Text>
            <Button
              variant="buttonLink"
              size="small"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              _expanded={{ bg: 'transparent', color: 'textPrimary' }}
              data-test="why-failed-toggle"
            >
              <Flex gap={1} alignItems="center">
                <Text textStyle="text-medium-xs">{expanded ? 'Hide details' : 'See details'}</Text>
                <Icon h={3} w={3}>
                  {expanded ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
                </Icon>
              </Flex>
            </Button>
          </Flex>
        </Stack>
      </Flex>

      {expanded && (
        <>
          {/* Tier 1 — short, linked, plus the agent hand-off */}
          <Stack gap={5} px={5} py={5} bg="surfaceSecondary" data-test="why-failed-details">
            <Stack gap={2}>
              <SectionLabel>What happened</SectionLabel>
              <Stack as="ol" gap={2} pl={0} listStyleType="none">
                {d.whatHappened.map((fact, i) => (
                  <Flex as="li" key={i} gap={3} alignItems="flex-start">
                    <Text textStyle="text-mono-xs" color="textTertiary" minW={4} pt={1}>
                      {i + 1}
                    </Text>
                    <Stack gap={1} flex={1} minW={0}>
                      <RichText
                        parts={fact.parts}
                        color={fact.onChain ? 'textSecondary' : 'textPrimary'}
                      />
                      {fact.chips && (
                        <Flex gap={1} flexWrap="wrap">
                          {fact.chips.map(c => (
                            <DetailChip key={c.value} detail={c} />
                          ))}
                        </Flex>
                      )}
                      {fact.link && <TabLink label={fact.link.label} href={fact.link.href} />}
                    </Stack>
                  </Flex>
                ))}
              </Stack>
              {isEnriching && (
                <Text textStyle="text-regular-xs" color="textTertiary">
                  Checking related activity…
                </Text>
              )}
            </Stack>

            {d.developerNote && (
              <Stack gap={1}>
                <SectionLabel>For developers</SectionLabel>
                <RichText parts={d.developerNote} />
              </Stack>
            )}

            <Stack gap={1.5} data-test="why-failed-agent">
              <Flex gap={3} alignItems="center" flexWrap="wrap">
                <Text textStyle="text-regular-sm" color="textPrimary">
                  Give your agent context to explore more:
                </Text>
                <CopyPromptButton contextUrl={contextUrl} />
              </Flex>
              <Link
                href={contextUrl}
                variant="underline"
                textStyle="text-mono-xs"
                color="textPrimary"
                wordBreak="break-all"
                target="_blank"
                rel="noreferrer"
                data-test="why-failed-context-link"
              >
                {contextUrl.replace(/^https?:\/\//, '')}
              </Link>
            </Stack>
          </Stack>

          {/* Tier 2 — rendered details + raw */}
          <Stack
            gap={5}
            px={5}
            py={5}
            bg="surfaceTertiary"
            borderTop="1px solid"
            borderColor="redesignBorderSecondary"
          >
            {d.postCondition && <PostConditionRow tx={tx} finding={d.postCondition} />}
            {d.source && (
              <SourceExcerpt source={d.source} calledContractId={tx.contract_call.contract_id} />
            )}
            <ArgsList args={d.args} />

            <Stack gap={1.5}>
              <SectionLabel>Raw</SectionLabel>
              <RawRow label="vm_error" value={d.raw.vmError ?? 'null'} />
              <RawRow
                label="tx_result"
                value={d.raw.txResult ? `${d.raw.txResult.hex}  →  ${d.raw.txResult.repr}` : 'n/a'}
              />
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
}

export { assetName };
