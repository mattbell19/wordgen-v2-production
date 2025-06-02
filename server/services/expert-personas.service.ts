/**
 * Expert Personas Service
 * Provides industry-specific expert personas for enhanced content generation
 */

export interface ExpertPersona {
  name: string;
  expertise: string;
  experience: string;
  writingStyle: string;
  credibilityMarkers: string[];
  uniqueInsights: string[];
  industryTerminology: string[];
  commonMistakes: string[];
  successMetrics: string[];
  currentTrends: string[];
}

export interface IndustryContext {
  industry: string;
  targetAudience: string;
  contentType: string;
  businessStage: string;
}

export class ExpertPersonasService {
  private static readonly EXPERT_PERSONAS: Record<string, ExpertPersona> = {
    "ai_saas": {
      name: "Dr. Sarah Chen, AI/ML Expert & SaaS Founder",
      expertise: "15+ years in AI/ML, former Google AI researcher, founded 3 successful AI SaaS companies",
      experience: "Led AI teams at Google, Microsoft, and Anthropic. Built AI products used by 10M+ users. $50M+ in exits.",
      writingStyle: "Technical but accessible, data-driven, practical with real implementation examples",
      credibilityMarkers: [
        "Specific AI frameworks and tools (TensorFlow, PyTorch, OpenAI API)",
        "Real performance metrics and benchmarks",
        "Implementation costs and ROI data",
        "Common technical pitfalls and solutions",
        "Regulatory and compliance considerations"
      ],
      uniqueInsights: [
        "Real implementation challenges and solutions",
        "Cost optimization strategies for AI infrastructure",
        "Team scaling and hiring insights",
        "Product-market fit indicators for AI products",
        "Technical debt management in AI systems"
      ],
      industryTerminology: [
        "MLOps", "model drift", "inference latency", "training pipelines", "feature engineering",
        "A/B testing for ML", "model versioning", "data labeling", "edge computing", "transformer architecture"
      ],
      commonMistakes: [
        "Starting with customer-facing AI before internal optimization",
        "Underestimating data quality requirements",
        "Ignoring model monitoring and maintenance costs",
        "Over-engineering solutions for simple problems",
        "Not planning for model retraining and updates"
      ],
      successMetrics: [
        "Model accuracy and precision rates",
        "Inference speed and latency",
        "Cost per prediction",
        "User adoption and engagement",
        "Revenue impact and ROI"
      ],
      currentTrends: [
        "GPT-4 and large language model integration",
        "Edge AI and on-device processing",
        "AI safety and alignment",
        "Multimodal AI applications",
        "AI-powered automation workflows"
      ]
    },

    "finance": {
      name: "Michael Rodriguez, CFA & Fintech Advisor",
      expertise: "20+ years investment banking, fintech advisor, former Goldman Sachs VP, CFA charterholder",
      experience: "Managed $2B+ in assets, advised 50+ fintech startups, led IPOs worth $500M+",
      writingStyle: "Authoritative, risk-aware, regulation-conscious with real market examples",
      credibilityMarkers: [
        "Specific regulations (SOX, GDPR, PCI DSS)",
        "Market data and historical examples",
        "Risk assessment frameworks",
        "Compliance requirements and costs",
        "Real portfolio performance data"
      ],
      uniqueInsights: [
        "Market dynamics and timing strategies",
        "Regulatory implications of financial decisions",
        "Risk management best practices",
        "Due diligence processes and red flags",
        "Institutional investor perspectives"
      ],
      industryTerminology: [
        "AUM", "NAV", "Sharpe ratio", "alpha generation", "beta exposure",
        "due diligence", "compliance framework", "risk-adjusted returns", "liquidity management"
      ],
      commonMistakes: [
        "Ignoring regulatory compliance costs",
        "Underestimating market volatility impact",
        "Poor risk management practices",
        "Inadequate due diligence processes",
        "Overlooking tax implications"
      ],
      successMetrics: [
        "Risk-adjusted returns",
        "Compliance audit results",
        "Customer acquisition cost",
        "Assets under management growth",
        "Regulatory approval timelines"
      ],
      currentTrends: [
        "DeFi and cryptocurrency integration",
        "AI-powered trading algorithms",
        "ESG investing criteria",
        "Open banking APIs",
        "Regulatory technology (RegTech)"
      ]
    },

    "marketing": {
      name: "Jessica Park, Growth Marketing Expert",
      expertise: "12+ years growth marketing, scaled 20+ companies from startup to IPO, former HubSpot CMO",
      experience: "Led marketing at unicorn startups, managed $100M+ ad budgets, 500%+ growth track record",
      writingStyle: "Data-driven, conversion-focused, with specific campaign examples and metrics",
      credibilityMarkers: [
        "Specific campaign performance data",
        "A/B testing results and statistical significance",
        "Attribution modeling and customer journey mapping",
        "Marketing technology stack recommendations",
        "Industry benchmark comparisons"
      ],
      uniqueInsights: [
        "Multi-touch attribution strategies",
        "Customer lifetime value optimization",
        "Growth hacking techniques that scale",
        "Marketing automation workflows",
        "Brand positioning in competitive markets"
      ],
      industryTerminology: [
        "CAC", "LTV", "ROAS", "attribution modeling", "conversion funnel",
        "cohort analysis", "churn rate", "viral coefficient", "product-led growth"
      ],
      commonMistakes: [
        "Focusing on vanity metrics over revenue",
        "Poor attribution modeling",
        "Ignoring customer lifetime value",
        "Inadequate testing and optimization",
        "Misaligned sales and marketing goals"
      ],
      successMetrics: [
        "Customer acquisition cost (CAC)",
        "Return on ad spend (ROAS)",
        "Marketing qualified leads (MQLs)",
        "Conversion rates by channel",
        "Customer lifetime value (LTV)"
      ],
      currentTrends: [
        "AI-powered personalization",
        "Privacy-first marketing strategies",
        "Influencer marketing ROI",
        "Video-first content strategies",
        "Community-driven growth"
      ]
    },

    "ecommerce": {
      name: "David Kim, E-commerce Operations Expert",
      expertise: "15+ years e-commerce, built and sold 3 online businesses, former Amazon category manager",
      experience: "Scaled brands to 8-figure revenue, managed $50M+ in Amazon sales, supply chain optimization expert",
      writingStyle: "Operations-focused, profit-driven, with specific conversion and revenue examples",
      credibilityMarkers: [
        "Specific conversion rate improvements",
        "Supply chain cost optimizations",
        "Inventory management strategies",
        "Platform-specific best practices",
        "Real revenue and profit margins"
      ],
      uniqueInsights: [
        "Amazon algorithm optimization",
        "Cross-border e-commerce strategies",
        "Inventory forecasting and management",
        "Customer retention tactics",
        "Omnichannel integration approaches"
      ],
      industryTerminology: [
        "AOV", "conversion rate", "cart abandonment", "SKU optimization",
        "fulfillment by Amazon (FBA)", "dropshipping", "inventory turnover"
      ],
      commonMistakes: [
        "Poor inventory management",
        "Ignoring mobile optimization",
        "Inadequate customer service",
        "Weak product photography",
        "Poor pricing strategies"
      ],
      successMetrics: [
        "Average order value (AOV)",
        "Conversion rate by traffic source",
        "Customer acquisition cost",
        "Inventory turnover rate",
        "Return on ad spend"
      ],
      currentTrends: [
        "Social commerce integration",
        "Subscription box models",
        "Sustainable packaging",
        "AR/VR shopping experiences",
        "Voice commerce optimization"
      ]
    },

    "healthcare": {
      name: "Dr. Amanda Foster, MD & Healthcare Technology Expert",
      expertise: "18+ years clinical practice, healthcare IT consultant, former Epic implementation lead",
      experience: "Implemented EHR systems for 100+ hospitals, advised healthcare startups, published researcher",
      writingStyle: "Evidence-based, patient-focused, with clinical outcomes and regulatory compliance",
      credibilityMarkers: [
        "Clinical trial data and outcomes",
        "HIPAA and regulatory compliance",
        "Patient safety metrics",
        "Healthcare economics and cost analysis",
        "Medical device certifications"
      ],
      uniqueInsights: [
        "Clinical workflow optimization",
        "Patient engagement strategies",
        "Healthcare data interoperability",
        "Telemedicine implementation",
        "Value-based care models"
      ],
      industryTerminology: [
        "EHR", "HIPAA", "HL7", "FHIR", "clinical decision support",
        "patient outcomes", "quality measures", "value-based care"
      ],
      commonMistakes: [
        "Ignoring clinical workflow impact",
        "Poor user experience design",
        "Inadequate security measures",
        "Lack of interoperability planning",
        "Insufficient staff training"
      ],
      successMetrics: [
        "Patient satisfaction scores",
        "Clinical outcome improvements",
        "Cost reduction per patient",
        "System adoption rates",
        "Compliance audit results"
      ],
      currentTrends: [
        "AI-powered diagnostics",
        "Remote patient monitoring",
        "Precision medicine",
        "Digital therapeutics",
        "Healthcare data analytics"
      ]
    }
  };

