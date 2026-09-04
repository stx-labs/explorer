'use client';

import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useClipboard } from '@/common/hooks/useClipboard';
import { FailedContractCallTx, copyPromptFor } from '@/common/tx-diagnosis';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { Flex, Icon, Stack } from '@chakra-ui/react';
import { CaretDown, CaretUp, Check, CopySimple, XCircle } from '@phosphor-icons/react';
import { useState } from 'react';

import { DetailChip, RichText } from './DetailChip';
import { TabLink } from './TechnicalDetailContent';
import { TechnicalDetails } from './TechnicalDetails';
import { useTxDiagnosis } from './useTxDiagnosis';
import { buildContextPackPath } from './why-failed-utils';

const NARRATIVE_MAX_WIDTH = '80ch';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text textStyle="text-medium-sm" color="textSecondary">
      {children}
    </Text>
  );
}

function CopyPromptButton({ contextPath }: { contextPath: string }) {
  const { copied, setValue } = useClipboard({ timeout: 750 });
  const copyPrompt = () => {
    const contextUrl = new URL(contextPath, window.location.origin).toString();
    void setValue(copyPromptFor(contextUrl));
  };
  return (
    <Button
      variant="redesignTertiary"
      size="small"
      onClick={copyPrompt}
      aria-label="Copy Prompt for Agent to Explore"
      data-test="why-failed-copy-prompt"
    >
      <Flex gap={1.5} alignItems="center">
        <Icon h={3.5} w={3.5}>
          {copied ? <Check weight="bold" /> : <CopySimple weight="bold" />}
        </Icon>
        <Text textStyle="text-medium-xs">
          {copied ? 'Copied' : 'Copy Prompt for Agent to Explore'}
        </Text>
      </Flex>
    </Button>
  );
}

export function WhyItFailed({ tx }: { tx: FailedContractCallTx }) {
  const [expanded, setExpanded] = useState(false);
  const { diagnosis, isEnriching } = useTxDiagnosis(tx, { expanded });
  const network = useGlobalContext().activeNetwork;
  const contextPath = buildContextPackPath(tx.tx_id, network.mode);
  // The context routes only serve the public networks (the server never fetches custom hosts).
  const isCustomNetwork = !!network.isCustomNetwork;

  return (
    <Stack
      gap={0}
      borderRadius="redesign.xl"
      border="1px solid"
      borderColor="redesignBorderSecondary"
      overflow="hidden"
      role="region"
      aria-label="Why this transaction failed"
      data-test="why-failed"
      data-diagnosis-class={diagnosis.class}
    >
      <Flex gap={3} px={5} py={4} bg="transactionStatus.failed" alignItems="flex-start">
        <Icon h={4} w={4} color="iconError" mt={1} flexShrink={0}>
          <XCircle weight="bold" />
        </Icon>
        <Stack gap={2} flex={1} minW={0}>
          <Stack gap={2} w="full" maxW={NARRATIVE_MAX_WIDTH}>
            <Text textStyle="text-medium-md" color="textPrimary" data-test="why-failed-headline">
              {diagnosis.headline}
            </Text>
            <Text textStyle="text-regular-sm" color="textPrimary" data-test="why-failed-action">
              {diagnosis.senderAction}
            </Text>
          </Stack>
          <Flex gap={4} alignItems="center" flexWrap="wrap" justifyContent="space-between">
            <Text textStyle="text-regular-xs" color="textSecondary">
              {diagnosis.invariant}
            </Text>
            <Button
              variant="buttonLink"
              size="small"
              onClick={() => setExpanded(value => !value)}
              aria-expanded={expanded}
              _expanded={{ bg: 'transparent', color: 'textPrimary' }}
              data-test="why-failed-toggle"
            >
              <Flex gap={1} alignItems="center">
                <Text textStyle="text-medium-xs">{expanded ? 'Hide details' : 'See details'}</Text>
                <Icon h={3} w={3}>
                  {expanded ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
                </Icon>
              </Flex>
            </Button>
          </Flex>
        </Stack>
      </Flex>

      {expanded && (
        <>
          <Stack gap={5} px={5} py={5} bg="surfaceSecondary" data-test="why-failed-details">
            <Stack gap={5} w="full" maxW={NARRATIVE_MAX_WIDTH}>
              <Stack gap={2}>
                <SectionLabel>What happened</SectionLabel>
                <Stack as="ol" gap={2} pl={0} listStyleType="none">
                  {diagnosis.whatHappened.map((fact, index) => (
                    <Flex as="li" key={index} gap={3} alignItems="flex-start">
                      <Text textStyle="text-mono-xs" color="textTertiary" minW={4} pt={1}>
                        {index + 1}
                      </Text>
                      <Stack gap={1} flex={1} minW={0}>
                        <RichText
                          parts={fact.parts}
                          color={fact.onChain ? 'textSecondary' : 'textPrimary'}
                        />
                        {fact.chips && (
                          <Flex gap={1} flexWrap="wrap">
                            {fact.chips.map(chip => (
                              <DetailChip key={chip.value} detail={chip} />
                            ))}
                          </Flex>
                        )}
                        {fact.link && <TabLink label={fact.link.label} href={fact.link.href} />}
                      </Stack>
                    </Flex>
                  ))}
                </Stack>
                {isEnriching && (
                  <Text textStyle="text-regular-xs" color="textTertiary">
                    Checking related activity…
                  </Text>
                )}
              </Stack>

              {diagnosis.developerNote && (
                <Stack gap={1}>
                  <SectionLabel>For developers</SectionLabel>
                  <RichText parts={diagnosis.developerNote} />
                </Stack>
              )}
            </Stack>

            {!isCustomNetwork && <CopyPromptButton contextPath={contextPath} />}
          </Stack>

          <TechnicalDetails tx={tx} diagnosis={diagnosis} />
        </>
      )}
    </Stack>
  );
}
