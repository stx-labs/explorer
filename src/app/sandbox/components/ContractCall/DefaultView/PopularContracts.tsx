import { HStack, Stack } from '@chakra-ui/react';
import { ChartBar, CurrencyDollar, Signature } from '@phosphor-icons/react';
import { FC } from 'react';

import { Circle } from '../../../../../common/components/Circle';
import { ExplorerLink } from '../../../../../common/components/ExplorerLinks';
import { Section } from '../../../../../common/components/Section';
import BitcoinCircleIcon from '../../../../../ui/icons/BitcoinCircleIcon';
import { Caption, Title } from '../../../../../ui/typography';

const defaultContracts = (address: string) => [
  {
    name: 'pox-4',
    address,
    description: '',
    icon: BitcoinCircleIcon,
  },
  {
    name: 'bns',
    address,
    description: '',
    icon: Signature,
  },
  {
    name: 'BNS-V2',
    address: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF',
    description: '',
    icon: Signature,
  },
  {
    name: 'cost-voting',
    address,
    description: '',
    icon: ChartBar,
  },
  {
    name: 'costs-3',
    address,
    description: '',
    icon: CurrencyDollar,
  },
];

export const PopularContracts: FC<{ rootContractAddress: string }> = ({ rootContractAddress }) => (
  <>
    <Title fontWeight={400}>Or select from one of these</Title>
    <Stack mt="24px" gap={6}>
      {defaultContracts(rootContractAddress).map(({ name, address, icon: Icon }) => (
        <ExplorerLink href={`/sandbox/contract-call/${address}.${name}`} key={name}>
          <Section color={'textTitle'} p="24px" _hover={{ cursor: 'pointer', color: 'brand' }}>
            <HStack gap={4}>
              <Circle>
                <Icon />
              </Circle>
              <Stack>
                <Title color="currentColor">{name}</Title>
                <Caption>{address}</Caption>
              </Stack>
            </HStack>
          </Section>
        </ExplorerLink>
      ))}
    </Stack>
  </>
);
