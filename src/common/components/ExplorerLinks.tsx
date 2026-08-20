'use client';

import { getSbtcContractAddress } from '@/app/token/[tokenId]/consts';
import { Link, LinkProps } from '@chakra-ui/react';
import { forwardRef } from 'react';

import { useGlobalContext } from '../context/useGlobalContext';
import { useSbtcNetworkMode } from '../hooks/useSbtcNetworkMode';
import { buildUrl } from '../utils/buildUrl';

export const ExplorerLink = forwardRef<HTMLAnchorElement, LinkProps & { openInNewTab?: boolean }>(
  ({ href, openInNewTab, ...rest }, ref) => {
    const network = useGlobalContext().activeNetwork;
    return (
      <Link
        ref={ref}
        href={buildUrl(href!, network)}
        {...(openInNewTab && { target: '_blank' })}
        {...rest}
      />
    );
  }
);

export const TxLink = forwardRef<
  HTMLAnchorElement,
  Partial<LinkProps> & { txId: string; openInNewTab?: boolean }
>(({ txId, openInNewTab = false, ...rest }, ref) => {
  return (
    <ExplorerLink
      ref={ref}
      href={`/txid/${encodeURIComponent(txId)}`}
      openInNewTab={openInNewTab}
      {...rest}
    />
  );
});

export const TokenLink = forwardRef<HTMLAnchorElement, Partial<LinkProps> & { tokenId: string }>(
  ({ tokenId, ...rest }, ref) => {
    return <ExplorerLink ref={ref} href={`/token/${encodeURIComponent(tokenId)}`} {...rest} />;
  }
);

// The tokenId is deliberately not a prop: this renders inside the "not the official sBTC token"
// warning, so a caller must not be able to repoint what the UI presents as official.
export const SbtcTokenLink = forwardRef<
  HTMLAnchorElement,
  Omit<Partial<LinkProps>, 'href'> & { fallbackTokenId: string }
>(({ fallbackTokenId, ...rest }, ref) => {
  const contractAddress = getSbtcContractAddress(useSbtcNetworkMode()) ?? fallbackTokenId;
  return <TokenLink ref={ref} {...rest} tokenId={contractAddress} />;
});

export const BlockLink = forwardRef<HTMLAnchorElement, Partial<LinkProps> & { hash: string }>(
  ({ hash, ...rest }, ref) => {
    return <ExplorerLink ref={ref} href={`/block/${encodeURIComponent(hash)}`} {...rest} />;
  }
);

export const BurnBlockLink = forwardRef<
  HTMLAnchorElement,
  Partial<LinkProps> & { heightOrHash: string }
>(({ heightOrHash, ...rest }, ref) => {
  return (
    <ExplorerLink ref={ref} href={`/btcblock/${encodeURIComponent(heightOrHash)}`} {...rest} />
  );
});

export const AddressLink = forwardRef<HTMLAnchorElement, Partial<LinkProps> & { address: string }>(
  ({ address, ...rest }, ref) => {
    return <ExplorerLink ref={ref} href={`/address/${encodeURIComponent(address)}`} {...rest} />;
  }
);
