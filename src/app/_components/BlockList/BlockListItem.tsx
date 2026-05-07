import { Flex, FlexProps } from '@chakra-ui/react';
import pluralize from 'pluralize';
import React from 'react';

import { Block } from '@stacks/stacks-blockchain-api-types';

import { BtcStxBlockLinks } from '../../../common/components/BtcStxBlockLinks';
import { TwoColsListItem } from '../../../common/components/TwoColumnsListItem';
import { toRelativeTime, truncateMiddleDeprecated } from '../../../common/utils/utils';
import { Caption } from '../../../ui/typography';

export const BlockListItem: React.FC<{ block: Block } & FlexProps> = React.memo(
  ({ block, ...rest }) => {
    return (
      <TwoColsListItem
        leftContent={{
          title: (
            <Flex
              onClick={e => {
                e.stopPropagation();
              }}
              alignItems="center"
            >
              <BtcStxBlockLinks
                btcBlockHeight={block.burn_block_height}
                stxBlockHeight={block.height}
                stxBlockHash={block.hash}
              />
            </Flex>
          ),
          subtitle: (
            <Caption display="block" color={'textSubdued'}>
              {(() => {
                const microblockCount = block?.microblocks_accepted?.length ?? 0;
                const txCount = block.txs?.length ?? 0;
                const txSegment = `${txCount} ${pluralize('transaction', txCount)}`;
                // Nakamoto blocks have no microblocks; only render the chip when relevant.
                return microblockCount > 0
                  ? `${microblockCount} ${pluralize('microblock', microblockCount)} · ${txSegment}`
                  : txSegment;
              })()}
            </Caption>
          ),
        }}
        rightContent={{
          title: toRelativeTime(block.block_time * 1000),
          subtitle: truncateMiddleDeprecated(block.hash),
        }}
        {...rest}
      />
    );
  }
);
