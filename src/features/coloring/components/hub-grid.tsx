import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/shared/components/ui/card";

interface HubItem {
    name: string;
    slug: string;
    count: number;
    imageSrc: string;
}

interface HubGridProps {
    hubs: HubItem[];
}

export function HubGrid({ hubs }: HubGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {hubs.map((hub, index) => {
                // 使用图片代理处理外部图片
                const proxiedSrc = hub.imageSrc?.startsWith("/")
                    ? hub.imageSrc
                    : `/api/image-proxy?url=${encodeURIComponent(hub.imageSrc)}`;
                const unoptimized = !hub.imageSrc?.startsWith("/");

                return (
                    <Link key={hub.slug} href={`/${hub.slug}`}>
                        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary group">
                            <div className="relative aspect-[4/3] bg-secondary/30 flex items-center justify-center border-b">
                                {hub.imageSrc ? (
                                    <Image
                                        src={proxiedSrc}
                                        alt={hub.name}
                                        fill
                                        unoptimized={unoptimized}
                                        priority={index < 4}
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="text-4xl">🎨</div>
                                )}
                            </div>
                            <CardContent className="p-4 text-center bg-card">
                                {/* Hub Title */}
                                <h3 className="font-medium text-lg capitalize">{hub.name}</h3>
                                {/* Pages in Hub */}
                                <p className="text-sm text-muted-foreground mt-2">
                                    {hub.count} pages
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
