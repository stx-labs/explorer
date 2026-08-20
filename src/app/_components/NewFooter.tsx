import { ExplorerLink } from '@/common/components/ExplorerLinks';
import { useSbtcNetworkMode } from '@/common/hooks/useSbtcNetworkMode';
import { NetworkModes } from '@/common/types/network';
import { HiroIcon } from '@/ui/icons/HiroIcon';
import { StacksNameAndLogoIcon } from '@/ui/icons/StacksNameAndLogoIcon';
import { Box, Flex, Grid, Icon, Stack, Text } from '@chakra-ui/react';

import { PAGE_MAX_WIDTH } from '../../common/constants/constants';
import { Link } from '../../ui/Link';
import { StacksSmiley } from './Footer/StacksSmiley';
import { getSbtcTokenPagePath } from './NewNavBar/consts';

interface Link {
  label: string;
  href: string;
}

const sbtcLink = (networkMode: NetworkModes | undefined): Link | undefined => {
  const href = getSbtcTokenPagePath(networkMode);
  return href ? { label: 'sBTC', href } : undefined;
};

const getRightSideLinks = (networkMode: NetworkModes | undefined): Link[] =>
  [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'Blocks',
      href: '/blocks',
    },
    {
      label: 'Transactions',
      href: '/transactions',
    },
    sbtcLink(networkMode),
    // {
    //   label: 'Stacking',
    //   href: '/stacking',
    // },
    {
      label: 'Mempool',
      href: '/mempool',
    },
    {
      label: 'Signers',
      href: '/signers',
    },
    {
      label: 'Tokens',
      href: '/tokens',
    },
    // {
    //   label: 'NFTs',
    //   href: '/nfts',
    // },
    // {
    //   label: 'Analytics',
    //   href: '/analytics',
    // },
    {
      label: 'Search',
      href: '/search',
    },
  ].filter((link): link is Link => link !== undefined);

const leftSideLinks: Link[] = [
  {
    label: 'Sandbox',
    href: '/sandbox/deploy',
  },
  {
    label: 'Status center',
    href: 'https://status.hiro.so/',
  },
  {
    label: 'Support',
    href: '/support',
  },
];

const xPadding = 8;

const FooterLink = ({ link }: { link: Link }) => (
  <ExplorerLink href={link.href} fontWeight="medium" fontSize="xs">
    {link.label}
  </ExplorerLink>
);

const TopFooterContent = () => {
  const rightSideLinks = getRightSideLinks(useSbtcNetworkMode());
  return (
    <>
      <Box hideBelow="lg" className="top-footer-content-hide-below-lg">
        <Flex justifyContent="space-between">
          <Flex gap={4}>
            {rightSideLinks.map(link => (
              <FooterLink key={link.label} link={link} />
            ))}
          </Flex>

          <Flex gap={4}>
            {leftSideLinks.map(link => (
              <FooterLink key={link.label} link={link} />
            ))}
          </Flex>
        </Flex>
      </Box>
      <Box hideFrom="lg" className="top-footer-content-hide-from-lg">
        <Grid templateColumns={['repeat(2, 1fr)', 'repeat(2, 1fr)', 'repeat(3, 1fr)']} gap={4}>
          {rightSideLinks.concat(leftSideLinks).map(link => (
            <FooterLink key={link.label} link={link} />
          ))}
        </Grid>
      </Box>
    </>
  );
};

const BottomFooterContent = () => {
  return (
    <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={3}>
      <BottomLinks />
      <Link href="https://stacks.co">
        <Icon h={3.5} w={18}>
          <StacksNameAndLogoIcon color="var(--stacks-colors-stacks-name-and-logo)" />
        </Icon>
      </Link>
    </Flex>
  );
};

const BottomLink = ({ href, text }: { href: string; text: string }) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      fontSize="xs"
      color="textSecondary"
      textDecoration="underline"
      _hover={{
        color: 'textInteractiveHover',
      }}
      whiteSpace="nowrap"
    >
      {text}
    </Link>
  );
};

const BottomLinks = () => {
  return (
    <Flex gap={6} flexWrap="wrap" rowGap={3}>
      <Flex gap={1.5} alignItems="center" flexWrap="nowrap">
        <HiroIcon h={4} w={4} color="var(--stacks-colors-icon-tertiary)" />
        <Text fontSize="xs" color="textSecondary">
          This Stacks Explorer is built and maintained by{' '}
          <BottomLink href="https://www.hiro.so" text="Hiro" />
        </Text>
      </Flex>
      <BottomLink href="https://www.hiro.so/terms" text="Terms of Use" />
      <BottomLink href="https://www.hiro.so/privacy" text="Privacy Policy" />
      <Text fontSize="xs" color="textSecondary" whiteSpace="nowrap">
        Market data provided by <BottomLink href="https://lunarcrush.com/" text="LunarCrush" />
      </Text>
    </Flex>
  );
};

export const NewFooter = () => {
  return (
    <Stack
      width="100%"
      py={6}
      px={xPadding}
      border="1px solid"
      borderColor="redesignBorderSecondary"
      borderRadius="lg"
      position="relative"
      gap={0}
      justifyContent="center"
      fontFamily="instrument"
    >
      <Link href="https://stacks.co">
        <StacksSmiley
          h={14}
          w={14}
          position="absolute"
          bottom={-5}
          right={xPadding}
          transform="translateY(50%)"
          transition="bottom 0.6s ease-in-out"
          _hover={{
            bottom: -2,
          }}
        />
      </Link>
      <Stack gap={8}>
        <TopFooterContent />
        <BottomFooterContent />
      </Stack>
    </Stack>
  );
};
