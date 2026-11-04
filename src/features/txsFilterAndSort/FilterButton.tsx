'use client';

import { Flex, HStack, Icon, Menu } from '@chakra-ui/react';
import { ArrowBendDownRight, FunnelSimple } from '@phosphor-icons/react';
import { ReactNode, memo, useCallback, useState } from 'react';

import { Checkbox } from '../../components/ui/checkbox';
import { MenuContent, MenuRoot, MenuTrigger } from '../../components/ui/menu';
import { Text } from '../../ui/Text';
import ClarityIcon from '../../ui/icons/ClarityIcon';
import CubeSparkleIcon from '../../ui/icons/CubeSparkleIcon';
import DiagonalArrowsIcon from '../../ui/icons/DiagonalArrowsIcon';
import FunctionXIcon from '../../ui/icons/FunctionX';
import { useFilterAndSortState } from './useFilterAndSortState';

// A real menu checkbox item (role="menuitemcheckbox", toggled by click/Enter/Space, menu stays
// open). The Checkbox is display-only so the item, not a nested input, owns the checked state.
function FilterItem({
  label,
  icon,
  value,
  checked,
  onCheckedChange,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Menu.CheckboxItem
      bg={'surface'}
      _hover={{ bg: 'none' }}
      _active={{ bg: 'none' }}
      _focus={{ bg: 'none' }}
      value={value}
      checked={checked}
      onCheckedChange={onCheckedChange}
      closeOnSelect={false}
    >
      <HStack
        gap={2}
        width={'full'}
        px={4}
        py={3}
        _hover={{ bg: 'filterButton.hoverBackground' }}
        rounded={'lg'}
      >
        {icon}
        <Text fontSize={'sm'}>{label}</Text>
        {/* `inputProps` reaches the native input; a root `tabIndex` would only land on its label. */}
        <Checkbox
          ml={'auto'}
          checked={checked}
          aria-hidden
          pointerEvents={'none'}
          inputProps={{ tabIndex: -1 }}
        />
      </HStack>
    </Menu.CheckboxItem>
  );
}

const FILTER_ITEMS: { value: string; label: string; icon: ReactNode }[] = [
  { value: 'coinbase', label: 'Coinbase', icon: <CubeSparkleIcon /> },
  { value: 'smart_contract', label: 'Contract deploy', icon: <ClarityIcon /> },
  { value: 'contract_call', label: 'Function call', icon: <FunctionXIcon /> },
  { value: 'tenure_change', label: 'Tenure change', icon: <ArrowBendDownRight /> },
  { value: 'token_transfer', label: 'Token transfer', icon: <DiagonalArrowsIcon /> },
];

/** `types` limits the offered filters, e.g. to the types a list can actually contain. */
export const FilterButton = memo(({ types }: { types?: readonly string[] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, [setIsHovered]);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, [setIsHovered]);
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, [setIsFocused]);
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, [setIsFocused]);
  const isHoveredOrFocused = isHovered || isFocused;

  const { activeFilters, setActiveFilters } = useFilterAndSortState();

  // Controlled by the route-scoped Redux filters so the menu reflects filters that persist across
  // navigation (otherwise the table stays filtered while the control shows no selection).
  const getItemProps = (value: string) => ({
    value,
    checked: activeFilters.includes(value),
    onCheckedChange: (checked: boolean) =>
      setActiveFilters(
        checked ? [...activeFilters, value] : activeFilters.filter(filter => filter !== value)
      ),
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const onMenuSelect = useCallback(() => {
    setIsMenuOpen(false);
  }, [setIsMenuOpen]);

  return (
    <MenuRoot
      positioning={{ placement: 'bottom-end' }}
      closeOnSelect={false}
      onSelect={onMenuSelect}
    >
      <MenuTrigger
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        bg="surface"
        color="textSubdued"
        border="normal"
        borderColor={'filterButton.borderColor'}
        fontWeight={'semibold'}
        fontSize={'sm'}
        _hover={{ color: 'text', backgroundColor: 'borderPrimary' }}
        _active={{ color: 'text', backgroundColor: 'borderPrimary' }}
        _focus={{ color: 'text', backgroundColor: 'borderPrimary' }}
        flexShrink={0}
      >
        <Flex gap={1}>
          <Icon h={4} w={4} color={isHoveredOrFocused || isMenuOpen ? 'text' : 'textSubdued'}>
            <FunnelSimple />
          </Icon>
          <Text>Filters {activeFilters.length > 0 && `(${activeFilters.length})`}</Text>
        </Flex>
      </MenuTrigger>
      <MenuContent bg={'surface'}>
        {FILTER_ITEMS.filter(item => !types || types.includes(item.value)).map(item => (
          <FilterItem
            key={item.value}
            label={item.label}
            icon={<Icon color={'text'}>{item.icon}</Icon>}
            {...getItemProps(item.value)}
          />
        ))}
      </MenuContent>
    </MenuRoot>
  );
});
