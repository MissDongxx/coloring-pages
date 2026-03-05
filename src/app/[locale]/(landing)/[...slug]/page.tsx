import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { getLocalPage } from '@/shared/models/post';
import { ColoringCanvasWithProviders } from '@/features/coloring/components/coloring-canvas-with-providers';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { PopularGrid } from '@/features/coloring/components/popular-grid';
import { SeoContentSection } from '@/features/coloring/components/seo-content-section';
import { RelatedPagesSection } from '@/features/coloring/components/related-pages-section';
import { generateCategoryContent } from '@/features/coloring/lib/seo-content-generator';
import {
  getPageBySlug,
  getAllPageSlugs,
  getCategoryBySlug,
  getPagesByCategory,
  getPagesBySubCategory,
  getAllCategories,
  getRelatedPages,
  getPopularPages,
  getRecommendedPages,
  getRandomCategoryCover,
} from '@/features/coloring/lib/data';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import type { Category } from '@/features/coloring/types/coloring-page';
import { parseSeoHubSlug, validateSeoHub } from '@/features/coloring/lib/seo-hub';
import { getPagesForHub, findColoringPage, ColoringPageStatus, findHubBySlugPrefix, getColoringPages } from '@/shared/models/coloring_page';

export const revalidate = 3600;

// Generate static params for coloring pages
export async function generateStaticParams() {
  const coloringSlugs = getAllPageSlugs();
  // We should also pre-render category pages? Maybe not for now to keep it simple or if the list is massive.
  // But for SEO it's good.
  // For now let's stick to coloring pages + manual handling for categories
  const locales = ['en', 'zh'];

  return locales.flatMap((locale) =>
    coloringSlugs.map((slug) => ({
      locale,
      slug: slug.split('/'), // [...slug] requires an array
    }))
  );
}

