/**
 * API endpoint for coloring pages
 * GET /api/coloring/pages - List coloring pages
 * POST /api/coloring/pages - Create a new coloring page (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getColoringPages,
  getColoringPagesCount,
  getColoringCategories,
  createColoringPage,
  ColoringPageStatus,
} from '@/shared/models/coloring_page';

/**
 * GET - List coloring pages with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get('category') || undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') || 'published') as ColoringPageStatus;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    // Get pages
    const pages = await getColoringPages({
      category,
      keyword,
      search,
      status,
      page,
      limit,
    });

    // Get total count
    const total = await getColoringPagesCount({
      category,
      keyword,
      search,
      status,
    });

    // Get available categories
    const categories = await getColoringCategories();

    return NextResponse.json({
      code: 0,
      message: 'Success',
      data: {
        pages: pages.map((page) => ({
          id: page.id,
          slug: page.slug,
          title: page.title,
          description: page.description,
          category: page.category,
          keyword: page.keyword,
          imageUrl: page.imageUrl,
          status: page.status,
          publishedAt: page.publishedAt?.toISOString(),
          createdAt: page.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        categories,
      },
    });
  } catch (error) {
    console.error('Failed to get coloring pages:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to get coloring pages',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new coloring page (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      slug,
      title,
      description,
      category,
      keyword,
      prompt,
      imageUrl,
      mdxPath,
      status = ColoringPageStatus.DRAFT,
    } = body;

    // Validate required fields
    if (!userId || !slug || !title || !category || !keyword || !imageUrl) {
      return NextResponse.json(
        {
          code: -1,
          message:
            'Missing required fields: userId, slug, title, category, keyword, imageUrl',
        },
        { status: 400 }
      );
    }

    // Create coloring page
    const page = await createColoringPage({
      userId,
      slug,
      title,
      description,
      category,
      keyword,
      prompt,
      imageUrl,
      mdxPath,
      status,
      sort: 0,
    });

    return NextResponse.json({
      code: 0,
      message: 'Coloring page created successfully',
      data: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        category: page.category,
        status: page.status,
      },
    });
  } catch (error) {
    console.error('Failed to create coloring page:', error);
    return NextResponse.json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Failed to create coloring page',
      },
      { status: 500 }
    );
  }
}
