import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { coloringPage, account } from '@/config/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { PinterestProvider } from '@/extensions/pinterest';
import { envConfigs } from '@/config';
import { updateColoringPage, ColoringPageStatus } from '@/shared/models/coloring_page';
import { getAllConfigs, saveConfigs } from '@/shared/models/config';

export async function GET(request: Request) {
    try {
        // Basic authorization for cron endpoint
        const CRON_SECRET = process.env.CRON_SECRET;
        const authHeader = request.headers.get('authorization');
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Load all configs from database and env
        const allConfigs = await getAllConfigs();

        const appId = allConfigs.pinterest_app_id;
        const appSecret = allConfigs.pinterest_app_secret;
        
        if (!appId || !appSecret) {
            return NextResponse.json({ error: 'Pinterest configuration (App ID/Secret) is missing' }, { status: 500 });
        }

        // Get initial tokens from DB configs
        let refreshToken = allConfigs.pinterest_refresh_token;
        let accessToken = allConfigs.pinterest_access_token;

        // Try to get developer/sandbox tokens if available
        const sandboxToken = process.env.PINTEREST_SANDBOX_TOKEN || process.env.PINTEREST_ACCESS_TOKEN;
        if (!accessToken && sandboxToken) {
            accessToken = sandboxToken;
        }

        // Get Pinterest account from database for specific user if CRON_USER_ID is set
        let pinterestAccount: any = null;
        if (allConfigs.cron_user_id) {
            const accounts = await db()
                .select()
                .from(account)
                .where(eq(account.userId, allConfigs.cron_user_id));

            pinterestAccount = accounts.find(
                (acc: any) => acc.providerId === 'pinterest'
            );

            if (pinterestAccount?.refreshToken) {
                refreshToken = pinterestAccount.refreshToken;
                accessToken = pinterestAccount.accessToken || accessToken;
            }
        }

        if (!refreshToken) {
            return NextResponse.json(
                { error: 'Pinterest refresh token is missing' },
                { status: 500 }
            );
        }

        // Create Pinterest provider with token persistence callback
        const pinterestProvider = new PinterestProvider(
            {
                appId,
                appSecret,
                refreshToken,
                accessToken,
            },
            process.env.PINTEREST_USE_SANDBOX === 'true',
            // Callback to persist rotated tokens to database
            async ({ accessToken: newAccessToken, refreshToken: newRefreshToken }) => {
                const updates: Record<string, string> = {
                    pinterest_access_token: newAccessToken,
                };
                if (newRefreshToken) {
                    updates.pinterest_refresh_token = newRefreshToken;
                }

                // 1. Save to config table (General app settings)
                await saveConfigs(updates);
                console.log('✅ Persisted rotated Pinterest tokens to config table');

                // 2. Save to account table (Specific user account) if applicable
                if (pinterestAccount) {
                    await db()
                        .update(account)
                        .set({
                            accessToken: newAccessToken,
                            refreshToken: newRefreshToken || undefined,
                            updatedAt: new Date(),
                        })
                        .where(eq(account.id, pinterestAccount.id));
                    console.log('✅ Persisted rotated Pinterest tokens to user account table');
                }
            }
        );

        // Fetch up to 10 unpublished pages
        const pagesToPin = await db()
            .select()
            .from(coloringPage)
            .where(
                and(
                    eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
                    isNull(coloringPage.pinterestPinId)
                )
            )
            .limit(10);

        if (pagesToPin.length === 0) {
            return NextResponse.json({ message: 'No pages to pin' });
        }

        const results = [];

        // Process pages sequentially to avoid hitting rate limits
        // In-memory cache for boards found/created in this batch
        const boardCache = new Map<string, string>();

        for (const page of pagesToPin) {
            try {
                // Determine board name from rootKeyword or category
                const boardName = (page.rootKeyword || page.category || 'General').trim();
                const capitalizedBoardName = boardName.charAt(0).toUpperCase() + boardName.slice(1);

                let boardId = boardCache.get(capitalizedBoardName);
                if (!boardId) {
                    boardId = await pinterestProvider.getOrCreateBoardByName(capitalizedBoardName);
                    boardCache.set(capitalizedBoardName, boardId);
                }

                const pinLink = `${envConfigs.app_url}/${page.slug}`;

                // Build rich description with hashtags
                const tags = (page.keyword || '').split(',').map((t: string) => `#${t.trim().replace(/\s+/g, '')}`).join(' ');
                const baseDescription = page.description || `Beautiful ${page.title} for you to color! Download and enjoy.`;
                const fullDescription = `${baseDescription}\n\n${tags}`;

                const pinResult = await pinterestProvider.createPin({
                    boardId,
                    title: page.title,
                    description: fullDescription,
                    link: pinLink,
                    imageUrl: page.imageUrl,
                    altText: page.title,
                });

                // Update database with pin info
                await updateColoringPage(page.id, {
                    pinterestPinId: pinResult.id,
                    pinterestPinUrl: pinResult.link || `https://pinterest.com/pin/${pinResult.id}`,
                });

                results.push({ id: page.id, slug: page.slug, success: true, pinId: pinResult.id });
            } catch (error: any) {
                console.error(`Failed to pin page ${page.id}:`, error);
                results.push({ id: page.id, slug: page.slug, success: false, error: error.message });
            }
        }

        return NextResponse.json({ message: 'Processed batch', results });
    } catch (error: any) {
        console.error('Pinterest cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
