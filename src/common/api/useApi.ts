'use client';

import { createClient } from '@stacks/token-metadata-api-client';

import { useGlobalContext } from '../context/useGlobalContext';

export const useMetadataApi = () => {
  const basePath = useGlobalContext().activeNetworkKey;
  return createClient({ baseUrl: basePath });
};
