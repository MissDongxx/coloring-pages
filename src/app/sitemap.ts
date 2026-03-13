import { MetadataRoute } from 'next';

import { db } from '@/core/db';
import { coloringPage, post } from '@/config/db/schema';
import { envConfigs } from '@/config';
import { eq } from 'drizzle-orm';
import { getAllPageSlugs, getAllCategories } from '@/features/coloring/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = envConfigs.app_url || 'https://coloringpages.club';
  // Remove trailing slash to avoid double slashes
  const baseUrlString = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  const baseUrl = new URL(baseUrlString);

  // Get default locale from config
  const defaultLocale = envConfigs.locale || 'en';

  // Static routes - include both root and default locale paths
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl.href,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl.href}${defaultLocale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl.href}blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl.href}${defaultLocale}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl.href}showcases`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl.href}${defaultLocale}/showcases`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl.href}categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl.href}${defaultLocale}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Dynamic routes - only fetch if database is configured
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  if (envConfigs.database_url) {
    try {
      // Get published blog posts
      const publishedPosts = await db()
        .select({
          slug: post.slug,
          updatedAt: post.updatedAt,
        })
        .from(post)
        .where(eq(post.status, 'published'))
        .limit(5000);

      for (const post of publishedPosts) {
        // Add both without locale and with default locale
        dynamicRoutes.push({
          url: `${baseUrl.href}blog/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
        dynamicRoutes.push({
          url: `${baseUrl.href}${defaultLocale}/blog/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }

      // Get published coloring pages
      const publishedPages = await db()
        .select({
          slug: coloringPage.slug,
          updatedAt: coloringPage.updatedAt,
        })
        .from(coloringPage)
        .where(eq(coloringPage.status, 'published'))
        .limit(5000);

      for (const page of publishedPages) {
        // Add both without locale and with default locale
        dynamicRoutes.push({
          url: `${baseUrl.href}${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.5,
        });
        dynamicRoutes.push({
          url: `${baseUrl.href}${defaultLocale}/${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    } catch (error) {
      console.error('Error fetching dynamic routes for sitemap:', error);
    }
  }

  // Static coloring pages from all-pages.json + category pages
  const staticColoringRoutes: MetadataRoute.Sitemap = [];

  // Deduplicate: collect slugs already in dynamicRoutes
  const existingSlugs = new Set(dynamicRoutes.map(r => {
    const url = new URL(r.url);
    return url.pathname.replace(/^\//, '').replace(/\/$/, '');
  }));

  // Add all static coloring page slugs
  const allSlugs = getAllPageSlugs();
  for (const slug of allSlugs) {
    if (!existingSlugs.has(slug)) {
      staticColoringRoutes.push({
        url: `${baseUrl.href}${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }

  // Add category pages
  const categories = getAllCategories();
  for (const cat of categories) {
    if (!existingSlugs.has(cat.slug)) {
      staticColoringRoutes.push({
        url: `${baseUrl.href}${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return [...staticRoutes, ...dynamicRoutes, ...staticColoringRoutes];
}
