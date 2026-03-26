'use client';

import {
  Box,
  Icon,
  ProgressCircleRoot as ProgressCircle,
  ProgressCircleValueText,
  Stack,
} from '@chakra-ui/react';

import { AddressBalanceResponse } from '@stacks/stacks-blockchain-api-types';

import { Circle } from '../../../../common/components/Circle';
import { TxLink } from '../../../../common/components/ExplorerLinks';
import { useAddressConfirmedTxsWithTransfersInfinite } from '../../../../common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { useCoreApiInfo } from '../../../../common/queries/useCoreApiInfo';
import { getStackingStartBlockHeight } from '../../../../common/utils/accounts';
import StxIcon from '../../../../ui/icons/StxIcon';
import { Caption, Title } from '../../../../ui/typography';

export const StackingPercentage = ({
  balance,
  address,
}: {
  balance: AddressBalanceResponse;
  address: string;
}) => {
  const { data: stacksInfo } = useCoreApiInfo();
  const { data } = useAddressConfirmedTxsWithTransfersInfinite(address);
  const firstPageTxs = data?.pages?.[0]?.results.map(txWithTransfers => txWithTransfers.tx);
  const stackingStartBlock = getStackingStartBlockHeight(firstPageTxs);

  if (stackingStartBlock) {
    if (!stacksInfo) {
      return (
        <Stack gap={2} py={4}>
          <Caption>Stacking progress</Caption>
          <Stack gap={2} alignItems="center">
            <ProgressCircle value={null} color="stackingPercentageProgressColor" />
            <Caption>Calculating...</Caption>
          </Stack>
        </Stack>
      );
    }

    const currentBlock = stacksInfo?.burn_block_height;
    const lockBlock = balance?.stx?.burnchain_lock_height;
    const unlockBlock = balance?.stx?.burnchain_unlock_height;

    const totalBlocksInStackingPeriod = unlockBlock - lockBlock;
    const blocksUntilUnlocked = unlockBlock - currentBlock;
    const blocksCompleted = totalBlocksInStackingPeriod - blocksUntilUnlocked;
    const stackingPercentage = (blocksCompleted / totalBlocksInStackingPeriod) * 100;

    const isStacking = unlockBlock > currentBlock;

    return (
      <Stack gap={2} py={4}>
        <Caption>Stacking progress</Caption>
        <Stack gap={2} alignItems="center">
          {isStacking ? (
            <ProgressCircle
              value={stackingPercentage}
              color="stackingPercentageProgressColor"
              h={'180px'}
              w={'180px'}
            >
              <ProgressCircleValueText>{`${Math.round(
                stackingPercentage
              )}%`}</ProgressCircleValueText>
            </ProgressCircle>
          ) : (
            <Circle mx="auto" h={12} w={12} mb="16px" bg={'invert'}>
              <Icon h={6} w={6} color="white">
                <StxIcon />
              </Icon>
            </Circle>
          )}
          {isStacking ? (
            <Stack gap={2} alignItems="center">
              <Caption mb="12px">
                ~{blocksUntilUnlocked.toLocaleString('en-US', { maximumFractionDigits: 2 })} blocks
                remaining
              </Caption>
              <TxLink txId={balance?.stx?.lock_tx_id} target="_blank" fontSize={'xs'}>
                View Stacking transaction
              </TxLink>
            </Stack>
          ) : (
            <Box textAlign="center">
              <Title mb="12px" fontSize={2} fontWeight={'medium'} color={'textTitle'}>
                Completed at #{unlockBlock}
              </Title>
              <TxLink txId={balance?.stx?.lock_tx_id} target="_blank" fontSize={'xs'}>
                View Stacking transaction
              </TxLink>
            </Box>
          )}
        </Stack>
      </Stack>
    );
  }
  return null;
};
