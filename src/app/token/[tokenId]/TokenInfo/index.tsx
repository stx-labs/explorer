import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { getIsSBTC } from '../../../../app/tokens/utils';
import { StatsWrapper } from '../../../_components/Stats/StatsWrapper';
import { MergedTokenData } from '../types';
import { MarketCap } from './MarketCap';
import { Price } from './Price';
import { Supply } from './Supply';
import { Transaction } from './Transaction';

export const TokenInfo: FC<{ tokenInfo: MergedTokenData; tokenId: string }> = ({
  tokenInfo,
  tokenId,
}) => {
  const circulatingSupply =
    tokenInfo?.extended?.circulatingSupply || tokenInfo?.basic?.circulatingSupply;
  const currentPrice = tokenInfo?.extended?.currentPrice;
  const isSBTC = getIsSBTC(tokenId);
  const sBTCMarketCapOverride = // LunarCrush is returning an incorrect circulating supply for SBTC, resulting in an incorrect market cap. Manually overriding it here.
    circulatingSupply && currentPrice ? circulatingSupply * currentPrice : undefined;
  return (
    <ErrorBoundary fallbackRender={() => null}>
      <StatsWrapper>
        <Supply
          borderRightWidth={['0px', '0px', '1px', '1px']}
          circulatingSupply={circulatingSupply}
          totalSupply={tokenInfo.basic?.totalSupply}
        />
        <Price
          currentPrice={tokenInfo.extended?.currentPrice}
          priceChangePercentage24h={tokenInfo.extended?.priceChangePercentage24h}
          currentPriceInBtc={tokenInfo.extended?.currentPriceInBtc}
          borderRightWidth={['0px', '0px', '0px', '1px']}
          tokenId={tokenId}
        />
        <MarketCap
          marketCap={tokenInfo.extended?.marketCap}
          tradingVolume24h={tokenInfo.extended?.tradingVolume24h}
          tradingVolumeChangePercentage24h={tokenInfo.extended?.tradingVolumeChangePercentage24h}
          borderRightWidth={['0px', '0px', '1px', '1px']}
          marketCapOverride={isSBTC ? sBTCMarketCapOverride : undefined}
        />
        <Transaction
          txId={tokenId}
          marketCapRank={isSBTC ? null : tokenInfo.extended?.marketCapRank}
        />
      </StatsWrapper>
    </ErrorBoundary>
  );
};
