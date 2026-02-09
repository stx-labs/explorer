import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// This API route handles revalidation requests
// It can be called with:
// - ?path=/some/path to revalidate a specific path
// - ?tag=some-tag to revalidate a specific tag
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const path = searchParams.get('path');
    const tag = searchParams.get('tag');

    if (path) {
      revalidatePath(path);
      return NextResponse.json({
        revalidated: true,
        now: Date.now(),
        path,
      });
    }

    if (tag) {
      revalidateTag(tag, 'max');
      return NextResponse.json({
        revalidated: true,
        now: Date.now(),
        tag,
      });
    }

    return NextResponse.json(
      {
        revalidated: false,
        message: 'No path or tag provided',
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        revalidated: false,
        message: 'Error revalidating',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
