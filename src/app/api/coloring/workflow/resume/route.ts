/**
 * API endpoint to resume a failed/timed-out coloring page generation workflow
 * POST /api/coloring/workflow/resume
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/shared/services/coloring-workflow';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId } = body;

        // Validate input
        if (!jobId || typeof jobId !== 'string') {
            return NextResponse.json(
                { code: -1, message: 'jobId is required and must be a string' },
                { status: 400 }
            );
        }

        // Start the resume process in the background
        const workflowService = getWorkflowService();
        // Don't await the promise here so the API returns immediately
        workflowService.resumeFromDownload(jobId).catch(error => {
            console.error(`Background resume workflow failed for job ${jobId}:`, error);
        });

        return NextResponse.json({
            code: 0,
            message: 'Resume workflow started successfully',
            data: {
                jobId,
                status: 'processing',
            },
        });
    } catch (error) {
        console.error('Failed to start resume workflow:', error);
        return NextResponse.json(
            {
                code: -1,
                message: error instanceof Error ? error.message : 'Failed to start resume workflow',
            },
            { status: 500 }
        );
    }
}
