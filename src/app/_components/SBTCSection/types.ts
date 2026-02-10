export interface SBTCData {
  totalSupply: number;
  totalSupplyUsd: number;
  btcPrice: number;
  recentTransactions: SBTCTransaction[];
}

export interface SBTCTransaction {
  txId: string;
  type: 'deposit' | 'withdrawal';
  address: string;
  amount: number;
  amountUsd: number;
  blockTime: number;
}
