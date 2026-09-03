import { NextRequest } from 'next/server';

import { handleContextPack } from '../context/route-shared';

// GET /txid/{txId}/context.md?chain=mainnet — agent context pack for a failed contract call.
export async function GET(request: NextRequest, ctx: { params: Promise<{ txId: string }> }) {
  return handleContextPack(request, ctx.params, 'markdown');
}
