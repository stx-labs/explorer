'use client';

import { Box, Stack } from '@chakra-ui/react';
import type { NextPage } from 'next';
import { ReactNode } from 'react';

import { Card } from '../../common/components/Card';
import { ListItem } from '../../ui/ListItem';
import { Text } from '../../ui/Text';
import { TextLink, TextLinkProps } from '../../ui/TextLink';
import { UnorderedList } from '../../ui/UnorderedList';
import { PageTitle } from '../_components/PageTitle';

function ExternalLink({
  children,
  href,
  ...rest
}: { children: ReactNode; href: string } & TextLinkProps) {
  return (
    <TextLink
      href={href}
      target={'_blank'}
      color={'purple.600'}
      textDecoration={'underline'}
      fontSize={'sm'}
      {...rest}
    >
      {children}
    </TextLink>
  );
}

const SupportPage: NextPage = () => {
  return (
    <>
      <PageTitle>Need support? </PageTitle>
      <Stack gap={4}>
        <Card lineHeight={'tall'} p={8} pb={10}>
          <Stack gap={4}>
            <Text fontSize={'xl'} fontWeight={'medium'}>
              Contact support
            </Text>
            <Text fontSize={'sm'}>
              Need help? Email us at{' '}
              <ExternalLink href={'mailto:support@stackslabs.com'} display={'inline'}>
                support@stackslabs.com
              </ExternalLink>
              <Text fontSize={'sm'} display={'inline'}>
                .
              </Text>
            </Text>
          </Stack>
        </Card>
        <Card lineHeight={'tall'} p={8} pb={10}>
          <Stack gap={4}>
            <Text fontSize={'xl'} fontWeight={'medium'}>
              Transaction help
            </Text>
            <Text fontSize={'sm'}>
              Do you have questions about a pending transaction, incorrect nonces, or missing memos?
            </Text>
            <UnorderedList display={'flex'} flexDirection={'column'} gap={4} pl={2}>
              <ListItem>
                <Text fontSize={'sm'} display={'inline'}>
                  For users, two of the most popular Stacks wallets provide help centers, which can
                  help you find answers to common questions around transactions. You can find the
                </Text>
                &nbsp;
                <ExternalLink
                  href={'https://leather.io/guides'}
                  whiteSpace={'nowrap'}
                  display={'inline'}
                >
                  Leather guides
                </ExternalLink>
                &nbsp;
                <Text fontSize={'sm'} display={'inline'}>
                  here and the
                </Text>
                &nbsp;
                <ExternalLink
                  href={'https://support.xverse.app/hc/en-us'}
                  whiteSpace={'nowrap'}
                  display={'inline'}
                >
                  Xverse support center here
                </ExternalLink>
                <Text fontSize={'sm'} display={'inline'}>
                  .
                </Text>
              </ListItem>
              <ListItem>
                <Text fontSize={'sm'}>
                  For developers, you can learn more about transactions in the Stacks documentation.
                </Text>
              </ListItem>
            </UnorderedList>
            <Text fontSize={'sm'}>
              If you need further assistance, you can reach out to the Stacks community, and you can
              get help in the #support channel on the Stacks Discord.
            </Text>
          </Stack>
        </Card>
        <Card lineHeight={'tall'} p={8} pb={10}>
          <Stack gap={4}>
            <Text fontSize={'xl'} fontWeight={'medium'}>
              Accessing your wallet and assets
            </Text>
            <Box>
              <Text fontSize={'sm'} display={'inline'}>
                If you are having trouble accessing your wallet or assets in it, please reach out to
                your wallet provider directly.
              </Text>
              &nbsp;
              <ExternalLink
                href={'https://www.stacks.co/explore/ecosystem?category=All+Teams#wallets'}
                display={'inline'}
                whiteSpace={'nowrap'}
              >
                A list of Stacks wallets can be found here
              </ExternalLink>
              <Text fontSize={'sm'} display={'inline'}>
                .
              </Text>
            </Box>
          </Stack>
        </Card>
        <Card lineHeight={'tall'} p={8} pb={10}>
          <Stack gap={4} flexWrap={'wrap'}>
            <Text fontSize={'xl'} fontWeight={'medium'}>
              General questions about Stacks
            </Text>
            <Box>
              <Text fontSize={'sm'} display={'inline'}>
                Check out the
              </Text>
              &nbsp;
              <ExternalLink
                href={'https://www.stacks.co/'}
                whiteSpace={'nowrap'}
                display={'inline'}
              >
                Stacks website
              </ExternalLink>
              <Text fontSize={'sm'} display={'inline'}>
                , which has an
              </Text>
              &nbsp;
              <ExternalLink
                href={'https://www.stacks.co/learn/introduction'}
                whiteSpace={'nowrap'}
                display={'inline'}
              >
                overview of Stacks
              </ExternalLink>
              &nbsp;
              <Text fontSize={'sm'} display={'inline'}>
                , a
              </Text>
              &nbsp;
              <ExternalLink
                href={'https://www.stacks.co/learn/faq'}
                whiteSpace={'nowrap'}
                display={'inline'}
              >
                helpful FAQ
              </ExternalLink>
              &nbsp;
              <Text fontSize={'sm'} display={'inline'}>
                , and more.
              </Text>
            </Box>
            <Box>
              <Text fontSize={'sm'} display={'inline'}>
                You can also get involved with the community and join
              </Text>
              &nbsp;
              <ExternalLink href={'https://stacks.chat'} whiteSpace={'nowrap'} display={'inline'}>
                the Stacks Discord
              </ExternalLink>
              <Text fontSize={'sm'} display={'inline'}>
                .
              </Text>
            </Box>
          </Stack>
        </Card>
        <Card lineHeight={'tall'} p={8} pb={10}>
          <Stack gap={4}>
            <Text fontSize={'xl'} fontWeight={'medium'}>
              Submit a bug or product feedback
            </Text>
            <Text fontSize={'sm'}>
              We’d love to hear from you.{' '}
              <ExternalLink href={'https://github.com/hirosystems/explorer/issues/new/choose'}>
                Open a GitHub issue
              </ExternalLink>
              .
            </Text>
          </Stack>
        </Card>
        <Card lineHeight={'tall'} p={8} pb={10}>
          <Stack gap={4}>
            <Text fontSize={'xl'} fontWeight={'medium'}>
              Found a bug in the Stacks blockchain?
            </Text>
            <Box>
              <ExternalLink
                href={'https://immunefi.com/bounty/stacks/'}
                display={'inline'}
                whiteSpace={'nowrap'}
              >
                Participate in the Stacks bounty program
              </ExternalLink>{' '}
              <Text fontSize={'sm'} display={'inline'}>
                with ImmuneFi and receive bounties ranging from $1,000 to $1,000,000 depending on
                how critical the bug is.
              </Text>
            </Box>
          </Stack>
        </Card>
      </Stack>
    </>
  );
};

export default SupportPage;
