import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { getMdxPage } from '@/shared/lib/mdx';
import { MDXContent } from '@/shared/blocks/common/mdx-content';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const page = await getMdxPage({ slug: 'terms-of-service', locale });

  return {
    title: page?.title || 'Terms of Service',
    description: page?.description || 'Terms of Service',
  };
}

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = await getMdxPage({ slug: 'terms-of-service', locale });

  if (!page) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p>Terms of service not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">{page.title}</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MDXContent source={page.content} />
      </div>
    </div>
  );
}
