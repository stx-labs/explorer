import { useFilterParams } from '@/common/utils/search-param-utils';
import {
  Box,
  Flex,
  FlexProps,
  HStack,
  Icon,
  IconButton,
  Link,
  Stack,
  StackProps,
} from '@chakra-ui/react';
import { ArrowRight, Command, KeyReturn, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { ReactNode, useCallback, useEffect } from 'react';

import { useGlobalContext } from '../../../common/context/useGlobalContext';
import {
  advancedSearchConfig,
  advancedSearchKeywords,
  buildAdvancedSearchQuery,
  getSearchPageUrl,
  useRecentResultsLocalStorage,
  useSearchQuery,
} from '../../../common/queries/useSearchQuery';
import { useAppDispatch, useAppSelector } from '../../../common/state/hooks';
import {
  AddressSearchResult,
  BlockSearchResult,
  BnsSearchResult,
  ContractSearchResult,
  SearchResult,
  SearchResultType,
} from '../../../common/types/search-results';
import { getSearchEntityUrl } from '../../../features/search/dropdown/search-results-card';
import {
  blur,
  clearSearchTerm,
  focus,
  selectIsSearchFieldFocused,
  selectQuickNavUrl,
  selectSearchPreviewScrollLeft,
  selectSearchTerm,
  selectTempSearchTerm,
  setQuickNavUrl,
  setSearchPreviewScrollLeft,
  setSearchTerm,
  setTempSearchTerm,
} from '../../../features/search/search-slice';
import { Button } from '../../../ui/Button';
import { Input, InputProps } from '../../../ui/Input';
import { Kbd } from '../../../ui/Kbd';
import { Text } from '../../../ui/Text';
import {
  BlockResultItem,
  BnsResultItem,
  CoinbaseResultItem,
  ContractCallResultItem,
  ContractDeployResultItem,
  ResultItem,
  TenureChangeResultItem,
  TokenTransferResultItem,
} from './ResultItem';
import { SearchDoubleGradientBorderWrapper } from './SearchDoubleGradientBorderWrapper';

export function SearchResultsWrapper({
  children,
  ...stackProps
}: { children: ReactNode } & StackProps) {
  return (
    <Stack
      zIndex={-1}
      position={'absolute'}
      background={'surfaceSecondary'}
      left={-3}
      right={-3}
      top={-3}
      borderRadius={['none', 'none', 'none', 'redesign.xxl']}
      boxShadow={'var(--stacks-shadows-elevation3)'}
      gap={4}
      {...stackProps}
    >
      {children}
    </Stack>
  );
}

function KeywordsPreview() {
  const keywords = Object.keys(advancedSearchConfig).filter(key => key !== 'TERM:');

  return (
    <Box mt={1} as="p" textStyle="text-mono-xs" lineHeight="tall">
      {keywords.map((key, index) => (
        <React.Fragment key={key}>
          <Text as="span" color={'textSecondary'} style={{ display: 'inline' }}>
            {key}
          </Text>
          <Text
            as="span"
            color={'textTertiary'}
            display="inline"
            wordBreak="break-all"
            overflowWrap="anywhere"
          >
            ({advancedSearchConfig[key].type})
          </Text>
          {index < keywords.length - 1 && ' '}
        </React.Fragment>
      ))}
    </Box>
  );
}

function QuickLinkButton({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link href={href} variant="noUnderline">
      <Button variant={'redesignTertiary'} size={'small'} alignItems="center">
        <Text textStyle="text-medium-xs" color="textSecondary">
          {children}
        </Text>
        <Icon w={3.5} h={3.5}>
          <ArrowRight />
        </Icon>
      </Button>
    </Link>
  );
}

function QuickLinks() {
  const network = useGlobalContext().activeNetwork;
  const isMainnet = network.mode === 'mainnet';

  return (
    <Stack
      backgroundColor={'surfacePrimary'}
      p={4}
      fontFamily="var(--font-instrument-sans)"
      gap={2}
      borderBottomLeftRadius="redesign.xxl"
      borderBottomRightRadius="redesign.xxl"
    >
      <Text fontSize={'xs'} color={'textSecondary'} lineHeight={'base'}>
        Quick links
      </Text>
      <Flex gap={2} flexWrap="wrap">
        {isMainnet && (
          <QuickLinkButton
            href={'/token/SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token?chain=mainnet'}
          >
            sBTC
          </QuickLinkButton>
        )}
        <QuickLinkButton href={'/blocks'}>Blocks</QuickLinkButton>
        <QuickLinkButton href={'/transactions'}>Transactions</QuickLinkButton>
        <QuickLinkButton href={'/signers'}>Signers</QuickLinkButton>
      </Flex>
    </Stack>
  );
}

export enum ResultItemsType {
  SearchResults = 'SearchResults',
  RecentResults = 'RecentResults',
}

function ResultItems({
  title,
  recentResults,
  iconType = 'arrow',
  type,
  ...stackProps
}: {
  title?: string;
  recentResults: SearchResult[];
  iconType?: 'arrow' | 'enter';
  type: ResultItemsType;
} & StackProps) {
  const network = useGlobalContext().activeNetwork;
  if (!recentResults.length) {
    return null;
  }
  return (
    <Stack px={4} fontFamily="var(--font-instrument-sans)" gap={2} {...stackProps}>
      {title && (
        <Text fontSize={'xs'} color={'textSecondary'} lineHeight={'base'}>
          {title}
        </Text>
      )}
      <Stack gap={1}>
        {recentResults.map((recentResultItem, index) => {
          const searchEntityUrl = getSearchEntityUrl(network, recentResultItem) || '#';
          if (recentResultItem.result.entity_type === SearchResultType.StandardAddress) {
            const addressResult = recentResultItem.result as AddressSearchResult;
            return (
              <ResultItem
                key={index}
                value={addressResult.entity_id}
                iconType={iconType}
                url={searchEntityUrl}
              />
            );
          }
          if (recentResultItem.result.entity_type === SearchResultType.BnsAddress) {
            const bnsResult = recentResultItem.result as BnsSearchResult;
            return (
              <BnsResultItem
                key={index}
                bns={bnsResult.display_name}
                address={bnsResult.entity_id}
                url={searchEntityUrl}
                iconType={iconType}
              />
            );
          }
          if (recentResultItem.result.entity_type === SearchResultType.BlockHash) {
            const blockResult = recentResultItem.result as BlockSearchResult;
            return (
              <BlockResultItem
                key={index}
                height={blockResult.block_data.height!}
                hash={blockResult.entity_id}
                url={searchEntityUrl}
                iconType={iconType}
              />
            );
          }
          if (recentResultItem.result.entity_type === SearchResultType.ContractAddress) {
            const contractResult = recentResultItem.result as ContractSearchResult;
            return (
              <ContractDeployResultItem
                key={index}
                tx={contractResult.metadata}
                url={searchEntityUrl}
              />
            );
          }
          if (recentResultItem.result.entity_type === SearchResultType.TxId) {
            const txType = recentResultItem.result.metadata?.tx_type;
            switch (txType) {
              case 'token_transfer':
                return (
                  <TokenTransferResultItem
                    key={index}
                    tx={recentResultItem.result.metadata}
                    url={searchEntityUrl}
                    iconType={iconType}
                  />
                );
              case 'contract_call':
                return (
                  <ContractCallResultItem
                    key={index}
                    tx={recentResultItem.result.metadata}
                    url={searchEntityUrl}
                    iconType={iconType}
                  />
                );
              case 'smart_contract':
                return (
                  <ContractDeployResultItem
                    key={index}
                    tx={recentResultItem.result.metadata}
                    url={searchEntityUrl}
                    iconType={iconType}
                  />
                );
              case 'coinbase':
                return (
                  <CoinbaseResultItem
                    key={index}
                    tx={recentResultItem.result.metadata}
                    url={searchEntityUrl}
                    iconType={iconType}
                  />
                );
              case 'tenure_change':
                return (
                  <TenureChangeResultItem
                    key={index}
                    tx={recentResultItem.result.metadata}
                    url={searchEntityUrl}
                    iconType={iconType}
                  />
                );
              default:
                return null;
            }
          }
          if (recentResultItem.result.entity_type === SearchResultType.TxList) {
            const searchTerm = recentResultItem.result.entity_id;
            const searchPageUrl = getSearchPageUrl(searchTerm, network);
            const txsCount = recentResultItem?.result?.metadata?.totalCount || 0;
            const txsCountFormatted = txsCount > 1000 ? '1000+' : txsCount;
            return (
              <ResultItem
                key={index}
                url={searchPageUrl}
                value={
                  type === ResultItemsType.RecentResults
                    ? searchTerm
                    : `${txsCountFormatted} result${txsCount === 1 ? '' : 's'} found`
                }
                iconType={iconType}
              />
            );
          }
          return null;
        })}
      </Stack>
    </Stack>
  );
}

function HiddenSearchField(props: InputProps) {
  const dispatch = useAppDispatch();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isSearchFieldFocused = useAppSelector(selectIsSearchFieldFocused);
  useEffect(() => {
    if (isSearchFieldFocused) {
      inputRef.current?.focus();
    }
  }, [isSearchFieldFocused]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(blur());
      }
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        dispatch(focus());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);
  return (
    <Input
      ref={inputRef}
      id="search-bar"
      name="search-bar"
      display="block"
      type="search"
      autoComplete="off"
      autoCapitalize={'off'}
      autoCorrect={'off'}
      enterKeyHint={'search'}
      outline={'none'}
      border={'none'}
      fontSize="sm"
      color="transparent"
      bg={'transparent'}
      p={0}
      zIndex="docked"
      width={'full'}
      css={{
        caretColor: 'textPrimary',
        '::-webkit-search-cancel-button': {
          display: 'none',
        },
      }}
      _placeholder={{ color: 'textSecondary' }}
      _hover={{
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
      }}
      _focus={{
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
      }}
      onFocus={() => dispatch(focus())}
      {...props}
    />
  );
}

