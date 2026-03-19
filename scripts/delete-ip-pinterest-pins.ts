import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env BEFORE any other imports
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '@/core/db';
import { coloringPage, account } from '@/config/db/schema';
import { eq, and, or, ilike } from 'drizzle-orm';
import { PinterestProvider } from '@/extensions/pinterest/pinterest';
import { getAllConfigs } from '@/shared/models/config';
import { EXCLUDED_HUB_KEYWORDS, ColoringPageStatus } from '@/shared/models/coloring_page';

interface DeletionResult {
  total: number;
  successfullyDeleted: number;
  failed: number;
  errors: Array<{ pinId: string; title: string; error: string }>;
}

/**
 * Check if a given text contains any IP/copyright keywords
 */
function containsIPKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return EXCLUDED_HUB_KEYWORDS.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Delete Pinterest pins for IP-related coloring pages
 */
async function deleteIPPins(): Promise<DeletionResult> {
  console.log('========================================');
  console.log('Deleting IP-Related Pinterest Pins');
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

  // Find all published pages with Pinterest pins that contain IP keywords
  console.log('Searching for IP-related pages with Pinterest pins...\n');

  const keywordConditions = EXCLUDED_HUB_KEYWORDS.flatMap(keyword => [
    ilike(coloringPage.rootKeyword, `%${keyword}%`),
    ilike(coloringPage.keyword, `%${keyword}%`),
    ilike(coloringPage.title, `%${keyword}%`),
    ilike(coloringPage.description, `%${keyword}%`)
  ]);

  const pagesWithPins = await db()
    .select({
      id: coloringPage.id,
      title: coloringPage.title,
      keyword: coloringPage.keyword,
      rootKeyword: coloringPage.rootKeyword,
      pinterestPinId: coloringPage.pinterestPinId,
      pinterestPinUrl: coloringPage.pinterestPinUrl,
    })
    .from(coloringPage)
    .where(
      and(
        eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
        or(...keywordConditions)
      )
    );

  // Filter to only include pages that actually have a Pinterest pin ID
  const pagesToDelete = pagesWithPins.filter(
    (p: { pinterestPinId: string | null }) => p.pinterestPinId !== null && p.pinterestPinId !== ''
  );

  console.log(`Found ${pagesToDelete.length} IP-related pages with Pinterest pins:`);
  pagesToDelete.slice(0, 10).forEach((p: { title: string; pinterestPinId: string }) => {
    console.log(`  - ${p.title} (Pin ID: ${p.pinterestPinId})`);
  });
  if (pagesToDelete.length > 10) {
    console.log(`  ... and ${pagesToDelete.length - 10} more`);
  }
  console.log();

  if (pagesToDelete.length === 0) {
    console.log('✅ No IP-related Pinterest pins found to delete.');
    return {
      total: 0,
      successfullyDeleted: 0,
      failed: 0,
      errors: [],
    };
  }

  // Confirm before proceeding
  console.log('⚠️  This will DELETE Pinterest pins from your Pinterest account.');
  console.log('⚠️  This action CANNOT be undone.');
  console.log();
  console.log('Waiting 5 seconds before proceeding... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log();

  const result: DeletionResult = {
    total: pagesToDelete.length,
    successfullyDeleted: 0,
    failed: 0,
    errors: [],
  };

  // Delete pins one by one
  for (const page of pagesToDelete) {
    try {
      console.log(`Deleting pin for "${page.title}" (Pin ID: ${page.pinterestPinId})...`);

      // Delete the pin from Pinterest
      await pinterestProvider.deletePin(page.pinterestPinId!);
      console.log(`  ✅ Deleted from Pinterest`);

      // Clear the Pinterest data from database
      await db()
        .update(coloringPage)
        .set({
          pinterestPinId: null,
          pinterestPinUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(coloringPage.id, page.id));

      console.log(`  ✅ Cleared database records`);
      result.successfullyDeleted++;

      // Rate limiting: wait between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`  ❌ Failed to delete: ${error.message}`);
      result.failed++;
      result.errors.push({
        pinId: page.pinterestPinId!,
        title: page.title,
        error: error.message,
      });
    }
  }

  return result;
}

async function main() {
  try {
    const result = await deleteIPPins();

    console.log();
    console.log('========================================');
    console.log('Deletion Summary');
    console.log('========================================');
    console.log(`Total pins found: ${result.total}`);
    console.log(`Successfully deleted: ${result.successfullyDeleted}`);
    console.log(`Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log();
      console.log('Errors:');
      result.errors.forEach(({ pinId, title, error }) => {
        console.log(`  - ${title} (${pinId}): ${error}`);
      });
    }

    console.log('========================================');
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('========================================');
    console.error('❌ Failed to delete IP-related pins:');
    console.error(error);
    console.error('========================================');
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
