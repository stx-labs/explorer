import { Box, Flex, Icon, Stack } from '@chakra-ui/react';
import { SignOut } from '@phosphor-icons/react';

import { Card } from '../../../common/components/Card';
import { useAppSelector } from '../../../common/state/hooks';
import { microToStacksFormatted, truncateMiddleDeprecated } from '../../../common/utils/utils';
import { IconButton } from '../../../ui/IconButton';
import { Text } from '../../../ui/Text';
import { Tooltip } from '../../../ui/Tooltip';
import StxIcon from '../../../ui/icons/StxIcon';
import { Caption } from '../../../ui/typography';
import { TransactionsPanel } from '../components/TransactionsPanel';
import { useUser } from '../hooks/useUser';
import { selectShowRightPanel } from '../sandbox-slice';

export function RightPanel() {
  const { isConnected, disconnect, stxAddress, balance } = useUser();
  const showRightPanel = useAppSelector(selectShowRightPanel);
  if (!showRightPanel || !isConnected) return null;

  return (
    <Card
      rounded={'none'}
      flexGrow={1}
      flexDirection="column"
      borderLeftWidth={'1px'}
      position={'absolute'}
      right={0}
      top={0}
      width={96}
      height={'full'}
      overflowX="hidden"
      overflowY="auto"
    >
      {balance ? (
        <Box bg={'surface'} borderBottomWidth="1px" p={7}>
          <Stack gap={4}>
            <Stack textAlign="right">
              <Caption>Account balance</Caption>
              <Flex
                flexShrink={0}
                flexGrow={1}
                alignItems="center"
                position="relative"
                justifyContent="flex-end"
                color={'textTitle'}
                gap={'8px'}
              >
                <Icon h={4.5} w={4.5} color="black">
                  <StxIcon />
                </Icon>
                <Text fontWeight={600} fontSize={'24px'} display="block" position="relative">
                  {balance?.stx?.balance ? microToStacksFormatted(balance.stx.balance) : 0} STX
                </Text>
              </Flex>
            </Stack>
            {stxAddress && (
              <Flex textAlign="right" justifyContent="flex-end" alignItems="center">
                <Caption _hover={{ cursor: 'pointer' }}>
                  {truncateMiddleDeprecated(stxAddress, 12)}
                </Caption>
                <Box
                  _hover={{ cursor: 'pointer' }}
                  onClick={() => {
                    disconnect();
                  }}
                  position="relative"
                  ml="8px"
                >
                  <Tooltip positioning={{ placement: 'bottom' }} content="Sign out">
                    <IconButton height={5} width={5} aria-label={'sign out'}>
                      <Icon h={3.5} w={3.5} color="icon">
                        <SignOut />
                      </Icon>
                    </IconButton>
                  </Tooltip>
                </Box>
              </Flex>
            )}
          </Stack>
        </Box>
      ) : null}
      <TransactionsPanel />
    </Card>
  );
}
