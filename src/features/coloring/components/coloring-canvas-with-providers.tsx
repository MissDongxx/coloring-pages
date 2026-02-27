"use client";

import { ColoringCanvas } from "@/features/coloring/components/coloring-canvas";
import { ThemeProvider } from "@/features/coloring/contexts/theme-context";
import { SoundProvider } from "@/features/coloring/contexts/sound-context";

interface RelatedPageItem {
  title: string;
  slug: string;
  imageSrc: string;
}

interface ColoringCanvasWithProvidersProps {
  pageId: string;
  imageSrc: string;
  title: string;
  description: string;
  category: string;
  relatedPages?: RelatedPageItem[];
}

export function ColoringCanvasWithProviders({
  pageId,
  imageSrc,
  title,
  description,
  category,
  relatedPages,
}: ColoringCanvasWithProvidersProps) {
  return (
    <ThemeProvider>
      <SoundProvider>
        <ColoringCanvas
          pageId={pageId}
          imageSrc={imageSrc}
          title={title}
          description={description}
          category={category}
          relatedPages={relatedPages}
        />
      </SoundProvider>
    </ThemeProvider>
  );
}
