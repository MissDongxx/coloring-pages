import Link from 'next/link';
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
import {
  JSONLDScript,
  generateCategoryPageSchema,
  generateItemListSchema,
  generateBreadcrumbSchema,
  generateImageObjectSchema,
} from '@/shared/lib/structured-data';
import { parseSeoHubSlug, validateSeoHub } from '@/features/coloring/lib/seo-hub';
import { getPagesForHub, findColoringPage, ColoringPageStatus, findHubBySlugPrefix, getColoringPages, getPagesCountForHub } from '@/shared/models/coloring_page';
import { joinUrl } from '@/shared/lib/utils';

export const revalidate = 3600;

/**
 * Check if a page should be noindexed based on slug patterns
 * This handles copyright-related content that should be hidden from search engines
 */
function shouldNoindex(slug: string): boolean {
  const lowerSlug = slug.toLowerCase();

  // Check for IP-related slugs
  if (lowerSlug.startsWith('ip-')) {
    return true;
  }

  // Check for fan-art related slugs
  if (lowerSlug.includes('beauty-and-beast') ||
      lowerSlug.includes('glass-slipper') ||
      lowerSlug.includes('ice-palace') ||
      lowerSlug.includes('mermaid-princess') ||
      lowerSlug.includes('genie-lamp') ||
      lowerSlug.includes('electric-mouse') ||
      lowerSlug.includes('fire-breathing-lizard') ||
      lowerSlug.includes('sleeping-bear-creature') ||
      lowerSlug.includes('water-turtle') ||
      lowerSlug.includes('iron-armor') ||
      lowerSlug.includes('dark-knight') ||
      lowerSlug.includes('web-swinging') ||
      lowerSlug.includes('thunder-hero') ||
      lowerSlug.includes('shield-hero') ||
      lowerSlug.includes('space-soldier') ||
      lowerSlug.includes('cute-alien') ||
      lowerSlug.includes('dark-villain-helmet') ||
      lowerSlug.includes('four-legged-walker') ||
      lowerSlug.includes('spaceship')) {
    return true;
  }

  // Check for categories IP and fan-art
  if (lowerSlug === 'ip' || lowerSlug === 'fan-art') {
    return true;
  }

  return false;
}

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
  let staticPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('/') || '';

  // Normalize slug: replace spaces with hyphens for consistency
  staticPageSlug = staticPageSlug.replace(/\s+/g, '-');

  // filter invalid slug
  if (staticPageSlug.includes('.')) {
    return;
  }

  // build canonical url
  canonicalUrl = joinUrl(
    envConfigs.app_url,
    locale !== envConfigs.locale ? locale : '',
    staticPageSlug
  );

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page metadata
  if (staticPage) {
    title = staticPage.title || '';
    description = staticPage.description || '';

    const metadata: any = {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
    };

    // Add noindex if specified in frontmatter
    if (staticPage.noindex) {
      metadata.robots = {
        index: false,
        follow: false,
      };
    }

    return metadata;
  }

  // 2. static page not found, try to get category or subcategory metadata
  const parts = staticPageSlug.split('/');
  const isCategory = parts.length === 1;
  const isSubCategory = parts.length === 2;

  // Check if this page should be noindexed
  const isNoindexPage = shouldNoindex(staticPageSlug);

  if (isCategory) {
    const category = getCategoryBySlug(parts[0]);
    if (category) {
      const metadata: any = {
        title: `${category.name} Coloring Pages - Free Printable`,
        description: category.description,
        alternates: {
          canonical: canonicalUrl,
        },
      };

      // Add noindex for copyright-related categories
      if (isNoindexPage) {
        metadata.robots = {
          index: false,
          follow: false,
        };
      }

      return metadata;
    }
  }

  if (isSubCategory) {
    const parentCat = getCategoryBySlug(parts[0]);
    if (parentCat && parentCat.subCategories) {
      const subCat = parentCat.subCategories.find((s) => s.slug === parts[1]);
      if (subCat) {
        const metadata: any = {
          title: `${subCat.name} Coloring Pages - Free Printable`,
          description: subCat.description,
          alternates: {
            canonical: canonicalUrl,
          },
        };

        // Add noindex for copyright-related subcategories
        if (isNoindexPage) {
          metadata.robots = {
            index: false,
            follow: false,
          };
        }

        return metadata;
      }
    }
  }

  // 3. category not found, try to get coloring page metadata
  const seoHubMatch = parseSeoHubSlug(staticPageSlug);
  if (seoHubMatch.isHub) {
    const hubTitle = seoHubMatch.modifier
      ? `${seoHubMatch.modifier.charAt(0).toUpperCase() + seoHubMatch.modifier.slice(1)} ${seoHubMatch.root.charAt(0).toUpperCase() + seoHubMatch.root.slice(1)} Coloring Pages`
      : `${seoHubMatch.root.charAt(0).toUpperCase() + seoHubMatch.root.slice(1)} Coloring Pages`;

    const metadata: any = {
      title: `${hubTitle} - Free Printable`,
      description: `Discover free printable ${seoHubMatch.modifier ? seoHubMatch.modifier + ' ' : ''}${seoHubMatch.root} coloring pages for kids and adults.`,
      alternates: { canonical: canonicalUrl }
    };

    // Add noindex for copyright-related hubs
    if (isNoindexPage) {
      metadata.robots = {
        index: false,
        follow: false,
      };
    }

    return metadata;
  }

  // 4. Check for Static coloring page
  let coloringPage = getPageBySlug(staticPageSlug);

  if (!coloringPage) {
    // Check DB for Longtail coloring page
    const dbPage = await findColoringPage({ slug: staticPageSlug, status: ColoringPageStatus.PUBLISHED });
    if (dbPage) {
      const metadata: any = {
        title: dbPage.title,
        description: dbPage.description || '',
        openGraph: {
          title: dbPage.title,
          description: dbPage.description || '',
          images: [dbPage.imageUrl],
        },
        alternates: { canonical: canonicalUrl },
      };

      // Add noindex for copyright-related pages
      if (isNoindexPage) {
        metadata.robots = {
          index: false,
          follow: false,
        };
      }

      return metadata;
    }
  }

  if (coloringPage) {
    title = coloringPage.title || '';
    description = coloringPage.description || '';

    const metadata: any = {
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

    // Add noindex for copyright-related pages
    if (isNoindexPage) {
      metadata.robots = {
        index: false,
        follow: false,
      };
    }

    return metadata;
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
      canonical: joinUrl(
        envConfigs.app_url,
        locale !== envConfigs.locale ? locale : '',
        staticPageSlug
      ),
    },
  };
}

