import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { getLocalPage } from '@/shared/models/post';
import { ColoringCanvasWithProviders } from '@/features/coloring/components/coloring-canvas-with-providers';
import { CategoryGrid } from '@/features/coloring/components/category-grid';
import { PopularGrid } from '@/features/coloring/components/popular-grid';
import {
  getPageBySlug,
  getAllPageSlugs,
  getCategoryBySlug,
  getPagesByCategory,
  getPagesBySubCategory,
  getAllCategories,
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
  const coloringPage = getPageBySlug(staticPageSlug);

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
      // Get pages for this category
      const pages = getPagesByCategory(category.slug);

      // Prepare subcategories for grid
      const subCategoriesForGrid = category.subCategories?.map(sub => {
        // Find a representative image from the first page in this subcategory
        const subPages = getPagesBySubCategory(category.slug, sub.slug);
        const imageSrc = subPages.length > 0 ? subPages[0].image.png : undefined;

        return {
          name: sub.name,
          slug: `${category.slug}/${sub.slug}`, // Construct full path for link
          count: sub.count,
          description: sub.description,
          imageSrc, // Use found image
          icon: category.icon, // Fallback to parent icon
          preview: `${sub.count} pages`
        };
      }) || [];

      // Convert pages to PopularGrid format
      const pageItems = pages.map(p => ({
        title: p.title,
        slug: p.slug,
        imageSrc: p.image.png
      }));

      return (
        <div className="container mx-auto px-4 pt-28 pb-8 md:pt-32 md:pb-8 max-w-6xl">
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

          {/* {subCategoriesForGrid.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">Categories</h2>
              <CategoryGrid categories={subCategoriesForGrid} hideEmpty={false} />
            </section>
          )} */}

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
          <div className="container mx-auto px-4 pt-28 pb-8 md:pt-32 md:pb-8 max-w-6xl">
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

  // 3. category not found, check for coloring page
  const coloringPage = getPageBySlug(staticPageSlug);

  if (coloringPage) {
    return (
      <ColoringCanvasWithProviders
        pageId={coloringPage.slug}
        imageSrc={coloringPage.image.png}
        title={coloringPage.title}
        description={coloringPage.description}
        category={coloringPage.category}
      />
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
