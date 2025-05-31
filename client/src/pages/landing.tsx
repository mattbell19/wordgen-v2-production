import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowRight, 
  Sparkles, 
  Search, 
  BarChart2, 
  Users, 
  Check,
  PenTool,
  Bot,
  Target,
  FileText,
  Globe,
  Zap,
  Settings,
  Layout,
  HelpCircle
} from "lucide-react";
import { SiGoogle, SiWordpress, SiShopify, SiMedium } from "react-icons/si";
import { MarketingHeader } from "@/components/marketing-header";
import { MarketingFooter } from "@/components/marketing-footer";
import '@/styles/fonts.css';

export default function Landing() {
  const mainFeatures = [
    {
      icon: <PenTool className="h-8 w-8 text-primary" />,
      title: "Smart Article Writer",
      description: "Write SEO-optimized articles with AI assistance. Our editor suggests improvements, checks readability, and ensures your content ranks well.",
      benefits: [
        "AI-powered writing suggestions",
        "SEO optimization in real-time",
        "Readability analysis"
      ],
      demoImage: "article-writer-demo.png"
    },
    {
      icon: <Bot className="h-8 w-8 text-primary" />,
      title: "AI Content Assistant",
      description: "Your personal AI writing partner that helps generate ideas, outlines, and complete articles based on your requirements.",
      benefits: [
        "Topic ideation",
        "Content outlining",
        "Full article generation"
      ],
      demoImage: "ai-assistant-demo.png"
    },
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Keyword Research Tools",
      description: "Discover high-performing keywords with our advanced research tools. Analyze competition, search volume, and ranking difficulty.",
      benefits: [
        "Comprehensive keyword analysis",
        "Competition insights",
        "Ranking difficulty scores"
      ],
      demoImage: "keyword-research-demo.png"
    }
  ];

  const additionalFeatures = [
    {
      icon: <Globe className="h-8 w-8 text-primary" />,
      title: "Site Audit & Analysis",
      description: "Complete SEO audit of your website. Identify issues, get actionable recommendations, and track improvements over time."
    },
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Bulk Content Generation",
      description: "Generate multiple articles simultaneously. Perfect for content agencies and large-scale content production."
    },
    {
      icon: <Layout className="h-8 w-8 text-primary" />,
      title: "Content Organization",
      description: "Keep your content organized with our powerful management system. Create collections, tag articles, and track revisions."
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Quick Export",
      description: "Export your content in multiple formats including HTML, Markdown, and plain text."
    },
    {
      icon: <Settings className="h-8 w-8 text-primary" />,
      title: "Custom Templates",
      description: "Create and save custom templates for faster content generation and consistent brand voice."
    },
    {
      icon: <BarChart2 className="h-8 w-8 text-primary" />,
      title: "Performance Analytics",
      description: "Track your content performance with detailed analytics and SEO metrics."
    }
  ];

  const faqs = [
    {
      question: "How does AI-powered content generation work?",
      answer: "Our platform uses advanced AI models to analyze your topic, research relevant information, and generate high-quality, SEO-optimized content. The AI considers your specific requirements, target keywords, and writing style to create unique articles that align with your brand voice while maintaining readability and search engine friendliness."
    },
    {
      question: "What makes Wordgen different from other AI writing tools?",
      answer: "Wordgen combines AI content generation with comprehensive SEO optimization tools, keyword research, and site auditing capabilities. Our platform offers a complete content creation ecosystem, including bulk article generation, keyword tracking, and performance analytics - all integrated into one seamless workflow."
    },
    {
      question: "How accurate is the SEO optimization?",
      answer: "Our SEO tools use real-time data from leading search engines and industry databases to provide accurate keyword metrics, competition analysis, and optimization recommendations. We continuously update our algorithms to align with the latest SEO best practices and search engine guidelines."
    },
    {
      question: "Can I customize the AI's writing style?",
      answer: "Yes! You can customize various aspects of the content generation, including tone of voice, writing style, content structure, and target audience. Our AI adapts to your preferences while maintaining SEO optimization and readability standards."
    },
    {
      question: "What types of content can Wordgen create?",
      answer: "Wordgen can generate various content types including blog posts, product descriptions, website copy, meta descriptions, social media content, and more. The AI is trained to handle different content formats while maintaining proper structure and SEO requirements."
    },
    {
      question: "Do you offer integration with popular CMS platforms?",
      answer: "Yes, we provide seamless integration with major content management systems including WordPress, Shopify, and custom platforms through our API. You can publish content directly from Wordgen to your preferred platform."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted">
      <MarketingHeader />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight font-sora-bold">
            AI-Powered Content Creation & SEO Optimization
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4 font-inter-regular">
            Create high-ranking content 10x faster with our comprehensive suite of AI tools. Perfect for content creators, marketers, and agencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button size="lg" className="gap-2 w-full sm:w-auto" asChild>
              <a href="/auth">Start Free Trial <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto" asChild>
              <a href="#features">Explore Features <ArrowRight className="h-4 w-4" /></a>
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="pt-16 space-y-6">
          <div className="flex items-center justify-center gap-2 text-primary/80">
            <Users className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">Trusted by 10,000+ content creators worldwide</span>
          </div>
          <div className="flex flex-wrap gap-8 md:gap-12 items-center justify-center text-muted-foreground/60">
            <SiGoogle className="h-6 w-6 md:h-8 md:w-8 hover:text-primary/60 transition-colors" />
            <SiWordpress className="h-6 w-6 md:h-8 md:w-8 hover:text-primary/60 transition-colors" />
            <SiShopify className="h-6 w-6 md:h-8 md:w-8 hover:text-primary/60 transition-colors" />
            <SiMedium className="h-6 w-6 md:h-8 md:w-8 hover:text-primary/60 transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Features Section */}
      <div id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools to transform your content creation workflow
          </p>
        </div>

        <div className="space-y-24">
          {mainFeatures.map((feature, idx) => (
            <div key={idx} className="grid md:grid-cols-2 gap-8 items-center">
              <div className={idx % 2 === 1 ? "md:order-2" : ""}>
                {/* Demo Image Area */}
                <div className="bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 aspect-video flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Feature Screenshot</p>
                </div>
              </div>
              <div className={idx % 2 === 1 ? "md:order-1" : ""}>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {feature.icon}
                    </div>
                    <h3 className="text-2xl font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{feature.description}</p>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIdx) => (
                      <div key={benefitIdx} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Features Grid */}
      <div className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Additional Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need for professional content creation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {additionalFeatures.map((feature, idx) => (
            <Card key={idx} className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Testimonials Section - from original code */}
      <div className="container mx-auto px-4 py-16 md:py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center px-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Trusted by Content Creators</h2>
            <p className="text-muted-foreground">
              Join thousands of satisfied users who have transformed their content strategy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                quote: "Increased our blog traffic by 200% in just 3 months!",
                author: "Sarah Johnson",
                role: "Content Manager",
                company: "TechStart"
              },
              {
                quote: "The AI-powered content generation saves me hours every week.",
                author: "Mike Chen",
                role: "SEO Specialist",
                company: "Growth Co"
              },
              {
                quote: "Best investment for our content marketing strategy.",
                author: "Emily Brown",
                role: "Marketing Director",
                company: "E-commerce Plus"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0 space-y-4">
                  <p className="text-lg font-medium italic">{testimonial.quote}</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Wordgen's AI-powered content creation platform
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Call to Action - from original code */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8 px-4">
          <h2 className="text-2xl md:text-3xl font-bold">Start Creating with Wordgen Today</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of content creators who trust our AI-powered platform for their content needs.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button size="lg" className="gap-2 w-full sm:w-auto" asChild>
              <a href="/auth">Start Your Free Trial <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <p className="text-sm text-muted-foreground">
              ✓ 30-day free trial &nbsp; ✓ No credit card required &nbsp; ✓ Cancel anytime
            </p>
          </div>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}