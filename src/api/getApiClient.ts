import { createClient } from '@stacks/blockchain-api-client';

import packageJson from '../../package.json';
import { RELEASE_TAG_NAME } from '../common/constants/env';

export const getApiClient = (baseUrl?: string) => {
  const apiClient = createClient({
    baseUrl,
  });

  apiClient.use({
    onRequest({ request }) {
      request.headers.set('x-hiro-product', 'explorer');
      request.headers.set('x-hiro-version', RELEASE_TAG_NAME || packageJson.version);
      // Add API key if available
      const apiKey = process.env.EXPLORER_STACKS_API_KEY || 'f79539a1def17c46e9c73f7ec1827b63';
      if (apiKey) {
        request.headers.set('x-api-key', apiKey);
      }
      return request;
    },
  });

  return apiClient;
};
