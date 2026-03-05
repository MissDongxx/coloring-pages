/**
 * Server-rendered related pages section for internal linking.
 * Outputs crawlable <a> links visible to search engine crawlers.
 */

import Link from 'next/link';
import Image from 'next/image';

interface PageItem {
    title: string;
    slug: string;
    imageSrc: string;
}

interface CategoryItem {
    name: string;
    slug: string;
    icon?: string;
    count: number;
}

interface RelatedPagesSectionProps {
    /** Same-category or same-root related pages */
    relatedPages: PageItem[];
    /** Popular / trending pages across the site */
    popularPages: PageItem[];
    /** Categories for cross-category navigation */
    categories: CategoryItem[];
    /** Name of the current category or root keyword for display */
    categoryLabel?: string;
}

/**
 * Generate varied anchor text instead of always "Title Coloring Page"
 */
function getAnchorText(title: string, idx: number): string {
    // Only vary on some items; keep some as-is for naturalness
    if (idx % 3 === 0) return title;
    if (idx % 3 === 1) {
        // "Free printable X"
        const base = title.replace(/ Coloring Page$/i, '');
        return `Free printable ${base.toLowerCase()} sheet`;
    }
    // "Printable X for kids"
    const base = title.replace(/ Coloring Page$/i, '');
    return `${base} coloring printable`;
}

function PageCard({ page, idx }: { page: PageItem; idx: number }) {
    const proxiedSrc = page.imageSrc.startsWith('/')
        ? page.imageSrc
        : `/api/image-proxy?url=${encodeURIComponent(page.imageSrc)}`;
    const unoptimized = !page.imageSrc.startsWith('/');

    return (
        <Link
            href={`/${page.slug}`}
            className="group block overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow"
            title={getAnchorText(page.title, idx)}
        >
            <div className="aspect-square bg-secondary relative overflow-hidden">
                <Image
                    src={proxiedSrc}
                    unoptimized={unoptimized}
                    alt={`${page.title} - free printable coloring page`}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                />
            </div>
            <div className="p-2">
                <span className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {page.title}
                </span>
            </div>
        </Link>
    );
}

export function RelatedPagesSection({
    relatedPages,
    popularPages,
    categories,
    categoryLabel,
}: RelatedPagesSectionProps) {
    return (
        <div className="max-w-6xl mx-auto mt-12 px-4 space-y-12">
            {/* Related pages — same category / root */}
            {relatedPages.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold mb-4">
                        {categoryLabel
                            ? `More ${categoryLabel} Coloring Pages`
                            : 'Related Coloring Pages'}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {relatedPages.slice(0, 12).map((page, i) => (
                            <PageCard key={page.slug} page={page} idx={i} />
                        ))}
                    </div>
                </section>
            )}

            {/* Popular pages */}
            {popularPages.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold mb-4">Popular Coloring Pages</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {popularPages.slice(0, 6).map((page, i) => (
                            <PageCard key={page.slug} page={page} idx={i + 20} />
                        ))}
                    </div>
                </section>
            )}

            {/* Category navigation */}
            {categories.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold mb-4">Explore More Categories</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {categories.slice(0, 8).map((cat) => (
                            <Link
                                key={cat.slug}
                                href={`/${cat.slug}`}
                                className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all"
                            >
                                {cat.icon && <span className="text-xl">{cat.icon}</span>}
                                <div>
                                    <span className="font-medium text-sm">{cat.name}</span>
                                    {cat.count > 0 && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                            ({cat.count})
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
