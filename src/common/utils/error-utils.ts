import * as Sentry from '@sentry/nextjs';

/**
 * Converts an unknown error type to a proper Error instance.
 * 
 * @param error - Any thrown error value (Error, string, null, undefined, or unknown)
 * @returns A proper Error instance, creating one if necessary
 * @example
 * try {
 *   riskyOperation();
 * } catch (e) {
 *   const error = ensureError(e);
 *   console.error(error.message);
 * }
 */
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

/**
 * Extracts detailed information from any error type into a structured object.
 * 
 * @param error - Any thrown error value
 * @returns An object containing error details including message, name, and stack
 */
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

/**
 * Logs an error to Sentry with context and severity level.
 * 
 * @param error - The Error instance to log
 * @param transactionName - Name to identify the transaction/operation
 * @param extraData - Additional context data to include in the log
 * @param level - Sentry severity level (defaults to 'error')
 */
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
    }
    return scope;
  });
}

type LogErrorOptions = Record<string, any> & {
  logToConsoleOnly?: boolean;
};

/**
 * Unified error logging function that logs to both console and Sentry.
 * 
 * @param error - The Error to log
 * @param transactionName - Name to identify the operation
 * @param extraData - Additional context
 * @param sentrySeverityLevel - Sentry severity level
 * @param options - Additional options including logToConsoleOnly
 */
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
