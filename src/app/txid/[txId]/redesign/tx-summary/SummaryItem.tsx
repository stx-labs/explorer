import {
  CopyButtonRedesign,
  ExtendedButtonProps,
  ExtendedIconProps,
} from '@/common/components/CopyButton';
import { microToStacks, microToStacksFormatted, usdFormatter } from '@/common/utils/utils';
import { Text } from '@/ui/Text';
import { Tooltip } from '@/ui/Tooltip';
import StacksIconThin from '@/ui/icons/StacksIconThin';
import { Flex, Icon, Stack, Table } from '@chakra-ui/react';
import { Question } from '@phosphor-icons/react';

export const DEFAULT_BUTTON_STYLING: ExtendedButtonProps = {
  bg: (copied: boolean) => (copied ? 'surfaceInvert' : 'transparent'),
  _groupHover: (copied: boolean) => ({ bg: copied ? 'surfaceInvert' : 'surfaceTertiary' }),
  _hover: (copied: boolean) => ({ bg: copied ? 'surfaceInvert' : 'surfaceFifth !important' }),
  css: {
    '&:hover .icon': { color: 'iconPrimary' },
  },
};

export const DEFAULT_ICON_STYLING: ExtendedIconProps = {
  color: (copied: boolean) => (copied ? 'iconInvert !important' : 'iconSecondary'),
};

export function RowCopyButton({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  return (
    <CopyButtonRedesign
      initialValue={value}
      aria-label={ariaLabel}
      iconProps={{
        ...DEFAULT_ICON_STYLING,
        height: 3.5,
        width: 3.5,
      }}
      buttonProps={{
        ...DEFAULT_BUTTON_STYLING,
        p: 1.5,
      }}
    />
  );
}

export function SummaryItemLabel({ label }: { label: string }) {
  return (
    <Text textStyle="text-medium-sm" color="textSecondary">
      {label}
    </Text>
  );
}

export function SummaryItemValue({
  value,
  valueRenderer,
  label,
  showCopyButton,
}: {
  value: string;
  valueRenderer?: (value: string) => React.ReactNode;
  label: string;
  showCopyButton?: boolean;
}) {
  const content = valueRenderer ? (
    valueRenderer(value)
  ) : (
    <Text textStyle="text-regular-sm" color="textPrimary" wordBreak="break-all">
      {value}
    </Text>
  );
  return (
    <Flex gap={2} alignItems="center">
      {content}
      {showCopyButton && <RowCopyButton value={value} ariaLabel={`copy ${label} value`} />}
    </Flex>
  );
}

export function PriceSummaryItemValue({ value, stxPrice }: { value: string; stxPrice: number }) {
  const stxAmount = microToStacks(value);
  const usdValue = stxPrice * stxAmount;
  const formattedValue = microToStacksFormatted(value);
  const formattedUsdValue =
    usdValue > 0 && usdValue < 0.01 ? '<$0.01' : usdFormatter.format(usdValue);

  return (
    <Flex gap={1.5} alignItems="center">
      <Icon h={3.5} w={3.5} color="iconPrimary">
        <StacksIconThin />
      </Icon>
      {formattedValue} STX
      <RowCopyButton value={value} ariaLabel={`copy stx price`} />
      <Text textStyle="text-regular-sm" color="textSecondary">
        /
      </Text>
      <Text textStyle="text-regular-sm" color="textSecondary">
        {formattedUsdValue}
      </Text>
      <RowCopyButton value={formattedUsdValue} ariaLabel={`copy usd price`} />
    </Flex>
  );
}

export function SummaryItem({
  label,
  value,
  valueRenderer,
  showCopyButton,
  infoText,
}: {
  label: string;
  value: string;
  valueRenderer?: (value: string) => React.ReactNode;
  showCopyButton?: boolean;
  infoText?: string;
}) {
  return (
    <>
      <Table.Row
        hideBelow="md"
        className="group"
        bg="transparent"
        css={{
          '& > td:first-of-type': {
            borderTopLeftRadius: 'redesign.md',
            borderBottomLeftRadius: 'redesign.md',
          },
          '& > td:last-of-type': {
            borderTopRightRadius: 'redesign.md',
            borderBottomRightRadius: 'redesign.md',
          },
        }}
      >
        <Table.Cell
          _groupHover={{
            bg: 'surfacePrimary',
          }}
          border="none"
        >
          <Flex gap={1.5} alignItems="center">
            <SummaryItemLabel label={label} />
            {infoText && (
              <Tooltip content={infoText} variant="redesignPrimary">
                <Icon h={3.5} w={3.5} color="iconTertiary">
                  <Question />
                </Icon>
              </Tooltip>
            )}
          </Flex>
        </Table.Cell>
        <Table.Cell
          _groupHover={{
            bg: 'surfacePrimary',
          }}
          border="none"
        >
          <SummaryItemValue
            value={value}
            label={label}
            valueRenderer={valueRenderer}
            showCopyButton={showCopyButton}
          />
        </Table.Cell>
      </Table.Row>
      <Table.Row
        hideFrom="md"
        className="group"
        bg="transparent"
        css={{
          '& > td:first-of-type': {
            borderTopLeftRadius: 'redesign.md',
            borderBottomLeftRadius: 'redesign.md',
          },
          '& > td:last-of-type': {
            borderTopRightRadius: 'redesign.md',
            borderBottomRightRadius: 'redesign.md',
          },
        }}
      >
        <Table.Cell
          _groupHover={{
            bg: 'surfacePrimary',
          }}
          border="none"
        >
          <Stack gap={1.5}>
            <SummaryItemLabel label={label} />
            <SummaryItemValue
              value={value}
              label={label}
              valueRenderer={valueRenderer}
              showCopyButton={showCopyButton}
            />
          </Stack>
        </Table.Cell>
      </Table.Row>
    </>
  );
}
