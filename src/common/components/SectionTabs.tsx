import { TabsTrigger } from '@/ui/Tabs';
import { Text } from '@/ui/Text';
import { Flex, Stack, StackProps } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';

export function mapTabParamToEnum<T extends string>(
  param: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(param as T) ? (param as T) : fallback;
}

export function useDeepLinkTabOnValueChange<T extends string>({
  setSelectedTab,
}: {
  setSelectedTab: (tab: T) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (value: T) => {
    setSelectedTab(value);
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    sp.set('tab', value);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };
}

export function SectionTabsTrigger({
  label,
  value,
  secondaryLabel,
  onClick,
  isActive,
}: {
  label: string;
  value: string;
  secondaryLabel?: string;
  onClick?: () => void;
  isActive: boolean;
}) {
  return (
    <TabsTrigger
      key={value}
      value={value}
      flex="1"
      w="100%"
      maxW="100%"
      gap={2}
      flexDirection={'column'}
      className={`group`}
      background={isActive ? 'surfacePrimary' : 'none'}
      py={1}
      px={3}
      onClick={onClick}
    >
      <Flex gap={1} alignItems="center">
        <Text
          textStyle="heading-xs"
          color={isActive ? 'textPrimary' : 'textSecondary'}
          _groupHover={{
            color: isActive ? 'textPrimary' : 'textPrimary',
          }}
        >
          {label}
        </Text>
        {secondaryLabel && (
          <Text
            textStyle="heading-xs"
            color={isActive ? 'textSecondary' : 'textTertiary'}
            _groupHover={{
              color: isActive ? 'textSecondary' : 'textSecondary',
            }}
          >
            {secondaryLabel}
          </Text>
        )}
      </Flex>
    </TabsTrigger>
  );
}

export function SectionTabsContentContainer({
  children,
  ...stackProps
}: { children: React.ReactNode } & StackProps) {
  return (
    <Stack
      borderRadius="redesign.xl"
      border="1px solid"
      borderColor="redesignBorderSecondary"
      p={3}
      {...stackProps}
    >
      {children}
    </Stack>
  );
}
