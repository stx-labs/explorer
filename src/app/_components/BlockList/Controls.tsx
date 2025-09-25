import { Field, Fieldset, Flex, FlexProps, StackProps } from '@chakra-ui/react';
import { ReactNode } from 'react';

import { Switch, SwitchProps } from '../../../components/ui/switch';

interface ControlsProps extends StackProps {
  groupByBtc: SwitchProps;
  liveUpdates: SwitchProps;
  horizontal?: boolean;
}

export function ControlsLayout({
  horizontal,
  children,
  ...rest
}: {
  horizontal?: boolean;
  children: ReactNode;
} & FlexProps) {
  return (
    <Flex direction={horizontal ? { base: 'column', md: 'row' } : 'column'} gap={3} {...rest}>
      {children}
    </Flex>
  );
}

export function Controls({ groupByBtc, liveUpdates, horizontal, ...rest }: ControlsProps) {
  return (
    <ControlsLayout horizontal={horizontal} {...rest}>
      <Fieldset.Root w="fit-content">
        <Field.Root display="flex" gap={3} w="fit-content">
          <Switch {...groupByBtc} variant="redesignPrimary" size="small">
            <Field.Label
              htmlFor="group-by-btc"
              mb="0"
              mr={0}
              fontSize={'14px'}
              lineHeight={'1.5em'}
              fontWeight={400}
              textOverflow={'ellipsis'}
              overflow={'hidden'}
              whiteSpace={'nowrap'}
            >
              Group by Bitcoin block
            </Field.Label>
          </Switch>
        </Field.Root>
      </Fieldset.Root>
      <Fieldset.Root w="fit-content">
        <Field.Root display="flex" gap={3} w="fit-content">
          <Switch {...liveUpdates} variant="redesignPrimary" size="small">
            <Field.Label
              htmlFor="live-updates"
              mb="0"
              mr={0}
              fontSize={'14px'}
              lineHeight={'1.5em'}
              fontWeight={400}
              textOverflow={'ellipsis'}
              overflow={'hidden'}
              whiteSpace={'nowrap'}
            >
              Live updates
            </Field.Label>
          </Switch>
        </Field.Root>
      </Fieldset.Root>
    </ControlsLayout>
  );
}
