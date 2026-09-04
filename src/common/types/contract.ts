'use client';

import type { OperationResponse } from '@stacks/blockchain-api-client';
import { ContractInterfaceResponse } from '@stacks/stacks-blockchain-api-types';

type ContractApiResponse = OperationResponse['/extended/v1/contract/{contract_id}'];

export type ContractWithParsedAbi = Omit<ContractApiResponse, 'abi' | 'clarity_version'> & {
  abi?: ContractInterfaceResponse;
  /** Older SSR contract types omit this field even though the generated endpoint includes it. */
  clarity_version?: number | null;
};
