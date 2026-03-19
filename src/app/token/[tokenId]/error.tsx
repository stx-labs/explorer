'use client';

import { PageTitle } from '@/app/_components/PageTitle';
import { ErrorMessageLayout } from '@/common/components/ErrorMessageLayout';
import { Section } from '@/common/components/Section';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useError } from '@/common/hooks/useError';
import { ExplorerError } from '@/common/types/Error';
import { buildUrl } from '@/common/utils/buildUrl';
import { logError } from '@/common/utils/error-utils';
import { DeprecatedButtonLink } from '@/ui/DeprecatedButtonLink';
import { Box, Flex, Grid, HStack } from '@chakra-ui/react';
import { useEffect } from 'react';

const defaultErrorMessage = 'Failed to fetch token';

export default function Error({ error }: { error: ExplorerError; reset: () => void }) {
  useEffect(() => {
    if (error.status === 404) return;
    logError(error, 'token-page-error', { status: error.status });
  }, [error]);
  const network = useGlobalContext().activeNetwork;
  const { errorName, errorStatusCode, errorMessage } = useError(error, defaultErrorMessage);
  return (
    <Flex direction={'column'} mt="32px" gap="32px">
      <PageTitle>{defaultErrorMessage}</PageTitle>
      <Section>
        <Grid placeItems="center" p="32px" minHeight="350px">
          <Box>
            <ErrorMessageLayout
              errorStatusCode={errorStatusCode}
              title={errorName}
              message={errorMessage}
              action={
                <HStack gap={4}>
                  <Box>
                    <DeprecatedButtonLink href={buildUrl('/', network)} buttonLinkSize="small">
                      Go home
                    </DeprecatedButtonLink>
                  </Box>
                  <Box>
                    <DeprecatedButtonLink
                      href={buildUrl('/tokens', network)}
                      buttonLinkSize="small"
                    >
                      All tokens
                    </DeprecatedButtonLink>
                  </Box>
                </HStack>
              }
            />
          </Box>
        </Grid>
      </Section>
    </Flex>
  );
}
