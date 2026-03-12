import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { account } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/core/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取用户的 Pinterest 绑定状态
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 查找用户的 Pinterest 账号绑定
    const accounts = await db()
      .select()
      .from(account)
      .where(eq(account.userId, session.user.id));

    const pinterestAccount = accounts.find(
      (acc: any) => acc.providerId === 'pinterest'
    );

    if (!pinterestAccount) {
      return NextResponse.json({
        connected: false,
      });
    }

    // 检查 token 是否过期
    const isExpired = pinterestAccount.accessTokenExpiresAt
      ? new Date(pinterestAccount.accessTokenExpiresAt) < new Date()
      : false;

    return NextResponse.json({
      connected: true,
      accountId: pinterestAccount.accountId,
      hasRefreshToken: !!pinterestAccount.refreshToken,
      tokenExpired: isExpired,
      expiresAt: pinterestAccount.accessTokenExpiresAt,
    });
  } catch (error: any) {
    console.error('Error getting Pinterest status:', error);
    return NextResponse.json(
      { error: 'Failed to get Pinterest status' },
      { status: 500 }
    );
  }
}

/**
 * 解除 Pinterest 绑定
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 查找并删除用户的 Pinterest 账号绑定
    const accounts = await db()
      .select()
      .from(account)
      .where(eq(account.userId, session.user.id));

    const pinterestAccount = accounts.find(
      (acc: any) => acc.providerId === 'pinterest'
    );

    if (!pinterestAccount) {
      return NextResponse.json({
        success: true,
        message: '未找到 Pinterest 绑定',
      });
    }

    await db()
      .delete(account)
      .where(eq(account.id, pinterestAccount.id));

    return NextResponse.json({
      success: true,
      message: 'Pinterest 绑定已解除',
    });
  } catch (error: any) {
    console.error('Error disconnecting Pinterest:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Pinterest' },
      { status: 500 }
    );
  }
}
