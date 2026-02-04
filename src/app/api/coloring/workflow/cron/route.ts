/**
 * API endpoint to initialize cron job for scheduled workflow execution
 * GET /api/coloring/workflow/cron
 *
 * This endpoint initializes the node-cron scheduler for daily workflow execution.
 * Call this when the application starts.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cron from 'node-cron';
import { envConfigs } from '@/config';
import { getWorkflowService } from '@/shared/services/coloring-workflow';
import { ColoringJobType } from '@/shared/models/coloring_job';

// Store scheduled task reference
let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Execute scheduled workflow
 */
async function executeScheduledWorkflow() {
  console.log(`[Cron] Starting scheduled workflow at ${new Date().toISOString()}`);

  try {
    const workflowService = getWorkflowService();
    const jobId = await workflowService.runWorkflow({
      jobType: ColoringJobType.SCHEDULED,
      userId: 'system',
    });

    console.log(`[Cron] Scheduled workflow started with job ID: ${jobId}`);
  } catch (error) {
    console.error('[Cron] Scheduled workflow failed:', error);
  }
}

/**
 * Initialize or update the cron schedule
 */
export function initializeCronSchedule() {
  // Stop existing task if any
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  // Check if workflow is enabled
  if (envConfigs.coloring_workflow_enabled !== 'true') {
    console.log('[Cron] Coloring workflow is disabled');
    return;
  }

  // Parse schedule time (format: "HH:MM")
  const scheduleTime = envConfigs.coloring_workflow_schedule_time || '02:00';
  const [hours, minutes] = scheduleTime.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`[Cron] Invalid schedule time: ${scheduleTime}`);
    return;
  }

  // Create cron expression: "0 MM HH * * *"
  const cronExpression = `0 ${minutes} ${hours} * * *`;

  console.log(`[Cron] Scheduling workflow at ${scheduleTime} (${cronExpression})`);

  // Schedule the task
  scheduledTask = cron.schedule(cronExpression, executeScheduledWorkflow, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('[Cron] Workflow scheduler initialized');
}

/**
 * Stop the cron schedule
 */
export function stopCronSchedule() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Cron] Workflow scheduler stopped');
  }
}

/**
 * GET endpoint - Initialize and return cron status
 */
export async function GET(request: NextRequest) {
  // Initialize cron if not already running
  if (!scheduledTask) {
    initializeCronSchedule();
  }

  const isRunning = scheduledTask !== null;
  const isEnabled = envConfigs.coloring_workflow_enabled === 'true';
  const scheduleTime = envConfigs.coloring_workflow_schedule_time || '02:00';

  return NextResponse.json({
    code: 0,
    message: 'Cron status retrieved',
    data: {
      enabled: isEnabled,
      running: isRunning,
      scheduleTime,
      schedule: `${scheduleTime} UTC daily`,
    },
  });
}

/**
 * POST endpoint - Manually trigger or update cron schedule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        if (!scheduledTask) {
          initializeCronSchedule();
        }
        break;

      case 'stop':
        stopCronSchedule();
        break;

      case 'restart':
        stopCronSchedule();
        initializeCronSchedule();
        break;

      case 'trigger':
        // Manually trigger the workflow
        await executeScheduledWorkflow();
        break;

      default:
        return NextResponse.json(
          { code: -1, message: 'Invalid action' },
          { status: 400 }
        );
    }

    const isRunning = scheduledTask !== null;

    return NextResponse.json({
      code: 0,
      message: `Cron ${action} successful`,
      data: {
        running: isRunning,
      },
    });
  } catch (error) {
    console.error('Failed to manage cron:', error);
    return NextResponse.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : 'Failed to manage cron',
      },
      { status: 500 }
    );
  }
}
