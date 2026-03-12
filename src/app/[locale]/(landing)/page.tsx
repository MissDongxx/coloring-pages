import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { PopularGrid } from '@/features/coloring/components/popular-grid';
import { getAllCategories, getPopularPages } from '@/features/coloring/lib/data';
import { getPopularHubs } from '@/shared/models/coloring_page';
import { ImageGenerator } from '@/shared/blocks/generator';
import { HubGrid } from '@/features/coloring/components/hub-grid';
import { Features } from '@/features/coloring/components/features';
import { Palette, Sparkles, Download } from 'lucide-react';

// 自定义图标组件
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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categories = getAllCategories();
  const popularPages = getPopularPages(8);
  const popularHubs = await getPopularHubs(8);

  // 只显示前8个分类
  const displayCategories = categories.slice(0, 8);
  const showMoreButton = categories.length > 8;

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

  return (
    <div className="container mx-auto px-4 pt-16 pb-8 md:pt-32 md:pb-8 max-w-6xl">


      {/* H1 - SEO优化标题 */}
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
        Free Printable Coloring Pages for Kids
      </h1>
      <p className="text-lg text-center text-muted-foreground mb-2">
        High-Quality PDF Coloring Pages for Kids, Parents, and Teachers
      </p>

      {/* 简短介绍 - SEO转化钩子 */}
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Browse by Theme</h2>
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

      {/* 热门涂色页 - 移到最下方 */}
      <section className="py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Popular Coloring Pages
        </h2>
        <PopularGrid items={popularPages} />
      </section>
    </div >
  );
}
