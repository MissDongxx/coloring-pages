import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/shared/components/ui/card";

interface ColoringCardProps {
  title: string;
  slug: string;
  imageSrc: string;
  imageAlt?: string;
  canonical?: string;
  category?: string;
}

export function ColoringCard({
  title,
  slug,
  imageSrc,
  imageAlt,
  canonical,
  category
}: ColoringCardProps) {
  // 生成优化的 Alt 文本
  const altText = imageAlt || `${title} coloring page - free printable`;

  // 构建链接（使用新的 URL 结构）
  const href = `/${slug}/`;
  const proxiedSrc = imageSrc.startsWith("/") ? imageSrc : `/api/image-proxy?url=${encodeURIComponent(imageSrc)}`;
  const unoptimized = !imageSrc.startsWith("/");

  return (
    <Link href={href} prefetch={false}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        <CardContent className="p-0">
          <div className="relative aspect-square bg-secondary">
            <Image
              src={proxiedSrc}
              unoptimized={unoptimized}
              alt={altText}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
          <div className="p-3">
            {/* 分类标签 */}
            {category && (
              <span className="text-xs text-primary uppercase tracking-wide mb-1 block">
                {category}
              </span>
            )}
            <h3 className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
