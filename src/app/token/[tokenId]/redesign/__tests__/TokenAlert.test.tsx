import { NetworkModes } from '@/common/types/network';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { TokenAlert } from '../TokenAlert';
import { useTokenIdPageData } from '../context/TokenIdPageContext';

jest.mock('../context/TokenIdPageContext', () => ({ useTokenIdPageData: jest.fn() }));
jest.mock('@/common/hooks/useSbtcNetworkMode', () => ({
  useSbtcNetworkMode: () => NetworkModes.Testnet,
}));
jest.mock('@/app/txid/[txId]/redesign/Alert', () => ({
  NotSBTCTokenAlert: () => <div>not the official sBTC token</div>,
  RiskyTokenAlert: () => <div>risky token</div>,
}));

const TESTNET_SBTC = 'SN3VMHXEN64ZZF71JQ5VESXDWTR301XTTXGF4J8F1.sbtc-token';
const mockPageData = useTokenIdPageData as jest.MockedFunction<typeof useTokenIdPageData>;

// The original bug: TokenAlert derived the contract id from `assetId`, which is undefined when the
// contract isn't on the active network, yielding the literal "." and a scam banner on real sBTC.
describe('TokenAlert', () => {
  it("does not warn on the active network's official sBTC, even without an assetId", () => {
    mockPageData.mockReturnValue({
      tokenId: TESTNET_SBTC,
      tokenData: { name: 'sBTC', symbol: 'sBTC' },
      assetId: undefined,
    } as unknown as ReturnType<typeof useTokenIdPageData>);

    render(<TokenAlert />);
    expect(screen.queryByText('not the official sBTC token')).not.toBeInTheDocument();
  });

  it('warns on an sBTC look-alike', () => {
    mockPageData.mockReturnValue({
      tokenId: 'ST2K48AP2251KJ45GEZNEEXG4EV8WQBYRPKT13BG9.sbtc-token',
      tokenData: { name: 'sBTC', symbol: 'sBTC' },
      assetId: undefined,
    } as unknown as ReturnType<typeof useTokenIdPageData>);

    render(<TokenAlert />);
    expect(screen.getByText('not the official sBTC token')).toBeInTheDocument();
  });
});
