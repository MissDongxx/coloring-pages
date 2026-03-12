import { NextRequest, NextResponse } from 'next/server';
import { envConfigs } from '@/config';
import { getAuth } from '@/core/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pinterest OAuth 2.0 授权流程
 * 用户点击"绑定 Pinterest"按钮后，重定向到此端点
 * 然后重定向到 Pinterest 授权页面
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
  // 去除末尾斜杠，防止双斜杠问题
  const baseUrl = appUrl.replace(/\/+$/, '');
  const redirectUri = `${baseUrl}/api/pinterest/callback`;

  // 生成 state 参数用于防止 CSRF 攻击
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })
  ).toString('base64');

  // 构建 Pinterest OAuth 授权 URL
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'boards:read,boards:write,pins:read,pins:write');
  authUrl.searchParams.set('state', state);

  // 重定向到 Pinterest 授权页面
  return NextResponse.redirect(authUrl.toString());
}
