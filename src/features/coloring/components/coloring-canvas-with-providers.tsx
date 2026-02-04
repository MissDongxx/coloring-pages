"use client";

import { ColoringCanvas } from "@/features/coloring/components/coloring-canvas";
import { ThemeProvider } from "@/features/coloring/contexts/theme-context";
import { SoundProvider } from "@/features/coloring/contexts/sound-context";

interface ColoringCanvasWithProvidersProps {
  pageId: string;
  imageSrc: string;
  title: string;
  description: string;
  category: string;
}

export function ColoringCanvasWithProviders({
  pageId,
  imageSrc,
  title,
  description,
  category,
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
        />
      </SoundProvider>
    </ThemeProvider>
  );
}
