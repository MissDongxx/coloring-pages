import { setRequestLocale } from 'next-intl/server';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { getAllCategories } from '@/features/coloring/lib/data';
import { getMetadata } from '@/shared/lib/seo';
import {
  JSONLDScript,
  generateCollectionPageSchema,
  generateItemListSchema,
  generateBreadcrumbSchema,
} from '@/shared/lib/structured-data';
import { envConfigs } from '@/config';

export const revalidate = 3600;

// Generate metadata for SEO
export const generateMetadata = getMetadata({
  title: 'All Coloring Page Categories - Free Printable',
  description: 'Browse all coloring page categories. Animals, nature, vehicles, fantasy, holidays and more themes for kids and adults.',
  canonicalUrl: '/categories',
});

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

  // Generate structured data for SEO
  const siteUrl = envConfigs.app_url || 'https://coloringpages.club';

  // CollectionPage Schema
  const collectionSchema = generateCollectionPageSchema({
    name: 'All Coloring Page Categories',
    description: `Browse our collection of ${categories.length} coloring page categories with thousands of free printable pages`,
    url: `${siteUrl}/categories`,
    numberOfItems: categories.length
  });

  // ItemList Schema for categories
  const itemListSchema = generateItemListSchema({
    name: 'Coloring Page Categories',
    description: 'List of all coloring page categories available on our site',
    url: `${siteUrl}/categories`,
    items: categories.map(cat => ({
      name: cat.name,
      url: `/${cat.slug}`,
      description: `${cat.count} ${cat.name.toLowerCase()} coloring pages`
    }))
  });

  // Breadcrumb Schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: `${siteUrl}/` },
    { name: 'Categories', item: `${siteUrl}/categories` }
  ]);

  return (
    <>
      {/* Structured Data for SEO */}
      <JSONLDScript data={collectionSchema} />
      <JSONLDScript data={itemListSchema} />
      <JSONLDScript data={breadcrumbSchema} />

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
    </>
  );
}
