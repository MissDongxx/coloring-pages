
import { db } from './src/core/db';
import { coloringPage } from './src/config/db/schema';
import { eq, like } from 'drizzle-orm';

async function check() {
    try {
        const results = await db()
            .select({ id: coloringPage.id, slug: coloringPage.slug, title: coloringPage.title })
            .from(coloringPage)
            .where(like(coloringPage.title, '%Rose%'))
            .limit(10);

        console.log('Results:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Error during check:', err);
    }
    process.exit(0);
}

check().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
