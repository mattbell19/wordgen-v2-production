import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PenTool,
  Bot,
  Target,
  Globe,
  FileText,
  Layout,
  Users,
  Search,
  Settings,
  BookOpen,
  Code,
  ExternalLink
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing-header";
import { MarketingFooter } from "@/components/marketing-footer";

const features = {
  contentCreation: {
    title: "Content Creation",
    sections: [
      {
        id: "article-writer",
        icon: <PenTool className="h-6 w-6" />,
        title: "Smart Article Writer",
        description: "Create SEO-optimized content with AI assistance",
        content: [
          {
            type: "text",
            content: "The Smart Article Writer is an AI-powered editor that helps you create high-quality, SEO-optimized content. It provides real-time suggestions, readability analysis, and SEO optimization tips as you write."
          },
          {
            type: "features",
            items: [
              "Real-time AI writing suggestions",
              "SEO optimization prompts",
              "Readability scoring",
              "Keyword density analysis",
              "Content structure recommendations"
            ]
          },
          {
            type: "usage",
            steps: [
              "Click 'New Article' in the dashboard",
              "Enter your target keywords and topic",
              "Use the rich text editor to write your content",
              "Review AI suggestions in the sidebar",
              "Export or publish your optimized content"
            ]
          }
        ]
      },
      {
        id: "ai-assistant",
        icon: <Bot className="h-6 w-6" />,
        title: "AI Content Assistant",
        description: "Generate ideas and outlines with AI",
        content: [
          {
            type: "text",
            content: "The AI Content Assistant helps you generate content ideas, create outlines, and expand your content. It uses advanced AI to understand your requirements and produce relevant suggestions."
          },
          {
            type: "features",
            items: [
              "Topic ideation",
              "Outline generation",
              "Content expansion",
              "Tone adjustment",
              "Style customization"
            ]
          },
          {
            type: "usage",
            steps: [
              "Select 'AI Assistant' from the sidebar",
              "Choose your content type and topic",
              "Specify your requirements and preferences",
              "Generate and refine suggestions",
              "Import to the article editor"
            ]
          }
        ]
      }
    ]
  },
  seoTools: {
    title: "SEO Tools",
    sections: [
      {
        id: "keyword-research",
        icon: <Target className="h-6 w-6" />,
        title: "Keyword Research",
        description: "Find high-value keywords for your content",
        content: [
          {
            type: "text",
            content: "Our keyword research tool helps you discover valuable keywords with detailed metrics including search volume, competition, and ranking difficulty."
          },
          {
            type: "features",
            items: [
              "Search volume analysis",
              "Competition metrics",
              "Ranking difficulty scores",
              "Related keywords",
              "Trend analysis"
            ]
          },
          {
            type: "usage",
            steps: [
              "Enter your seed keyword",
              "Review search volume and difficulty",
              "Analyze competition metrics",
              "Save keywords to lists",
              "Export research data"
            ]
          }
        ]
      },
      {
        id: "site-audit",
        icon: <Globe className="h-6 w-6" />,
        title: "Site Audit & Analysis",
        description: "Comprehensive SEO analysis of your website",
        content: [
          {
            type: "text",
            content: "The Site Audit tool performs a detailed analysis of your website's SEO health, identifying issues and providing actionable recommendations."
          },
          {
            type: "features",
            items: [
              "Technical SEO analysis",
              "Content optimization check",
              "Mobile responsiveness",
              "Page speed insights",
              "Backlink analysis"
            ]
          },
          {
            type: "usage",
            steps: [
              "Add your website URL",
              "Run a comprehensive audit",
              "Review detailed reports",
              "Get actionable recommendations",
              "Track improvements over time"
            ]
          }
        ]
      }
    ]
  },
  management: {
    title: "Content Management",
    sections: [
      {
        id: "bulk-generation",
        icon: <FileText className="h-6 w-6" />,
        title: "Bulk Content Generation",
        description: "Generate multiple articles efficiently",
        content: [
          {
            type: "text",
            content: "The Bulk Generation tool allows you to create multiple pieces of content simultaneously, perfect for large-scale content production."
          },
          {
            type: "features",
            items: [
              "Template-based generation",
              "Batch processing",
              "Custom variables",
              "Format preservation",
              "Quality control"
            ]
          },
          {
            type: "usage",
            steps: [
              "Create or select a template",
              "Upload your content requirements",
              "Configure generation settings",
              "Review and edit content",
              "Export in bulk"
            ]
          }
        ]
      }
    ]
  },
  payments: {
    title: "Subscription Management",
    sections: [
      {
        id: "subscription",
        icon: <Code className="h-6 w-6" />,
        title: "Subscription Plans & Usage",
        description: "Manage your subscription, billing, and usage limits",
        content: [
          {
            type: "text",
            content: "Our flexible subscription system provides different tiers to match your content generation needs. Each plan includes specific usage limits and features to help you scale your content creation efficiently."
          },
          {
            type: "features",
            items: [
              "Free Tier: 5 free articles + 1 keyword report",
              "Pay-As-You-Go: $5 per article",
              "Starter Plan: $75/month for 25 articles + 10 keyword reports",
              "Growth Plan: $149/month for 75 articles + 30 keyword reports",
              "Agency Plan: $299/month for 200 articles + 100 keyword reports"
            ]
          },
          {
            type: "usage",
            steps: [
              "Monitor your usage in the dashboard",
              "Receive notifications when approaching limits",
              "Upgrade plans anytime as needs grow",
              "Cancel or change plans from account settings",
              "View detailed usage history and billing"
            ]
          }
        ]
      }
    ]
  }
};

function DocSection({ section }: { section: any }) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            {section.icon}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{section.title}</h3>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
        </div>

        {section.content.map((block: any, index: number) => {
          switch (block.type) {
            case "text":
              return (
                <p key={index} className="mb-6 text-muted-foreground">
                  {block.content}
                </p>
              );
            case "features":
              return (
                <div key={index} className="mb-6">
                  <h4 className="font-semibold mb-2">Key Features</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {block.items.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            case "usage":
              return (
                <div key={index} className="mb-6">
                  <h4 className="font-semibold mb-2">How to Use</h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    {block.steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              );
            default:
              return null;
          }
        })}
      </CardContent>
    </Card>
  );
}

export default function Docs() {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Documentation</h1>
            <p className="text-lg text-muted-foreground">
              Learn how to use Wordgen's features to create and optimize your content
            </p>
          </div>

          <Tabs defaultValue="content-creation" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content-creation">Content Creation</TabsTrigger>
              <TabsTrigger value="seo-tools">SEO Tools</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="content-creation" className="space-y-4">
              {features.contentCreation.sections.map((section, index) => (
                <DocSection key={index} section={section} />
              ))}
            </TabsContent>

            <TabsContent value="seo-tools" className="space-y-4">
              {features.seoTools.sections.map((section, index) => (
                <DocSection key={index} section={section} />
              ))}
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              {features.management.sections.map((section, index) => (
                <DocSection key={index} section={section} />
              ))}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {features.payments.sections.map((section, index) => (
                <DocSection key={index} section={section} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}