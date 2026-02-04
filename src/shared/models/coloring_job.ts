/**
 * Coloring job model - manages workflow jobs for generating coloring pages
 */

import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { coloringJob, coloringPage } from '@/config/db/schema';
import { nanoid } from 'nanoid';

export type ColoringJob = typeof coloringJob.$inferSelect;
export type NewColoringJob = typeof coloringJob.$inferInsert;
export type UpdateColoringJob = Partial<Omit<NewColoringJob, 'id' | 'createdAt'>>;

export enum ColoringJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ColoringJobType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

/**
 * Add a new coloring job
 */
export async function addColoringJob(data: NewColoringJob) {
  const [result] = await db().insert(coloringJob).values(data).returning();
  return result;
}

/**
 * Create a new coloring job with generated ID
 */
export async function createColoringJob(data: Omit<NewColoringJob, 'id'>) {
  return addColoringJob({
    ...data,
    id: nanoid(),
  });
}

/**
 * Update a coloring job
 */
export async function updateColoringJob(id: string, data: UpdateColoringJob) {
  const [result] = await db()
    .update(coloringJob)
    .set(data)
    .where(eq(coloringJob.id, id))
    .returning();

  return result;
}

/**
 * Delete a coloring job (soft delete by setting status to failed)
 */
export async function deleteColoringJob(id: string) {
  const result = await updateColoringJob(id, {
    status: ColoringJobStatus.FAILED,
    errorMessage: 'Job deleted',
  });

  return result;
}

/**
 * Find a coloring job by ID or other criteria
 */
export async function findColoringJob({
  id,
  userId,
  status,
  jobType,
}: {
  id?: string;
  userId?: string;
  status?: ColoringJobStatus;
  jobType?: ColoringJobType;
}) {
  const [result] = await db()
    .select()
    .from(coloringJob)
    .where(
      and(
        id ? eq(coloringJob.id, id) : undefined,
        userId ? eq(coloringJob.userId, userId) : undefined,
        status ? eq(coloringJob.status, status) : undefined,
        jobType ? eq(coloringJob.jobType, jobType) : undefined
      )
    )
    .limit(1);

  return result;
}

/**
 * Get coloring jobs with filtering and pagination
 */
export async function getColoringJobs({
  userId,
  status,
  jobType,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: ColoringJobStatus;
  jobType?: ColoringJobType;
  page?: number;
  limit?: number;
} = {}): Promise<ColoringJob[]> {
  const result = await db()
    .select()
    .from(coloringJob)
    .where(
      and(
        userId ? eq(coloringJob.userId, userId) : undefined,
        status ? eq(coloringJob.status, status) : undefined,
        jobType ? eq(coloringJob.jobType, jobType) : undefined
      )
    )
    .orderBy(desc(coloringJob.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

/**
 * Get count of coloring jobs
 */
export async function getColoringJobsCount({
  userId,
  status,
  jobType,
}: {
  userId?: string;
  status?: ColoringJobStatus;
  jobType?: ColoringJobType;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(coloringJob)
    .where(
      and(
        userId ? eq(coloringJob.userId, userId) : undefined,
        status ? eq(coloringJob.status, status) : undefined,
        jobType ? eq(coloringJob.jobType, jobType) : undefined
      )
    )
    .limit(1);

  return result?.count || 0;
}

/**
 * Get job with page statistics
 */
export async function getColoringJobWithStats(id: string) {
  const job = await findColoringJob({ id });
  if (!job) {
    return null;
  }

  // Get page statistics
  const [pageStats] = await db()
    .select({
      total: count(),
      published: count(
        // Count only published pages
        eq(coloringPage.status, 'published')
      ),
    })
    .from(coloringPage)
    .where(eq(coloringPage.jobId, id));

  return {
    ...job,
    stats: {
      total: pageStats?.total || 0,
      published: pageStats?.published || 0,
      failed: job.failedPages,
    },
  };
}

/**
 * Update job status
 */
export async function updateJobStatus(
  id: string,
  status: ColoringJobStatus,
  errorMessage?: string
) {
  return updateColoringJob(id, {
    status,
    errorMessage,
    ...(status === ColoringJobStatus.COMPLETED
      ? { completedAt: new Date() }
      : {}),
  });
}

/**
 * Increment job progress counters
 */
export async function incrementJobProgress(
  id: string,
  processedPages: number = 0,
  failedPages: number = 0
) {
  const job = await findColoringJob({ id });
  if (!job) {
    return null;
  }

  return updateColoringJob(id, {
    processedPages: job.processedPages + processedPages,
    failedPages: job.failedPages + failedPages,
  });
}
