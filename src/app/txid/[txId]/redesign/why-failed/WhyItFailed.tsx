'use client';

import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { ExplorerLink } from '@/common/components/ExplorerLinks';
import { ScrollIndicator } from '@/common/components/ScrollIndicator';
import { Table } from '@/common/components/table/Table';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import {
  Diagnosis,
  FailedContractCallTx,
  copyPromptFor,
  resolvePostConditionPrincipal,
} from '@/common/tx-diagnosis';
import { contractName } from '@/common/tx-diagnosis/clarity-source';
import { assetName, formatInt, truncateMiddle } from '@/common/tx-diagnosis/templates';
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from '@/components/ui/accordion';
import { SimpleTag } from '@/ui/Badge';
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
import { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { SummaryItem as StackedSummaryItem } from '../DetailsCard';
import {
  NameCellRenderer,
  TypeCellRenderer,
  ValueCellRenderer,
} from '../function-called/FunctionCalledTableCellRenderers';
import { getPostConditionCellText } from '../post-conditions/post-condition-table-utils';
import { DetailChip, RichText } from './DetailChip';
import { useTxDiagnosis } from './useTxDiagnosis';

const NARRATIVE_MAX_WIDTH = '80ch';

// ---------------------------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------------------------

/** The label style the rest of the transaction page uses for detail sections. */
function SectionLabel({ children }: { children: string }) {
  return (
    <Text textStyle="text-medium-sm" color="textSecondary">
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
      aria-label="Copy Prompt for Agent to Explore"
      data-test="why-failed-copy-prompt"
    >
      <Flex gap={1.5} alignItems="center">
        <Icon h={3.5} w={3.5}>
          {copied ? <Check weight="bold" /> : <CopySimple weight="bold" />}
        </Icon>
        <Text textStyle="text-medium-xs">
          {copied ? 'Copied' : 'Copy Prompt for Agent to Explore'}
        </Text>
      </Flex>
    </Button>
  );
}

// ---------------------------------------------------------------------------------------------
// Technical details (accordion rows)
// ---------------------------------------------------------------------------------------------

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
      <Flex gap={3} alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Text textStyle="text-regular-xs" color="textSecondary">
          {source.note ?? ''}
        </Text>
        <TabLink label="Open in Source code" href={openHref} />
      </Flex>
    </Stack>
  );
}

function PostConditionFields({
  tx,
  finding,
}: {
  tx: FailedContractCallTx;
  finding: NonNullable<Diagnosis['postCondition']> & { index: number };
}) {
  const pc = tx.post_conditions[finding.index];
  if (!pc) return null;
  const principal = resolvePostConditionPrincipal(pc.principal, tx.sender_address);
  const amount = pc.type === 'non_fungible' ? pc.asset_value.repr : formatInt(pc.amount);
  const asset = pc.type === 'stx' ? 'STX' : pc.asset.asset_name;
  const problemText: Record<string, string> = {
    principal_mismatch: 'Does not match the signer',
    amount_not_met: `Actual ${finding.actual ? formatInt(finding.actual) : ''} did not satisfy the condition`,
    asset_unchecked: 'No condition covers the asset that moved',
    nft: 'NFT not covered',
    stacking: 'Stacking condition did not hold',
    unknown: '',
  };
  return (
    <Stack gap={3}>
      <Grid
        templateColumns={{ base: '1fr', md: 'auto 1fr' }}
        gap={2}
        columnGap={4}
        alignItems="center"
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
      <Flex justifyContent="flex-end">
        <TabLink
          label="Open Post-conditions"
          href={`?tab=postConditions&highlight=${finding.index}`}
        />
      </Flex>
    </Stack>
  );
}

interface ArgRow {
  name: string;
  value: string;
  type: string;
}

/** The same Name / Value / Type columns the Function called tab renders. */
const ARG_COLUMNS: ColumnDef<ArgRow>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    cell: info => NameCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
  {
    id: 'value',
    header: 'Value',
    accessorKey: 'value',
    cell: info => ValueCellRenderer(info.getValue() as string),
    enableSorting: false,
    minSize: 150,
    maxSize: 150,
  },
  {
    id: 'type',
    header: 'Type',
    accessorKey: 'type',
    cell: info => TypeCellRenderer(info.getValue() as string),
    enableSorting: false,
  },
];

function ArgsTable({ args }: { args: Diagnosis['args'] }) {
  return (
    <Stack gap={3} data-test="why-failed-arguments">
      <Table
        columns={ARG_COLUMNS}
        data={args}
        scrollIndicatorWrapper={table => <ScrollIndicator>{table}</ScrollIndicator>}
      />
      <Flex justifyContent="flex-end">
        <TabLink label="Open Function called" href="?tab=functionCall" />
      </Flex>
    </Stack>
  );
}

