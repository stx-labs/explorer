function stringifyError(error: any): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'reason' in error) return String(error.reason);
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  if (error && typeof error === 'object' && 'error' in error) return String(error.error);
  try {
    return JSON.stringify(error);
  } catch {
    return 'Something went wrong! Please try again later.';
  }
}

export function getErrorMessage(error: any) {
  const message = stringifyError(error);
  return message && message !== '{}' ? message : 'Something went wrong! Please try again later.';
}
