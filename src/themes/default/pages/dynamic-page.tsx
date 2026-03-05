import { getThemeBlock } from '@/core/theme';
import type { DynamicPage as DynamicPageType } from '@/shared/types/blocks/landing';
import { Suspense } from 'react';
import React from 'react';

// Client component wrapper with mount check for rendering section components
function SectionComponentWrapper({ component }: { component: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="w-full h-64 animate-pulse bg-muted" />;
  }

  return <>{component}</>;
}

export default async function DynamicPage({
  locale,
  page,
  data,
}: {
  locale?: string;
  page: DynamicPageType;
  data?: Record<string, any>;
}) {
  // Build sections array
  const sections: React.ReactNode[] = [];

  if (page?.sections) {
    for (const sectionKey of Object.keys(page.sections)) {
      const section = page.sections?.[sectionKey];
      if (!section || section.disabled === true) {
        continue;
      }

      if (page.show_sections && !page.show_sections.includes(sectionKey)) {
        continue;
      }

      // block name
      const block = section.block || section.id || sectionKey;

      try {
        if (section.component) {
          // Don't use Suspense for pre-built components - render directly with wrapper
          sections.push(
            <SectionComponentWrapper key={sectionKey} component={section.component} />
          );
          continue;
        }

        const DynamicBlock = await getThemeBlock(block);
        sections.push(
          <Suspense key={sectionKey} fallback={<div className="w-full h-64 animate-pulse bg-muted" />}>
            <DynamicBlock
              section={section}
              {...(data || section.data || {})}
            />
          </Suspense>
        );
      } catch (error) {
        // Skip this section if there's an error
        continue;
      }
    }
  }

  return (
    <>
      {page.title && !page.sections?.hero && (
        <h1 className="sr-only">{page.title}</h1>
      )}
      {sections}
    </>
  );
}
