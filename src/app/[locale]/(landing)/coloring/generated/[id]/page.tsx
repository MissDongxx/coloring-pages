import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import { findColoringPage } from '@/shared/models/coloring_page';
import { ColoringCanvasWithProviders } from '@/features/coloring/components/coloring-canvas-with-providers';

interface Props {
    params: Promise<{ locale: string; id: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const page = await findColoringPage({ id });

    if (!page) return {};

    const keywords = [
        page.category,
        page.keyword,
        'coloring page',
        'free coloring page',
        'printable',
    ].join(', ');

    return {
        title: page.title || 'Coloring Page',
        description: page.description || `Free ${page.title} coloring page for kids and adults.`,
        keywords,
        openGraph: {
            title: page.title || 'Coloring Page',
            description: page.description || `Free ${page.title} coloring page.`,
            images: [page.imageUrl],
        },
    };
}

export default async function GeneratedColoringPage({ params }: Props) {
    const { locale, id } = await params;
    setRequestLocale(locale);

    const page = await findColoringPage({ id });

    if (!page) {
        notFound();
    }

    return (
        <div className="min-h-screen">
            <ColoringCanvasWithProviders
                pageId={page.id}
                imageSrc={page.imageUrl}
                title={page.title}
                description={page.description || ''}
                category={page.category}
            />
        </div>
    );
}

