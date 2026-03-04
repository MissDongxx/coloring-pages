import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import { getPageBySlug, getAllPageSlugs, getRecommendedPages } from '@/features/coloring/lib/data';
import { ColoringCanvasWithProviders } from '@/features/coloring/components/coloring-canvas-with-providers';
import { findColoringPage, getPagesForHub, getPagesCountForHub } from '@/shared/models/coloring_page';
import { ColoringPageStatus } from '@/shared/models/coloring_page';
import {
  HubPage,
  parseHubSlug,
  generateHubTitle,
  generateHubDescription,
  generateHubIntroText,
} from '@/features/coloring/components/hub-page';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}

// 生成静态参数 (static pages only)
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

  // Step 1: Try static data
  const staticPage = await getPageBySlug(slug);
  if (staticPage) {
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

  // Step 2: Try DB long-tail page
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

  // Step 3: Try hub page
  const hubParsed = parseHubSlug(slug);
  if (hubParsed) {
    const count = await getPagesCountForHub({
      rootKeyword: hubParsed.root,
      modifier: hubParsed.modifier,
    });
    if (count > 0) {
      const title = generateHubTitle(hubParsed.root, hubParsed.modifier);
      const description = generateHubDescription(hubParsed.root, hubParsed.modifier, count);
      return {
        title,
        description,
        openGraph: { title, description },
      };
    }
  }

  return {};
}

export default async function ColoringPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  setRequestLocale(locale);

  // ============================================
  // Step 1: Try static data (legacy JSON pages)
  // ============================================
  const staticPage = await getPageBySlug(slug);
  if (staticPage) {
    const relatedPages = getRecommendedPages(staticPage.slug, staticPage.category, staticPage.subCategory);
    return (
      <div className="min-h-screen">
        <ColoringCanvasWithProviders
          pageId={staticPage.slug}
          imageSrc={staticPage.image.png}
          title={staticPage.title}
          description={staticPage.description}
          category={staticPage.category}
          relatedPages={relatedPages}
        />
      </div>
    );
  }

  // ============================================
  // Step 2: Try DB long-tail page
  // ============================================
  try {
    const dbPage = await findColoringPage({
      slug,
      status: ColoringPageStatus.PUBLISHED,
    });
    if (dbPage) {
      const relatedPages = getRecommendedPages(dbPage.slug, dbPage.category);
      return (
        <div className="min-h-screen">
          <ColoringCanvasWithProviders
            pageId={dbPage.slug}
            imageSrc={dbPage.imageUrl}
            title={dbPage.title}
            description={dbPage.description || ''}
            category={dbPage.category}
            relatedPages={relatedPages}
          />
        </div>
      );
    }
  } catch (error) {
    console.error('[ColoringPage] Error fetching from DB:', error);
  }

  // ============================================
  // Step 3: Try hub page (dynamic aggregation)
  // ============================================
  const hubParsed = parseHubSlug(slug);
  if (hubParsed) {
    const currentPage = parseInt(resolvedSearchParams.page || '1');
    const limit = 30;

    const [pages, totalCount] = await Promise.all([
      getPagesForHub({
        rootKeyword: hubParsed.root,
        modifier: hubParsed.modifier,
        page: currentPage,
        limit,
      }),
      getPagesCountForHub({
        rootKeyword: hubParsed.root,
        modifier: hubParsed.modifier,
      }),
    ]);

    if (totalCount > 0) {
      const title = generateHubTitle(hubParsed.root, hubParsed.modifier);
      const description = generateHubDescription(hubParsed.root, hubParsed.modifier, totalCount);
      const introText = generateHubIntroText(hubParsed.root, hubParsed.modifier);
      const totalPages = Math.ceil(totalCount / limit);

      return (
        <HubPage
          title={title}
          description={description}
          introText={introText}
          rootKeyword={hubParsed.root}
          modifier={hubParsed.modifier}
          pages={pages}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          locale={locale}
        />
      );
    }
  }

  // ============================================
  // Nothing matched → 404
  // ============================================
  notFound();
}
