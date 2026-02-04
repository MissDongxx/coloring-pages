import { ColoringCard } from "./coloring-card";

interface PopularItem {
  title: string;
  slug: string;
  imageSrc: string;
}

interface PopularGridProps {
  items: PopularItem[];
}

export function PopularGrid({ items }: PopularGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <ColoringCard key={item.slug} {...item} />
      ))}
    </div>
  );
}
