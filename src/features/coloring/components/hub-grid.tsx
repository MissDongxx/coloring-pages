import Link from "next/link";
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
            {hubs.map((hub) => (
                <Link key={hub.slug} href={`/${hub.slug}`}>
                    <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary group">
                        <div className="aspect-[4/3] bg-secondary/30 flex items-center justify-center border-b">
                            {hub.imageSrc ? (
                                <img
                                    src={hub.imageSrc}
                                    alt={hub.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    loading="lazy"
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
            ))}
        </div>
    );
}
