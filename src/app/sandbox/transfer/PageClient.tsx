'use client';

import { Box, Flex, Grid, Stack } from '@chakra-ui/react';
import { BigNumber } from 'bignumber.js';
import { Form, Formik } from 'formik';
import { NextPage } from 'next';

import { Badge } from '../../../common/components/Badge';
import { CONNECT_AUTH_ORIGIN } from '../../../common/constants/env';
import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useFeeTransfer } from '../../../common/queries/useFeeTransfer';
import { getConnectNetworkString } from '../../../common/utils/network-utils';
import {
  microToStacks,
  stacksToMicro,
  validateStacksAddress,
  validateStacksContractId,
} from '../../../common/utils/utils';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Text } from '../../../ui/Text';
import { Caption, Title } from '../../../ui/typography';
import { useUser } from '../hooks/useUser';
import { transferStx } from '../utils/walletTransactions';

const PageClient: NextPage = () => {
  const { data: feeData } = useFeeTransfer();
  const network = useGlobalContext().activeNetwork;
  const { isConnected, balance, stxAddress } = useUser();
  const fee = feeData ? new BigNumber(feeData as any).multipliedBy(180) : 0;

  return (
    <Formik
      validateOnBlur={false}
      validateOnChange={false}
      initialValues={{
        recipient: '',
        memo: '',
        amount: null,
      }}
      validate={values => {
        const _errors: any = {};
        const validPrincipal =
          validateStacksAddress(values.recipient) || validateStacksContractId(values.recipient);
        if (!validPrincipal) {
          _errors.recipient = 'Invalid Stacks address.';
        } else if (values.recipient === stxAddress) {
          _errors.recipient = 'You cannot send yourself STX ;)';
        }

        if (!values.amount) {
          _errors.amount = 'You need to specify an amount to send.';
        }
        if (Number(balance?.stx?.balance || '0') < (values.amount || 0)) {
          _errors.amount = "Sorry, you don't have enough STX to make this transfer.";
        }
        return _errors;
      }}
      onSubmit={async ({ recipient, amount, memo }) => {
        await transferStx({
          recipient,
          amount: stacksToMicro(amount || 0).toString(),
          memo,
          network: getConnectNetworkString(network),
        });
      }}
      render={({ handleChange, handleBlur, values, errors, setFieldValue }) => (
        <Grid gridTemplateColumns="760px" flexGrow={1} flexShrink={1}>
          <Flex flexGrow={1} flexDirection="column" p="24px">
            <Form>
              <Stack gap={4}>
                <Title fontSize="24px">Send STX</Title>
                <Text fontSize={'sm'}>Enter a STX address and an amount you'd like to send.</Text>
                {Object.keys(errors)?.length ? (
                  <Box
                    px="16px"
                    py="8px"
                    color="red"
                    lineHeight="1.8"
                    fontSize="14px"
                    wordBreak="break-all"
                  >
                    {errors?.recipient || errors?.amount}
                  </Box>
                ) : null}
                <Input
                  id="recipient"
                  name="recipient"
                  type="text"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.recipient}
                  placeholder="Recipient STX address"
                />
                <Box>
                  <Flex alignItems="center" position="relative">
                    {balance?.stx?.balance ? (
                      <Badge
                        position="absolute"
                        right="68px"
                        onClick={() => {
                          const total = BigInt(balance?.stx?.balance || 0) - BigInt(fee.toString());
                          void setFieldValue('amount', microToStacks(total.toString()));
                        }}
                        _hover={{
                          bg: 'bgAlt',
                          cursor: 'pointer',
                          color: 'textTitle',
                        }}
                      >
                        Send max
                      </Badge>
                    ) : null}
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.amount || 0}
                      placeholder="0.000000"
                      flexGrow={1}
                    />
                    <Grid
                      bg={'surface'}
                      position="absolute"
                      right="1px"
                      top="1px"
                      borderLeftWidth={'1px'}
                      placeItems="center"
                      borderRadius="0 4px 4px 0"
                      height={'100%'}
                      px={'16px'}
                    >
                      <Caption>STX</Caption>
                    </Grid>
                  </Flex>
                </Box>
                <Input
                  id="memo"
                  name="memo"
                  type="text"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.memo}
                  placeholder="Optional message (memo)"
                />
                <Box>
                  <Button type="submit" variant="primary">
                    {isConnected ? 'Send STX' : 'Connect Stacks Wallet'}
                  </Button>
                </Box>
              </Stack>
            </Form>
          </Flex>
        </Grid>
      )}
    />
  );
};

export default PageClient;
