/**
 * API endpoint to get workflow job status
 * GET /api/coloring/workflow/status/[jobId]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findColoringJob,
  getColoringJobWithStats,
} from '@/shared/models/coloring_job';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Get job with statistics
    const job = await getColoringJobWithStats(jobId);

    if (!job) {
      return NextResponse.json(
        { code: -1, message: 'Job not found' },
        { status: 404 }
      );
    }

    // Calculate progress percentage
    const progress =
      job.totalKeywords > 0
        ? Math.round((job.processedPages / (job.totalKeywords * 2)) * 100) // *2 for en and zh
        : job.status === 'completed'
          ? 100
          : job.status === 'processing'
            ? 50
            : 0;

    return NextResponse.json({
      code: 0,
      message: 'Success',
      data: {
        job: {
          id: job.id,
          status: job.status,
          jobType: job.jobType,
          totalKeywords: job.totalKeywords,
          processedPages: job.processedPages,
          failedPages: job.failedPages,
          errorMessage: job.errorMessage,
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        },
        stats: job.stats || {
          total: 0,
          published: 0,
          failed: job.failedPages,
        },
        progress,
        currentStep: getCurrentStep(job.status),
      },
    });
  } catch (error) {
    console.error('Failed to get job status:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to get job status',
      },
      { status: 500 }
    );
  }
}

/**
 * Get current step description from status
 */
function getCurrentStep(status: string): string {
  switch (status) {
    case 'pending':
      return 'Waiting to start...';
    case 'processing':
      return 'Processing workflow...';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown status';
  }
}
