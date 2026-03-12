import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { account } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/core/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get user's Pinterest binding status
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
    // Find user's Pinterest account binding
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

    // Check if token has expired
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
 * Unbind Pinterest account
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
    // Find and delete user's Pinterest account binding
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
        message: 'No Pinterest binding found',
      });
    }

    await db()
      .delete(account)
      .where(eq(account.id, pinterestAccount.id));

    return NextResponse.json({
      success: true,
      message: 'Pinterest binding has been removed',
    });
  } catch (error: any) {
    console.error('Error disconnecting Pinterest:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Pinterest' },
      { status: 500 }
    );
  }
}
