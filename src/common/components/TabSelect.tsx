'use client';

import { CloseButton } from '@/components/ui/close-button';
import type { CollectionItem } from '@chakra-ui/react';
import { Select as ChakraSelect, Portal } from '@chakra-ui/react';
import * as React from 'react';

interface TabSelectTriggerProps extends ChakraSelect.ControlProps {
  clearable?: boolean;
  open: boolean;
}

export const TabSelectTrigger = React.forwardRef<HTMLButtonElement, TabSelectTriggerProps>(
  function TabSelectTrigger(props, ref) {
    const { children, clearable, open, ...rest } = props;
    return (
      <ChakraSelect.Control {...rest}>
        <ChakraSelect.Trigger ref={ref}>{children}</ChakraSelect.Trigger>
        <ChakraSelect.IndicatorGroup>
          {clearable && <TabSelectClearTrigger />}
        </ChakraSelect.IndicatorGroup>
      </ChakraSelect.Control>
    );
  }
);

const TabSelectClearTrigger = React.forwardRef<HTMLButtonElement, ChakraSelect.ClearTriggerProps>(
  function TabSelectClearTrigger(props, ref) {
    return (
      <ChakraSelect.ClearTrigger asChild {...props} ref={ref}>
        <CloseButton
          size="xs"
          variant="plain"
          focusVisibleRing="inside"
          focusRingWidth="2px"
          pointerEvents="auto"
        />
      </ChakraSelect.ClearTrigger>
    );
  }
);

interface TabSelectContentProps extends ChakraSelect.ContentProps {
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
}

export const TabSelectContent = React.forwardRef<HTMLDivElement, TabSelectContentProps>(
  function TabSelectContent(props, ref) {
    const { portalled = true, portalRef, ...rest } = props;
    return (
      <Portal disabled={!portalled} container={portalRef}>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content {...rest} ref={ref} />
        </ChakraSelect.Positioner>
      </Portal>
    );
  }
);

export const TabSelectItem = React.forwardRef<HTMLDivElement, ChakraSelect.ItemProps>(
  function TabSelectItem(props, ref) {
    const { item, children, ...rest } = props;
    return (
      <ChakraSelect.Item key={item.value} item={item} {...rest} ref={ref}>
        {children}
      </ChakraSelect.Item>
    );
  }
);

interface TabSelectValueTextProps extends Omit<ChakraSelect.ValueTextProps, 'children'> {
  children?(items: CollectionItem[]): React.ReactNode;
}

export const TabSelectValueText = React.forwardRef<HTMLSpanElement, TabSelectValueTextProps>(
  function TabSelectValueText(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraSelect.ValueText {...rest} ref={ref}>
        <ChakraSelect.Context>
          {select => {
            const items = select.selectedItems;
            if (items.length === 0) return props.placeholder;
            if (children) return children(items);
            if (items.length === 1) return select.collection.stringifyItem(items[0]);
            return `${items.length} selected`;
          }}
        </ChakraSelect.Context>
      </ChakraSelect.ValueText>
    );
  }
);

export const TabSelectRoot = React.forwardRef<HTMLDivElement, ChakraSelect.RootProps>(
  function TabSelectRoot(props, ref) {
    return (
      <ChakraSelect.Root
        {...props}
        ref={ref}
        positioning={{
          sameWidth: true,
          offset: { mainAxis: 1, crossAxis: 0 },
          ...props.positioning,
        }}
      >
        {props.asChild ? (
          props.children
        ) : (
          <>
            <ChakraSelect.HiddenSelect />
            {props.children}
          </>
        )}
      </ChakraSelect.Root>
    );
  }
) as ChakraSelect.RootComponent;

interface TabSelectItemGroupProps extends ChakraSelect.ItemGroupProps {
  label: React.ReactNode;
}

export const TabSelectItemGroup = React.forwardRef<HTMLDivElement, TabSelectItemGroupProps>(
  function TabSelectItemGroup(props, ref) {
    const { children, label, ...rest } = props;
    return (
      <ChakraSelect.ItemGroup {...rest} ref={ref}>
        <ChakraSelect.ItemGroupLabel>{label}</ChakraSelect.ItemGroupLabel>
        {children}
      </ChakraSelect.ItemGroup>
    );
  }
);

export const TabSelectLabel = ChakraSelect.Label;
export const TabSelectItemText = ChakraSelect.ItemText;
export const TabSelectPositioner = ChakraSelect.Positioner;
export const TabSelectControl = ChakraSelect.Control;
export const TabSelectHiddenSelect = ChakraSelect.HiddenSelect;
export const TabSelectIndicator = ChakraSelect.Indicator;
