import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useStripe } from "@/hooks/use-stripe";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PricingTier {
  name: string;
  price: number;
  description: string;
  features: string[];
  articleLimit: number;
  keywordReportLimit: number;
  highlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Pay-As-You-Go",
    price: 5,
    description: "Perfect for occasional use",
    features: [
      "£5 per article",
      "No monthly commitment",
      "Basic SEO optimization",
      "Standard support",
    ],
    articleLimit: 1,
    keywordReportLimit: 1,
  },
  {
    name: "Starter Plan",
    price: 75,
    description: "Perfect for small content teams",
    features: [
      "25 articles per month",
      "10 keyword reports",
      "Priority support",
      "Advanced SEO tools",
      "Content calendar",
    ],
    articleLimit: 25,
    keywordReportLimit: 10,
    highlighted: true,
  },
  {
    name: "Growth Plan",
    price: 149,
    description: "Ideal for growing businesses",
    features: [
      "75 articles per month",
      "30 keyword reports",
      "Priority support",
      "Advanced SEO tools",
      "Content calendar",
      "Team collaboration",
      "Custom templates",
    ],
    articleLimit: 75,
    keywordReportLimit: 30,
  },
  {
    name: "Agency Plan",
    price: 299,
    description: "For professional content agencies",
    features: [
      "200 articles per month",
      "100 keyword reports",
      "Priority support",
      "Advanced SEO tools",
      "Content calendar",
      "Team collaboration",
      "Custom templates",
      "API access",
      "White-label reports",
    ],
    articleLimit: 200,
    keywordReportLimit: 100,
  },
];

interface PricingTableProps {
  currentPlan?: string;
  onSelectPlan: (plan: PricingTier) => void;
}

export function PricingTable({ currentPlan, onSelectPlan }: PricingTableProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const { isStripeLoaded } = useStripe();

  const handleSelectPlan = (tier: PricingTier) => {
    setSelectedTier(tier.name);
    onSelectPlan(tier);
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {pricingTiers.map((tier) => (
        <Card
          key={tier.name}
          className={cn(
            "relative p-6",
            tier.highlighted && "border-primary shadow-lg"
          )}
        >
          {tier.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
              Most Popular
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-xl font-bold">{tier.name}</h3>
            <p className="text-muted-foreground">{tier.description}</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold">£{tier.price}</span>
            {tier.name !== "Pay-As-You-Go" && (
              <span className="text-muted-foreground">/month</span>
            )}
          </div>
          <ul className="mb-6 space-y-2">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            variant={tier.highlighted ? "default" : "outline"}
            disabled={!isStripeLoaded || currentPlan === tier.name}
            onClick={() => handleSelectPlan(tier)}
          >
            {currentPlan === tier.name
              ? "Current Plan"
              : currentPlan
              ? "Change Plan"
              : "Select Plan"}
          </Button>
        </Card>
      ))}
    </div>
  );
} 