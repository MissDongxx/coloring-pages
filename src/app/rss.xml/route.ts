import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { coloringPage } from '@/config/db/schema';
import { eq, desc } from 'drizzle-orm';
import { envConfigs } from '@/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RSSItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  enclosure: {
    url: string;
    type: string;
  };
  category: string;
}

export async function GET() {
  const appUrl = envConfigs.app_url || 'https://coloringpages.club';
  const baseUrl = new URL(appUrl);

  // Fetch published coloring pages
  let pages: any[] = [];
  if (envConfigs.database_url) {
    try {
      pages = await db()
        .select()
        .from(coloringPage)
        .where(eq(coloringPage.status, 'published'))
        .orderBy(desc(coloringPage.publishedAt))
        .limit(100);
    } catch (error) {
      console.error('Error fetching pages for RSS feed:', error);
    }
  }

  // Build RSS items
  const rssItems: RSSItem[] = pages.map((page) => {
    const pubDate = page.publishedAt
      ? new Date(page.publishedAt).toUTCString()
      : new Date(page.createdAt).toUTCString();

    const description = page.description || `Beautiful ${page.title} for you to color! Download and enjoy.`;

    return {
      title: page.title,
      description,
      link: `${baseUrl.href}${page.slug}`,
      guid: `${baseUrl.href}${page.slug}`,
      pubDate,
      enclosure: {
        url: page.imageUrl,
        type: 'image/jpeg',
      },
      category: page.category || 'coloring-pages',
    };
  });

  // Generate RSS XML
  const rssXml = generateRSSXml({
    title: 'Coloring Pages Club - Latest Coloring Pages',
    description: 'Download and print beautiful coloring pages for kids and adults',
    link: baseUrl.href,
    language: 'en-us',
    items: rssItems,
  });

  return new NextResponse(rssXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

interface RSSFeedOptions {
  title: string;
  description: string;
  link: string;
  language: string;
  items: RSSItem[];
}

function generateRSSXml(options: RSSFeedOptions): string {
  const { title, description, link, language, items } = options;
  const lastBuildDate = new Date().toUTCString();

  const itemsXml = items
    .map(
      (item) => `  <item>
    <title>${escapeXml(item.title)}</title>
    <description>${escapeXml(item.description)}</description>
    <link>${escapeXml(item.link)}</link>
    <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
    <pubDate>${item.pubDate}</pubDate>
    <enclosure url="${escapeXml(item.enclosure.url)}" type="${item.enclosure.type}"/>
    <category>${escapeXml(item.category)}</category>
  </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <language>${language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(link)}rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
