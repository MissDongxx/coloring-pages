import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getAllHubs } from '@/shared/models/coloring_page';
import { HubGrid } from '@/features/coloring/components/hub-grid';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { getMetadata } from '@/shared/lib/seo';
import {
  JSONLDScript,
  generateCollectionPageSchema,
  generateItemListSchema,
  generateBreadcrumbSchema,
} from '@/shared/lib/structured-data';
import { envConfigs } from '@/config';

export const revalidate = 3600;

export async function generateMetadata() {
    return {
        title: 'All Coloring Page Themes - Free Printable',
        description:
            'Browse all coloring page themes. Find free printable coloring pages by theme for kids, adults, and teachers.',
        alternates: {
            canonical: `${envConfigs.app_url}/themes`,
        },
    };
}

export default async function ThemesPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ page?: string; q?: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    const sp = await searchParams;
    const currentPage = Math.max(1, parseInt(sp.page || '1', 10));
    const search = sp.q || '';

    const { hubs, total, totalPages } = await getAllHubs({
        page: currentPage,
        pageSize: 20,
        search: search || undefined,
    });

    // Generate structured data for SEO
    const siteUrl = envConfigs.app_url || 'https://coloringpages.club';

    // CollectionPage Schema
    const collectionSchema = generateCollectionPageSchema({
        name: 'All Coloring Page Themes',
        description: `Browse our collection of ${total} coloring page themes with free printable pages`,
        url: `${siteUrl}/themes`,
        numberOfItems: total
    });

    // ItemList Schema for themes
    const itemListSchema = generateItemListSchema({
        name: 'Coloring Page Themes',
        description: 'List of all coloring page themes available on our site',
        url: `${siteUrl}/themes`,
        items: hubs.map((hub: any) => ({
            name: hub.name || hub.slug,
            url: `/${hub.slug}`,
            description: `${hub.count || 0} coloring pages`
        }))
    });

    // Breadcrumb Schema
    const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', item: `${siteUrl}/` },
        { name: 'All Themes', item: `${siteUrl}/themes` }
    ]);

    return (
        <>
            {/* Structured Data for SEO */}
            <JSONLDScript data={collectionSchema} />
            <JSONLDScript data={itemListSchema} />
            <JSONLDScript data={breadcrumbSchema} />

            <div className="container mx-auto px-4 pt-16 pb-8 md:pt-20 md:pb-8 max-w-6xl">
            <Breadcrumb className="mb-8">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>All Themes</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                    All Coloring Page Themes
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Browse all {total} themes and find the perfect coloring pages to print.
                </p>
            </div>

            {/* Search bar */}
            <div className="mb-8 max-w-md mx-auto">
                <form method="GET" className="relative">
                    <input
                        type="text"
                        name="q"
                        defaultValue={search}
                        placeholder="Search themes..."
                        className="w-full px-4 py-3 pl-10 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                    >
                        Search
                    </button>
                </form>
            </div>

            {/* Results */}
            {hubs.length > 0 ? (
                <section>
                    <HubGrid hubs={hubs} />
                </section>
            ) : (
                <p className="text-center text-muted-foreground py-12">
                    {search
                        ? `No themes found matching "${search}".`
                        : 'No themes available yet.'}
                </p>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <nav className="mt-12 flex justify-center items-center gap-2">
                    {currentPage > 1 && (
                        <Link
                            href={`/themes?page=${currentPage - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
                            className="px-4 py-2 rounded-lg border border-input hover:bg-accent text-sm font-medium transition-colors"
                        >
                            ← Previous
                        </Link>
                    )}
                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => {
                                // Show first, last, current, and neighbors
                                if (p === 1 || p === totalPages) return true;
                                if (Math.abs(p - currentPage) <= 2) return true;
                                return false;
                            })
                            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                                    acc.push('ellipsis');
                                }
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === 'ellipsis' ? (
                                    <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                                        …
                                    </span>
                                ) : (
                                    <Link
                                        key={item}
                                        href={`/themes?page=${item}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${item === currentPage
                                                ? 'bg-primary text-primary-foreground'
                                                : 'border border-input hover:bg-accent'
                                            }`}
                                    >
                                        {item}
                                    </Link>
                                )
                            )}
                    </div>
                    {currentPage < totalPages && (
                        <Link
                            href={`/themes?page=${currentPage + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
                            className="px-4 py-2 rounded-lg border border-input hover:bg-accent text-sm font-medium transition-colors"
                        >
                            Next →
                        </Link>
                    )}
                </nav>
            )}
        </div>
        </>
    );
}
