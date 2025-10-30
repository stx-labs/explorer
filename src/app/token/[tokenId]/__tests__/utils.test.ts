import { isRiskyNFTContract } from '../utils';

describe('isRiskyNFTContract', () => {
  it('should return true for contract names ending with .StacksDao', () => {
    expect(isRiskyNFTContract('SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.StacksDao')).toBe(true);
  });

  it('should return false for contract names with similar but different endings', () => {
    expect(isRiskyNFTContract('SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.stacksdao')).toBe(false);
    expect(isRiskyNFTContract('SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.StacksDAO')).toBe(false);
    expect(isRiskyNFTContract('SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B.StacksDaoExtra')).toBe(
      false
    );
  });

  it('should return false for invalid contract names', () => {
    expect(isRiskyNFTContract('')).toBe(false);
    expect(isRiskyNFTContract('not-a-contract')).toBe(false);
    expect(isRiskyNFTContract('SP1J45NVEGQ7ZA4M57TGF0RAB00TMYCYG00X8EF5B')).toBe(false);
  });
});
