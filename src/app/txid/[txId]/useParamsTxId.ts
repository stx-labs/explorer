'use client';

import { useParams } from 'next/navigation';

export function useParamsTxId() {
  const params = useParams();
  if (typeof params?.txId !== 'string') {
    throw new Error('Bad txId param');
  }
  return params.txId;
}