function StartElement() {
  return (
    <Flex
      background={'surfaceSecondary'}
      pl={4}
      pr={3}
      zIndex={1}
      alignItems={'center'}
      justifyContent={'center'}
      height={'full'}
    >
      <Icon className={'search-icon'} h={4} w={4} color={'iconSecondary'}>
        <MagnifyingGlass />
      </Icon>
    </Flex>
  );
}

function EndElement({ handleSearch }: { handleSearch: () => void }) {
  const dispatch = useAppDispatch();
  const isSearchFieldFocused = useAppSelector(selectIsSearchFieldFocused);
  const tempSearchTerm = useAppSelector(selectTempSearchTerm);
  return (
    <Flex
      alignItems={'center'}
      background={'surfaceSecondary'}
      px={2}
      zIndex={1}
      gap={1.5}
      height={'100%'}
    >
      {isSearchFieldFocused ? (
        !!tempSearchTerm ? (
          <>
            <Kbd onClick={handleSearch} cursor={'pointer'} display={{ base: 'none', md: 'flex' }}>
              <Icon h={3.5} w={3.5} color={'iconSecondary'}>
                <KeyReturn />
              </Icon>
            </Kbd>
            <Icon
              h={3.5}
              w={3.5}
              color={'iconSecondary'}
              cursor={'pointer'}
              onClick={() => {
                dispatch(clearSearchTerm());
              }}
            >
              <X />
            </Icon>
          </>
        ) : null
      ) : (
        <Kbd display={{ base: 'none', md: 'flex' }}>
          <Icon h={3.5} w={3}>
            <Command />
          </Icon>
          <Text fontSize={'xs'} fontFamily="var(--font-matter-mono)">
            K
          </Text>
        </Kbd>
      )}
    </Flex>
  );
}

