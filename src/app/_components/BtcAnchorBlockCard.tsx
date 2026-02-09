'use client';

import { Block } from '@stacks/stacks-blockchain-api-types';

import { BurnBlockLink } from '../../common/components/ExplorerLinks';
import { KeyValueVertical } from '../../common/components/KeyValueVertical';
import { Section } from '../../common/components/Section';
import { useGlobalContext } from '../../common/context/useGlobalContext';
import { truncateMiddleDeprecated } from '../../common/utils/utils';
import { Text } from '../../ui/Text';
import { TextLink } from '../../ui/TextLink';

export function BtcAnchorBlockCardBase({ block }: { block?: Block }) {
  const { btcTxBaseUrl } = useGlobalContext().activeNetwork;

  if (!block) return null;

  return (
    <Section title="Bitcoin anchor">
      <KeyValueVertical
        label={'Bitcoin block height'}
        value={
          <BurnBlockLink
            heightOrHash={block.burn_block_height.toString()}
            fontSize={'sm'}
            fontWeight={'medium'}
          >
            #{block.burn_block_height}
          </BurnBlockLink>
        }
        copyValue={block.burn_block_height.toString()}
      />
      <KeyValueVertical
        label={'Bitcoin block hash'}
        value={
          <BurnBlockLink heightOrHash={block.burn_block_hash} fontSize={'sm'} fontWeight={'medium'}>
            {truncateMiddleDeprecated(block.burn_block_hash, 8)}
          </BurnBlockLink>
        }
        copyValue={block.burn_block_hash}
      />
      <KeyValueVertical
        label={'Anchor transaction ID'}
        value={
          <TextLink
            as="a"
            target="_blank"
            href={`${btcTxBaseUrl}/${block.miner_txid.replace('0x', '')}`}
          >
            <Text fontSize={'sm'} fontWeight={'medium'}>
              {truncateMiddleDeprecated(block.miner_txid, 8)}
            </Text>
          </TextLink>
        }
        copyValue={block.miner_txid}
      />
    </Section>
  );
}
