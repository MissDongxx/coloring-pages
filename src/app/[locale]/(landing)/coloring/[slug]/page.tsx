import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import { getPageBySlug, getAllPageSlugs, getRecommendedPages } from '@/features/coloring/lib/data';
import { ColoringCanvasWithProviders } from '@/features/coloring/components/coloring-canvas-with-providers';
import { findColoringPage } from '@/shared/models/coloring_page';
import { ColoringPageStatus } from '@/shared/models/coloring_page';

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

  // Try to get from static data first
  const staticPage = await getPageBySlug(slug);

  // If not found in static data, try database
  if (!staticPage) {
    try {
      const dbPage = await findColoringPage({
        slug,
        status: ColoringPageStatus.PUBLISHED,
      });

      if (dbPage) {
        return {
          title: dbPage.title,
          description: dbPage.description || undefined,
          openGraph: {
            title: dbPage.title,
            description: dbPage.description || undefined,
            images: dbPage.imageUrl ? [dbPage.imageUrl] : undefined,
          },
        };
      }
    } catch (error) {
      console.error('[ColoringPage] Error fetching from DB:', error);
    }

    return {};
  }

  return {
    title: staticPage.title,
    description: staticPage.description,
    openGraph: {
      title: staticPage.title,
      description: staticPage.description,
      images: [staticPage.image.png],
    },
  };
}

export default async function ColoringPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Try to get from static data first
  const staticPage = await getPageBySlug(slug);

  let pageData: {
    slug: string;
    title: string;
    description: string;
    imageSrc: string;
    category: string;
    subCategory?: string;
  } | null = null;

  if (staticPage) {
    // Use static data
    pageData = {
      slug: staticPage.slug,
      title: staticPage.title,
      description: staticPage.description,
      imageSrc: staticPage.image.png,
      category: staticPage.category,
      subCategory: staticPage.subCategory,
    };
  } else {
    // Try database
    try {
      const dbPage = await findColoringPage({
        slug,
        status: ColoringPageStatus.PUBLISHED,
      });

      if (dbPage) {
        pageData = {
          slug: dbPage.slug,
          title: dbPage.title,
          description: dbPage.description || '',
          imageSrc: dbPage.imageUrl,
          category: dbPage.category,
          subCategory: undefined, // Database pages might not have subCategory
        };
      }
    } catch (error) {
      console.error('[ColoringPage] Error fetching from DB:', error);
    }
  }

  if (!pageData) {
    notFound();
  }

  // Get recommended pages from the same category
  const relatedPages = getRecommendedPages(pageData.slug, pageData.category, pageData.subCategory);

  return (
    <div className="min-h-screen">
      <ColoringCanvasWithProviders
        pageId={pageData.slug}
        imageSrc={pageData.imageSrc}
        title={pageData.title}
        description={pageData.description}
        category={pageData.category}
        relatedPages={relatedPages}
      />
    </div>
  );
}
