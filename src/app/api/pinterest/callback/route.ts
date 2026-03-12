import { NextRequest, NextResponse } from 'next/server';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { account } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pinterest OAuth 2.0 callback handler
 * Handles the callback after Pinterest authorization, retrieves token and saves to database
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
      `${baseUrl}/settings?error=${encodeURIComponent(`Pinterest authorization failed: ${errorDescription}`)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent('Invalid callback: missing code parameter')}`
    );
  }

  if (
    !envConfigs.pinterest_app_id ||
    !envConfigs.pinterest_app_secret
  ) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent('Pinterest configuration error: missing APP_ID or APP_SECRET')}`
    );
  }

  let userId: string | null = null;

  // Verify state parameter (prevent CSRF attacks)
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;

      // Verify timestamp (state valid for 30 minutes)
      const stateAge = Date.now() - (stateData.timestamp || 0);
      if (stateAge > 30 * 60 * 1000) {
        return NextResponse.redirect(
          `${baseUrl}/settings?error=${encodeURIComponent('Authorization link has expired, please try again')}`
        );
      }
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('Invalid state parameter')}`
      );
    }
  }

  try {
    const appId = envConfigs.pinterest_app_id;
    const appSecret = envConfigs.pinterest_app_secret;
    const redirectUri = `${baseUrl}/api/pinterest/callback`;

    const authString = Buffer.from(`${appId}:${appSecret}`).toString('base64');

    // Exchange code for access token
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
        `${baseUrl}/settings?error=${encodeURIComponent(`Failed to get token: ${data.error_description || data.error || 'Unknown error'}`)}`
      );
    }

    const refreshToken = data.refresh_token;
    const accessToken = data.access_token;
    const expiresIn = data.expires_in; // Usually 3600 seconds (1 hour)

    // If userId exists, save to database
    if (userId) {
      // Check if Pinterest account binding already exists
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
        // Update existing account
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
        // Create new account record
        await db()
          .insert(account)
          .values({
            id: getUuid(),
            accountId: 'pinterest_user', // Pinterest doesn't have user ID, use fixed value
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

    // Redirect back to settings page with success message
    return NextResponse.redirect(
      `${baseUrl}/settings?success=${encodeURIComponent('Pinterest binding successful!')}`
    );

  } catch (error: any) {
    console.error('Pinterest callback error:', error);
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(`An error occurred: ${error.message}`)}`
    );
  }
}
