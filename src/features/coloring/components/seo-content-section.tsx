/**
 * Server-rendered SEO content section for coloring pages.
 * Outputs crawlable HTML text + JSON-LD structured data below the canvas.
 */

import { generateSeoContent } from '@/features/coloring/lib/seo-content-generator';

interface SeoContentSectionProps {
    title: string;
    slug: string;
    category: string;
    subCategory?: string;
    keywords?: string[];
    description?: string;
    imageSrc: string;
    rootKeyword?: string | null;
    modifier?: string | null;
}

export function SeoContentSection(props: SeoContentSectionProps) {
    const { htmlContent, imageJsonLd, breadcrumbJsonLd } = generateSeoContent(props);

    return (
        <>
            {/* JSON-LD structured data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(imageJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            {/* SEO content */}
            <div
                className="seo-content-wrapper max-w-3xl mx-auto mt-12 px-4 pb-8 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
        </>
    );
}
