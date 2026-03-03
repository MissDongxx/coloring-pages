import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * 图片代理 API
 * 用于处理 Cloudflare R2 图片的 CORS 问题
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  // Validate URL format
  let validatedUrl: URL;
  try {
    validatedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // Only allow http/https protocols
  if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ColoringPagesBot/1.0)',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Validate content type is an image
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: `Invalid content type: ${contentType}` },
        { status: 400 }
      );
    }

    // Set CORS headers and caching
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(response.body, { headers });
  } catch (error) {
    // Handle timeout errors
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout - image took too long to load' },
        { status: 504 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'Failed to fetch image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS 处理（用于 CORS 预检）
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
