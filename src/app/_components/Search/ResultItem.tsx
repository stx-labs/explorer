import { useAppDispatch } from '@/common/state/hooks';
import {
  blur,
  setQuickNavUrl,
  setSearchTerm,
  setTempSearchTerm,
} from '@/features/search/search-slice';
import { Flex, FlexProps, Icon } from '@chakra-ui/react';
import { ArrowRight, KeyReturn } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import {
  MempoolTenureChangeTransaction,
  MempoolTransaction,
  TenureChangeTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';

import {
  CoinbaseTxs,
  ContractCallTxs,
  ContractDeployTxs,
  TokenTransferTxs,
} from '../../../common/types/tx';
import {
  getContractName,
  microToStacksFormatted,
  truncateMiddleDeprecated,
} from '../../../common/utils/utils';
import { Text } from '../../../ui/Text';
import StxIcon from '../../../ui/icons/StxIcon';
import { SearchItemTitle } from './SearchItemTitle';
import { TxTag } from './TxTag';

function ResultItemWrapper({ children, ...props }: FlexProps) {
  return (
    <Flex
      background={'surfacePrimary'}
      borderRadius={'redesign.md'}
      px={3.5}
      py={3}
      alignItems={'center'}
      gap={2}
      justifyContent={'space-between'}
      cursor={'pointer'}
      _hover={{
        background: 'surfaceFifth',
      }}
      {...props}
    >
      {children}
    </Flex>
  );
}

function ResultItemIcon({ type, url }: { type?: 'arrow' | 'enter' | undefined; url: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    if (type === 'enter') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          dispatch(blur());
          router.push(url);
          dispatch(setTempSearchTerm(''));
          dispatch(setSearchTerm(''));
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [type, url, dispatch, router]);

  if (type === 'enter') {
    return (
      <Flex
        alignItems={'center'}
        gap={1.5}
        flex={'0 0 auto'}
        display={{ base: 'none', md: 'flex' }}
      >
        <Icon h={3.5} w={3.5} color={'iconSecondary'}>
          <KeyReturn />
        </Icon>
        <Text fontSize={'xs'} color={'textSecondary'}>
          Enter
        </Text>
      </Flex>
    );
  }
  if (type === 'arrow') {
    return (
      <Icon h={4} w={4} color={'iconSecondary'}>
        <ArrowRight />
      </Icon>
    );
  }
  return null;
}

export function ResultItem({
  value,
  url,
  iconType = 'arrow',
}: {
  value: string;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  return (
    <ResultItemWrapper
      onClick={() => {
        dispatch(blur());
        router.push(url);
        dispatch(setTempSearchTerm(''));
        dispatch(setSearchTerm(''));
      }}
    >
      <SearchItemTitle>{value}</SearchItemTitle>
      <ResultItemIcon type={iconType} url={url} />
    </ResultItemWrapper>
  );
}

function TxResultItem({
  tx,
  children,
  iconType = 'arrow',
  url,
}: {
  tx: Transaction | MempoolTransaction;
  children: ReactNode;
  iconType?: 'arrow' | 'enter';
  url: string;
}) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(setQuickNavUrl(url));
    return () => {
      dispatch(setQuickNavUrl(''));
    };
  }, [dispatch, url]);
  const router = useRouter();
  return (
    <ResultItemWrapper
      onClick={() => {
        dispatch(blur());
        router.push(url);
        dispatch(setTempSearchTerm(''));
        dispatch(setSearchTerm(''));
      }}
    >
      <Flex gap={4} flex={'1 1 auto'} minWidth={0}>
        {children}
        <TxTag
          type={
            tx.tx_status === 'pending'
              ? 'pending'
              : tx.tx_status === 'success'
                ? 'confirmed'
                : 'failed'
          }
        />
      </Flex>
      <ResultItemIcon type={iconType} url={url} />
    </ResultItemWrapper>
  );
}

