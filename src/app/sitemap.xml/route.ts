import { NextResponse } from 'next/server';
import { db } from '@/core/db';
import { coloringPage, post } from '@/config/db/schema';
import { envConfigs } from '@/config';
import { joinUrl } from '@/shared/lib/utils';
import { eq, or, ilike, and, not } from 'drizzle-orm';
import { getAllCategories } from '@/features/coloring/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SITEMAP_URLS = 1000;

// Copyright-related keywords to exclude from sitemap
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
      // Exclude IP/copyright-related pages
      const PAGES_LIMIT = Math.min(200, (MAX_SITEMAP_URLS - entries.length) / 2);
      const ipExclusionConditions = EXCLUDED_HUB_KEYWORDS.flatMap(keyword => [
        ilike(coloringPage.rootKeyword, `%${keyword}%`),
        ilike(coloringPage.keyword, `%${keyword}%`)
      ]);

      // Build where conditions, filter out undefined
      const whereConditions = [eq(coloringPage.status, 'published')];
      if (ipExclusionConditions.length > 0) {
        const orCondition = or(...ipExclusionConditions);
        if (orCondition) {
          whereConditions.push(not(orCondition));
        }
      }

      const publishedPages = await db()
        .select({
          slug: coloringPage.slug,
          updatedAt: coloringPage.updatedAt,
        })
        .from(coloringPage)
        .where(and(...whereConditions))
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
  // Exclude copyright-related categories (IP, fan-art)
  const EXCLUDED_CATEGORIES = ['IP', 'fan-art', 'ip', 'fan-art'];
  if (entries.length < MAX_SITEMAP_URLS) {
    try {
      const categories = getAllCategories();
      for (const cat of categories) {
        if (entries.length >= MAX_SITEMAP_URLS) break;
        // Skip excluded categories
        if (EXCLUDED_CATEGORIES.includes(cat.slug)) continue;
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
