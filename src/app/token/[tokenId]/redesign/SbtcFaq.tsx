import { ReverseAccordion, ReverseAccordionItem } from '@/common/components/ReverseAccordion';
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from '@/components/ui/accordion';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, Icon, Stack } from '@chakra-ui/react';
import { ArrowUpRight, Plus, X } from '@phosphor-icons/react';
import { useState } from 'react';

export const items: ReverseAccordionItem[] = [
  {
    title: 'What is sBTC?',
    text: 'sBTC is a decentralized, 1:1 Bitcoin-backed asset on Stacks that unlocks Bitcoin for DeFi and smart contracts. It enables users to earn yield, access lending, and trade on decentralized exchanges, all with 100% Bitcoin finality. Secured by a decentralized network of signers-not a single entity-sBTC operates directly on the Bitcoin main chain, making its transactions resistant to censorship.',
    link: ' https://sbtc.stacks.co/',
    linkLabel: 'Learn more',
  },
  {
    title: 'How can I get sBTC?',
    text: "You can mint sBTC by depositing BTC through the sBTC bridge app. Connect a non-custodial wallet like Leather or Xverse, enter the BTC amount and your Stacks address, sign the transaction, and once confirmed, you'll receive sBTC",
    link: ' https://sbtc.stacks.co/',
    linkLabel: 'Get sBTC',
  },
];

export function SbtcFaqReverseAccordion() {
  return <ReverseAccordion items={items} />;
}

export function SbtcFaqAccordion() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <AccordionRoot
      collapsible={true}
      onValueChange={value => {
        setExpandedIndex(Number(value.value[0]));
      }}
      variant="primary"
    >
      <Stack gap={2}>
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <AccordionItem key={item.title} value={index.toString()}>
              <AccordionItemTrigger w="full">
                <Flex justifyContent="space-between" alignItems="center" w="full">
                  <Text textStyle="text-medium-xs">{item.title}</Text>
                  <Icon h={4} w={4} color="iconTertiary">
                    {isExpanded ? <X /> : <Plus />}
                  </Icon>
                </Flex>
              </AccordionItemTrigger>
              <AccordionItemContent>
                <Stack gap={4}>
                  <Text textStyle="text-regular-xs">{item.text}</Text>
                  <Button
                    onClick={() => window.open(item.link, '_blank')}
                    variant="redesignTertiary"
                    w="fit-content"
                  >
                    <Flex gap={1} alignItems="center">
                      <Text textStyle="text-medium-xs">{item.linkLabel}</Text>
                      <Icon h={4} w={4} color="iconSecondary">
                        <ArrowUpRight />
                      </Icon>
                    </Flex>
                  </Button>
                </Stack>
              </AccordionItemContent>
            </AccordionItem>
          );
        })}
      </Stack>
    </AccordionRoot>
  );
}
