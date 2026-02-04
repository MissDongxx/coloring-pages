/**
 * API endpoint to generate keywords using AI
 * POST /api/coloring/keywords/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createKeywordGenerator } from '@/extensions/keyword-generator';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wordRoots, categories, count, source } = body;

    // Validate input
    if (source === 'word_roots' && (!wordRoots || !Array.isArray(wordRoots))) {
      return NextResponse.json(
        { code: -1, message: 'wordRoots must be an array when source is word_roots' },
        { status: 400 }
      );
    }

    // Create keyword generator
    const generator = createKeywordGenerator();

    // Generate keywords
    const result = await generator.generate({
      source: source || (wordRoots ? 'word_roots' : 'auto_generated'),
      wordRoots,
      categories,
      count,
    });

    // Read CSV content
    const csvContent = await fs.readFile(result.csvPath, 'utf-8');

    return NextResponse.json({
      code: 0,
      message: 'Keywords generated successfully',
      data: {
        keywords: result.keywords,
        csvContent,
        csvPath: result.csvPath,
        count: result.keywords.length,
      },
    });
  } catch (error) {
    console.error('Failed to generate keywords:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to generate keywords',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get available categories
 */
export async function GET() {
  return NextResponse.json({
    code: 0,
    message: 'Available categories retrieved',
    data: {
      categories: [
        { name: 'animals', count: 20 },
        { name: 'nature', count: 15 },
        { name: 'transportation', count: 10 },
        { name: 'food', count: 15 },
        { name: 'holidays', count: 10 },
        { name: 'fantasy', count: 10 },
        { name: 'sports', count: 10 },
        { name: 'space', count: 10 },
      ],
    },
  });
}