function SearchPreview() {
  const scrollLeft = useAppSelector(selectSearchPreviewScrollLeft);
  const tempSearchTerm = useAppSelector(selectTempSearchTerm);
  return (
    <Flex
      fontSize="sm"
      lineHeight="none"
      position="absolute"
      alignItems="center"
      whiteSpace="pre"
      overflow="hidden"
      textOverflow="ellipsis"
      width={'fit-content'}
      justifyContent={'flex-start'}
      style={{ transform: `translateX(-${scrollLeft}px)` }}
      height={'full'}
      color={'textPrimary'}
    >
      {tempSearchTerm
        ?.toString()
        ?.split(new RegExp(`(${advancedSearchKeywords.join('|')})`, 'g'))
        ?.map((segment, index) =>
          advancedSearchKeywords.includes(segment) ? (
            <Text
              key={index}
              display="inline-block"
              bg={{ base: 'feedback.blue-200', _dark: 'feedback.blue-900' }}
              color={{ base: 'feedback.blue-600', _dark: 'feedback.blue-300' }}
              borderRadius="redesign.xs"
              py={1}
              whiteSpace="pre"
              textTransform={'uppercase'}
            >
              {segment}
            </Text>
          ) : (
            <React.Fragment key={index}>{segment}</React.Fragment>
          )
        )}
    </Flex>
  );
}

