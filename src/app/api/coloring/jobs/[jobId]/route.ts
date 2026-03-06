/**
 * API endpoint to get job details by ID
 * GET /api/coloring/jobs/[jobId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { findColoringJob } from '@/shared/models/coloring_job';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await findColoringJob({ id: jobId });

    if (!job) {
      return NextResponse.json(
        { code: -1, message: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'Job retrieved successfully',
      data: job,
    });
  } catch (error) {
    console.error('Failed to get job:', error);
    return NextResponse.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : 'Failed to get job',
      },
      { status: 500 }
    );
  }
}
