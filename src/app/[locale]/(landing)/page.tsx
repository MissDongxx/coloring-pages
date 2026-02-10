import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { PopularGrid } from '@/features/coloring/components/popular-grid';
import { getAllCategories, getPopularPages } from '@/features/coloring/lib/data';
import { ImageGenerator } from '@/shared/blocks/generator';

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

      {/* 分类入口 - 只显示前8个 */}
      <section className="py-12 mb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Browse by Category
        </h2>
        <CategoryGrid categories={categoryData} />

        {/* 更多类别按钮 */}
        {showMoreButton && (
          <div className="text-center mt-8">
            <Link
              href="/categories"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              More Categories ({categories.length - 8}+)
            </Link>
          </div>
        )}
      </section>

      {/* 热门涂色页 - 移到最下方 */}
      <section className="py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Popular Coloring Pages
        </h2>
        <PopularGrid items={popularPages} />
      </section>
    </div>
  );
}
