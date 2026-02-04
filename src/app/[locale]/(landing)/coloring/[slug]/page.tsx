import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import { getPageBySlug, getAllPageSlugs } from '@/features/coloring/lib/data';
import { ColoringCanvas } from '@/features/coloring/components/coloring-canvas';

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

  return (
    <div className="min-h-screen">
      <ColoringCanvas
        pageId={page.slug}
        imageSrc={page.image.png}
        title={page.title}
        description={page.description}
        category={page.category}
      />
    </div>
  );
}