function SearchInput({
  searchTermFromQueryParams = '',
  ...flexProps
}: { searchTermFromQueryParams?: string } & FlexProps) {
  const dispatch = useAppDispatch();
  const tempSearchTerm = useAppSelector(selectTempSearchTerm);
  const searchTerm = useAppSelector(selectSearchTerm);
  const reg = new RegExp(`(${advancedSearchKeywords.join('|')})`, 'gi');
  const isSearchFieldFocused = useAppSelector(selectIsSearchFieldFocused);
  const router = useRouter();
  const network = useGlobalContext().activeNetwork;
  const searchPageUrl = getSearchPageUrl(tempSearchTerm, network);
  const isAdvancedSearch = advancedSearchKeywords.some(term => tempSearchTerm.includes(term));
  const quickNavUrl = useAppSelector(selectQuickNavUrl);

  const searchResponse = useSearchQuery(searchTerm, true);
  const searchEntityUrl = getSearchEntityUrl(network, searchResponse.data);

  useEffect(() => {
    dispatch(setTempSearchTerm(searchTermFromQueryParams));
  }, [searchTermFromQueryParams, dispatch]);

  const handleSearch = useCallback(() => {
    if (!!quickNavUrl && quickNavUrl === searchEntityUrl) {
      router.push(searchEntityUrl);
      dispatch(blur());
    } else {
      dispatch(focus());
      dispatch(setSearchTerm(tempSearchTerm));
    }
  }, [dispatch, quickNavUrl, router, searchEntityUrl, tempSearchTerm]);

  return (
    <SearchDoubleGradientBorderWrapper {...flexProps}>
      <Flex
        background={'surfaceSecondary'}
        alignItems={'center'}
        width={'full'}
        overflow="hidden"
        position="relative"
        borderRadius="redesign.lg"
        zIndex={3}
      >
        <StartElement />
        <Flex width={'full'} fontFamily="var(--font-instrument-sans)">
          <HiddenSearchField
            placeholder={
              isSearchFieldFocused ? '' : 'Search transactions, addresses, domains, and blocks'
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            onChange={(e: React.FormEvent<HTMLInputElement>) => {
              const formattedValue = e.currentTarget.value.replace(reg, match => {
                return match.toUpperCase();
              });
              dispatch(setTempSearchTerm(formattedValue.trimStart()));
              dispatch(setQuickNavUrl(''));
            }}
            onScroll={(e: React.FormEvent<HTMLInputElement>) =>
              dispatch(setSearchPreviewScrollLeft(e.currentTarget.scrollLeft))
            }
            value={tempSearchTerm}
          />
          <SearchPreview />
        </Flex>
        <EndElement handleSearch={handleSearch} />
      </Flex>
    </SearchDoubleGradientBorderWrapper>
  );
}

export function Search({ fullScreen = false }: { fullScreen?: boolean }) {
  const dispatch = useAppDispatch();
  const searchTermFromQueryParams = buildAdvancedSearchQuery(useFilterParams());
  const recentResults = useRecentResultsLocalStorage();

  const isSearchFieldFocused = useAppSelector(selectIsSearchFieldFocused);
  const searchTerm = useAppSelector(selectSearchTerm);
  const searchResponse = useSearchQuery(searchTerm, true);
  const isLoading = searchResponse.isLoading;

  const Wrapper = useCallback(
    function Wrapper({ children }: { children: ReactNode }) {
      if (fullScreen) {
        return (
          <Flex
            position={isSearchFieldFocused ? 'absolute' : undefined}
            top={4}
            left={3}
            right={3}
            zIndex={2}
            background={'surfaceTertiary'}
          >
            {children}
            {isSearchFieldFocused && (
              <IconButton
                h={12}
                w={12}
                color="iconPrimary"
                onClick={() => {
                  dispatch(blur());
                }}
                bg={'surfacePrimary'}
                position={'absolute'}
                top={-1}
                right={0}
                zIndex={10000}
                borderRadius={'redesign.lg'}
                _hover={{
                  bg: 'surfaceFifth',
                }}
              >
                <X />
              </IconButton>
            )}
          </Flex>
        );
      }
      return children;
    },
    [isSearchFieldFocused, fullScreen, dispatch]
  );

  const inputMaxWidthFullscreen =
    fullScreen && isSearchFieldFocused ? 'calc(100% - var(--stacks-spacing-16))' : 'none';

  return (
    <Wrapper>
      <HStack width="full" position={'relative'} zIndex={'modal'}>
        <SearchInput
          searchTermFromQueryParams={searchTermFromQueryParams}
          maxW={[inputMaxWidthFullscreen, inputMaxWidthFullscreen, inputMaxWidthFullscreen, 'lg']}
          position={fullScreen && isSearchFieldFocused ? 'relative' : undefined}
        />
        {isSearchFieldFocused && (
          <SearchResultsWrapper height={fullScreen ? '100vh' : 'auto'}>
            {isLoading ? null : searchResponse && searchResponse.data ? (
              !searchResponse.data.found ? (
                <Flex pt={18} pb={3} px={4}>
                  <Stack px={4} py={3} bg="surfacePrimary" borderRadius={'redesign.lg'}>
                    <Text textStyle="text-medium-sm" color="textSecondary">
                      No results found.
                    </Text>
                    <Text textStyle="text-regular-sm" color="textSecondary">
                      Try searching with an address, BNS name, transaction ID, token ID, contract
                      ID, Stacks block hash or block height, or a syntax search.
                    </Text>
                  </Stack>
                </Flex>
              ) : (
                <Stack pt={18}>
                  <ResultItems
                    recentResults={[searchResponse.data]}
                    iconType={'enter'}
                    px={3}
                    pb={4}
                    type={ResultItemsType.SearchResults}
                  />
                </Stack>
              )
            ) : (
              <>
                <Stack gap={6}>
                  <Stack px={4} gap={3} pt={16}>
                    <KeywordsPreview />
                  </Stack>
                  <ResultItems
                    title={'Recent results'}
                    recentResults={recentResults}
                    type={ResultItemsType.RecentResults}
                  />
                </Stack>
                {!fullScreen && <QuickLinks />}
              </>
            )}
          </SearchResultsWrapper>
        )}
      </HStack>
      {isSearchFieldFocused && (
        <Flex
          display={fullScreen ? 'none' : 'block'}
          position={'fixed'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor={'blackAlpha.200'}
          backdropFilter={'blur(4px)'}
          zIndex={'overlay'}
          onClick={() => {
            dispatch(blur());
          }}
        />
      )}
    </Wrapper>
  );
}
