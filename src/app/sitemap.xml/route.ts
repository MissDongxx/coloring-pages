import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { coloringPage, post } from '@/config/db/schema';
import { envConfigs } from '@/config';
import { joinUrl } from '@/shared/lib/utils';
import { eq } from 'drizzle-orm';
import { getAllCategories } from '@/features/coloring/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SITEMAP_URLS = 1000;

interface SitemapEntry {
  url: string;
  lastModified: Date | string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'always';
  priority: number;
}

async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const baseUrl = envConfigs.app_url || 'https://coloringpages.club';
  const defaultLocale = envConfigs.locale || 'en';

  const entries: SitemapEntry[] = [];

  // Static routes - high priority
  entries.push(
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: joinUrl(baseUrl, defaultLocale),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: joinUrl(baseUrl, 'blog'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: joinUrl(baseUrl, defaultLocale, 'blog'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: joinUrl(baseUrl, 'categories'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: joinUrl(baseUrl, defaultLocale, 'categories'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  );

  // Early return if we've hit the limit
  if (entries.length >= MAX_SITEMAP_URLS) {
    return entries.slice(0, MAX_SITEMAP_URLS);
  }

  // Dynamic routes - only if database configured
  if (envConfigs.database_url) {
    try {
      // Limit blog posts to keep sitemap small
      const BLOG_LIMIT = Math.min(200, (MAX_SITEMAP_URLS - entries.length) / 2);
      const publishedPosts = await db()
        .select({
          slug: post.slug,
          updatedAt: post.updatedAt,
        })
        .from(post)
        .where(eq(post.status, 'published'))
        .limit(BLOG_LIMIT);

      for (const post of publishedPosts) {
        if (entries.length >= MAX_SITEMAP_URLS) break;
        entries.push({
          url: joinUrl(baseUrl, 'blog', post.slug),
          lastModified: post.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
        if (entries.length >= MAX_SITEMAP_URLS) break;
        entries.push({
          url: joinUrl(baseUrl, defaultLocale, 'blog', post.slug),
          lastModified: post.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }

      // Limit coloring pages
      const PAGES_LIMIT = Math.min(200, (MAX_SITEMAP_URLS - entries.length) / 2);
      const publishedPages = await db()
        .select({
          slug: coloringPage.slug,
          updatedAt: coloringPage.updatedAt,
        })
        .from(coloringPage)
        .where(eq(coloringPage.status, 'published'))
        .limit(PAGES_LIMIT);

      for (const page of publishedPages) {
        if (entries.length >= MAX_SITEMAP_URLS) break;
        entries.push({
          url: joinUrl(baseUrl, page.slug),
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
        if (entries.length >= MAX_SITEMAP_URLS) break;
        entries.push({
          url: joinUrl(baseUrl, defaultLocale, page.slug),
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
  if (entries.length < MAX_SITEMAP_URLS) {
    try {
      const categories = getAllCategories();
      for (const cat of categories) {
        if (entries.length >= MAX_SITEMAP_URLS) break;
        entries.push({
          url: joinUrl(baseUrl, cat.slug),
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    } catch (error) {
      console.error('Error fetching categories for sitemap:', error);
    }
  }

  return entries;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = `    <lastmod>${formatDate(entry.lastModified)}</lastmod>`;
      const changefreq = `    <changefreq>${entry.changeFrequency}</changefreq>`;
      const priority = `    <priority>${entry.priority.toFixed(1)}</priority>`;
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
${lastmod}
${changefreq}
${priority}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export async function GET() {
  const entries = await getSitemapEntries();
  const xml = generateSitemapXml(entries);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
