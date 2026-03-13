/**
 * Sync Pinterest pins to database
 * This script fetches all pins from Pinterest boards and matches them with existing pages
 */

import { createPinterestProvider } from '../src/extensions/pinterest/pinterest';
import { db } from '../src/core/db';
import { coloringPage } from '../src/config/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🔄 Starting Pinterest pins sync...');

    const pinterestProvider = createPinterestProvider();

    // First, refresh the access token
    console.log('🔄 Refreshing Pinterest access token...');
    await (pinterestProvider as any).refreshAccessToken();
    console.log('✅ Access token refreshed');

    // Get all boards
    console.log('📋 Fetching Pinterest boards...');
    const boards = await pinterestProvider.getBoards();
    console.log(`Found ${boards.length} boards`);

    let totalPinsProcessed = 0;
    let totalPinsMatched = 0;

    // For each board, fetch all pins
    for (const board of boards) {
        console.log(`\n📍 Processing board: ${board.name}`);
        console.log(`   Board ID: ${board.id}`);

        try {
            // Fetch pins from this board
            const pins = await fetchPinsFromBoard(pinterestProvider, board.id);
            console.log(`   Found ${pins.length} pins`);

            totalPinsProcessed += pins.length;

            // Match pins with existing pages by URL
            for (const pin of pins) {
                const link = pin.link?.url || pin.link;
                if (!link) continue;

                // Extract slug from URL
                // URL format: https://coloringpages.club/slug
                const slugMatch = link.match(/coloringpages\.club\/([^\/\?]+)/);
                if (!slugMatch) continue;

                const slug = slugMatch[1];

                // Find the page by slug
                const [page] = await db()
                    .select()
                    .from(coloringPage)
                    .where(eq(coloringPage.slug, slug))
                    .limit(1);

                if (page) {
                    // Update the page with Pinterest data
                    await db()
                        .update(coloringPage)
                        .set({
                            pinterestPinId: pin.id,
                            pinterestPinUrl: pin.url || `https://pinterest.com/pin/${pin.id}`,
                        })
                        .where(eq(coloringPage.id, page.id));

                    console.log(`   ✓ Matched: ${page.title?.slice(0, 40)} (Pin ID: ${pin.id})`);
                    totalPinsMatched++;
                }
            }
        } catch (error: any) {
            console.error(`   ❌ Error processing board ${board.name}:`, error.message);
        }
    }

    console.log('\n✅ Sync completed!');
    console.log(`📊 Summary:`);
    console.log(`   Total pins processed: ${totalPinsProcessed}`);
    console.log(`   Pins matched to pages: ${totalPinsMatched}`);
    console.log(`   Pins not matched: ${totalPinsProcessed - totalPinsMatched}`);

    process.exit(0);
}

/**
 * Fetch all pins from a board using pagination
 */
async function fetchPinsFromBoard(provider: any, boardId: string): Promise<any[]> {
    const accessToken = await (provider as any).refreshAccessToken();
    const baseUrl = (provider as any).baseUrl;
    const allPins: any[] = [];
    let bookmark: string | null = null;
    const pageSize = 100;

    do {
        const url = new URL(`${baseUrl}/boards/${boardId}/pins`);
        url.searchParams.set('page_size', String(pageSize));
        if (bookmark) {
            url.searchParams.set('bookmark', bookmark);
        }

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch pins: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        allPins.push(...data.items);

        bookmark = data.bookmark || null;
        console.log(`   Fetched ${data.items.length} pins, total so far: ${allPins.length}`);
    } while (bookmark);

    return allPins;
}

main().catch((err) => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});
