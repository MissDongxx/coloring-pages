import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { coloringPage } from '@/config/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createPinterestProvider } from '@/extensions/pinterest';
import { envConfigs } from '@/config';
import { updateColoringPage, ColoringPageStatus } from '@/shared/models/coloring_page';

export async function GET(request: Request) {
    try {
        // Basic authorization for cron endpoint
        const CRON_SECRET = process.env.CRON_SECRET;
        const authHeader = request.headers.get('authorization');
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!envConfigs.pinterest_app_id || !envConfigs.pinterest_app_secret || !envConfigs.pinterest_refresh_token || !envConfigs.pinterest_board_id) {
            return NextResponse.json({ error: 'Pinterest configuration is missing' }, { status: 500 });
        }

        const pinterestProvider = createPinterestProvider();
        const boardId = envConfigs.pinterest_board_id;

        // Fetch up to 5 unpublished pages
        const pagesToPin = await db()
            .select()
            .from(coloringPage)
            .where(
                and(
                    eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
                    isNull(coloringPage.pinterestPinId)
                )
            )
            .limit(5);

        if (pagesToPin.length === 0) {
            return NextResponse.json({ message: 'No pages to pin' });
        }

        const results = [];

        // Process pages sequentially to avoid hitting rate limits
        for (const page of pagesToPin) {
            try {
                const pinLink = `${envConfigs.app_url}/${page.slug}`;
                const description = page.description || `Beautiful ${page.title} for you to color! Download and enjoy.`;

                const pinResult = await pinterestProvider.createPin({
                    boardId,
                    title: page.title,
                    description,
                    link: pinLink,
                    imageUrl: page.imageUrl,
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
