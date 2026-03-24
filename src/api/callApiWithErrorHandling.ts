import { PathsWithMethod } from 'openapi-typescript-helpers';

import { OperationResponse } from '@stacks/blockchain-api-client';
import { paths } from '@stacks/blockchain-api-client/lib/generated/schema';

import { logError } from '../common/utils/error-utils';
import { getErrorMessage } from './getErrorMessage';
import { useApiClient } from './useApiClient';

const ERROR_TRANSACTION_NAME = 'api-call-error';

type ExtractPath<Endpoint extends keyof paths> = paths[Endpoint];

type ApiParams<Endpoint extends keyof paths> =
  ExtractPath<Endpoint> extends {
    get: { parameters: infer Params };
  }
    ? { params: Params }
    : { params?: never };

export async function callApiWithErrorHandling<Endpoint extends PathsWithMethod<paths, 'get'>>(
  apiClient: ReturnType<typeof useApiClient>,
  apiUrl: Endpoint,
  apiParams?: ApiParams<Endpoint>
): Promise<OperationResponse[Endpoint]> {
  const { error, data, response } = await apiClient.GET(apiUrl, apiParams as any);

  if (error) {
    const errorObj = new Error(getErrorMessage(error)) as any;
    const requestId = response?.headers?.get?.('x-request-id');
    const status = response?.status ?? 'unknown';

    errorObj.status = status;
    if (requestId) {
      errorObj.requestId = requestId;
    }

    logError(errorObj, ERROR_TRANSACTION_NAME, {
      apiUrl,
      apiParams,
      status,
      requestId,
      fullUrl: response?.url,
    });
    throw errorObj;
  }

  return data as OperationResponse[Endpoint];
}
