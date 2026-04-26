import { BTC_PRICE_USD, CRYPTO_PRICES_SOURCE, STX_PRICE_USD } from '@/lib/crypto-prices.config';

import { useCryptoPrices } from '../useCryptoPrices';

describe('useCryptoPrices', () => {
  it('returns STX/BTC USD rates and source from shared config', () => {
    const { stx, btc, source } = useCryptoPrices();
    expect(stx).toBe(STX_PRICE_USD);
    expect(btc).toBe(BTC_PRICE_USD);
    expect(source).toBe(CRYPTO_PRICES_SOURCE);
  });
});
