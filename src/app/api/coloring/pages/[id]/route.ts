/**
 * API endpoint for individual coloring page operations
 * GET /api/coloring/pages/[id] - Get a coloring page
 * PATCH /api/coloring/pages/[id] - Update a coloring page
 * DELETE /api/coloring/pages/[id] - Delete a coloring page
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findColoringPage,
  updateColoringPage,
  deleteColoringPage,
  publishColoringPage,
  unpublishColoringPage,
  ColoringPageStatus,
} from '@/shared/models/coloring_page';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const page = await findColoringPage({ id });

    if (!page) {
      return NextResponse.json(
        { code: -1, message: 'Coloring page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'Success',
      data: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description,
        category: page.category,
        keyword: page.keyword,
        prompt: page.prompt,
        imageUrl: page.imageUrl,
        mdxPath: page.mdxPath,
        status: page.status,
        jobId: page.jobId,
        userId: page.userId,
        publishedAt: page.publishedAt?.toISOString(),
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
        sort: page.sort,
      },
    });
  } catch (error) {
    console.error('Failed to get coloring page:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to get coloring page',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, ...updateData } = body;

    let page;

    // Handle special actions
    switch (action) {
      case 'publish':
        page = await publishColoringPage(id);
        break;

      case 'unpublish':
        page = await unpublishColoringPage(id);
        break;

      default:
        // Regular update
        page = await updateColoringPage(id, updateData);
    }

    if (!page) {
      return NextResponse.json(
        { code: -1, message: 'Coloring page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'Coloring page updated successfully',
      data: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        status: page.status,
      },
    });
  } catch (error) {
    console.error('Failed to update coloring page:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to update coloring page',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const page = await deleteColoringPage(id);

    if (!page) {
      return NextResponse.json(
        { code: -1, message: 'Coloring page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'Coloring page deleted successfully',
      data: {
        id: page.id,
        status: page.status,
      },
    });
  } catch (error) {
    console.error('Failed to delete coloring page:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to delete coloring page',
      },
      { status: 500 }
    );
  }
}
