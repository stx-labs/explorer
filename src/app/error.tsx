'use client';

import { ErrorMessageLayout } from '@/common/components/ErrorMessageLayout';
import { Section } from '@/common/components/Section';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { buildUrl } from '@/common/utils/buildUrl';
import { logError } from '@/common/utils/error-utils';
import { Button } from '@/ui/Button';
import { DeprecatedButtonLink } from '@/ui/DeprecatedButtonLink';
import { Box, Grid, HStack } from '@chakra-ui/react';
import { useEffect } from 'react';

import { PageTitle } from './_components/PageTitle';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, 'page-error');
  }, [error]);

  const network = useGlobalContext().activeNetwork;
  const errorName = error.name || 'Unknown error';
  const errorMessage = error.message || 'Something went wrong, please try again later.';

  return (
    <Grid mt="32px" gap="32px" width="100%" gridTemplateColumns={['100%']}>
      <PageTitle>Stacks Explorer</PageTitle>
      <Section>
        <Grid placeItems="center" p="32px" minHeight="350px">
          <Box>
            <ErrorMessageLayout
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
                    <Button onClick={() => reset()} variant="secondary" mt={6}>
                      Try again
                    </Button>
                  </Box>
                </HStack>
              }
            />
          </Box>
        </Grid>
      </Section>
    </Grid>
  );
}
