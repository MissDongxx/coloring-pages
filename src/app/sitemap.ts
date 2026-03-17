import { MetadataRoute } from 'next';

import { db } from '@/core/db';
import { coloringPage, post } from '@/config/db/schema';
import { envConfigs } from '@/config';
import { eq } from 'drizzle-orm';
import { getAllCategories } from '@/features/coloring/lib/data';

const MAX_SITEMAP_URLS = 1000; // Limit to 1000 URLs for better performance

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = envConfigs.app_url || 'https://coloringpages.club';
  const baseUrlString = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  const baseUrl = new URL(baseUrlString);
  const defaultLocale = envConfigs.locale || 'en';

  const routes: MetadataRoute.Sitemap = [];

  // Static routes - high priority
  routes.push(
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
      priority: 0.9,
    },
    {
      url: `${baseUrl.href}${defaultLocale}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl.href}categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl.href}${defaultLocale}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  );

  // Early return if we've hit the limit
  if (routes.length >= MAX_SITEMAP_URLS) {
    return routes.slice(0, MAX_SITEMAP_URLS);
  }

  // Dynamic routes - only if database configured
  if (envConfigs.database_url) {
    try {
      // Limit blog posts to keep sitemap small
      const BLOG_LIMIT = Math.min(200, (MAX_SITEMAP_URLS - routes.length) / 2);
      const publishedPosts = await db()
        .select({
          slug: post.slug,
          updatedAt: post.updatedAt,
        })
        .from(post)
        .where(eq(post.status, 'published'))
        .limit(BLOG_LIMIT);

      for (const post of publishedPosts) {
        if (routes.length >= MAX_SITEMAP_URLS) break;
        routes.push({
          url: `${baseUrl.href}blog/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
        if (routes.length >= MAX_SITEMAP_URLS) break;
        routes.push({
          url: `${baseUrl.href}${defaultLocale}/blog/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }

      // Limit coloring pages
      const PAGES_LIMIT = Math.min(200, (MAX_SITEMAP_URLS - routes.length) / 2);
      const publishedPages = await db()
        .select({
          slug: coloringPage.slug,
          updatedAt: coloringPage.updatedAt,
        })
        .from(coloringPage)
        .where(eq(coloringPage.status, 'published'))
        .limit(PAGES_LIMIT);

      for (const page of publishedPages) {
        if (routes.length >= MAX_SITEMAP_URLS) break;
        routes.push({
          url: `${baseUrl.href}${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
        if (routes.length >= MAX_SITEMAP_URLS) break;
        routes.push({
          url: `${baseUrl.href}${defaultLocale}/${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    } catch (error) {
      console.error('Error fetching dynamic routes for sitemap:', error);
    }
  }

  // Add category pages (higher priority than individual pages)
  if (routes.length < MAX_SITEMAP_URLS) {
    try {
      const categories = getAllCategories();
      for (const cat of categories) {
        if (routes.length >= MAX_SITEMAP_URLS) break;
        routes.push({
          url: `${baseUrl.href}${cat.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    } catch (error) {
      console.error('Error fetching categories for sitemap:', error);
    }
  }

  return routes;
}
