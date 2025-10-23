'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useContractById } from '@/common/queries/useContractById';
import { buildUrl } from '@/common/utils/buildUrl';
import { ButtonLink } from '@/ui/ButtonLink';
import { Stack } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';

import {
  ContractCallTransaction,
  MempoolContractCallTransaction,
  MempoolSmartContractTransaction,
  SmartContractTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { CodeEditor, withControls } from './CodeEditor';

const CodeEditorWithControls = withControls(CodeEditor, true, true);

export function Source({
  tx,
}: {
  tx:
    | ContractCallTransaction
    | MempoolContractCallTransaction
    | SmartContractTransaction
    | MempoolSmartContractTransaction;
}) {
  const txContractId =
    'contract_call' in tx ? tx.contract_call.contract_id : tx.smart_contract.contract_id;
  const { data: txContract } = useContractById(txContractId);
  const sourceCode = txContract?.source_code;
  const network = useGlobalContext().activeNetwork;
  const url = buildUrl(`/txid/${encodeURIComponent(txContractId)}`, network);
  const pathname = usePathname();
  const needLink = !url.includes(pathname);
  return (
    <Stack gap={3}>
      {needLink && (
        <ButtonLink href={url} buttonLinkSize="small" aria-label="View deployment">
          View deployment{' '}
        </ButtonLink>
      )}
      <CodeEditorWithControls code={sourceCode || ''} />
    </Stack>
  );
}
