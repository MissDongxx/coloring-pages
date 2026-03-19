import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env BEFORE any other imports
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '@/core/db';
import { coloringPage, account } from '@/config/db/schema';
import { eq, and, or, ilike, isNotNull } from 'drizzle-orm';
import { PinterestProvider } from '@/extensions/pinterest/pinterest';
import { getAllConfigs } from '@/shared/models/config';
import { EXCLUDED_HUB_KEYWORDS, ColoringPageStatus } from '@/shared/models/coloring_page';

interface IPPin {
  id: string;
  title: string;
  keyword: string;
  rootKeyword: string;
  pinterestPinId: string;
  pinterestPinUrl: string;
  existsOnPinterest?: boolean;
  error?: string;
}

async function checkIPPins() {
  console.log('========================================');
  console.log('Checking IP-Related Pinterest Pins');
  console.log('========================================\n');

  // Load Pinterest configuration
  const allConfigs = await getAllConfigs();
  const appId = allConfigs.pinterest_app_id;
  const appSecret = allConfigs.pinterest_app_secret;
  let refreshToken = allConfigs.pinterest_refresh_token;
  let accessToken = allConfigs.pinterest_access_token;

  // Try sandbox token if available
  const sandboxToken = process.env.PINTEREST_SANDBOX_TOKEN || process.env.PINTEREST_ACCESS_TOKEN;
  if (!accessToken && sandboxToken) {
    accessToken = sandboxToken;
  }

  // Get user account if CRON_USER_ID is set
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

  if (!refreshToken && !accessToken) {
    throw new Error('Pinterest credentials not found. Please set up Pinterest integration.');
  }

  // Create Pinterest provider
  const pinterestProvider = new PinterestProvider(
    {
      appId,
      appSecret,
      refreshToken: refreshToken || '',
      accessToken,
    },
    !!sandboxToken
  );

  // Find all published pages with Pinterest pins
  console.log('Step 1: Finding all pages with Pinterest pins...\n');

  const allPagesWithPins = await db()
    .select({
      id: coloringPage.id,
      title: coloringPage.title,
      keyword: coloringPage.keyword,
      rootKeyword: coloringPage.rootKeyword,
      description: coloringPage.description,
      pinterestPinId: coloringPage.pinterestPinId,
      pinterestPinUrl: coloringPage.pinterestPinUrl,
    })
    .from(coloringPage)
    .where(
      and(
        eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
        isNotNull(coloringPage.pinterestPinId)
      )
    );

  console.log(`Found ${allPagesWithPins.length} total pages with Pinterest pins.\n`);

  // Filter to find IP-related pages
  console.log('Step 2: Filtering IP-related content...\n');

  const ipPins: IPPin[] = [];

  for (const page of allPagesWithPins) {
    const searchText = `${page.rootKeyword || ''} ${page.keyword || ''} ${page.title || ''} ${page.description || ''}`;

    if (EXCLUDED_HUB_KEYWORDS.some(keyword =>
      searchText.toLowerCase().includes(keyword.toLowerCase())
    )) {
      ipPins.push({
        id: page.id,
        title: page.title,
        keyword: page.keyword || '',
        rootKeyword: page.rootKeyword || '',
        pinterestPinId: page.pinterestPinId!,
        pinterestPinUrl: page.pinterestPinUrl || '',
      });
    }
  }

  if (ipPins.length === 0) {
    console.log('✅ No IP-related pins found in database.');
    console.log('All IP content has been cleaned up!');
    return;
  }

  console.log(`⚠️  Found ${ipPins.length} IP-related pins in database:\n`);

  // Group by IP category for better readability
  const categoryGroups: Record<string, IPPin[]> = {};

  for (const pin of ipPins) {
    let category = 'Other';

    for (const keyword of EXCLUDED_HUB_KEYWORDS) {
      const searchText = `${pin.rootKeyword} ${pin.keyword} ${pin.title}`.toLowerCase();
      if (searchText.includes(keyword.toLowerCase())) {
        // Determine category based on keyword
        if (keyword.includes('disney') || ['mickey mouse', 'minnie mouse', 'elsa', 'anna', 'moana', 'ariel'].some(k => keyword.includes(k))) {
          category = 'Disney';
        } else if (keyword.includes('marvel') || ['spider-man', 'spiderman', 'batman', 'superman', 'iron man'].some(k => keyword.includes(k))) {
          category = 'Marvel/DC';
        } else if (keyword.includes('pokemon') || ['pikachu', 'charizard'].some(k => keyword.includes(k))) {
          category = 'Pokemon';
        } else if (keyword.includes('sanrio') || ['hello kitty', 'kuromi'].some(k => keyword.includes(k))) {
          category = 'Sanrio';
        } else if (['naruto', 'dragon ball', 'goku', 'vegeta'].some(k => keyword.includes(k))) {
          category = 'Anime';
        } else if (keyword.includes('minecraft') || keyword.includes('fortnite') || keyword.includes('roblox')) {
          category = 'Games';
        }
        break;
      }
    }

    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(pin);
  }

  // Display pins grouped by category
  for (const [category, pins] of Object.entries(categoryGroups)) {
    console.log(`📁 ${category} (${pins.length} pins):`);
    pins.slice(0, 5).forEach(pin => {
      console.log(`   - ${pin.title}`);
      console.log(`     Pin ID: ${pin.pinterestPinId}`);
      console.log(`     URL: ${pin.pinterestPinUrl}`);
    });
    if (pins.length > 5) {
      console.log(`   ... and ${pins.length - 5} more`);
    }
    console.log();
  }

  // Optionally verify if pins still exist on Pinterest
  console.log('Step 3: Verifying if pins still exist on Pinterest...\n');
  console.log('⚠️  This will make API calls to Pinterest. Skipping by default.');
  console.log('To verify, set VERIFY_PINS=true environment variable.\n');

  if (process.env.VERIFY_PINS === 'true') {
    let verifiedCount = 0;
    let notFoundCount = 0;

    for (const pin of ipPins) {
      try {
        await pinterestProvider.getPin(pin.pinterestPinId);
        pin.existsOnPinterest = true;
        verifiedCount++;
      } catch (error: any) {
        pin.existsOnPinterest = false;
        pin.error = error.message;
        notFoundCount++;
      }

      if ((verifiedCount + notFoundCount) % 5 === 0) {
        console.log(`Verified ${verifiedCount + notFoundCount}/${ipPins.length} pins...`);
      }
    }

    console.log(`\n✅ Verified: ${verifiedCount} pins still exist on Pinterest`);
    console.log(`❌ Not found: ${notFoundCount} pins (already deleted or inaccessible)\n`);
  }

  console.log('========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Total IP-related pins in database: ${ipPins.length}`);
  console.log('');
  console.log('To delete these pins, run:');
  console.log('  npm run pinterest:delete-ip-pins');
  console.log('========================================');
}

async function main() {
  try {
    await checkIPPins();
    process.exit(0);
  } catch (error) {
    console.error('========================================');
    console.error('❌ Failed to check IP-related pins:');
    console.error(error);
    console.error('========================================');
    process.exit(1);
  } finally {
    try {
      const { closeDb } = await import('@/core/db');
      await closeDb();
      console.log('\nDatabase connection closed.');
    } catch (e) {
      // Silently fail if closure fails
    }
  }
}

main();
