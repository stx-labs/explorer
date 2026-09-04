import { buildContextPackPath, sourceSummary } from '../why-failed-utils';

describe('buildContextPackPath', () => {
  it('builds a relative public-network context path', () => {
    expect(buildContextPackPath('0xabc', 'mainnet')).toBe('/txid/0xabc/context.md?chain=mainnet');
  });

  it('omits the query string when no chain is available', () => {
    expect(buildContextPackPath('0xabc')).toBe('/txid/0xabc/context.md');
  });
});

describe('sourceSummary', () => {
  it('omits the called contract name and includes the function and line', () => {
    expect(
      sourceSummary(
        {
          contractId: 'SP000000000000000000002Q6VF78.called',
          functionName: 'execute',
          failingLine: 42,
          lines: [],
        },
        'SP000000000000000000002Q6VF78.called'
      )
    ).toBe('execute · line 42');
  });

  it('identifies a callee contract', () => {
    expect(
      sourceSummary(
        {
          contractId: 'SP000000000000000000002Q6VF78.callee',
          functionName: 'swap',
          lines: [],
        },
        'SP000000000000000000002Q6VF78.called'
      )
    ).toBe('callee · swap');
  });
});
