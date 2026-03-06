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
        const jobId = await workflowService.runWorkflow({
            jobType: ColoringJobType.MANUAL,
            userId: 'system-script',
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