export default async function DynamicPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  // Parse page parameter, default to 1
  const currentPage = parseInt(pageParam || '1', 10);
  const itemsPerPage = 50; // 每页显示50张图片

  // 1. try to get static page from
  // content/pages/**/*.mdx

  // static page slug
  let staticPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('/') || '';

  // Normalize slug: replace spaces with hyphens for consistency
  staticPageSlug = staticPageSlug.replace(/\s+/g, '-');

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

      // Generate structured data for SEO
      const siteUrl = envConfigs.app_url || 'https://coloringpages.club';
      const categoryUrl = joinUrl(siteUrl, category.slug);

      // CategoryPage Schema
      const categorySchema = generateCategoryPageSchema({
        name: `${category.name} Coloring Pages`,
        description: category.description,
        url: categoryUrl,
        numberOfItems: pageItems.length,
        categoryName: category.name,
        items: pageItems.slice(0, 20).map(p => ({
          name: p.title,
          url: `/${p.slug}`,
          image: p.imageSrc
        }))
      });

      // Breadcrumb Schema
      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', item: joinUrl(siteUrl, '/') },
        { name: category.name, item: categoryUrl }
      ]);

      return (
        <>
          {/* Structured Data for SEO */}
          <JSONLDScript data={categorySchema} />
          <JSONLDScript data={breadcrumbSchema} />

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
                .filter((c) => !['ip', 'fan-art', 'IP', 'fan-art'].includes(c.slug))
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
        </>
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

        // Generate structured data for SEO
        const siteUrl = envConfigs.app_url || 'https://coloringpages.club';
        const subCategoryUrl = joinUrl(siteUrl, parentCat.slug, subCat.slug);

        // CategoryPage Schema for subcategory
        const subCategorySchema = generateCategoryPageSchema({
          name: `${subCat.name} Coloring Pages`,
          description: subCat.description,
          url: subCategoryUrl,
          numberOfItems: pageItems.length,
          categoryName: subCat.name,
          items: pageItems.slice(0, 20).map(p => ({
            name: p.title,
            url: `/${p.slug}`,
            image: p.imageSrc
          }))
        });

        // Breadcrumb Schema
        const breadcrumbSchema = generateBreadcrumbSchema([
          { name: 'Home', item: joinUrl(siteUrl, '/') },
          { name: parentCat.name, item: joinUrl(siteUrl, parentCat.slug) },
          { name: subCat.name, item: subCategoryUrl }
        ]);

        return (
          <>
            {/* Structured Data for SEO */}
            <JSONLDScript data={subCategorySchema} />
            <JSONLDScript data={breadcrumbSchema} />

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
                  .filter((c) => !['ip', 'fan-art', 'IP', 'fan-art'].includes(c.slug))
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
          </>
        );
      }
    }
  }

  // 3. category not found, check for SEO Hub
  const seoHubMatch = parseSeoHubSlug(staticPageSlug);
  if (seoHubMatch.isHub) {
    const hubPrefix = staticPageSlug.replace('-coloring-pages', '');

    // Always try to find the hub in the database first, as it has the canonical rootKeyword and modifier
    // This handles multi-word roots like "lds-bible" that may not be in DIMENSION_REGISTRY
    const dbHub = await findHubBySlugPrefix(hubPrefix);

    let root: string | null = null;
    let modifier: string | null = null;

    if (dbHub) {
      // Use the canonical values from the database
      root = dbHub.rootKeyword;
      modifier = dbHub.modifier;
    } else {
      // Fallback to parsed values (for hubs that exist in DIMENSION_REGISTRY but not yet in DB)
      root = seoHubMatch.root;
      modifier = seoHubMatch.modifier;
    }

    // If we couldn't determine the root, return 404
    if (!root) {
      return notFound();
    }

    // Type narrowing: root is now guaranteed to be a string
    const rootKeyword: string = root;
    const hubModifier: string | undefined = modifier || undefined;

    // Get total count for pagination
    const totalCount = await getPagesCountForHub({
      rootKeyword: rootKeyword,
      modifier: hubModifier
    });

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Validate page number
    const validPage = currentPage < 1 ? 1 : currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;

    const pages = await getPagesForHub({
      rootKeyword: rootKeyword,
      modifier: hubModifier,
      page: validPage,
      limit: itemsPerPage
    });

    if (pages.length === 0 && !dbHub) {
      return notFound(); // 404 if no pages exist and no DB hub found
    }

    const hubTitle = hubModifier
      ? `${hubModifier.charAt(0).toUpperCase() + hubModifier.slice(1)} ${rootKeyword.charAt(0).toUpperCase() + rootKeyword.slice(1)} Coloring Pages`
      : `${rootKeyword.charAt(0).toUpperCase() + rootKeyword.slice(1)} Coloring Pages`;

    const pageItems = pages.map(p => ({
      title: p.title,
      slug: p.slug,
      imageSrc: p.imageUrl
    }));

    // Generate SEO content for theme/hub page
    const themeName = hubModifier
      ? `${hubModifier.charAt(0).toUpperCase() + hubModifier.slice(1)} ${rootKeyword.charAt(0).toUpperCase() + rootKeyword.slice(1)}`
      : rootKeyword.charAt(0).toUpperCase() + rootKeyword.slice(1);
    const hubSeoContent = generateCategoryContent(
      themeName,
      staticPageSlug,
      [], // hub pages don't have subcategories
      totalCount
    );

    // Get cross-category links for internal linking
    const hubCategories = getAllCategories()
      .filter((c) => !['ip', 'fan-art', 'IP', 'fan-art'].includes(c.slug))
      .slice(0, 6)
      .map(c => ({ name: c.name, slug: c.slug, icon: c.icon, count: c.count, imageSrc: getRandomCategoryCover(c.slug) }));

    // Normalize slug: replace spaces with hyphens for URL
    const normalizedModifier = hubModifier?.replace(/\s+/g, '-') || '';
    const normalizedRoot = rootKeyword.replace(/\s+/g, '-');
    const slug = normalizedModifier
      ? `${normalizedModifier}-${normalizedRoot}-coloring-pages`
      : `${normalizedRoot}-coloring-pages`;

    // Generate structured data for SEO
    const siteUrl = envConfigs.app_url || 'https://coloringpages.club';
    const hubUrl = joinUrl(siteUrl, slug);

    // CategoryPage Schema for SEO Hub
    const hubSchema = generateCategoryPageSchema({
      name: hubTitle,
      description: `Discover our collection of ${totalCount} free printable ${hubModifier ? hubModifier + ' ' : ''}${rootKeyword} coloring pages`,
      url: hubUrl,
      numberOfItems: pageItems.length,
      categoryName: themeName,
      items: pageItems.slice(0, 20).map(p => ({
        name: p.title,
        url: `/${p.slug}`,
        image: p.imageSrc
      }))
    });

    // Breadcrumb Schema
    const breadcrumbItems: any[] = [
      { name: 'Home', item: joinUrl(siteUrl, '/') }
    ];

    if (hubModifier) {
      breadcrumbItems.push({
        name: rootKeyword.charAt(0).toUpperCase() + rootKeyword.slice(1),
        item: joinUrl(siteUrl, `${normalizedRoot}-coloring-pages`)
      });
    }

    breadcrumbItems.push({
      name: hubTitle,
      item: hubUrl
    });

    const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

    return (
      <>
        {/* Structured Data for SEO */}
        <JSONLDScript data={hubSchema} />
        <JSONLDScript data={breadcrumbSchema} />

        <div className="container mx-auto px-4 pt-16 pb-8 md:pt-20 md:pb-8 max-w-6xl">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {hubModifier && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/${rootKeyword.replace(/\s+/g, '-')}-coloring-pages`}>
                    {rootKeyword.charAt(0).toUpperCase() + rootKeyword.slice(1)}
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
            Discover our collection of {totalCount} free printable {hubModifier ? hubModifier + ' ' : ''}{rootKeyword} coloring pages.
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-muted-foreground mt-2">
              Page {validPage} of {totalPages}
            </p>
          )}
        </div>

        <section>
          <PopularGrid items={pageItems} />
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {validPage > 1 && (
              <Link
                href={`/${slug}${validPage - 1 > 1 ? `?page=${validPage - 1}` : ''}`}
                className="px-4 py-2 rounded-md border hover:bg-accent text-sm"
              >
                Previous
              </Link>
            )}

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (validPage <= 3) {
                pageNum = i + 1;
              } else if (validPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = validPage - 2 + i;
              }

              return (
                <Link
                  key={pageNum}
                  href={`/${slug}${pageNum > 1 ? `?page=${pageNum}` : ''}`}
                  className={`px-4 py-2 rounded-md border text-sm ${
                    pageNum === validPage
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}

            {validPage < totalPages && (
              <Link
                href={`/${slug}?page=${validPage + 1}`}
                className="px-4 py-2 rounded-md border hover:bg-accent text-sm"
              >
                Next
              </Link>
            )}
          </div>
        )}

        {/* Cross-category navigation */}
        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Explore More Categories</h2>
          <CategoryGrid
            categories={hubCategories.map((cat) => ({
              name: cat.name,
              slug: cat.slug,
              count: cat.count,
              icon: cat.icon,
              imageSrc: cat.imageSrc,
            }))}
          />
        </section>

        {/* SEO Content — server-rendered, crawlable */}
        <div
          className="seo-content-wrapper max-w-3xl mx-auto mt-12 text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: hubSeoContent }}
        />
      </div>
      </>
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
    const currentModifier = isFromDb ? dbPage!.modifier : null;
    const currentKeywords = coloringPage?.keywords || [];

    // Check if the hub has content (prevents broken internal links in breadcrumbs)
    // Only validate if rootKeyword exists and is not from static pages (static pages don't have modifiers)
    let hubHasContent: boolean | undefined = undefined;
    if (currentRootKeyword && isFromDb) {
      try {
        const hubCount = await getPagesCountForHub({
          rootKeyword: currentRootKeyword,
          modifier: currentModifier
        });
        // Only consider hub valid if it has more than 1 page (the current page itself)
        hubHasContent = hubCount > 1;
      } catch (error) {
        console.error('[page.tsx] Error checking hub content:', error);
        hubHasContent = false;
      }
    }

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

    // Generate structured data for SEO
    const siteUrl = envConfigs.app_url || 'https://coloringpages.club';
    const pageUrl = `${siteUrl}/${currentSlug}`;

    // ImageObject Schema for the coloring page
    const imageSchema = generateImageObjectSchema({
      name: currentTitle,
      description: currentDescription || `${currentTitle} - Free printable coloring page`,
      url: currentImageSrc,
      thumbnailUrl: currentImageSrc,
      keywords: currentKeywords.length > 0 ? currentKeywords : [currentCategory, currentRootKeyword || 'coloring page'],
      category: currentCategory
    });

    // Breadcrumb Schema
    const breadcrumbItems: any[] = [
      { name: 'Home', item: joinUrl(siteUrl, '/') }
    ];

    // Add category if it exists
    if (currentCategory) {
      breadcrumbItems.push({
        name: currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1),
        item: joinUrl(siteUrl, currentCategory)
      });
    }

    breadcrumbItems.push({
      name: currentTitle,
      item: pageUrl
    });

    const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

    return (
      <>
        {/* Structured Data for SEO */}
        <JSONLDScript data={imageSchema} />
        <JSONLDScript data={breadcrumbSchema} />

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
              hubHasContent={hubHasContent}
            />
          }
        />
      </div>
      </>
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
