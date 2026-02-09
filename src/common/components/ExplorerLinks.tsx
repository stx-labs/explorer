'use client';

import { Link, LinkProps } from '@chakra-ui/react';
import { forwardRef } from 'react';

import { useGlobalContext } from '../context/useGlobalContext';
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

export const AddressLink = forwardRef<
  HTMLAnchorElement,
  Partial<LinkProps> & { principal: string }
>(({ principal, ...rest }, ref) => {
  return principal.includes('.') ? (
    <TxLink ref={ref} txId={principal} {...rest} />
  ) : (
    <ExplorerLink ref={ref} href={`/address/${encodeURIComponent(principal)}`} {...rest} />
  );
});
