import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getTranslations, getMessages } from 'next-intl/server';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { PopularGrid } from '@/features/coloring/components/popular-grid';
import { getAllCategories, getPopularPages } from '@/features/coloring/lib/data';
import { getPopularHubs } from '@/shared/models/coloring_page';
import { ImageGenerator } from '@/shared/blocks/generator';
import { HubGrid } from '@/features/coloring/components/hub-grid';
import { Features } from '@/features/coloring/components/features';
import { Palette, Sparkles, Download } from 'lucide-react';
import { Pricing } from '@/themes/default/blocks/pricing';
import { getMetadata } from '@/shared/lib/seo';
import {
  JSONLDScript,
  generateWebSiteSchema,
  generateCollectionPageSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
} from '@/shared/lib/structured-data';
import { envConfigs } from '@/config';
import { joinUrl } from '@/shared/lib/utils';

// Custom icon components
function PaletteIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
      <ellipse cx="32" cy="32" rx="24" ry="24" fill="currentColor" fillOpacity="0.9"/>
      <circle cx="20" cy="24" r="5" fill="#FF6B6B"/>
      <circle cx="32" cy="20" r="5" fill="#4ECDC4"/>
      <circle cx="44" cy="24" r="5" fill="#FFE66D"/>
      <circle cx="48" cy="36" r="5" fill="#95E1D3"/>
      <circle cx="38" cy="46" r="5" fill="#F38181"/>
      <ellipse cx="32" cy="32" rx="24" ry="24" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
      <path d="M32 8C32 8 36 20 40 24C44 28 56 32 56 32C56 32 44 36 40 40C36 44 32 56 32 56C32 56 28 44 24 40C20 36 8 32 8 32C8 32 20 28 24 24C28 20 32 8 32 8Z" fill="currentColor" fillOpacity="0.9"/>
      <path d="M32 8C32 8 36 20 40 24C44 28 56 32 56 32C56 32 44 36 40 40C36 44 32 56 32 56C32 56 28 44 24 40C20 36 8 32 8 32C8 32 20 28 24 24C28 20 32 8 32 8Z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="32" cy="32" r="8" fill="#FFD93D" fillOpacity="0.8"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
      <rect x="12" y="8" width="40" height="48" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2"/>
      <path d="M32 20V40" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M24 32L32 40L40 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 52H44" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export const revalidate = 3600;

// Generate metadata for SEO
export const generateMetadata = getMetadata({
  metadataKey: 'pages.index.page.metadata',
  canonicalUrl: '/',
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categories = getAllCategories();
  const popularPages = getPopularPages(12);
  const popularHubs = await getPopularHubs(16);

  // 过滤掉版权相关的分类（IP, fan-art）
  const EXCLUDED_SLUGS = ['ip', 'fan-art', 'IP', 'fan-art'];
  const filteredCategories = categories.filter(cat => !EXCLUDED_SLUGS.includes(cat.slug));

  // 只显示前8个分类
  const displayCategories = filteredCategories.slice(0, 8);
  const showMoreButton = filteredCategories.length > 8;

  // 转换为 CategoryGrid 需要的格式，包含 icon 和 preview
  const categoryData = displayCategories.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    count: cat.count,
    icon: cat.icon,
    imageSrc: cat.imageSrc,
    preview: cat.preview,
  }));

  const t = await getTranslations('ai.image');
  const messages = await getMessages();
  const pricingData = (messages.pages as any).index.page.sections.pricing;

  // Generate structured data for SEO
  const siteUrl = envConfigs.app_url || 'https://coloringpages.club';

  // WebSite Schema
  const websiteSchema = generateWebSiteSchema({
    name: 'ColoringPages',
    url: siteUrl,
    description: 'Download 1000+ free printable coloring pages for kids and adults in PDF format'
  });

  // CollectionPage Schema
  const collectionSchema = generateCollectionPageSchema({
    name: 'Free Printable Coloring Pages Collection',
    description: 'Browse our collection of free printable coloring pages including animals, princess, cars, holidays and more themes',
    url: joinUrl(siteUrl, '/'),
    numberOfItems: popularPages.length + categoryData.length
  });

  // Breadcrumb Schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: joinUrl(siteUrl, '/') }
  ]);

  // FAQ Schema - Use FAQ data from index.json
  const tPage = await getTranslations('pages.index.page');
  const faqRawData = tPage.raw('sections.faq.items') as Array<{question: string; answer: string}>;
  const faqSchema = generateFAQSchema(faqRawData.slice(0, 5)); // Take first 5 FAQs

  return (
    <>
      {/* Structured Data for SEO */}
      <JSONLDScript data={websiteSchema} />
      <JSONLDScript data={collectionSchema} />
      <JSONLDScript data={breadcrumbSchema} />
      <JSONLDScript data={faqSchema} />

      <div className="container mx-auto px-4 pt-16 pb-8 md:pt-32 md:pb-8 max-w-6xl">


      {/* H1 - SEO优化标题 */}
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
        Free Printable Coloring Pages for Kids
      </h1>
      <p className="text-lg text-center text-muted-foreground mb-2">
        High-Quality PDF Coloring Pages for Kids, Parents, and Teachers
      </p>

      {/* Brief intro - SEO conversion hook */}
      <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
        Download hundreds of free printable coloring pages in high-quality PDF format.
        Perfect for kids, parents, and teachers. No registration required.
      </p>

      {/* Image Generator */}
      <section className="mb-24">
        <ImageGenerator srOnlyTitle="AI Coloring Page Generator" />
      </section>

      {/* Browse by Theme Section */}
      <section id="browse-by-theme" className="mb-12">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h2 className="text-2xl font-bold">Browse by Theme</h2>
          <form action={`/${locale}/themes`} method="GET" className="relative w-48 md:w-64">
            <input
              type="text"
              name="q"
              placeholder="Search themes..."
              className="w-full px-4 py-2 pl-10 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        </div>
        <HubGrid hubs={popularHubs} />
        <div className="mt-8 text-center">
          <Link
            href={`/${locale}/themes`}
            className="inline-flex items-center justify-center px-10 py-4 text-base font-medium transition-all rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:opacity-90"
          >
            View All Themes
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <Features
        features={[
          {
            icon: <PaletteIcon />,
            title: 'Online Coloring',
            description: 'Color directly in your browser with our easy-to-use digital coloring tools. No download or installation required - start creating instantly!',
          },
          {
            icon: <SparkleIcon />,
            title: 'AI Generator',
            description: 'Create unique coloring pages with our AI-powered generator. Simply describe what you want and watch your custom coloring page come to life.',
          },
          {
            icon: <DownloadIcon />,
            title: 'Free PDF Downloads',
            description: 'Download high-quality PDF coloring pages for free. Print them anytime, anywhere. Perfect for home, classroom, or on-the-go coloring fun.',
          },
        ]}
      />

      {/* Popular coloring pages - moved to bottom */}
      <section className="py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Popular Coloring Pages
        </h2>
        <PopularGrid items={popularPages} />
      </section>

      {/* Pricing Section */}
      {pricingData && <div id="pricing"><Pricing section={pricingData} /></div>}
    </div>
    </>
  );
}
