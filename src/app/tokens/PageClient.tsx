'use client';

import type { NextPage } from 'next';
import React from 'react';

import { Sip10Disclaimer } from '../../common/components/Sip10Disclaimer';
import { PageTitle } from '../_components/PageTitle';
import { TokensList } from './TokensList/TokensList';
// Adding a commit to test the PR process

export const TokensPageLayout = ({
  title,
  tokensList,
  disclaimer,
}: {
  title: React.ReactNode;
  tokensList: React.ReactNode;
  disclaimer: React.ReactNode;
}) => (
  <>
    {title}
    {tokensList}
    {disclaimer}
  </>
);

const TokensPage: NextPage = () => (
  <TokensPageLayout
    title={<PageTitle>Token Tracker</PageTitle>}
    tokensList={<TokensList />}
    disclaimer={<Sip10Disclaimer />}
  />
);

export default TokensPage;
