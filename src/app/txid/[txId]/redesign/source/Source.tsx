'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useContractById } from '@/common/queries/useContractById';
import { buildUrl } from '@/common/utils/buildUrl';
import { ButtonLink } from '@/ui/ButtonLink';
import { Stack } from '@chakra-ui/react';

import { CodeEditor, withControls } from './CodeEditor';

const CodeEditorWithControls = withControls(CodeEditor, true, true);

export function Source({ contractId }: { contractId: string }) {
  const { data: txContract } = useContractById(contractId);
  const sourceCode = txContract?.source_code;
  const network = useGlobalContext().activeNetwork;
  return (
    <Stack gap={3}>
      <ButtonLink
        href={buildUrl(`/txid/${encodeURIComponent(contractId)}`, network)}
        buttonLinkSize="small"
        aria-label="View deployment"
      >
        View deployment{' '}
      </ButtonLink>
      <CodeEditorWithControls code={sourceCode || ''} />
    </Stack>
  );
}
