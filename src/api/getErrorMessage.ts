export function getErrorMessage(error: any) {
  if (typeof error === 'string') return error;
  return (
    error?.reason ||
    error?.message ||
    error?.error ||
    'Something went wrong! Please try again later.'
  );
}
