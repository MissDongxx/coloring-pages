/**
 * Coloring page model - manages generated coloring pages
 */

import { and, count, desc, eq, like, or, ilike, sql, isNotNull } from 'drizzle-orm';
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
 * Get pages for an SEO Hub based on root keyword and optional modifier.
 * Uses ilike and space replacement to fuzzy match the slugified terms.
 */
export async function getPagesForHub({
  rootKeyword,
  modifier,
  page = 1,
  limit = 30,
}: {
  rootKeyword: string;
  modifier?: string | null;
  page?: number;
  limit?: number;
}): Promise<ColoringPage[]> {
  const rootStr = rootKeyword.replace(/-/g, ' ');

  const conditions = [
    eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
    ilike(coloringPage.rootKeyword, `%${rootStr}%`)
  ];

  if (modifier) {
    const modStr = modifier.replace(/-/g, ' ');
    conditions.push(ilike(coloringPage.modifier, `%${modStr}%`));
  }

  const result = await db()
    .select()
    .from(coloringPage)
    .where(and(...conditions))
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

/**
 * Create a coloring page with slug conflict retry.
 * On unique violation, appends -2, -3, etc.
 * Uses DB unique index as the source of truth (concurrent-safe).
 */
export async function createColoringPageWithSlugRetry(
  data: Omit<NewColoringPage, 'id'>,
  maxRetries = 10
): Promise<ColoringPage> {
  const baseSlug = data.slug;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    try {
      const id = nanoid();
      const [result] = await db()
        .insert(coloringPage)
        .values({ ...data, id, slug })
        .returning();
      return result;
    } catch (err: any) {
      // Check if it's a unique constraint violation
      const msg = (err.message || '').toLowerCase();
      const code = err.code || '';
      if (code === '23505' || msg.includes('unique') || msg.includes('duplicate')) {
        console.log(`[coloring_page] Slug "${slug}" conflict, trying next...`);
        continue;
      }
      throw err; // Re-throw non-conflict errors
    }
  }

  throw new Error(`Failed to create page after ${maxRetries} slug retries for base: ${baseSlug}`);
}

/**
 * Get count of pages matching hub criteria (for hub page display)
 */
export async function getPagesCountForHub({
  rootKeyword,
  modifier,
}: {
  rootKeyword: string;
  modifier?: string | null;
}): Promise<number> {
  const rootStr = rootKeyword.replace(/-/g, ' ');
  const conditions = [
    eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
    ilike(coloringPage.rootKeyword, `%${rootStr}%`)
  ];

  if (modifier) {
    const modStr = modifier.replace(/-/g, ' ');
    conditions.push(ilike(coloringPage.modifier, `%${modStr}%`));
  }

  const [result] = await db()
    .select({ count: count() })
    .from(coloringPage)
    .where(and(...conditions))
    .limit(1);

  return result?.count || 0;
}

/**
 * Get popular SEO Hub combinations aggregated by rootKeyword and modifier
 */
export async function getPopularHubs(limitCount: number = 8) {
  // 1. Get the likely top root keywords by rough count
  const hubs = await db()
    .select({
      rootKeyword: coloringPage.rootKeyword,
      roughCount: sql<number>`count(*)`.as('rough_count'),
      imageUrl: sql<string>`COALESCE(
        MAX(CASE WHEN ${coloringPage.imageUrl} LIKE '%images.coloringpages.club%' THEN ${coloringPage.imageUrl} END),
        MAX(${coloringPage.imageUrl})
      )`.as('image_url')
    })
    .from(coloringPage)
    .where(
      and(
        eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
        isNotNull(coloringPage.rootKeyword),
        sql`${coloringPage.rootKeyword} != ''`
      )
    )
    .groupBy(coloringPage.rootKeyword)
    .orderBy(desc(sql`rough_count`)) // Sort by rough count first
    .limit(limitCount + 20); // Fetch a larger pool for accurate recount

  // 2. For each hub, get the accurate count using the more inclusive logic
  const result = await Promise.all(
    hubs.map(async (hub: { rootKeyword: string | null; imageUrl: string | null }) => {
      const accurateCount = await getPagesCountForHub({ rootKeyword: hub.rootKeyword || '' });
      return {
        ...hub,
        count: accurateCount
      };
    })
  );

  // 3. Final sort by accurate count and limit
  return result
    .sort((a, b) => b.count - a.count)
    .slice(0, limitCount)
    .map((hub: { rootKeyword: string | null; count: number; imageUrl: string | null }) => {
      const root = hub.rootKeyword || '';
      const slug = `${root}-coloring-pages`.replace(/\s+/g, '-').toLowerCase();
      const name = root.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      return {
        name,
        slug,
        count: hub.count,
        imageSrc: hub.imageUrl || '/images/coloring/placeholder.png',
        rootKeyword: root,
        modifier: null
      };
    });
}


