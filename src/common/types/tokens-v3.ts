import { OperationResponse } from '@stacks/blockchain-api-client';

export type FtHolderListResponse = OperationResponse['get_fungible_token_holders'];

export type FtHolder = FtHolderListResponse['results'][number];

export type FtSupplyResponse = OperationResponse['get_ft_total_supply'];

export type PrincipalNftBalanceListResponse = OperationResponse['get_principal_balances_nft'];
