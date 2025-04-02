import { RowCopyButton } from '@/app/txid/[txId]/redesign/tx-summary/SummaryItem';
import { DefaultBadge, DefaultBadgeIcon, DefaultBadgeLabel } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { Flex, FlexProps, Icon } from '@chakra-ui/react';
import { Eye, Function, Lock } from '@phosphor-icons/react';

import { ClarityAbiFunction } from '@stacks/transactions';

export function FunctionListItem({
  functionAbi,
  isOpen,
  setIsOpen,
  containerProps,
}: {
  functionAbi: ClarityAbiFunction;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  containerProps?: FlexProps;
}) {
  const { name, access } = functionAbi;

  const badge = (
    <DefaultBadge
      label={<DefaultBadgeLabel label={name} fontFamily="mono" />}
      icon={
        <Icon h={3} w={3} color="iconSecondary">
          <Function weight="bold" />
        </Icon>
      }
      type="tag"
      variant="solid"
      _groupHover={{
        bg: 'surfaceTertiary',
      }}
    />
  );

  return (
    <Flex justifyContent={'space-between'} alignItems={'center'} w="full" {...containerProps}>
      <Flex gap={2} alignItems={'center'}>
        {access !== 'private' ? (
          <Button variant="unstyled" onClick={() => setIsOpen(!isOpen)}>
            {badge}
          </Button>
        ) : (
          badge
        )}
        <RowCopyButton value={name} ariaLabel={`copy function name`} />
        {access === 'read_only' && (
          <DefaultBadge
            px={1.5}
            py={0.5}
            bg="surfaceFifth"
            label={<DefaultBadgeLabel label={'Read Only'} fontFamily="instrument" />}
            icon={<DefaultBadgeIcon icon={<Eye weight="bold" />} color="iconSecondary" />}
            variant="solid"
            _groupHover={{
              bg: 'surfaceTertiary',
            }}
          />
        )}
        {access === 'private' && (
          <DefaultBadge
            px={1.5}
            py={0.5}
            bg="surfaceFifth"
            label={<DefaultBadgeLabel label={'Private function'} fontFamily="instrument" />}
            icon={<DefaultBadgeIcon icon={<Lock weight="bold" />} color="iconSecondary" />}
            variant="solid"
            _groupHover={{
              bg: 'surfaceTertiary',
            }}
          />
        )}
      </Flex>
      {access !== 'private' && (
        <ButtonLink
          buttonLinkType="button"
          onClick={() => setIsOpen(!isOpen)}
          buttonLinkSize="small"
          aria-label="Call this function"
          buttonLinkDirection={isOpen ? 'backward' : 'forward'}
        >
          {isOpen ? 'Go back' : 'Call this function'}
        </ButtonLink>
      )}
    </Flex>
  );
}