export function TokenTransferResultItem({
  tx,
  url,
  iconType = 'arrow',
}: {
  tx: TokenTransferTxs;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  return (
    <TxResultItem tx={tx} iconType={iconType} url={url}>
      <SearchItemTitle href={url}>
        {microToStacksFormatted(tx.token_transfer.amount)} STX
      </SearchItemTitle>
      <Flex gap={1.5} alignItems={'center'}>
        <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
          {truncateMiddleDeprecated(tx.sender_address, 4)}
        </Text>
        <Icon h={4} w={4} color={'textTertiary'}>
          <ArrowRight />
        </Icon>
        <Text fontSize={'sm'} color={'textSecondary'} whiteSpace={'nowrap'}>
          {truncateMiddleDeprecated(tx.token_transfer.recipient_address, 4)}
        </Text>
      </Flex>
    </TxResultItem>
  );
}

export function ContractDeployResultItem({
  tx,
  url,
  iconType,
}: {
  tx: ContractDeployTxs;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  return (
    <TxResultItem tx={tx} url={url} iconType={iconType}>
      <SearchItemTitle href={url}>{getContractName(tx.smart_contract.contract_id)}</SearchItemTitle>
      <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
        {truncateMiddleDeprecated(tx.tx_id, 4)}
      </Text>
    </TxResultItem>
  );
}

export function ContractCallResultItem({
  tx,
  url,
  iconType = 'arrow',
}: {
  tx: ContractCallTxs;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  return (
    <TxResultItem tx={tx} url={url} iconType={iconType}>
      <SearchItemTitle href={url}>{tx.contract_call.function_name}</SearchItemTitle>
      <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
        {truncateMiddleDeprecated(tx.tx_id, 4)}
      </Text>
    </TxResultItem>
  );
}

export function CoinbaseResultItem({
  tx,
  url,
  iconType = 'arrow',
}: {
  tx: CoinbaseTxs;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  return (
    <TxResultItem tx={tx} url={url} iconType={iconType}>
      <SearchItemTitle href={url}>Coinbase</SearchItemTitle>
      <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
        {truncateMiddleDeprecated(tx.tx_id, 4)}
      </Text>
    </TxResultItem>
  );
}

export function TenureChangeResultItem({
  tx,
  url,
  iconType = 'arrow',
}: {
  tx: TenureChangeTransaction | MempoolTenureChangeTransaction;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  return (
    <TxResultItem tx={tx} url={url} iconType={iconType}>
      <SearchItemTitle href={url}>Tenure Change</SearchItemTitle>
      <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
        {truncateMiddleDeprecated(tx.tx_id, 4)}
      </Text>
    </TxResultItem>
  );
}

export function BnsResultItem({
  bns,
  address,
  url,
  iconType = 'arrow',
}: {
  bns: string;
  address: string;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  return (
    <ResultItemWrapper
      onClick={() => {
        dispatch(blur());
        router.push(url);
        dispatch(setTempSearchTerm(''));
        dispatch(setSearchTerm(''));
      }}
    >
      <Flex gap={4} flex={'1 1 auto'} minWidth={0}>
        <SearchItemTitle href={url}>{bns}</SearchItemTitle>
        <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
          {truncateMiddleDeprecated(address, 5)}
        </Text>
      </Flex>
      <ResultItemIcon type={iconType} url={url} />
    </ResultItemWrapper>
  );
}

export function BlockResultItem({
  height,
  hash,
  url,
  iconType = 'arrow',
}: {
  height: number;
  hash: string;
  url: string;
  iconType?: 'arrow' | 'enter';
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  return (
    <ResultItemWrapper
      py={2.5}
      onClick={() => {
        dispatch(blur());
        router.push(url);
        dispatch(setTempSearchTerm(''));
        dispatch(setSearchTerm(''));
      }}
    >
      <Flex gap={4} flex={'1 1 auto'} minWidth={0}>
        <SearchItemTitle href={url}>
          <Flex
            alignItems={'center'}
            gap={1.5}
            background={'surfaceTertiary'}
            px={1.5}
            py={1}
            borderRadius={'redesign.md'}
          >
            <Icon
              h={4}
              w={4}
              color={'white'}
              background={'accent.stacks-500'}
              px={1}
              borderRadius={'redesign.xs'}
            >
              <StxIcon />
            </Icon>
            <Text
              color={'textPrimary'}
              textDecoration={'underline'}
              fontSize={'sm'}
              lineHeight={'base'}
              fontFamily="var(--font-matter-mono)"
            >
              #{height}
            </Text>
          </Flex>
        </SearchItemTitle>
        <Text fontSize={'sm'} color={'textPrimary'} whiteSpace={'nowrap'}>
          {truncateMiddleDeprecated(hash, 4)}
        </Text>
      </Flex>
      <ResultItemIcon type={iconType} url={url} />
    </ResultItemWrapper>
  );
}
