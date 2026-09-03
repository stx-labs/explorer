import { NextRequest } from 'next/server';

import { handleContextPack } from '../context/route-shared';

// GET /txid/{txId}/context.json?chain=mainnet — machine-readable agent context pack.
export async function GET(request: NextRequest, ctx: { params: Promise<{ txId: string }> }) {
  return handleContextPack(request, ctx.params, 'json');
}
