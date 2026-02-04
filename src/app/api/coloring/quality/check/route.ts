/**
 * API endpoint to check image quality
 * POST /api/coloring/quality/check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createImageQualityChecker } from '@/extensions/image-quality-checker';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import * as os from 'os';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { code: -1, message: 'No image file provided' },
        { status: 400 }
      );
    }

    // Save uploaded file to temp location
    const tempDir = path.join(os.tmpdir(), 'quality-check');
    const fileId = nanoid();
    const tempPath = path.join(tempDir, `${fileId}-${file.name}`);

    // Ensure temp directory exists
    await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

    try {
      // Create quality checker
      const checker = createImageQualityChecker();

      // Check quality
      const result = await checker.checkQuality(tempPath);

      return NextResponse.json({
        code: 0,
        message: 'Quality check completed',
        data: {
          passed: result.passed,
          score: result.score,
          issues: result.issues,
          metadata: result.metadata,
          threshold: parseInt(process.env.COLORING_MIN_QUALITY_SCORE || '70', 10),
        },
      });
    } finally {
      // Clean up temp file
      await unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    console.error('Failed to check image quality:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to check image quality',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get quality check configuration
 */
export async function GET() {
  return NextResponse.json({
    code: 0,
    message: 'Quality check configuration',
    data: {
      minWidth: parseInt(process.env.COLORING_MIN_IMAGE_WIDTH || '512', 10),
      maxWidth: parseInt(process.env.COLORING_MAX_IMAGE_WIDTH || '4096', 10),
      minSize: parseInt(process.env.COLORING_MIN_IMAGE_SIZE || '10240', 10),
      maxSize: parseInt(process.env.COLORING_MAX_IMAGE_SIZE || '5242880', 10),
      minScore: parseInt(process.env.COLORING_MIN_QUALITY_SCORE || '70', 10),
      useAIValidation: process.env.COLORING_USE_AI_VALIDATION === 'true',
      aiValidationModel: process.env.COLORING_AI_VALIDATION_MODEL || 'openai',
    },
  });
}
