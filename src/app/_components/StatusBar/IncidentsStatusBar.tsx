import { Flex, Stack, StackProps } from '@chakra-ui/react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import { useUnresolvedIncidents } from '../../../common/queries/useUnresolvedIncidents';
import { logError } from '../../../common/utils/error-utils';
import { Text } from '../../../ui/Text';
import { TextLink } from '../../../ui/TextLink';
import { StatusBarBase } from './StatusBarBase';
import { getColor, getIncidentImpactIcon } from './utils';

function IncidentsStatusBarBase(props: StackProps) {
  const isTestnet = useGlobalContext().activeNetwork.mode === 'testnet';
  const { data: unresolvedIncidentsResponse } = useUnresolvedIncidents();
  const incidents = unresolvedIncidentsResponse?.incidents;
  const statusBarRef = useRef<HTMLDivElement | null>(null);

  if (!incidents?.length) {
    return null;
  }

  return (
    <Stack {...props}>
      {incidents?.map(({ name, impact }) => {
        const isTestnetUpdate = name.includes('Testnet Update:');
        if (isTestnetUpdate && !isTestnet) return null;
        const icon = getIncidentImpactIcon(impact);
        const content = (
          <Flex flexWrap="wrap" flexGrow={1}>
            <Text fontSize="xs" display="inline">
              {`${name}${name.endsWith('.') ? '' : '.'} More information on the`}&nbsp;
              <TextLink
                href="https://status.hiro.so/"
                target="_blank"
                color={getColor(impact)}
                display="inline"
                textDecoration="underline"
              >
                Hiro status page
              </TextLink>
              .
            </Text>
          </Flex>
        );
        return (
          <StatusBarBase
            key={name}
            ref={statusBarRef}
            content={
              <Flex gap={1.5} alignItems="center">
                {icon}
                {content}
              </Flex>
            }
          />
        );
      })}
    </Stack>
  );
}

export function IncidentsStatusBar(props: StackProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallbackRender={() => null}
          onError={error => {
            logError(error, 'incidents-status-bar', undefined, 'warning');
          }}
          onReset={reset}
        >
          <IncidentsStatusBarBase {...props} />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
