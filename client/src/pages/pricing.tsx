import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section className="py-12 lg:py-20 overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="mb-3 text-3xl font-medium">Pricing & Plans</h2>
          <p className="text-base text-neutral-600 dark:text-neutral-400">
            Choose the plan that best fits your content needs. All plans include SEO optimization and quality assurance.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {/* Pay-As-You-Go Plan */}
          <div className="w-full">
            <div className="h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-2xl mb-2">Pay-As-You-Go</h3>
                <p className="text-lg font-medium mb-1">£5/article</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Perfect for occasional content needs with no monthly commitment.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <FeatureItem>Pay per article</FeatureItem>
                <FeatureItem>No monthly commitment</FeatureItem>
                <FeatureItem>Basic SEO optimization</FeatureItem>
                <FeatureItem>Access to all writing tools</FeatureItem>
                <FeatureItem>24/7 support</FeatureItem>
              </div>
              <PricingButton noCardRequired>Try 14 Days Free Trial</PricingButton>
            </div>
          </div>

          {/* Starter Plan */}
          <div className="w-full relative">
            <div className="absolute -top-3 left-0 right-0 text-center">
              <span className="bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm border border-purple-200 dark:border-purple-800">
                Most Popular
              </span>
            </div>
            <div className="h-full bg-gradient-to-br from-red-500 via-purple-500 to-blue-500 rounded-lg p-6 text-white shadow-lg ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-neutral-900">
              <div className="mb-6">
                <h3 className="text-2xl mb-2">Starter</h3>
                <p className="text-lg font-medium mb-1">£75/mo</p>
                <p className="text-sm">
                  25 articles per month. Save £50 vs pay-as-you-go.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <FeatureItem light>25 articles per month</FeatureItem>
                <FeatureItem light>Advanced SEO optimization</FeatureItem>
                <FeatureItem light>Priority support</FeatureItem>
                <FeatureItem light>Content calendar</FeatureItem>
                <FeatureItem light>Basic analytics</FeatureItem>
              </div>
              <PricingButton light noCardRequired>Try 14 Days Free Trial</PricingButton>
            </div>
          </div>

          {/* Growth Plan */}
          <div className="w-full">
            <div className="h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-2xl mb-2">Growth</h3>
                <p className="text-lg font-medium mb-1">£149/mo</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  75 articles per month. Best value for growing businesses.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <FeatureItem>75 articles per month</FeatureItem>
                <FeatureItem>Advanced SEO optimization</FeatureItem>
                <FeatureItem>Priority support</FeatureItem>
                <FeatureItem>Content strategy</FeatureItem>
                <FeatureItem>Advanced analytics</FeatureItem>
              </div>
              <PricingButton noCardRequired>Try 14 Days Free Trial</PricingButton>
            </div>
          </div>

          {/* Agency Plan */}
          <div className="w-full">
            <div className="h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-2xl mb-2">Agency</h3>
                <p className="text-lg font-medium mb-1">£299/mo</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  200 articles per month. Ideal for agencies and large teams.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <FeatureItem>200 articles per month</FeatureItem>
                <FeatureItem>White-label options</FeatureItem>
                <FeatureItem>API access</FeatureItem>
                <FeatureItem>Dedicated account manager</FeatureItem>
                <FeatureItem>Custom integrations</FeatureItem>
              </div>
              <PricingButton noCardRequired>Try 14 Days Free Trial</PricingButton>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="w-full">
            <div className="h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-2xl mb-2">Enterprise</h3>
                <p className="text-lg font-medium mb-1">Custom pricing</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Tailored solutions for large organizations with custom needs.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <FeatureItem>Custom article volume</FeatureItem>
                <FeatureItem>Custom AI training</FeatureItem>
                <FeatureItem>Advanced analytics</FeatureItem>
                <FeatureItem>API access</FeatureItem>
                <FeatureItem>Custom integrations</FeatureItem>
              </div>
              <PricingButton>Contact sales</PricingButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FeatureItem = ({ children, light }: { children: string; light?: boolean }) => {
  return (
    <li className="flex items-center">
      <Check className={`size-3.5 mr-2 ${light ? 'text-white' : ''}`} />
      <span className={`text-sm ${light ? 'text-white' : ''}`}>{children}</span>
    </li>
  );
};

const PricingButton = ({
  children,
  light,
  noCardRequired,
}: {
  children: string;
  light?: boolean;
  noCardRequired?: boolean;
}) => {
  return (
    <div>
      <button
        className={`w-full py-2 px-4 rounded-lg border text-sm transition-all ${
          light
            ? 'border-white text-white hover:bg-white hover:text-black'
            : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }`}
      >
        {children}
      </button>
      {noCardRequired && (
        <p className={`mt-2 text-xs text-center ${light ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
          No credit card required
        </p>
      )}
    </div>
  );
};