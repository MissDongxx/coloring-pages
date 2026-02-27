import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import { getPageBySlug, getAllPageSlugs, getRecommendedPages } from '@/features/coloring/lib/data';
import { ColoringCanvasWithProviders } from '@/features/coloring/components/coloring-canvas-with-providers';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

// 生成静态参数
export async function generateStaticParams() {
  const slugs = await getAllPageSlugs();
  const locales = ['en', 'zh'];

  return locales.flatMap((locale) =>
    slugs.map((slug) => ({
      locale,
      slug,
    }))
  );
}

// 生成元数据
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      images: [page.image.png],
    },
  };
}

export default async function ColoringPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  // Get recommended pages from the same category
  const relatedPages = getRecommendedPages(page.slug, page.category, page.subCategory);

  return (
    <div className="min-h-screen">
      <ColoringCanvasWithProviders
        pageId={page.slug}
        imageSrc={page.image.png}
        title={page.title}
        description={page.description}
        category={page.category}
        relatedPages={relatedPages}
      />
    </div>
  );
}
