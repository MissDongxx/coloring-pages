/**
 * Coloring page model - manages generated coloring pages
 */

import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { db } from '@/core/db';
import { coloringPage } from '@/config/db/schema';
import { nanoid } from 'nanoid';

export type ColoringPage = typeof coloringPage.$inferSelect;
export type NewColoringPage = typeof coloringPage.$inferInsert;
export type UpdateColoringPage = Partial<Omit<NewColoringPage, 'id' | 'createdAt'>>;

export enum ColoringPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Add a new coloring page
 */
export async function addColoringPage(data: NewColoringPage) {
  const [result] = await db().insert(coloringPage).values(data).returning();
  return result;
}

/**
 * Create a new coloring page with generated ID
 */
export async function createColoringPage(data: Omit<NewColoringPage, 'id'>) {
  const id = nanoid();
  console.log('[coloring_page] Creating page with ID:', id, 'for userId:', data.userId, 'slug:', data.slug);
  const result = await addColoringPage({
    ...data,
    id,
  });
  console.log('[coloring_page] Page created successfully:', result.id);
  return result;
}

/**
 * Update a coloring page
 */
export async function updateColoringPage(id: string, data: UpdateColoringPage) {
  const [result] = await db()
    .update(coloringPage)
    .set(data)
    .where(eq(coloringPage.id, id))
    .returning();

  return result;
}

/**
 * Delete a coloring page (soft delete by setting status to archived)
 */
export async function deleteColoringPage(id: string) {
  const result = await updateColoringPage(id, {
    status: ColoringPageStatus.ARCHIVED,
    deletedAt: new Date(),
  });

  return result;
}

/**
 * Permanently delete a coloring page
 */
export async function permanentlyDeleteColoringPage(id: string) {
  const [result] = await db()
    .delete(coloringPage)
    .where(eq(coloringPage.id, id))
    .returning();

  return result;
}

/**
 * Find a coloring page by ID, slug, or other criteria
 */
export async function findColoringPage({
  id,
  slug,
  userId,
  jobId,
  status,
  category,
  keyword,
}: {
  id?: string;
  slug?: string;
  userId?: string;
  jobId?: string;
  status?: ColoringPageStatus;
  category?: string;
  keyword?: string;
}) {
  const conditions = [
    id ? eq(coloringPage.id, id) : undefined,
    slug ? eq(coloringPage.slug, slug) : undefined,
    userId ? eq(coloringPage.userId, userId) : undefined,
    jobId ? eq(coloringPage.jobId, jobId) : undefined,
    status ? eq(coloringPage.status, status) : undefined,
    category ? eq(coloringPage.category, category) : undefined,
    keyword ? eq(coloringPage.keyword, keyword) : undefined
  ].filter(Boolean);

  console.log('[coloring_page] Finding page with conditions:', { id, slug, conditions });

  const [result] = await db()
    .select()
    .from(coloringPage)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(1);

  console.log('[coloring_page] Find result:', result ? { id: result.id, slug: result.slug, title: result.title } : null);

  return result;
}

/**
 * Get coloring pages with filtering and pagination
 */
export async function getColoringPages({
  userId,
  jobId,
  status,
  category,
  keyword,
  search,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  jobId?: string;
  status?: ColoringPageStatus;
  category?: string;
  keyword?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ColoringPage[]> {
  const result = await db()
    .select()
    .from(coloringPage)
    .where(
      and(
        userId ? eq(coloringPage.userId, userId) : undefined,
        jobId ? eq(coloringPage.jobId, jobId) : undefined,
        status ? eq(coloringPage.status, status) : undefined,
        category ? eq(coloringPage.category, category) : undefined,
        keyword ? eq(coloringPage.keyword, keyword) : undefined,
        search
          ? or(
              like(coloringPage.title, `%${search}%`),
              like(coloringPage.description, `%${search}%`),
              like(coloringPage.keyword, `%${search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(coloringPage.sort), desc(coloringPage.publishedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

/**
 * Get count of coloring pages
 */
export async function getColoringPagesCount({
  userId,
  jobId,
  status,
  category,
  keyword,
  search,
}: {
  userId?: string;
  jobId?: string;
  status?: ColoringPageStatus;
  category?: string;
  keyword?: string;
  search?: string;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(coloringPage)
    .where(
      and(
        userId ? eq(coloringPage.userId, userId) : undefined,
        jobId ? eq(coloringPage.jobId, jobId) : undefined,
        status ? eq(coloringPage.status, status) : undefined,
        category ? eq(coloringPage.category, category) : undefined,
        keyword ? eq(coloringPage.keyword, keyword) : undefined,
        search
          ? or(
              like(coloringPage.title, `%${search}%`),
              like(coloringPage.description, `%${search}%`),
              like(coloringPage.keyword, `%${search}%`)
            )
          : undefined
      )
    )
    .limit(1);

  return result?.count || 0;
}

/**
 * Get all unique categories
 */
export async function getColoringCategories(): Promise<string[]> {
  const results = await db()
    .selectDistinct({ category: coloringPage.category })
    .from(coloringPage)
    .where(eq(coloringPage.status, ColoringPageStatus.PUBLISHED));

  return results.map((r: { category: string | null }) => r.category).filter((c: string | null): c is string => c !== null);
}

/**
 * Publish a coloring page
 */
export async function publishColoringPage(id: string) {
  const [result] = await db()
    .update(coloringPage)
    .set({
      status: ColoringPageStatus.PUBLISHED,
      publishedAt: new Date(),
    })
    .where(eq(coloringPage.id, id))
    .returning();

  return result;
}

/**
 * Unpublish a coloring page (set back to draft)
 */
export async function unpublishColoringPage(id: string) {
  const [result] = await db()
    .update(coloringPage)
    .set({
      status: ColoringPageStatus.DRAFT,
      publishedAt: null,
    })
    .where(eq(coloringPage.id, id))
    .returning();

  return result;
}

/**
 * Batch create coloring pages
 */
export async function batchCreateColoringPages(
  pages: Array<Omit<NewColoringPage, 'id'>>
): Promise<ColoringPage[]> {
  if (pages.length === 0) {
    return [];
  }

  const values = pages.map((page) => ({
    ...page,
    id: nanoid(),
  }));

  const results = await db()
    .insert(coloringPage)
    .values(values)
    .returning();

  return results;
}

/**
 * Get pages by category
 */
export async function getPagesByCategory(
  category: string,
  page = 1,
  limit = 30
): Promise<ColoringPage[]> {
  return getColoringPages({
    category,
    status: ColoringPageStatus.PUBLISHED,
    page,
    limit,
  });
}

/**
 * Search coloring pages
 */
export async function searchColoringPages(
  query: string,
  page = 1,
  limit = 30
): Promise<ColoringPage[]> {
  return getColoringPages({
    search: query,
    status: ColoringPageStatus.PUBLISHED,
    page,
    limit,
  });
}
