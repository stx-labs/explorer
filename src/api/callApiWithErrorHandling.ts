import { PathsWithMethod } from 'openapi-typescript-helpers';

import { OperationResponse } from '@stacks/blockchain-api-client';
import { paths } from '@stacks/blockchain-api-client/lib/generated/schema';

import { logError } from '../common/utils/error-utils';
import { ApiError, getApiErrorFingerprint, getApiErrorSeverity } from './ApiError';
import { getErrorMessage } from './getErrorMessage';
import { useApiClient } from './useApiClient';

const ERROR_TRANSACTION_NAME = 'api-call-error';
const ERROR_BODY_MAX_LENGTH = 2048;

function truncateErrorBody(body: unknown): string {
  try {
    const str = typeof body === 'string' ? body : JSON.stringify(body);
    return str.length > ERROR_BODY_MAX_LENGTH
      ? `${str.slice(0, ERROR_BODY_MAX_LENGTH)}…[truncated]`
      : str;
  } catch {
    return '[unserializable]';
  }
}

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
    const status = response?.status;
    const endpoint = apiUrl as string;
    const method = 'GET';
    const message = getErrorMessage(error);
    const apiError = new ApiError({
      message: status ? `${message} (${status})` : message,
      status,
      endpoint,
      method,
    });

    logError(
      apiError,
      ERROR_TRANSACTION_NAME,
      { apiParams, status, errorBody: truncateErrorBody(error) },
      getApiErrorSeverity(status),
      { fingerprint: getApiErrorFingerprint(endpoint, method, status) },
      {
        'api.endpoint': endpoint,
        'api.method': method,
        ...(status !== undefined ? { 'api.status': String(status) } : {}),
      }
    );
    throw apiError;
  }

  return data as OperationResponse[Endpoint];
}
