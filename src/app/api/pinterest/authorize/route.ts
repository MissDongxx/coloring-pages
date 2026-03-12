import { NextRequest, NextResponse } from 'next/server';
import { envConfigs } from '@/config';
import { getAuth } from '@/core/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pinterest OAuth 2.0 authorization flow
 * After user clicks "Connect Pinterest" button, redirect to this endpoint
 * Then redirect to Pinterest authorization page
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - Please login first' },
      { status: 401 }
    );
  }

  if (
    !envConfigs.pinterest_app_id
  ) {
    return NextResponse.json(
      { error: 'Pinterest app not configured - Please set PINTEREST_APP_ID' },
      { status: 500 }
    );
  }

  const appId = envConfigs.pinterest_app_id;
  const appUrl = envConfigs.app_url || 'http://localhost:3000';
  // Remove trailing slash to prevent double slash issues
  const baseUrl = appUrl.replace(/\/+$/, '');
  const redirectUri = `${baseUrl}/api/pinterest/callback`;

  // Generate state parameter to prevent CSRF attacks
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })
  ).toString('base64');

  // Build Pinterest OAuth authorization URL
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'boards:read,boards:write,pins:read,pins:write');
  authUrl.searchParams.set('state', state);

  // Redirect to Pinterest authorization page
  return NextResponse.redirect(authUrl.toString());
}
