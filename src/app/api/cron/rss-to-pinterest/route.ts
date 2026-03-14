import { NextResponse } from 'next/server';
import { PinterestProvider } from '@/extensions/pinterest';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { coloringPage, account } from '@/config/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseStringPromise } from 'xml2js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Basic authorization for cron endpoint
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !envConfigs.pinterest_app_id ||
      !envConfigs.pinterest_app_secret
    ) {
      return NextResponse.json(
        { error: 'Pinterest configuration is missing' },
        { status: 500 }
      );
    }

    // Get Pinterest account from database or fall back to env var
    let pinterestAccount: any = null;
    let useFallbackToken = false;

    if (envConfigs.cron_user_id) {
      // Try to get Pinterest account from database for the cron user
      const accounts = await db()
        .select()
        .from(account)
        .where(eq(account.userId, envConfigs.cron_user_id));

      pinterestAccount = accounts.find(
        (acc: any) => acc.providerId === 'pinterest'
      );

      if (!pinterestAccount || !pinterestAccount.refreshToken) {
        console.warn('No Pinterest account found for cron user, falling back to env var');
        useFallbackToken = true;
      }
    } else {
      console.log('CRON_USER_ID not set, using fallback token from environment');
      useFallbackToken = true;
    }

    // Check if we have a valid refresh token
    const refreshToken = pinterestAccount?.refreshToken || envConfigs.pinterest_refresh_token;
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Pinterest refresh token is missing' },
        { status: 500 }
      );
    }

    // Create Pinterest provider with token persistence callback
    const pinterestProvider = new PinterestProvider(
      {
        appId: envConfigs.pinterest_app_id,
        appSecret: envConfigs.pinterest_app_secret,
        refreshToken,
        accessToken: process.env.PINTEREST_SANDBOX_TOKEN || process.env.PINTEREST_ACCESS_TOKEN,
      },
      process.env.PINTEREST_USE_SANDBOX === 'true',
      // Callback to persist rotated tokens to database
      async ({ accessToken, refreshToken: newRefreshToken, expiresAt }) => {
        if (!useFallbackToken && pinterestAccount) {
          // Update the account in database
          await db()
            .update(account)
            .set({
              accessToken,
              refreshToken: newRefreshToken,
              accessTokenExpiresAt: new Date(expiresAt),
              updatedAt: new Date(),
            })
            .where(eq(account.id, pinterestAccount.id));
          console.log('Persisted rotated Pinterest tokens to database');
        } else {
          console.warn('Token rotated but not persisted (using fallback token or no account)');
        }
      }
    );

    // Parse query parameters for batch processing
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5'); // Default: process 5 items at a time
    const offset = parseInt(searchParams.get('offset') || '0');

    const appUrl = envConfigs.app_url || 'https://coloringpages.club';
    const rssUrl = `${appUrl}/rss.xml`;

    // Fetch RSS feed
    console.log(`Fetching RSS feed from: ${rssUrl}`);
    const rssResponse = await fetch(rssUrl);
    if (!rssResponse.ok) {
      throw new Error(`Failed to fetch RSS feed: ${rssResponse.status}`);
    }

    const rssXml = await rssResponse.text();
    const rssResult = await parseStringPromise(rssXml, {
      explicitArray: false,
      mergeAttrs: true,
    });

    const allItems: any[] = rssResult.rss?.channel?.item || [];
    console.log(`Found ${allItems.length} items in RSS feed`);

    if (allItems.length === 0) {
      return NextResponse.json({ message: 'No items in RSS feed' });
    }

    // Apply batch processing: slice items with offset and limit
    const items = allItems.slice(offset, offset + limit);
    console.log(`Processing batch: offset=${offset}, limit=${limit}, items=${items.length}`);

    const results = [];
    const boardCache = new Map<string, string>();

    // Process each RSS item
    for (const item of items) {
      try {
        // Handle both object and array formats for enclosure
        const imageUrl = item.enclosure?.url || (typeof item.enclosure === 'string' ? item.enclosure : null);
        const pageUrl = item.link || item.guid;
        const title = item.title;
        const description = item.description;
        const category = Array.isArray(item.category)
          ? item.category[0]
          : item.category || 'coloring-pages';

        if (!imageUrl || !pageUrl) {
          console.log(`Skipping item without image URL or page URL: ${title}`);
          continue;
        }

        // Extract slug from page URL
        const slug = pageUrl.replace(/^.*\/([^/]+)\/?$/, '$1');

        // Check if this page already has a Pinterest pin
        const existingPages = await db()
          .select()
          .from(coloringPage)
          .where(
            and(
              eq(coloringPage.slug, slug),
              eq(coloringPage.status, 'published')
            )
          )
          .limit(1);

        if (existingPages.length > 0 && existingPages[0].pinterestPinId) {
          console.log(`Page ${slug} already has a Pinterest pin: ${existingPages[0].pinterestPinId}`);
          continue;
        }

        // Determine board name: prioritize rootKeyword from database, then RSS category
        let boardKeyword = category;
        if (existingPages.length > 0 && existingPages[0].rootKeyword) {
          boardKeyword = existingPages[0].rootKeyword;
        }

        const boardName = boardKeyword
          ? boardKeyword.charAt(0).toUpperCase() + boardKeyword.slice(1)
          : 'Coloring Pages';

        let boardId = boardCache.get(boardName);
        if (!boardId) {
          boardId = await pinterestProvider.getOrCreateBoardByName(boardName);
          boardCache.set(boardName, boardId);
        }

        // Create Pinterest pin
        const pinResult = await pinterestProvider.createPin({
          boardId,
          title,
          description,
          link: pageUrl,
          imageUrl,
          altText: title,
        });

        // Update database if page exists
        if (existingPages.length > 0) {
          await db()
            .update(coloringPage)
            .set({
              pinterestPinId: pinResult.id,
              pinterestPinUrl: pinResult.link || `https://pinterest.com/pin/${pinResult.id}`,
              updatedAt: new Date(),
            })
            .where(eq(coloringPage.id, existingPages[0].id));
        }

        results.push({
          slug,
          success: true,
          pinId: pinResult.id,
          board: boardName,
        });

        console.log(`Created Pinterest pin for ${slug}: ${pinResult.id}`);

        // Rate limiting: wait between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Failed to process RSS item:`, error);
        results.push({
          title: item.title,
          success: false,
          error: error.message,
        });
      }
    }

    const hasMore = offset + limit < allItems.length;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({
      message: 'RSS to Pinterest sync batch completed',
      totalItems: allItems.length,
      batchInfo: {
        offset,
        limit,
        processedInBatch: results.length,
        hasMore,
        nextOffset,
      },
      results,
    });
  } catch (error: any) {
    console.error('RSS to Pinterest cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
