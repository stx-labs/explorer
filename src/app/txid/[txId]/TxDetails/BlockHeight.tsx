'use client';

import { Box, Flex, Icon, useBreakpointValue } from '@chakra-ui/react';
import { Clock } from '@phosphor-icons/react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

import { BtcStxBlockLinks } from '../../../../common/components/BtcStxBlockLinks';
import { KeyValueHorizontal } from '../../../../common/components/KeyValueHorizontal';
import { Value } from '../../../../common/components/Value';
import { toRelativeTime } from '../../../../common/utils/utils';
import { Tooltip } from '../../../../ui/Tooltip';
import { ExplorerErrorBoundary } from '../../../_components/ErrorBoundary';
import { useTxBlock } from '../useTxBlock';
import { isInMempool, isInMicroblock } from '../utils';

function BlockHeightBase({ tx }: { tx: Transaction | MempoolTransaction }) {
  const { data: block } = useTxBlock(tx);
  const isOnTouchScreen = useBreakpointValue({ base: true, md: false }); // TODO: get rid of this. use css

  if (isInMempool(tx) || isInMicroblock(tx)) return null;

  const ts = tx.block_time || tx.burn_block_time;
  if (!ts) return null;

  const readableTs = `${new Date(ts * 1000).toLocaleTimeString()} ${new Date(
    ts * 1000
  ).toLocaleDateString()}`;

  if (!block) return null;

  return (
    <KeyValueHorizontal
      label={'Block height'}
      value={
        <Flex
          alignItems={['flex-start', 'flex-start', 'center']}
          gap={2}
          direction={['column', 'column', 'row']}
        >
          <BtcStxBlockLinks
            btcBlockHeight={block?.burn_block_height}
            stxBlockHeight={tx.block_height}
            stxBlockHash={tx.block_hash}
          />
          <Box>
            {isOnTouchScreen ? (
              <Flex alignItems="center">
                <Icon h={4} w={4} mr={1}>
                  <Clock />
                </Icon>
                <Value suppressHydrationWarning={true}>
                  {toRelativeTime(ts * 1000)} - {readableTs}
                </Value>
              </Flex>
            ) : (
              <Tooltip content={readableTs}>
                <Flex alignItems="center">
                  <Icon h={4} w={4} mr={1}>
                    <Clock />
                  </Icon>
                  <Value suppressHydrationWarning={true}>{toRelativeTime(ts * 1000)}</Value>
                </Flex>
              </Tooltip>
            )}
          </Box>
        </Flex>
      }
      copyValue={readableTs}
    />
  );
}

export function BlockHeight({ tx }: { tx: Transaction | MempoolTransaction }) {
  return (
    <ExplorerErrorBoundary renderContent={() => null}>
      <BlockHeightBase tx={tx} />
    </ExplorerErrorBoundary>
  );
}
