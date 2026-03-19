import { NextResponse } from 'next/server';
import { PinterestProvider } from '@/extensions/pinterest';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { coloringPage, account } from '@/config/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseStringPromise } from 'xml2js';
import { getAllConfigs, saveConfigs } from '@/shared/models/config';
import { EXCLUDED_HUB_KEYWORDS } from '@/shared/models/coloring_page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Check if a given text contains any IP/copyright keywords
 * @param text - The text to check (title, description, category, etc.)
 * @returns true if the text contains IP keywords, false otherwise
 */
function containsIPKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return EXCLUDED_HUB_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

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
      return NextResponse.json(
        { error: 'Pinterest configuration (App ID/Secret) is missing' },
        { status: 500 }
      );
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
      async ({ accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn }) => {
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
              const accessTokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
              await db()
                  .update(account)
                  .set({
                      accessToken: newAccessToken,
                      refreshToken: newRefreshToken || undefined,
                      accessTokenExpiresAt,
                      updatedAt: new Date(),
                  })
                  .where(eq(account.id, pinterestAccount.id));
              console.log('✅ Persisted rotated Pinterest tokens to user account table');
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

        // Skip IP/copyright related content
        const titleText = title || '';
        const descText = description || '';
        const categoryText = category || '';
        const searchText = `${titleText} ${descText} ${categoryText}`;

        if (containsIPKeywords(searchText)) {
          console.log(`Skipping IP/copyright related content: ${title}`);
          results.push({
            slug: pageUrl.replace(/^.*\/([^/]+)\/?$/, '$1'),
            success: false,
            skipped: true,
            reason: 'IP content',
            title: title,
          });
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

        // Additional IP check using database fields
        if (existingPages.length > 0) {
          const page = existingPages[0];
          const dbSearchText = `${page.rootKeyword || ''} ${page.keyword || ''} ${page.title || ''} ${page.description || ''}`;

          if (containsIPKeywords(dbSearchText)) {
            console.log(`Skipping page with IP/copyright content (from DB): ${page.title}`);
            results.push({
              slug,
              success: false,
              skipped: true,
              reason: 'IP content (DB)',
              title: page.title,
            });
            continue;
          }
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
