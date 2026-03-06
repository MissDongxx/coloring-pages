import { parseArgs } from 'util';
import { getWorkflowService } from '@/shared/services/coloring-workflow';
import { ColoringJobType } from '@/shared/models/coloring_job';
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
        wordRoots: wordRoots || 'Auto-generated (No roots provided)',
        count: count || 'Default',
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

        const jobId = await workflowService.runWorkflow({
            jobType: ColoringJobType.MANUAL,
            userId: firstUser.id,
            wordRoots: wordRoots,
            count: count,
            provider: provider,
        });

        console.log(`\n========================================`);
        console.log(`✅ Workflow completed successfully!`);
        console.log(`✅ Job ID: ${jobId}`);
        console.log(`========================================\n`);

        // Explicitly exit to prevent hanging promises
        process.exit(0);
    } catch (error) {
        console.error(`\n========================================`);
        console.error(`❌ Workflow failed with error:`);
        console.error(error);
        console.error(`========================================\n`);
        process.exit(1);
    }
}

main();
