import { NextRequest, NextResponse } from 'next/server';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { account, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pinterest OAuth 2.0 回调处理
 * 处理 Pinterest 授权后的回调，获取 token 并保存到数据库
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = envConfigs.app_url || 'http://localhost:3000';
  // 去除末尾斜杠，防止双斜杠问题
  const baseUrl = appUrl.replace(/\/+$/, '');

  // Handle authorization error or denial
  if (error) {
    const errorDescription = searchParams.get('error_description') || error;
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(`Pinterest 授权失败: ${errorDescription}`)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent('无效的回调：缺少 code 参数')}`
    );
  }

  if (
    !envConfigs.pinterest_app_id ||
    !envConfigs.pinterest_app_secret
  ) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent('Pinterest 配置错误：缺少 APP_ID 或 APP_SECRET')}`
    );
  }

  let userId: string | null = null;

  // 验证 state 参数（防止 CSRF 攻击）
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;

      // 验证时间戳（state 有效期 30 分钟）
      const stateAge = Date.now() - (stateData.timestamp || 0);
      if (stateAge > 30 * 60 * 1000) {
        return NextResponse.redirect(
          `${baseUrl}/settings?error=${encodeURIComponent('授权链接已过期，请重试')}`
        );
      }
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('无效的 state 参数')}`
      );
    }
  }

  try {
    const appId = envConfigs.pinterest_app_id;
    const appSecret = envConfigs.pinterest_app_secret;
    const redirectUri = `${baseUrl}/api/pinterest/callback`;

    const authString = Buffer.from(`${appId}:${appSecret}`).toString('base64');

    // 交换 code 获取 access token
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await tokenResponse.json() as any;

    if (!tokenResponse.ok) {
      console.error('Pinterest token error:', data);
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent(`获取 Token 失败: ${data.error_description || data.error || '未知错误'}`)}`
      );
    }

    const refreshToken = data.refresh_token;
    const accessToken = data.access_token;
    const expiresIn = data.expires_in; // 通常是 3600 秒（1小时）

    // 如果有 userId，保存到数据库
    if (userId) {
      // 检查是否已存在 Pinterest 账号绑定
      const existingAccounts = await db()
        .select()
        .from(account)
        .where(eq(account.userId, userId));

      const pinterestAccount = existingAccounts.find(
        (acc: any) => acc.providerId === 'pinterest'
      );

      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiresIn * 1000);

      if (pinterestAccount) {
        // 更新现有账号
        await db()
          .update(account)
          .set({
            accessToken: accessToken,
            refreshToken: refreshToken,
            accessTokenExpiresAt: expiresAt,
            updatedAt: now,
          })
          .where(eq(account.id, pinterestAccount.id));
      } else {
        // 创建新账号记录
        await db()
          .insert(account)
          .values({
            id: getUuid(),
            accountId: 'pinterest_user', // Pinterest 没有用户 ID，使用固定值
            providerId: 'pinterest',
            userId: userId,
            accessToken: accessToken,
            refreshToken: refreshToken,
            accessTokenExpiresAt: expiresAt,
            scope: 'boards:read,boards:write,pins:read,pins:write',
            createdAt: now,
            updatedAt: now,
          });
      }
    }

    // 重定向回设置页面，显示成功消息
    return NextResponse.redirect(
      `${baseUrl}/settings?success=${encodeURIComponent('Pinterest 绑定成功！')}`
    );

  } catch (error: any) {
    console.error('Pinterest callback error:', error);
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(`发生错误: ${error.message}`)}`
    );
  }
}
