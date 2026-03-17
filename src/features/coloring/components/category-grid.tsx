import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/shared/components/ui/card";

interface Category {
  name: string;
  slug: string;
  count: number;
  icon?: string;
  imageSrc?: string;
  preview?: string;
}

interface CategoryGridProps {
  categories: Category[];
  hideEmpty?: boolean;
}

export function CategoryGrid({ categories, hideEmpty = true }: CategoryGridProps) {
  // 过滤掉 0 页面的分类（如果 hideEmpty 为 true）
  const filteredCategories = hideEmpty
    ? categories.filter((cat) => cat.count > 0)
    : categories;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {filteredCategories.map((cat, index) => {
        // 使用图片代理处理外部图片
        const proxiedSrc = cat.imageSrc?.startsWith("/")
          ? cat.imageSrc
          : `/api/image-proxy?url=${encodeURIComponent(cat.imageSrc || '')}`;
        const unoptimized = Boolean(cat.imageSrc && !cat.imageSrc.startsWith("/"));

        return (
          <Link key={cat.slug} href={`/${cat.slug}/`}>
            <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary group">
              <div className="relative aspect-[4/3] bg-secondary/30 flex items-center justify-center border-b">
                {cat.imageSrc ? (
                  <Image
                    src={proxiedSrc}
                    alt={cat.name || 'Coloring Category'}
                    fill
                    unoptimized={unoptimized}
                    priority={index < 4}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="text-4xl">{cat.icon}</div>
                )}
              </div>
              <CardContent className="p-4 text-center">
                {/* 分类名 */}
                <h3 className="font-medium text-lg">{cat.name}</h3>
                {/* 预览关键词 */}
                {cat.preview && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {cat.preview}
                  </p>
                )}
                {/* 页面数量 */}
                <p className="text-sm text-muted-foreground mt-2">
                  {cat.count > 0 ? `${cat.count} pages` : "Coming soon"}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