function postConditionSummary(tx: FailedContractCallTx, d: Diagnosis): string {
  const n = tx.post_conditions?.length ?? 0;
  if (d.postCondition?.index !== undefined)
    return `#${d.postCondition.index + 1} of ${n} · ${d.postCondition.problem.replace(/_/g, ' ')}`;
  if (d.postCondition?.candidates?.length)
    return `one of #${d.postCondition.candidates.map(i => i + 1).join(', #')} · ${d.postCondition.problem.replace(/_/g, ' ')}`;
  if (n) return `${n} in ${tx.post_condition_mode} mode · not reached`;
  return `${tx.post_condition_mode} mode · none set`;
}

const VM_ERROR_PREVIEW = 120;

/** Raw values as the stacked label/value rows of the page's details card. */
function DetailRows({ tx, d }: { tx: FailedContractCallTx; d: Diagnosis }) {
  const ec = d.errorCode;
  const mono = (value: string) => (
    <Text textStyle="text-mono-xs" color="textPrimary" wordBreak="break-all">
      {value}
    </Text>
  );
  const vmError = d.raw.vmError;
  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} data-test="why-failed-raw">
      <StackedSummaryItem
        label="Result"
        value={d.raw.txResult?.repr ?? 'n/a'}
        valueRenderer={value => <SimpleTag label={<Text textStyle="text-mono-xs">{value}</Text>} />}
        showCopyButton={!!d.raw.txResult}
      />
      {ec?.name && (
        <StackedSummaryItem
          label="Error constant"
          value={ec.name}
          valueRenderer={mono}
          showCopyButton
        />
      )}
      {ec?.candidateNames?.length ? (
        <StackedSummaryItem
          label="Candidate constants"
          value={ec.candidateNames.join(', ')}
          valueRenderer={mono}
          showCopyButton
        />
      ) : null}
      {ec?.definedIn && (
        <StackedSummaryItem
          label="Defined in"
          value={ec.definedIn}
          valueRenderer={value => (
            <DetailChip
              detail={{
                kind: 'contract',
                label: `${contractName(value)}${ec.definitionLine ? ` · line ${ec.definitionLine}` : ''}`,
                value,
                href: `/txid/${value}`,
              }}
            />
          )}
        />
      )}
      {ec?.usageLines?.length ? (
        <StackedSummaryItem
          label={ec.usageLines.length > 1 ? 'Raised at lines' : 'Raised at line'}
          value={ec.usageLines.join(', ')}
          showCopyButton
        />
      ) : null}
      {ec?.nativeFunction && (
        <StackedSummaryItem
          label={(ec.nativeCandidates?.length ?? 0) > 1 ? 'Built-in candidates' : 'Built-in'}
          value={
            ec.nativeCandidates?.length
              ? ec.nativeCandidates
                  .map(c => (c.contractId ? `${c.fn} in ${contractName(c.contractId)}` : c.fn))
                  .join(', ')
              : ec.nativeFunction
          }
          valueRenderer={mono}
          showCopyButton
        />
      )}
      {d.runtime && (
        <StackedSummaryItem
          label="Runtime error"
          value={d.runtime.variant}
          valueRenderer={mono}
          showCopyButton
        />
      )}
      <StackedSummaryItem label="Post-conditions" value={postConditionSummary(tx, d)} />
      <StackedSummaryItem
        label="vm_error"
        value={vmError ?? 'null'}
        valueRenderer={value =>
          mono(value.length > VM_ERROR_PREVIEW ? `${value.slice(0, VM_ERROR_PREVIEW - 1)}…` : value)
        }
        showCopyButton={!!vmError}
      />
      {d.raw.txResult && (
        <StackedSummaryItem
          label="tx_result (hex)"
          value={d.raw.txResult.hex}
          valueRenderer={value => mono(truncateMiddle(value, 10, 6))}
          showCopyButton
        />
      )}
    </Grid>
  );
}

function RowHeader({ title, summary }: { title: string; summary?: string }) {
  return (
    <Flex justifyContent="space-between" alignItems="center" w="full" gap={3} py={1} minW={0}>
      <Text textStyle="text-medium-sm" color="textPrimary" whiteSpace="nowrap">
        {title}
      </Text>
      {summary && (
        <Text
          textStyle="text-mono-xs"
          color="textSecondary"
          textAlign="right"
          minW={0}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          title={summary}
        >
          {summary}
        </Text>
      )}
    </Flex>
  );
}

interface TechnicalRow {
  id: string;
  title: string;
  summary?: string;
  content: React.ReactNode;
}

