import { NextResponse } from 'next/server';
import { createPinterestProvider } from '@/extensions/pinterest';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { coloringPage } from '@/config/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseStringPromise } from 'xml2js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RSSItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  enclosure?: {
    $: {
      url: string;
      type: string;
    };
  };
  category?: string[];
}

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
      !envConfigs.pinterest_app_secret ||
      !envConfigs.pinterest_refresh_token
    ) {
      return NextResponse.json(
        { error: 'Pinterest configuration is missing' },
        { status: 500 }
      );
    }

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

    const items: any[] = rssResult.rss?.channel?.item || [];
    console.log(`Found ${items.length} items in RSS feed`);

    if (items.length === 0) {
      return NextResponse.json({ message: 'No items in RSS feed' });
    }

    const pinterestProvider = createPinterestProvider();
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

        // Determine board name from category or use default
        const boardName = category
          ? category.charAt(0).toUpperCase() + category.slice(1)
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

    return NextResponse.json({
      message: 'RSS to Pinterest sync completed',
      totalItems: items.length,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('RSS to Pinterest cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
