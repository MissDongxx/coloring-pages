import { parseArgs } from 'util';
import { getWorkflowService } from '@/shared/services/coloring-workflow';
import { ColoringJobType } from '@/shared/models/coloring_job';
import {
  getPendingKeywords,
  markKeywordsAsProcessed,
  areAllKeywordsProcessed,
  resetAllKeywords,
} from '@/shared/services/gist-keywords';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
    console.log('Starting Coloring Workflow Script...');

    // Parse command line arguments
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            roots: {
                type: 'string',
                short: 'r',
            },
            count: {
                type: 'string',
                short: 'c',
            },
            provider: {
                type: 'string',
                short: 'p',
            },
        },
    });

    const wordRoots = values.roots ? values.roots.split(',').map(r => r.trim()).filter(Boolean) : undefined;
    const count = values.count ? parseInt(values.count, 10) : undefined;
    // enforce correct literal type
    const provider = (values.provider === 'replicate' || values.provider === 'kaggle') ? values.provider : 'kaggle';

    console.log('Workflow Options:', {
        wordRoots: wordRoots || 'Auto-generated from local CSV (No roots provided)',
        count: count || '30 (default)',
        provider: provider,
    });

    try {
        const workflowService = getWorkflowService();

        // Find a valid user ID to avoid FK violation
        // We use dynamic imports to avoid loading DB logic until needed
        const { db } = await import('@/core/db');
        const { user } = await import('@/config/db/schema');
        const [firstUser] = await db().select({ id: user.id }).from(user).limit(1);

        if (!firstUser) {
            throw new Error('No users found in database. Please create at least one user (sign up on the website) before running this workflow.');
        }

        console.log(`Using valid User ID for job record: ${firstUser.id}`);

        let finalWordRoots = wordRoots;
        let finalCount = count;
        let keywordIds: number[] | undefined;

        // If no word roots provided, fetch from local CSV
        if (!finalWordRoots) {
            console.log('[Workflow] No word roots provided, fetching from local CSV...');

            let gistResult = await getPendingKeywords();

            // If no pending keywords, check if we need to reset
            if (!gistResult) {
                console.log('[Workflow] No pending keywords found, checking if all are processed...');
                const allProcessed = await areAllKeywordsProcessed();

                if (allProcessed) {
                    console.log('[Workflow] All keywords have been processed. Resetting for next cycle...');
                    await resetAllKeywords();

                    // Fetch again after reset
                    gistResult = await getPendingKeywords();
                }
            }

            if (!gistResult || gistResult.count === 0) {
                console.log('[Workflow] No keywords available to process. Skipping workflow.');
                process.exit(0);
            }

            finalWordRoots = gistResult.keywords;
            keywordIds = gistResult.ids;
            finalCount = 30; // Always use 30 for Gist keywords

            console.log(`[Workflow] Found ${gistResult.count} keyword(s) from local CSV: ${finalWordRoots.join(', ')}`);
        }

        const jobId = await workflowService.runWorkflow({
            jobType: ColoringJobType.MANUAL,
            userId: firstUser.id,
            wordRoots: finalWordRoots,
            count: finalCount,
            provider: provider,
        });

        console.log(`\n========================================`);
        console.log(`✅ Workflow completed successfully!`);
        console.log(`✅ Job ID: ${jobId}`);
        console.log(`========================================\n`);

        // Mark keywords as processed if they came from local CSV
        if (keywordIds && keywordIds.length > 0) {
            console.log(`[Workflow] Marking ${keywordIds.length} keyword(s) as processed in local CSV...`);
            await markKeywordsAsProcessed(keywordIds);
            console.log('[Workflow] Keywords marked successfully.');
        }

        // Explicitly exit to prevent hanging promises
        process.exit(0);
    } catch (error) {
        console.error(`\n========================================`);
        console.error(`❌ Workflow failed with error:`);
        console.error(error);
        console.error(`========================================\n`);
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