function sourceSummary(source: NonNullable<Diagnosis['source']>, calledContractId: string) {
  const parts: string[] = [];
  if (source.contractId !== calledContractId) parts.push(contractName(source.contractId));
  if (source.functionName) parts.push(source.functionName);
  if (source.failingLine) parts.push(`line ${source.failingLine}`);
  return parts.join(' · ');
}

/**
 * Tier 2: the technical material as collapsible rows, each header carrying a one-line summary so
 * the closed state already tells the story. The row most likely to be wanted opens by default.
 */
function TechnicalDetails({ tx, d }: { tx: FailedContractCallTx; d: Diagnosis }) {
  const calledContractId = tx.contract_call.contract_id;
  const pcFinding =
    d.postCondition && d.postCondition.index !== undefined
      ? (d.postCondition as NonNullable<Diagnosis['postCondition']> & { index: number })
      : undefined;

  const rows: TechnicalRow[] = [];
  if (d.source) {
    rows.push({
      id: 'code',
      title: d.source.failingLine ? 'Failing code' : 'Entry point',
      summary: sourceSummary(d.source, calledContractId),
      content: <SourceExcerpt source={d.source} calledContractId={calledContractId} />,
    });
  }
  if (pcFinding) {
    rows.push({
      id: 'post-condition',
      title: `Post-condition #${pcFinding.index + 1}`,
      summary: pcFinding.problem.replace(/_/g, ' '),
      content: <PostConditionFields tx={tx} finding={pcFinding} />,
    });
  }
  if (d.args.length) {
    rows.push({
      id: 'arguments',
      title: `Arguments (${d.args.length})`,
      summary: d.args.map(a => a.name).join(', '),
      content: <ArgsTable args={d.args} />,
    });
  }
  rows.push({
    id: 'details',
    title: 'Raw details',
    summary: d.raw.txResult?.repr,
    content: <DetailRows tx={tx} d={d} />,
  });

  const defaultOpen = rows[0].id;
  const rowIds = rows.map(row => row.id);
  const rowIdsKey = rowIds.join(',');
  const [openRows, setOpenRows] = useState<string[]>([defaultOpen]);
  const userChangedOpenRows = useRef(false);

  useEffect(() => {
    setOpenRows(current => {
      const valid = current.filter(id => rowIds.includes(id));
      if (!userChangedOpenRows.current && !valid.includes(defaultOpen)) return [defaultOpen];
      return valid;
    });
    // rowIdsKey is the stable identity of the available rows; depending on the array would run on
    // every diagnosis render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen, rowIdsKey]);

  return (
    <Box
      px={5}
      py={2}
      bg="surfaceTertiary"
      borderTop="1px solid"
      borderColor="redesignBorderSecondary"
      data-test="why-failed-technical"
    >
      <AccordionRoot
        multiple
        lazyMount
        value={openRows}
        onValueChange={({ value }) => {
          userChangedOpenRows.current = true;
          setOpenRows(value);
        }}
        variant="plain"
      >
        {rows.map((row, i) => (
          <AccordionItem
            key={row.id}
            value={row.id}
            borderBottom={i < rows.length - 1 ? '1px solid' : 'none'}
            borderColor="redesignBorderSecondary"
          >
            <AccordionItemTrigger indicatorPlacement="end" px={0} cursor="pointer">
              <RowHeader title={row.title} summary={row.summary} />
            </AccordionItemTrigger>
            <AccordionItemContent px={0} pb={4}>
              {row.content}
            </AccordionItemContent>
          </AccordionItem>
        ))}
      </AccordionRoot>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------------------------

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

export function WhyItFailed({ tx }: { tx: FailedContractCallTx }) {
  const [expanded, setExpanded] = useState(false);
  const { diagnosis, isEnriching } = useTxDiagnosis(tx, { expanded });
  const contextUrl = useContextPackUrl(tx.tx_id);
  // The context routes only serve the public networks (the server never fetches custom hosts).
  const isCustomNetwork = !!useGlobalContext().activeNetwork.isCustomNetwork;
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
        <Stack gap={2} flex={1} minW={0}>
          <Stack gap={2} w="full" maxW={NARRATIVE_MAX_WIDTH}>
            <Text textStyle="text-medium-md" color="textPrimary" data-test="why-failed-headline">
              {d.headline}
            </Text>
            <Text textStyle="text-regular-sm" color="textPrimary" data-test="why-failed-action">
              {d.senderAction}
            </Text>
          </Stack>
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
            <Stack gap={5} w="full" maxW={NARRATIVE_MAX_WIDTH}>
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
            </Stack>

            {!isCustomNetwork && <CopyPromptButton contextUrl={contextUrl} />}
          </Stack>

          {/* Tier 2 — technical details as collapsible rows */}
          <TechnicalDetails tx={tx} d={d} />
        </>
      )}
    </Stack>
  );
}

export { assetName };
