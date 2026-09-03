'use client';

import { ApiError } from '@/api/ApiError';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useContractById } from '@/common/queries/useContractById';
import { buildUrl } from '@/common/utils/buildUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';
import { usePathname, useSearchParams } from 'next/navigation';

import { CodeEditor, DEFAULT_EDITOR_HEIGHT, withControls } from './CodeEditor';

const CodeEditorWithControls = withControls(CodeEditor, true, true);

export function Source({ contractId }: { contractId: string }) {
  const { data: txContract, isLoading, isError, error, refetch } = useContractById(contractId);
  const sourceCode = txContract?.source_code;
  const deployTxId = txContract?.tx_id;
  const network = useGlobalContext().activeNetwork;
  const url = buildUrl(`/txid/${encodeURIComponent(deployTxId || contractId)}`, network);
  const pathname = usePathname();
  // `?line=<n>` (set by the "Why it failed" card) reveals and highlights that line.
  const lineParam = Number(useSearchParams().get('line'));
  const revealLine = Number.isInteger(lineParam) && lineParam > 0 ? lineParam : undefined;
  const isDeployTxPage =
    pathname.startsWith('/txid/') &&
    (pathname.includes(contractId) || (!!deployTxId && pathname.includes(deployTxId)));
  const needLink = !isDeployTxPage;

  if (isLoading) {
    return <Skeleton minHeight={DEFAULT_EDITOR_HEIGHT} w="full" borderRadius="redesign.xl" />;
  }

  if (isError) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <Stack gap={3} alignItems="flex-start">
        <Text fontSize="sm">
          {isNotFound
            ? 'This contract was not found on the current network. It may not be deployed yet.'
            : 'Failed to load the contract source code.'}
        </Text>
        <Button variant="redesignPrimary" onClick={() => refetch()}>
          Try again
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={3}>
      {needLink && (
        <ButtonLink href={url} buttonLinkSize="small" aria-label="View deployment">
          View deployment
        </ButtonLink>
      )}
      <CodeEditorWithControls code={sourceCode || ''} revealLine={revealLine} />
    </Stack>
  );
}
