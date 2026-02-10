/**
 * API endpoint to start a manual coloring page generation workflow
 * POST /api/coloring/workflow/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/shared/services/coloring-workflow';
import { ColoringJobType } from '@/shared/models/coloring_job';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wordRoots, userId } = body;

    // Validate input
    if (wordRoots && !Array.isArray(wordRoots)) {
      return NextResponse.json(
        { code: -1, message: 'wordRoots must be an array' },
        { status: 400 }
      );
    }

    // Start the workflow
    const workflowService = getWorkflowService();
    const jobId = await workflowService.runWorkflow({
      wordRoots,
      jobType: ColoringJobType.MANUAL,
      userId: userId || 'system',
      provider: body.provider,
    });

    return NextResponse.json({
      code: 0,
      message: 'Workflow started successfully',
      data: {
        jobId,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Failed to start workflow:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to start workflow',
      },
      { status: 500 }
    );
  }
}

// Allow GET to check if workflow is available
export async function GET() {
  return NextResponse.json({
    code: 0,
    message: 'Coloring workflow service is available',
    data: {
      status: 'available',
    },
  });
}
