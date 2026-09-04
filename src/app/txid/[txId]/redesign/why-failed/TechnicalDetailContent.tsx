'use client';

import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { ExplorerLink } from '@/common/components/ExplorerLinks';
import {
  Diagnosis,
  FailedContractCallTx,
  contractName,
  formatInt,
  resolvePostConditionPrincipal,
  truncateMiddle,
} from '@/common/tx-diagnosis';
import { SimpleTag } from '@/ui/Badge';
import { Link } from '@/ui/Link';
import { Text } from '@/ui/Text';
import { Box, Flex, Grid, Icon, Stack } from '@chakra-ui/react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';

import { SummaryItem as StackedSummaryItem } from '../DetailsCard';
import { FunctionArgsDataTable } from '../function-called/FunctionArgsTable';
import { getPostConditionCellText } from '../post-conditions/post-condition-table-utils';
import { DetailChip } from './DetailChip';
import { postConditionSummary, sourceSummary } from './why-failed-utils';

/** Same-page tab link, or a network-preserving explorer link for another contract. */
export function TabLink({ label, href }: { label: string; href: string }) {
  const searchParams = useSearchParams();
  const isAbsolute = href.startsWith('/');
  const merged = new URLSearchParams(searchParams.toString());
  if (!isAbsolute) {
    new URLSearchParams(href.replace(/^\?/, '')).forEach((value, key) => merged.set(key, value));
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

function SourceExcerpt({
  source,
  calledContractId,
}: {
  source: NonNullable<Diagnosis['source']>;
  calledContractId: string;
}) {
  const code = source.lines.map(line => line.code).join('\n');
  const failingLine = source.failingLine;
  const lineQuery = `tab=sourceCode${failingLine ? `&line=${failingLine}` : ''}`;
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
          {source.lines.map(line => {
            const failing = line.n === failingLine;
            return (
              <Flex
                key={line.n}
                gap={3}
                px={3}
                py={0.5}
                bg={failing ? 'transactionStatus.failed' : undefined}
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
                  {line.n}
                </Text>
                <Text
                  as="span"
                  display="inline"
                  textStyle="text-mono-xs"
                  color="textPrimary"
                  whiteSpace="pre"
                >
                  {line.code}
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
  const postCondition = tx.post_conditions[finding.index];
  if (!postCondition) return null;
  const principal = resolvePostConditionPrincipal(postCondition.principal, tx.sender_address);
  const amount =
    postCondition.type === 'non_fungible'
      ? postCondition.asset_value.repr
      : formatInt(postCondition.amount);
  const asset = postCondition.type === 'stx' ? 'STX' : postCondition.asset.asset_name;
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
          {getPostConditionCellText(postCondition.condition_code, postCondition.type)}
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

function ArgsTable({ args }: { args: Diagnosis['args'] }) {
  return (
    <Stack gap={3} data-test="why-failed-arguments">
      <FunctionArgsDataTable data={args} />
      <Flex justifyContent="flex-end">
        <TabLink label="Open Function called" href="?tab=functionCall" />
      </Flex>
    </Stack>
  );
}

const VM_ERROR_PREVIEW = 120;

function DetailRows({ tx, diagnosis }: { tx: FailedContractCallTx; diagnosis: Diagnosis }) {
  const errorCode = diagnosis.errorCode;
  const mono = (value: string) => (
    <Text textStyle="text-mono-xs" color="textPrimary" wordBreak="break-all">
      {value}
    </Text>
  );
  const vmError = diagnosis.raw.vmError;
  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} data-test="why-failed-raw">
      <StackedSummaryItem
        label="Result"
        value={diagnosis.raw.txResult?.repr ?? 'n/a'}
        valueRenderer={value => <SimpleTag label={<Text textStyle="text-mono-xs">{value}</Text>} />}
        showCopyButton={!!diagnosis.raw.txResult}
      />
      {errorCode?.name && (
        <StackedSummaryItem
          label="Error constant"
          value={errorCode.name}
          valueRenderer={mono}
          showCopyButton
        />
      )}
      {errorCode?.candidateNames?.length ? (
        <StackedSummaryItem
          label="Candidate constants"
          value={errorCode.candidateNames.join(', ')}
          valueRenderer={mono}
          showCopyButton
        />
      ) : null}
      {errorCode?.definedIn && (
        <StackedSummaryItem
          label="Defined in"
          value={errorCode.definedIn}
          valueRenderer={value => (
            <DetailChip
              detail={{
                kind: 'contract',
                label: `${contractName(value)}${errorCode.definitionLine ? ` · line ${errorCode.definitionLine}` : ''}`,
                value,
                href: `/txid/${value}`,
              }}
            />
          )}
        />
      )}
      {errorCode?.usageLines?.length ? (
        <StackedSummaryItem
          label={errorCode.usageLines.length > 1 ? 'Raised at lines' : 'Raised at line'}
          value={errorCode.usageLines.join(', ')}
          showCopyButton
        />
      ) : null}
      {errorCode?.nativeFunction && (
        <StackedSummaryItem
          label={(errorCode.nativeCandidates?.length ?? 0) > 1 ? 'Built-in candidates' : 'Built-in'}
          value={
            errorCode.nativeCandidates?.length
              ? errorCode.nativeCandidates
                  .map(candidate =>
                    candidate.contractId
                      ? `${candidate.fn} in ${contractName(candidate.contractId)}`
                      : candidate.fn
                  )
                  .join(', ')
              : errorCode.nativeFunction
          }
          valueRenderer={mono}
          showCopyButton
        />
      )}
      {diagnosis.runtime && (
        <StackedSummaryItem
          label="Runtime error"
          value={diagnosis.runtime.variant}
          valueRenderer={mono}
          showCopyButton
        />
      )}
      <StackedSummaryItem label="Post-conditions" value={postConditionSummary(tx, diagnosis)} />
      <StackedSummaryItem
        label="vm_error"
        value={vmError ?? 'null'}
        valueRenderer={value =>
          mono(value.length > VM_ERROR_PREVIEW ? `${value.slice(0, VM_ERROR_PREVIEW - 1)}…` : value)
        }
        showCopyButton={!!vmError}
      />
      {diagnosis.raw.txResult && (
        <StackedSummaryItem
          label="tx_result (hex)"
          value={diagnosis.raw.txResult.hex}
          valueRenderer={value => mono(truncateMiddle(value, 10, 6))}
          showCopyButton
        />
      )}
    </Grid>
  );
}

export interface TechnicalRow {
  id: string;
  title: string;
  summary?: string;
  content: React.ReactNode;
}

export function buildTechnicalRows(tx: FailedContractCallTx, diagnosis: Diagnosis): TechnicalRow[] {
  const calledContractId = tx.contract_call.contract_id;
  const finding =
    diagnosis.postCondition && diagnosis.postCondition.index !== undefined
      ? (diagnosis.postCondition as NonNullable<Diagnosis['postCondition']> & { index: number })
      : undefined;
  const rows: TechnicalRow[] = [];
  if (diagnosis.source) {
    rows.push({
      id: 'code',
      title: diagnosis.source.failingLine ? 'Failing code' : 'Entry point',
      summary: sourceSummary(diagnosis.source, calledContractId),
      content: <SourceExcerpt source={diagnosis.source} calledContractId={calledContractId} />,
    });
  }
  if (finding) {
    rows.push({
      id: 'post-condition',
      title: `Post-condition #${finding.index + 1}`,
      summary: finding.problem.replace(/_/g, ' '),
      content: <PostConditionFields tx={tx} finding={finding} />,
    });
  }
  if (diagnosis.args.length) {
    rows.push({
      id: 'arguments',
      title: `Arguments (${diagnosis.args.length})`,
      summary: diagnosis.args.map(arg => arg.name).join(', '),
      content: <ArgsTable args={diagnosis.args} />,
    });
  }
  rows.push({
    id: 'details',
    title: 'Raw details',
    summary: diagnosis.raw.txResult?.repr,
    content: <DetailRows tx={tx} diagnosis={diagnosis} />,
  });
  return rows;
}
