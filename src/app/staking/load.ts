import { logError } from '@/common/utils/error-utils';

export async function load<T>(
  request: Promise<T>,
  context: string,
  chain: string
): Promise<T | undefined> {
  try {
    return await request;
  } catch (error) {
    logError(error as Error, context, { chain }, 'error');
    return undefined;
  }
}