// dynamic page metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  // metadata values
  let title = '';
  let description = '';
  let canonicalUrl = '';

  // 1. try to get static page metadata from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('/') || '';

  // filter invalid slug
  if (staticPageSlug.includes('.')) {
    return;
  }

  // build canonical url
  canonicalUrl =
    locale !== envConfigs.locale
      ? `${envConfigs.app_url}/${locale}/${staticPageSlug}`
      : `${envConfigs.app_url}/${staticPageSlug}`;

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page metadata
  if (staticPage) {
    title = staticPage.title || '';
    description = staticPage.description || '';

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  // 2. static page not found, try to get category or subcategory metadata
  const parts = staticPageSlug.split('/');
  const isCategory = parts.length === 1;
  const isSubCategory = parts.length === 2;

  if (isCategory) {
    const category = getCategoryBySlug(parts[0]);
    if (category) {
      return {
        title: `${category.name} Coloring Pages - Free Printable`,
        description: category.description,
        alternates: {
          canonical: canonicalUrl,
        },
      };
    }
  }

  if (isSubCategory) {
    const parentCat = getCategoryBySlug(parts[0]);
    if (parentCat && parentCat.subCategories) {
      const subCat = parentCat.subCategories.find((s) => s.slug === parts[1]);
      if (subCat) {
        return {
          title: `${subCat.name} Coloring Pages - Free Printable`,
          description: subCat.description,
          alternates: {
            canonical: canonicalUrl,
          },
        };
      }
    }
  }

  // 3. category not found, try to get coloring page metadata
  const seoHubMatch = parseSeoHubSlug(staticPageSlug);
  if (seoHubMatch.isHub) {
    const hubTitle = seoHubMatch.modifier
      ? `${seoHubMatch.modifier.charAt(0).toUpperCase() + seoHubMatch.modifier.slice(1)} ${seoHubMatch.root.charAt(0).toUpperCase() + seoHubMatch.root.slice(1)} Coloring Pages`
      : `${seoHubMatch.root.charAt(0).toUpperCase() + seoHubMatch.root.slice(1)} Coloring Pages`;

    return {
      title: `${hubTitle} - Free Printable`,
      description: `Discover free printable ${seoHubMatch.modifier ? seoHubMatch.modifier + ' ' : ''}${seoHubMatch.root} coloring pages for kids and adults.`,
      alternates: { canonical: canonicalUrl }
    };
  }

  // 4. Check for Static coloring page
  let coloringPage = getPageBySlug(staticPageSlug);

  if (!coloringPage) {
    // Check DB for Longtail coloring page
    const dbPage = await findColoringPage({ slug: staticPageSlug, status: ColoringPageStatus.PUBLISHED });
    if (dbPage) {
      return {
        title: dbPage.title,
        description: dbPage.description || '',
        openGraph: {
          title: dbPage.title,
          description: dbPage.description || '',
          images: [dbPage.imageUrl],
        },
        alternates: { canonical: canonicalUrl },
      };
    }
  }

  if (coloringPage) {
    title = coloringPage.title || '';
    description = coloringPage.description || '';

    return {
      title,
      description,
      openGraph: {
        title: coloringPage.title,
        description: coloringPage.description,
        images: [coloringPage.image.png],
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  // 3. coloring page not found, try to get dynamic page metadata from
  // src/config/locale/messages/{locale}/pages/**/*.json

  // dynamic page slug
  const dynamicPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('.') || '';

  const messageKey = `pages.${dynamicPageSlug}`;

  try {
    const t = await getTranslations({ locale, namespace: messageKey });

    // return dynamic page metadata
    if (t.has('metadata')) {
      title = t.raw('metadata.title');
      description = t.raw('metadata.description');

      return {
        title,
        description,
        alternates: {
          canonical: canonicalUrl,
        },
      };
    }
  } catch (error) {
    // ignore error if translation not found
  }

  // 4. return common metadata
  const tc = await getTranslations('common.metadata');

  title = tc('title');
  description = tc('description');

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // 1. try to get static page from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('/') || '';

  // filter invalid slug
  if (staticPageSlug.includes('.')) {
    return notFound();
  }

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page
  if (staticPage) {
    const Page = await getThemePage('static-page');

    return <Page locale={locale} post={staticPage} />;
  }

  // 2. static page not found, try to check for category or subcategory
  const parts = staticPageSlug.split('/');
  const isCategory = parts.length === 1;
  const isSubCategory = parts.length === 2;

  if (isCategory) {
    const category = getCategoryBySlug(parts[0]);
    if (category) {
      // Get static pages for this category
      const staticPages = getPagesByCategory(category.slug);

      // Get DB pages for this category
      const dbPages = await getColoringPages({ limit: 100, status: ColoringPageStatus.PUBLISHED, category: category.slug });

      // Convert pages to PopularGrid format and deduplicate by slug
      const pageItemsMap = new Map<string, { title: string; slug: string; imageSrc: string }>();

      // Add DB pages (prioritize DB pages)
      dbPages.forEach(p => {
        pageItemsMap.set(p.slug, {
          title: p.title,
          slug: p.slug,
          imageSrc: p.imageUrl
        });
      });

      // Add static pages (only if not already present from DB)
      staticPages.forEach(p => {
        if (!pageItemsMap.has(p.slug)) {
          pageItemsMap.set(p.slug, {
            title: p.title,
            slug: p.slug,
            imageSrc: p.image.png
          });
        }
      });

      const pageItems = Array.from(pageItemsMap.values());

      // Generate SEO content for category hub page
      const categoryContent = generateCategoryContent(
        category.name,
        category.slug,
        (category.subCategories || []).map(sc => ({ name: sc.name, slug: sc.slug, count: sc.count })),
        pageItems.length
      );

      return (
        <div className="container mx-auto px-4 pt-16 pb-8 md:pt-20 md:pb-8 max-w-6xl">
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{category.name} Coloring Pages</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{category.description}</p>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-6">All {category.name} Pages</h2>
            {pageItems.length > 0 ? (
              <PopularGrid items={pageItems} />
            ) : (
              <p className="text-center text-muted-foreground py-12">No coloring pages found in this category yet.</p>
            )}
          </section>

          <section className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">Explore More Categories</h2>
            <CategoryGrid
              categories={getAllCategories()
                .filter((c) => c.slug !== category.slug)
                .slice(0, 4)
                .map((cat) => ({
                  name: cat.name,
                  slug: cat.slug,
                  count: cat.count,
                  icon: cat.icon,
                  imageSrc: cat.imageSrc,
                  preview: cat.preview,
                }))}
            />
          </section>

          {/* SEO Content — server-rendered, crawlable */}
          <div
            className="seo-content-wrapper max-w-3xl mx-auto mt-12 text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: categoryContent }}
          />
        </div>
      );
    }
  }


  if (isSubCategory) {
    const parentCat = getCategoryBySlug(parts[0]);
    if (parentCat && parentCat.subCategories) {
      const subCat = parentCat.subCategories.find(s => s.slug === parts[1]);
      if (subCat) {
        const pages = getPagesBySubCategory(parentCat.slug, subCat.slug);
        const pageItems = pages.map(p => ({
          title: p.title,
          slug: p.slug,
          imageSrc: p.image.png
        }));

        return (
          <div className="container mx-auto px-4 pt-16 pb-8 md:pt-20 md:pb-8 max-w-6xl">
            <Breadcrumb className="mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${parentCat.slug}`}>{parentCat.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{subCat.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{subCat.name} Coloring Pages</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subCat.description}</p>
            </div>

            <section>
              <PopularGrid items={pageItems} />
              {pageItems.length === 0 && (
                <p className="text-center text-muted-foreground py-12">No coloring pages found in this topic yet.</p>
              )}
            </section>

            <section className="mt-16 pt-8 border-t">
              <h2 className="text-2xl font-bold mb-6">Explore More Categories</h2>
              <CategoryGrid
                categories={getAllCategories()
                  .filter((c) => c.slug !== parentCat.slug)
                  .slice(0, 4)
                  .map((cat) => ({
                    name: cat.name,
                    slug: cat.slug,
                    count: cat.count,
                    icon: cat.icon,
                    imageSrc: cat.imageSrc,
                    preview: cat.preview,
                  }))}
              />
            </section>
          </div>
        );
      }
    }
  }

  // 3. category not found, check for SEO Hub
  const seoHubMatch = parseSeoHubSlug(staticPageSlug);
  if (seoHubMatch.isHub) {
    const hubPrefix = staticPageSlug.replace('-coloring-pages', '');
    const dbHub = await findHubBySlugPrefix(hubPrefix);

    let root = seoHubMatch.root;
    let modifier = seoHubMatch.modifier;

    if (dbHub) {
      root = dbHub.rootKeyword!;
      modifier = dbHub.modifier;
    }

    const pages = await getPagesForHub({
      rootKeyword: root,
      modifier: modifier
    });

    if (pages.length === 0 && !dbHub) {
      return notFound(); // 404 if no pages exist and no DB hub found
    }

    const hubTitle = modifier
      ? `${modifier.charAt(0).toUpperCase() + modifier.slice(1)} ${root.charAt(0).toUpperCase() + root.slice(1)} Coloring Pages`
      : `${root.charAt(0).toUpperCase() + root.slice(1)} Coloring Pages`;

    const pageItems = pages.map(p => ({
      title: p.title,
      slug: p.slug,
      imageSrc: p.imageUrl
    }));

    // Generate SEO content for theme/hub page
    const themeName = modifier
      ? `${modifier.charAt(0).toUpperCase() + modifier.slice(1)} ${root.charAt(0).toUpperCase() + root.slice(1)}`
      : root.charAt(0).toUpperCase() + root.slice(1);
    const hubSeoContent = generateCategoryContent(
      themeName,
      staticPageSlug,
      [], // hub pages don't have subcategories
      pageItems.length
    );

    // Get cross-category links for internal linking
    const hubCategories = getAllCategories()
      .slice(0, 6)
      .map(c => ({ name: c.name, slug: c.slug, icon: c.icon, count: c.count }));

    return (
      <div className="container mx-auto px-4 pt-16 pb-8 md:pt-20 md:pb-8 max-w-6xl">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {modifier && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${root.replace(/\s+/g, '-')}-coloring-pages`}>
                    {root.charAt(0).toUpperCase() + root.slice(1)}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{hubTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{hubTitle}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our collection of free printable {modifier ? modifier + ' ' : ''}{root} coloring pages.
          </p>
        </div>

        <section>
          <PopularGrid items={pageItems} />
        </section>

        {/* Cross-category navigation */}
        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Explore More Categories</h2>
          <CategoryGrid
            categories={hubCategories.map((cat) => ({
              name: cat.name,
              slug: cat.slug,
              count: cat.count,
              icon: cat.icon,
            }))}
          />
        </section>

        {/* SEO Content — server-rendered, crawlable */}
        <div
          className="seo-content-wrapper max-w-3xl mx-auto mt-12 text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: hubSeoContent }}
        />
      </div>
    );
  }

  // 4. check for exact longtail match in DB or static
  let coloringPage = getPageBySlug(staticPageSlug);
  let isFromDb = false;
  let dbPage = null;

  if (!coloringPage) {
    dbPage = await findColoringPage({ slug: staticPageSlug, status: ColoringPageStatus.PUBLISHED });
    if (dbPage) {
      isFromDb = true;
    }
  }

  if (coloringPage || dbPage) {
    let relatedPages = coloringPage
      ? getRelatedPages(coloringPage.related || [])
      : [];

    // Fetch dynamic related from Hub
    if (isFromDb && dbPage?.rootKeyword) {
      const hubPages = await getPagesForHub({
        rootKeyword: dbPage.rootKeyword,
        limit: 12
      });
      relatedPages = hubPages
        .filter(p => p.id !== dbPage.id) // Exclude current
        .slice(0, 6)
        .map(p => ({
          title: p.title,
          slug: p.slug,
          imageSrc: p.imageUrl
        }));
    }

    // Prepare data for server-rendered SEO sections
    const currentSlug = isFromDb ? dbPage!.slug : coloringPage!.slug;
    const currentTitle = isFromDb ? dbPage!.title : coloringPage!.title;
    const currentCategory = isFromDb ? dbPage!.category : coloringPage!.category;
    const currentDescription = isFromDb ? (dbPage!.description || '') : coloringPage!.description;
    const currentImageSrc = isFromDb ? dbPage!.imageUrl : coloringPage!.image.png;
    const currentRootKeyword = isFromDb ? dbPage!.rootKeyword : (coloringPage!.rootKeyword || null);
    const currentKeywords = coloringPage?.keywords || [];

    // Get recommended pages for server-rendered internal linking
    const recommendedPages = getRecommendedPages(currentSlug, currentCategory, coloringPage?.subCategory, 12);
    const popular = getPopularPages(6);
    const allCats = getAllCategories()
      .filter(c => c.slug !== currentCategory)
      .slice(0, 6)
      .map(c => ({
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        count: c.count,
        imageSrc: getRandomCategoryCover(c.slug)
      }));

    return (
      <div className="pt-6 md:pt-10 pb-8">
        <ColoringCanvasWithProviders
          pageId={currentSlug}
          imageSrc={currentImageSrc}
          title={currentTitle}
          description={currentDescription}
          category={currentCategory}
          rootKeyword={currentRootKeyword}
          relatedPages={relatedPages}
        />

        {/* Server-rendered internal links — crawlable <a> tags */}
        <RelatedPagesSection
          relatedPages={recommendedPages}
          popularPages={popular}
          categories={allCats}
          categoryLabel={currentRootKeyword ? currentRootKeyword.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}
          seoContent={
            /* Server-rendered SEO content — visible to crawlers, displayed after Explore More Categories */
            <SeoContentSection
              title={currentTitle}
              slug={currentSlug}
              category={currentCategory}
              subCategory={coloringPage?.subCategory}
              keywords={currentKeywords}
              description={currentDescription}
              imageSrc={currentImageSrc}
              rootKeyword={currentRootKeyword}
            />
          }
        />
      </div>
    );
  }

  // 4. static and coloring pages not found
  // try to get dynamic page content from
  // src/config/locale/messages/{locale}/pages/**/*.json

  // dynamic page slug
  const dynamicPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('.') || '';

  const messageKey = `pages.${dynamicPageSlug}`;

  try {
    const t = await getTranslations({ locale, namespace: messageKey });

    // return dynamic page
    if (t.has('page')) {
      const Page = await getThemePage('dynamic-page');
      return <Page locale={locale} page={t.raw('page')} />;
    }
  } catch (error) {
    // ignore error if translation not found
  }

  // 5. page not found
  return notFound();
}
