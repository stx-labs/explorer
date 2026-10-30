'use client';

import { Flex, HStack, Icon, useCheckboxGroup } from '@chakra-ui/react';
import { ArrowBendDownRight, FunnelSimple } from '@phosphor-icons/react';
import { ReactNode, memo, useCallback, useState } from 'react';

import { Checkbox, CheckboxProps } from '../../components/ui/checkbox';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../../components/ui/menu';
import { Text } from '../../ui/Text';
import ClarityIcon from '../../ui/icons/ClarityIcon';
import CubeSparkleIcon from '../../ui/icons/CubeSparkleIcon';
import DiagonalArrowsIcon from '../../ui/icons/DiagonalArrowsIcon';
import FunctionXIcon from '../../ui/icons/FunctionX';
import { useFilterAndSortState } from './useFilterAndSortState';

function FilterItem({
  label,
  icon,
  value,
  selectedFilters,
  checkboxProps,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  selectedFilters: (string | number)[];
  checkboxProps: CheckboxProps;
}) {
  return (
    <MenuItem
      bg={'surface'}
      _hover={{ bg: 'none' }}
      _active={{ bg: 'none' }}
      _focus={{ bg: 'none' }}
      value={value}
    >
      <HStack
        gap={2}
        as="label"
        width={'full'}
        px={4}
        py={3}
        _hover={{ bg: 'filterButton.hoverBackground' }}
        rounded={'lg'}
      >
        {icon}
        <Text fontSize={'sm'}>{label}</Text>
        <Checkbox ml={'auto'} checked={selectedFilters.includes(value)} {...checkboxProps} />
      </HStack>
    </MenuItem>
  );
}

export const FilterButton = memo(() => {
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
  const { value: selectedFilters, getItemProps: getCheckboxProps } = useCheckboxGroup({
    value: activeFilters,
    onValueChange: (value: string[]) => {
      setActiveFilters(value);
    },
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
          <Text>Filters {selectedFilters.length > 0 && `(${selectedFilters.length})`}</Text>
        </Flex>
      </MenuTrigger>
      <MenuContent bg={'surface'}>
        <FilterItem
          label={'Coinbase'}
          icon={
            <Icon color={'text'}>
              <CubeSparkleIcon />
            </Icon>
          }
          value={'coinbase'}
          selectedFilters={selectedFilters}
          checkboxProps={getCheckboxProps({ value: 'coinbase' })}
        />
        <FilterItem
          label={'Contract deploy'}
          icon={
            <Icon color={'text'}>
              <ClarityIcon />
            </Icon>
          }
          value={'smart_contract'}
          selectedFilters={selectedFilters}
          checkboxProps={getCheckboxProps({ value: 'smart_contract' })}
        />
        <FilterItem
          label={'Function call'}
          icon={
            <Icon color={'text'}>
              <FunctionXIcon />
            </Icon>
          }
          value={'contract_call'}
          selectedFilters={selectedFilters}
          checkboxProps={getCheckboxProps({ value: 'contract_call' })}
        />
        <FilterItem
          label={'Tenure change'}
          icon={
            <Icon color={'text'}>
              <ArrowBendDownRight />
            </Icon>
          }
          value={'tenure_change'}
          selectedFilters={selectedFilters}
          checkboxProps={getCheckboxProps({ value: 'tenure_change' })}
        />
        <FilterItem
          label={'Token transfer'}
          icon={
            <Icon color={'text'}>
              <DiagonalArrowsIcon />
            </Icon>
          }
          value={'token_transfer'}
          selectedFilters={selectedFilters}
          checkboxProps={getCheckboxProps({ value: 'token_transfer' })}
        />
      </MenuContent>
    </MenuRoot>
  );
});