/**
 * Get all hubs with pagination and optional search
 */
export async function getAllHubs({
  page = 1,
  pageSize = 20,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const conditions = [
    eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
    isNotNull(coloringPage.rootKeyword),
    sql`${coloringPage.rootKeyword} != ''`,
  ];

  if (search) {
    conditions.push(ilike(coloringPage.rootKeyword, `%${search}%`));
  }

  // Get total unique rootKeywords count
  const [totalResult] = await db()
    .select({ count: sql<number>`count(DISTINCT ${coloringPage.rootKeyword})` })
    .from(coloringPage)
    .where(and(...conditions));

  const totalCount = totalResult?.count || 0;

  // Get paginated hubs
  const hubs = await db()
    .select({
      rootKeyword: coloringPage.rootKeyword,
      roughCount: sql<number>`count(*)`.as('rough_count'),
      imageUrl: sql<string>`COALESCE(
        MAX(CASE WHEN ${coloringPage.imageUrl} LIKE '%images.coloringpages.club%' THEN ${coloringPage.imageUrl} END),
        MAX(${coloringPage.imageUrl})
      )`.as('image_url'),
    })
    .from(coloringPage)
    .where(and(...conditions))
    .groupBy(coloringPage.rootKeyword)
    .orderBy(desc(sql`rough_count`))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const hubData = hubs.map((hub: { rootKeyword: string | null; roughCount: number; imageUrl: string | null }) => {
    const root = hub.rootKeyword || '';
    const slug = `${root}-coloring-pages`.replace(/\s+/g, '-').toLowerCase();
    const name = root
      .split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      name,
      slug,
      count: hub.roughCount,
      imageSrc: hub.imageUrl || '/images/coloring/placeholder.png',
      rootKeyword: root,
      modifier: null,
    };
  });

  return {
    hubs: hubData,
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

let hubCache: { rootKeyword: string | null; modifier: string | null }[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Finds the canonical rootKeyword and modifier for a given Hub slug prefix
 * (e.g. "micro-nature-leaf-veins" -> { rootKeyword: "nature leaf veins", modifier: "micro" })
 */
export async function findHubBySlugPrefix(prefix: string) {
  try {
    const now = Date.now();
    if (!hubCache || now - lastCacheTime > CACHE_TTL) {
      // Fetch all distinct pairs to match against slugified version
      hubCache = await db()
        .select({
          rootKeyword: coloringPage.rootKeyword,
          modifier: coloringPage.modifier,
        })
        .from(coloringPage)
        .where(
          and(
            eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
            isNotNull(coloringPage.rootKeyword)
          )
        )
        .groupBy(coloringPage.rootKeyword, coloringPage.modifier);

      lastCacheTime = now;
    }

    if (!hubCache) return null;

    return hubCache.find((h: { rootKeyword: string | null; modifier: string | null }) => {
      const hubSlug = h.modifier
        ? `${h.modifier}-${h.rootKeyword}`.toLowerCase().replace(/\s+/g, '-')
        : h.rootKeyword!.toLowerCase().replace(/\s+/g, '-');
      return hubSlug === prefix;
    }) || null;
  } catch (error) {
    console.error('[findHubBySlugPrefix] Error fetching hubs:', error);
    // If cache exists, return from stale cache as fallback
    if (hubCache) {
      return hubCache.find((h: { rootKeyword: string | null; modifier: string | null }) => {
        const hubSlug = h.modifier
          ? `${h.modifier}-${h.rootKeyword}`.toLowerCase().replace(/\s+/g, '-')
          : h.rootKeyword!.toLowerCase().replace(/\s+/g, '-');
        return hubSlug === prefix;
      }) || null;
    }
    return null;
  }
}
