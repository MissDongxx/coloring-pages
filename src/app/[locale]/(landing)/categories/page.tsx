import { setRequestLocale } from 'next-intl/server';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { getAllCategories } from '@/features/coloring/lib/data';

export const revalidate = 3600;

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categories = getAllCategories();

  // 转换为 CategoryGrid 需要的格式，包含 icon 和 preview
  const categoryData = categories.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    count: cat.count,
    icon: cat.icon,
    imageSrc: cat.imageSrc,
    preview: cat.preview,
  }));

  return (
    <div className="container mx-auto px-4 pt-16 pb-8 md:pt-32 md:pb-8 max-w-6xl">
      {/* 页面标题 */}
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
        All Coloring Categories
      </h1>
      <p className="text-lg text-center text-muted-foreground mb-8">
        Explore all {categories.length} categories of free printable coloring pages
      </p>

      {/* 所有分类 */}
      <CategoryGrid categories={categoryData} hideEmpty={false} />
    </div>
  );
}
