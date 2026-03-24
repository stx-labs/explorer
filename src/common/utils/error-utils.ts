import * as Sentry from '@sentry/nextjs';

export function ensureError(error: unknown): Error {
  if (error == null) {
    return new Error('An unknown error occurred');
  }

  if (error instanceof Error) {
    return error;
  }

  const message = typeof error === 'string' ? error : 'An unknown error occurred';
  return new Error(message);
}

export function extractErrorDetails(error: unknown): Partial<Error> & Record<string, any> {
  const errorDetails: Partial<Error> & Record<string, any> = {
    message: 'An unknown error occurred',
    name: 'Unknown',
    stack: '',
  };

  if (error instanceof Error) {
    return {
      ...error,
      message: error.message,
      name: error.name,
      stack: error.stack ?? '',
    };
  } else if (typeof error === 'string') {
    errorDetails.message = error;
  } else if (typeof error === 'number') {
    errorDetails.message = `Error code: ${error}`;
  } else if (error && typeof error === 'object') {
    try {
      errorDetails.message = JSON.stringify(error);
    } catch {
      errorDetails.message = '[Circular]';
    }

    Object.assign(errorDetails, error);

    if ('name' in error) errorDetails.name = (error as any).name;
    if ('stack' in error) errorDetails.stack = (error as any).stack;
    if ('message' in error) errorDetails.message = (error as any).message;
  }

  return errorDetails;
}

export function logErrorInSentry(
  error: Error,
  transactionName: string,
  extraData?: { [key: string]: any },
  level?: Sentry.SeverityLevel
) {
  Sentry.captureException(error, scope => {
    scope.setLevel(level || 'error');
    if (transactionName) {
      scope.setTransactionName(transactionName);
    }
    if (extraData) {
      scope.setContext('app-context', extraData);
      // Set tags for easy filtering in Sentry UI
      if (extraData.status) scope.setTag('status', String(extraData.status));
      if (extraData.apiUrl) scope.setTag('api_url', extraData.apiUrl);
      if (extraData.requestId) scope.setTag('request_id', extraData.requestId);
    }
    return scope;
  });
}

type LogErrorOptions = Record<string, any> & {
  logToConsoleOnly?: boolean;
};

export function logError(
  error: Error,
  transactionName: string,
  extraData?: Record<string, any>,
  sentrySeverityLevel?: Sentry.SeverityLevel,
  options?: LogErrorOptions
) {
  const checkedError = ensureError(error);
  const errorDetails = extractErrorDetails(error);
  const updatedExtraData = { ...extraData, errorDetails };

  console.error(checkedError, updatedExtraData);
  if (options?.logToConsoleOnly) {
    return;
  }

  logErrorInSentry(checkedError, transactionName, { ...updatedExtraData }, sentrySeverityLevel);
}