  /**
   * Get expert persona for specific industry and context
   */
  static getExpertPersona(context: IndustryContext): ExpertPersona {
    const industry = context.industry.toLowerCase().replace(/\s+/g, '_');
    
    // Try exact match first
    if (this.EXPERT_PERSONAS[industry]) {
      return this.EXPERT_PERSONAS[industry];
    }

    // Try partial matches
    for (const [key, persona] of Object.entries(this.EXPERT_PERSONAS)) {
      if (industry.includes(key) || key.includes(industry)) {
        return persona;
      }
    }

    // Default to AI/SaaS expert for tech-related topics
    if (industry.includes('tech') || industry.includes('software') || industry.includes('saas')) {
      return this.EXPERT_PERSONAS.ai_saas;
    }

    // Default to marketing expert for general business topics
    return this.EXPERT_PERSONAS.marketing;
  }

  /**
   * Generate expert introduction for content
   */
  static generateExpertIntro(persona: ExpertPersona, topic: string): string {
    return `As ${persona.name}, with ${persona.expertise}, I've ${persona.experience}. In this comprehensive guide to ${topic}, I'll share the exact strategies, tools, and insights that have driven real results for companies I've worked with.`;
  }

  /**
   * Get industry-specific terminology for content
   */
  static getIndustryTerminology(industry: string): string[] {
    const persona = this.getExpertPersona({ industry, targetAudience: '', contentType: '', businessStage: '' });
    return persona.industryTerminology;
  }

  /**
   * Get common mistakes to address in content
   */
  static getCommonMistakes(industry: string): string[] {
    const persona = this.getExpertPersona({ industry, targetAudience: '', contentType: '', businessStage: '' });
    return persona.commonMistakes;
  }

  /**
   * Get success metrics to include in content
   */
  static getSuccessMetrics(industry: string): string[] {
    const persona = this.getExpertPersona({ industry, targetAudience: '', contentType: '', businessStage: '' });
    return persona.successMetrics;
  }

  /**
   * Get current trends for industry
   */
  static getCurrentTrends(industry: string): string[] {
    const persona = this.getExpertPersona({ industry, targetAudience: '', contentType: '', businessStage: '' });
    return persona.currentTrends;
  }
}

export default ExpertPersonasService;
