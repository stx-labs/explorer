import { SectionTabsContentContainer } from '@/common/components/SectionTabs';
import { Text } from '@/ui/Text';
import { Stack } from '@chakra-ui/react';

import {
  MempoolTenureChangeTransaction,
  TenureChangeTransaction,
} from '@stacks/stacks-blockchain-api-types';

import { getTxAlert } from './Alert';
import { TxHeader } from './TxHeader';
import { TxSummary } from './tx-summary/TxSummary';

export const TenureChangePage = ({
  tx,
}: {
  tx: TenureChangeTransaction | MempoolTenureChangeTransaction;
}) => {
  return (
    <>
      <Stack gap={3}>
        <TxHeader tx={tx} />
        {getTxAlert(tx)}
      </Stack>
      <Stack gap={3}>
        <Text textStyle="heading-xs">Overview</Text>
        <SectionTabsContentContainer>
          <TxSummary tx={tx} />
        </SectionTabsContentContainer>
      </Stack>
    </>
  );
};
