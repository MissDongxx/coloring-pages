/**
 * Coloring page model - manages generated coloring pages
 */

import { and, count, desc, eq, like, or, ilike, sql, isNotNull, not } from 'drizzle-orm';
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

// Copyright-related keywords to exclude from hubs
const EXCLUDED_HUB_KEYWORDS = [
  // Sanrio
  'hello kitty', 'kuromi', 'my melody', 'cinnamoroll', 'pompompurin',
  'kerokerokeroppi', 'bad badtz-maru', 'little twin stars', 'pochacco',
  'tuxedosam', 'hangyodon', 'osaru no monichi', 'chococat', 'spottie dottie', 'purin', 'dearluna',
  'sanrio',
  // Disney
  'mickey mouse', 'minnie mouse', 'donald duck', 'goofy', 'pluto', 'daisy duck',
  'chip and dale', 'winnie the pooh', 'tigger', 'piglet', 'eeyore', 'rabbit', 'roo', 'lumpy',
  'elsa', 'anna', 'olaf', 'moana', 'maui', 'ariel', 'belle', 'cinderella', 'snow white',
  'jasmine', 'aurora', 'rapunzel', 'tiana', 'merida', 'pocahontas', 'mulan', 'sleeping beauty',
  'disney', 'pixar',
  // Peppa Pig
  'peppa pig', 'george pig', 'suzy sheep', 'rebecca rabbit', 'danny dog', 'candy cat',
  'pedro pony', 'emily elephant', 'edmond elephant', 'richard rabbit', 'freddy fox',
  'wendy wolf', 'gabriella goat', 'kylie kangaroo', 'gerald giraffe',
  // Paw Patrol
  'paw patrol', 'chase', 'marshall', 'rubble', 'sky', 'rocky', 'zuma', 'everest', 'tracker', 'ryder',
  // Marvel/DC
  'spider-man', 'spiderman', 'batman', 'superman', 'wonder woman', 'iron man',
  'captain america', 'thor', 'hulk', 'black widow', 'hawkeye', 'black panther',
  'doctor strange', 'scarlet witch', 'ant-man', 'wasp', 'flash', 'aquaman', 'cyborg',
  'marvel', 'dc',
  // Others
  'spongebob', 'patrick', 'squidward', 'sandy', 'mr krabs', 'plankton',
  'pokemon', 'pikachu', 'charizard', 'mewtwo', 'eevee', 'snorlax', 'gengar',
  'lucario', 'mew', 'gyarados', 'dragonite', 'blastoise', 'venusaur', 'greninja',
  'ash ketchum', 'team rocket',
  'barbie', 'ken', 'skipper', 'stacie', 'chelsea', 'raquelle', 'ryan',
  'rainbow friends',
  'totoro', 'chihiro', 'howl', 'ponyo', 'mononoke', 'haku', 'calcifer', 'no-face', 'kiki', 'jiji',
  'doraemon', 'nobita', 'shizuka', 'takeshi', 'suneo',
  'crayon shin-chan', 'shinchan',
  'naruto', 'sasuke', 'sakura', 'kakashi',
  'dragon ball', 'goku', 'vegeta', 'bulma', 'piccolo', 'gohan', 'trunks', 'frieza', 'cell', 'buu',
  'thomas', 'bob the builder',
  'dreamworks',
  // Games
  'minecraft', 'fortnite', 'roblox', 'among us', 'fnaf', 'five nights at freddys',
  'league of legends', 'lol', 'genshin impact', 'genshin', 'honkai', 'valorant',
  'overwatch', 'call of duty', 'cod', 'gta', 'zelda', 'mario', 'luigi', 'princess peach',
  'sonic', 'pac-man', 'pacman', 'tetris', 'angry birds', 'subway surfers', 'candy crush',
  // Pop Culture/Toys
  'labubu', 'pop mart', 'skullpanda', 'hirono', 'dimoo', 'molly'
];

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

  // console.log('[coloring_page] Finding page with conditions:', { id, slug, conditions });

  const [result] = await db()
    .select()
    .from(coloringPage)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(1);

  // console.log('[coloring_page] Find result:', result ? { id: result.id, slug: result.slug, title: result.title } : null);

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
    ilike(coloringPage.rootKeyword, rootStr)
  ];

  // Add copyright keyword exclusions using Drizzle's not() and ilike()
  const exclusionConditions = EXCLUDED_HUB_KEYWORDS.map(
    keyword => not(ilike(coloringPage.rootKeyword, `%${keyword}%`))
  );
  conditions.push(...exclusionConditions);

  if (modifier) {
    const modStr = modifier.replace(/-/g, ' ');
    conditions.push(ilike(coloringPage.modifier, modStr));
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

      // Filter out undefined values to prevent Drizzle from using DEFAULT keyword
      // Only include properties with actual values (null, empty string, 0, false are kept)
      const cleanData = Object.fromEntries(
        Object.entries({ ...data, id, slug }).filter(([_, value]) => value !== undefined)
      );

      const [result] = await db()
        .insert(coloringPage)
        .values(cleanData)
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
      // Log more detailed error for debugging
      console.error('[coloring_page] Create page error:', {
        message: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint,
        slug,
        dataKeys: Object.keys(data)
      });
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
    ilike(coloringPage.rootKeyword, rootStr)
  ];

  // Add copyright keyword exclusions using Drizzle's not() and ilike()
  const exclusionConditions = EXCLUDED_HUB_KEYWORDS.map(
    keyword => not(ilike(coloringPage.rootKeyword, `%${keyword}%`))
  );
  conditions.push(...exclusionConditions);

  if (modifier) {
    const modStr = modifier.replace(/-/g, ' ');
    conditions.push(ilike(coloringPage.modifier, modStr));
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
  // Build exclusion conditions using Drizzle's not() and ilike()
  const exclusionConditions = EXCLUDED_HUB_KEYWORDS.map(
    keyword => not(ilike(coloringPage.rootKeyword, `%${keyword}%`))
  );

  // Single query to get all needed data
  const hubs = await db()
    .select({
      rootKeyword: coloringPage.rootKeyword,
      count: sql<number>`count(*)`.as('count'),
      imageUrl: sql<string>`COALESCE(
        MAX(CASE WHEN "image_url" LIKE '%images.coloringpages.club%' THEN "image_url" END),
        MAX("image_url")
      )`.as('image_url')
    })
    .from(coloringPage)
    .where(
      and(
        eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
        isNotNull(coloringPage.rootKeyword),
        sql`${coloringPage.rootKeyword} != ''`,
        ...exclusionConditions
      )
    )
    .groupBy(coloringPage.rootKeyword)
    .orderBy(desc(sql`count`))
    .limit(limitCount * 2); // Get more initially to account for filtering

  // Transform the results
  return hubs
    .map((hub: { rootKeyword: string | null; count: number; imageUrl: string | null }) => {
      const root = hub.rootKeyword || '';
      const slug = `${root}-coloring-pages`.replace(/\s+/g, '-').toLowerCase();
      const name = root.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      return {
        name,
        slug,
        count: hub.count,
        imageSrc: hub.imageUrl || '',
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
  // Build exclusion conditions using Drizzle's not() and ilike()
  const exclusionConditions = EXCLUDED_HUB_KEYWORDS.map(
    keyword => not(ilike(coloringPage.rootKeyword, `%${keyword}%`))
  );

  const conditions = [
    eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
    isNotNull(coloringPage.rootKeyword),
    sql`${coloringPage.rootKeyword} != ''`,
    ...exclusionConditions,
  ];

  if (search) {
    conditions.push(ilike(coloringPage.rootKeyword, `%${search}%`));
  }

  // Get total unique rootKeywords count
  const [totalResult] = await db()
    .select({ count: sql<number>`count(DISTINCT "root_keyword")` })
    .from(coloringPage)
    .where(and(...conditions));

  const totalCount = totalResult?.count || 0;

  // Get paginated hubs
  const hubs = await db()
    .select({
      rootKeyword: coloringPage.rootKeyword,
      roughCount: sql<number>`count(*)`.as('rough_count'),
      imageUrl: sql<string>`COALESCE(
        MAX(CASE WHEN "image_url" LIKE '%images.coloringpages.club%' THEN "image_url" END),
        MAX("image_url")
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
      imageSrc: hub.imageUrl || '',
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
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache - increased to reduce DB load

/**
 * Finds the canonical rootKeyword and modifier for a given Hub slug prefix
 * (e.g. "micro-nature-leaf-veins" -> { rootKeyword: "nature leaf veins", modifier: "micro" })
 */
export async function findHubBySlugPrefix(prefix: string) {
  try {
    const now = Date.now();
    if (!hubCache || now - lastCacheTime > CACHE_TTL) {
      // Build exclusion conditions using Drizzle's not() and ilike()
      const exclusionConditions = EXCLUDED_HUB_KEYWORDS.map(
        keyword => not(ilike(coloringPage.rootKeyword, `%${keyword}%`))
      );

      // Use DISTINCT ON for better performance in PostgreSQL
      hubCache = await db()
        .selectDistinct({
          rootKeyword: coloringPage.rootKeyword,
          modifier: coloringPage.modifier,
        })
        .from(coloringPage)
        .where(
          and(
            eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
            isNotNull(coloringPage.rootKeyword),
            ...exclusionConditions
          )
        )
        .orderBy(coloringPage.rootKeyword, coloringPage.modifier)
        .limit(10000); // Add a limit to prevent excessive data fetching

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

/**
 * Get all existing generation keywords from the database
 * Used to filter out already generated keywords
 */
export async function getAllGeneratedKeywords(): Promise<Set<string>> {
  const results = await db()
    .select({ keyword: coloringPage.keyword })
    .from(coloringPage)
    .where(isNotNull(coloringPage.keyword));

  return new Set(results.map((r: { keyword: string | null }) => r.keyword).filter((k: string | null): k is string => k !== null && k !== ''));
}

/**
 * Get all published page slugs for deduplication
 */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const results = await db()
    .select({ slug: coloringPage.slug })
    .from(coloringPage)
    .where(eq(coloringPage.status, ColoringPageStatus.PUBLISHED));

  return results.map((r: { slug: string | null }) => r.slug).filter((s: string | null): s is string => s !== null && s !== '');
}

/**
 * Unpublish all IP-related coloring pages
 * Matches pages whose rootKeyword, keyword, title, or description contains IP-related keywords
 */
export async function unpublishIPRelatedPages(): Promise<{ count: number; ids: string[] }> {
  // Build conditions to match any IP-related keyword in multiple fields
  const keywordConditions = EXCLUDED_HUB_KEYWORDS.flatMap(keyword => [
    ilike(coloringPage.rootKeyword, `%${keyword}%`),
    ilike(coloringPage.keyword, `%${keyword}%`),
    ilike(coloringPage.title, `%${keyword}%`),
    ilike(coloringPage.description, `%${keyword}%`)
  ]);

  // Find all published pages that match IP keywords
  const matchingPages = await db()
    .select({ id: coloringPage.id, title: coloringPage.title, keyword: coloringPage.keyword })
    .from(coloringPage)
    .where(
      and(
        eq(coloringPage.status, ColoringPageStatus.PUBLISHED),
        or(...keywordConditions)
      )
    );

  const ids = matchingPages.map((p: { id: string }) => p.id);

  if (ids.length === 0) {
    console.log('[unpublishIPRelatedPages] No IP-related pages found to unpublish.');
    return { count: 0, ids: [] };
  }

  // Log what we're unpublishing
  console.log(`[unpublishIPRelatedPages] Found ${ids.length} IP-related pages to unpublish:`);
  matchingPages.slice(0, 10).forEach((p: { title: string; keyword: string }) => {
    console.log(`  - ${p.title} (keyword: ${p.keyword})`);
  });
  if (matchingPages.length > 10) {
    console.log(`  ... and ${matchingPages.length - 10} more`);
  }

  // Update by ID to ensure we only update the matched pages
  for (const id of ids) {
    await db()
      .update(coloringPage)
      .set({
        status: ColoringPageStatus.DRAFT,
        publishedAt: null,
      })
      .where(eq(coloringPage.id, id));
  }

  return { count: ids.length, ids };
}
