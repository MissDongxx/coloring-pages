import { Card } from "@/shared/components/ui/card";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturesProps {
  features: Feature[];
}

export function Features({ features }: FeaturesProps) {
  return (
    <section className="py-16 md:py-24">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
        FEATURES
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="p-8 text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-card rounded-2xl"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 flex items-center justify-center text-primary">
                {feature.icon}
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4 text-card-foreground">
              {feature.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
