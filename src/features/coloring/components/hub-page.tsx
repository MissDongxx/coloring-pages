/**
 * Hub page component for SEO aggregation pages
 * Renders a grid of coloring pages matching rootKeyword + modifier
 */

import Link from 'next/link';
import type { ColoringPage } from '@/shared/models/coloring_page';

interface HubPageProps {
    title: string;
    description: string;
    introText: string;
    rootKeyword: string;
    modifier?: string | null;
    pages: ColoringPage[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    locale: string;
}

/**
 * Generate template intro text for hub pages (150-300 words)
 */
export function generateHubIntroText(rootKeyword: string, modifier?: string | null): string {
    const root = rootKeyword.replace(/-/g, ' ');
    const mod = modifier ? modifier.replace(/-/g, ' ') : '';
    const fullTopic = mod ? `${mod} ${root}` : root;

    return `Welcome to our collection of ${fullTopic} coloring pages! Whether you're a child discovering the joy of coloring for the first time or an adult looking for a relaxing creative activity, you'll find the perfect page here.

Our ${fullTopic} coloring pages feature carefully designed illustrations with clean lines and beautiful details. Each page is free to download and print — simply click on any design that catches your eye, then use the online coloring tool or print it out to color with your favorite crayons, colored pencils, or markers.

Coloring is more than just fun — it helps develop fine motor skills, encourages creativity, and provides a wonderful way to relax and unwind. Our ${root} designs range from simple outlines perfect for younger children to more detailed illustrations that will challenge and delight older kids and adults alike.

Browse our complete collection below and find your next coloring adventure. New designs are added regularly, so be sure to check back often for fresh ${root} coloring pages to enjoy!`;
}

/**
 * Generate SEO title for hub page
 */
export function generateHubTitle(rootKeyword: string, modifier?: string | null): string {
    const root = rootKeyword
        .split(/-/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    const mod = modifier
        ? modifier.split(/-/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : '';
    return mod
        ? `${mod} ${root} Coloring Pages`
        : `${root} Coloring Pages`;
}

/**
 * Generate SEO description for hub page
 */
export function generateHubDescription(rootKeyword: string, modifier?: string | null, count: number = 0): string {
    const root = rootKeyword.replace(/-/g, ' ');
    const mod = modifier ? modifier.replace(/-/g, ' ') + ' ' : '';
    const countText = count > 0 ? `${count}+ ` : '';
    return `Explore ${countText}free ${mod}${root} coloring pages. Download, print, or color online. Perfect for kids and adults!`;
}

/**
 * Parse a hub slug into rootKeyword + modifier
 * Format: {modifier?}-{root}-coloring-pages
 *
 * Examples:
 *   christmas-coloring-pages → { root: 'christmas', modifier: null }
 *   cute-christmas-coloring-pages → { root: 'christmas', modifier: 'cute' }
 *   cute-baby-dragon-coloring-pages → needs DB lookup to determine split
 *
 * Strategy: try longest possible root first (query DB for matching rootKeywords)
 */
export function parseHubSlug(slug: string): { root: string; modifier: string | null } | null {
    const suffix = '-coloring-pages';
    if (!slug.endsWith(suffix)) return null;

    const prefix = slug.slice(0, -suffix.length);
    if (!prefix) return null;

    // Try to split into modifier + root
    // Without DB lookup, use simple heuristic:
    // If prefix has dashes, first segment is modifier, rest is root
    const parts = prefix.split('-');

    if (parts.length === 1) {
        // e.g. "christmas-coloring-pages" → root = christmas
        return { root: parts[0], modifier: null };
    }

    // For multi-word: first segment = modifier, rest = root
    // e.g. "cute-christmas-coloring-pages" → modifier = cute, root = christmas
    // e.g. "for-adults-christmas-coloring-pages" → modifier = for-adults, root = christmas
    // This is a best-effort parse; the DB query will validate
    return {
        root: parts[parts.length - 1],
        modifier: parts.slice(0, -1).join('-'),
    };
}

export function HubPage({
    title,
    description,
    introText,
    rootKeyword,
    modifier,
    pages,
    totalCount,
    currentPage,
    totalPages,
    locale,
}: HubPageProps) {
    // Normalize slug: replace spaces with hyphens for URL
    const normalizedModifier = modifier?.replace(/\s+/g, '-') || '';
    const normalizedRootKeyword = rootKeyword.replace(/\s+/g, '-');
    const slug = normalizedModifier
        ? `${normalizedModifier}-${normalizedRootKeyword}-coloring-pages`
        : `${normalizedRootKeyword}-coloring-pages`;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Breadcrumbs */}
                <nav className="text-sm text-muted-foreground mb-6">
                    <Link href={`/${locale}`} className="hover:text-foreground">Home</Link>
                    <span className="mx-2">/</span>
                    <Link href={`/${locale}/`} className="hover:text-foreground">Coloring Pages</Link>
                    {modifier && (
                        <>
                            <span className="mx-2">/</span>
                            <Link
                                href={`/${locale}/${normalizedRootKeyword}-coloring-pages`}
                                className="hover:text-foreground"
                            >
                                {rootKeyword.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Coloring Pages
                            </Link>
                        </>
                    )}
                    <span className="mx-2">/</span>
                    <span className="text-foreground">{title}</span>
                </nav>

                {/* Title & Description */}
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
                    <p className="text-lg text-muted-foreground">{description}</p>
                    <p className="text-sm text-muted-foreground mt-2">{totalCount} coloring pages available</p>
                </header>

                {/* Intro Text (SEO content) */}
                <div className="prose prose-sm max-w-none mb-8 text-muted-foreground">
                    {introText.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                    ))}
                </div>

                {/* Pages Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                    {pages.map((page) => (
                        <Link
                            key={page.id}
                            href={`/${locale}/${page.slug}`}
                            className="group block overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-shadow"
                        >
                            <div className="aspect-square bg-muted overflow-hidden">
                                <img
                                    src={page.imageUrl}
                                    alt={page.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-2">
                                <div className="text-sm font-medium truncate">{page.title}</div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2">
                        {currentPage > 1 && (
                            <Link
                                href={`/${locale}/${slug}?page=${currentPage - 1}`}
                                className="px-4 py-2 rounded-md border hover:bg-accent text-sm"
                            >
                                Previous
                            </Link>
                        )}
                        <span className="px-4 py-2 text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        {currentPage < totalPages && (
                            <Link
                                href={`/${locale}/${slug}?page=${currentPage + 1}`}
                                className="px-4 py-2 rounded-md border hover:bg-accent text-sm"
                            >
                                Next
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
