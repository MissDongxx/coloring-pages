import { NextRequest, NextResponse } from 'next/server';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { account } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/core/auth';
import { PinterestProvider } from '@/extensions/pinterest/pinterest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 分享内容到 Pinterest
 * POST /api/pinterest/share
 * Body: { imageUrl, description, link, boardId? }
 */
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const { imageUrl, description, link, boardId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // 查找用户的 Pinterest 账号绑定
    const accounts = await db()
      .select()
      .from(account)
      .where(eq(account.userId, session.user.id));

    const pinterestAccount = accounts.find(
      (acc: any) => acc.providerId === 'pinterest'
    );

    if (!pinterestAccount || !pinterestAccount.refreshToken) {
      return NextResponse.json(
        { error: 'Pinterest not connected - Please bind your account first' },
        { status: 400 }
      );
    }

    // 使用沙盒 token 或用户的 refresh token 创建 Pinterest provider
    // 注意：试用版应用需要使用沙盒环境
    const sandboxToken = process.env.PINTEREST_SANDBOX_TOKEN;

    const pinterest = new PinterestProvider({
      appId: envConfigs.pinterest_app_id || '',
      appSecret: envConfigs.pinterest_app_secret || '',
      // 使用沙盒 token 时，refreshToken 可以是空字符串
      refreshToken: sandboxToken ? '' : (pinterestAccount.refreshToken || ''),
      // 沙盒 token（可选）
      accessToken: sandboxToken,
    }, true, // 使用沙盒环境
    // Callback to persist rotated tokens to database
    async ({ accessToken, refreshToken: newRefreshToken, expiresIn }) => {
      if (!sandboxToken) {
        // Only persist if we're not using sandbox token
        const accessTokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
        await db()
          .update(account)
          .set({
            accessToken,
            refreshToken: newRefreshToken,
            accessTokenExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(account.id, pinterestAccount.id));
        console.log('Persisted rotated Pinterest tokens to database');
      }
    });

    // 如果没有指定 boardId，获取用户的第一个 board
    let targetBoardId = boardId;
    if (!targetBoardId) {
      const boards = await pinterest.getBoards();
      if (boards.length === 0) {
        return NextResponse.json(
          { error: 'No Pinterest boards found - Please create a board first' },
          { status: 400 }
        );
      }
      targetBoardId = boards[0].id;
    }

    // Pinterest 不接受 localhost URL，需要过滤掉
    let validLink = link || process.env.NEXT_PUBLIC_APP_URL;
    if (validLink && (validLink.includes('localhost') || validLink.includes('127.0.0.1'))) {
      validLink = undefined; // 移除 localhost 链接
    }

    // 创建 Pin
    const pin = await pinterest.createPin({
      boardId: targetBoardId,
      title: description?.split('\n')[0] || 'Coloring Page',
      description: description || 'Check out this coloring page!',
      link: validLink,
      imageUrl: imageUrl,
    });

    return NextResponse.json({
      success: true,
      pin: {
        id: pin.id,
        url: `https://pinterest.com/pin/${pin.id}`,
      },
    });
  } catch (error: any) {
    console.error('Error sharing to Pinterest:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to share to Pinterest' },
      { status: 500 }
    );
  }
}
