import { Icon, Stack, StackProps } from '@chakra-ui/react';
import { Drop } from '@phosphor-icons/react';
import { usePathname } from 'next/navigation';
import React from 'react';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { buildUrl } from '../../../common/utils/buildUrl';
import ClarityIcon from '../../../ui/icons/ClarityIcon';
import FunctionXIcon from '../../../ui/icons/FunctionX';
import StxIcon from '../../../ui/icons/StxIcon';
import { NavItem } from './NavItem';

export const SideNav: React.FC<StackProps> = () => {
  const network = useGlobalContext().activeNetwork;
  const pathname = usePathname();

  return (
    <Stack borderRight={`1px solid var(--stacks-colors-border-secondary)`} gap={0}>
      <NavItem
        label={'Write & Deploy Contracts'}
        url={buildUrl(`/sandbox/deploy`, network)}
        icon={
          <Icon h={5} w={5} color={'surfaceOpposite'}>
            <ClarityIcon />
          </Icon>
        }
        isSelected={pathname?.startsWith('/sandbox/deploy')}
      />
      <NavItem
        label={'Call Functions'}
        url={buildUrl(`/sandbox/contract-call`, network)}
        icon={
          <Icon h={5} w={5} color={'surfaceOpposite'}>
            <FunctionXIcon />
          </Icon>
        }
        isSelected={pathname?.startsWith('/sandbox/contract-call')}
      />
      <NavItem
        label={'STX Transfer'}
        url={buildUrl(`/sandbox/transfer`, network)}
        icon={
          <Icon h={5} w={5} color={'surfaceOpposite'}>
            <StxIcon />
          </Icon>
        }
        isSelected={pathname?.startsWith('/sandbox/transfer')}
      />
      {network.mode === 'testnet' && (
        <NavItem
          label={'Testnet Faucet'}
          url={buildUrl(`/sandbox/faucet`, network)}
          icon={
            <Icon h={5} w={5} color={'surfaceOpposite'}>
              <Drop />
            </Icon>
          }
          isSelected={pathname?.startsWith('/sandbox/faucet')}
        />
      )}
    </Stack>
  );
};
