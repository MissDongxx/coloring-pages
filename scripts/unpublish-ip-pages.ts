import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env BEFORE any other imports
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { unpublishIPRelatedPages } from '@/shared/models/coloring_page';

async function main() {
  console.log('========================================');
  console.log('Unpublishing IP-Related Coloring Pages');
  console.log('========================================\n');

  console.log('This will unpublish all coloring pages containing IP-related keywords such as:');
  console.log('  - Disney characters (Mickey, Minnie, Elsa, Anna, etc.)');
  console.log('  - Sanrio characters (Hello Kitty, Kuromi, My Melody, etc.)');
  console.log('  - Marvel/DC characters (Spider-Man, Batman, Superman, etc.)');
  console.log('  - Pokemon, Naruto, Dragon Ball, etc.');
  console.log('  - And other copyrighted content\n');

  try {
    const result = await unpublishIPRelatedPages();

    if (result.count === 0) {
      console.log('\n✅ No IP-related pages found. Database is already clean.');
    } else {
      console.log(`\n========================================`);
      console.log(`✅ Successfully unpublished ${result.count} page(s)`);
      console.log(`========================================\n`);
      console.log('These pages have been set to DRAFT status and will no longer be visible on the site.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ Failed to unpublish IP-related pages:');
    console.error(error);
    console.error('========================================\n');
    process.exit(1);
  } finally {
    try {
      const { closeDb } = await import('@/core/db');
      await closeDb();
      console.log('Database connection closed.');
    } catch (e) {
      // Silently fail if closure fails
    }
  }
}

main();
