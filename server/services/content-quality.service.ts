/**
 * Enhanced Content Quality Service
 * Provides comprehensive content quality analysis and improvement
 */

export interface QualityMetrics {
  overall_score: number;
  expert_authority: number;
  actionability: number;
  specificity: number;
  current_relevance: number;
  engagement: number;
  seo_optimization: number;
  content_depth: number;
  technical_accuracy: number;
}

export interface QualityAnalysis {
  metrics: QualityMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  missing_elements: string[];
  improvement_suggestions: string[];
}

export interface ContentRequirements {
  min_examples: number;
  min_statistics: number;
  min_actionable_steps: number;
  required_sections: string[];
  min_word_count: number;
  max_word_count: number;
}

export class ContentQualityService {
  private static readonly QUALITY_THRESHOLD = 80; // Increased from 70
  private static readonly MIN_RETRY_THRESHOLD = 75;

  /**
   * Analyze content quality with enhanced metrics
   */
  static async analyzeContentQuality(
    content: string,
    keywords: string[],
    industry: string,
    targetAudience: string = 'professional'
  ): Promise<QualityAnalysis> {
    const metrics = await this.calculateQualityMetrics(content, keywords, industry);
    const analysis = this.generateQualityAnalysis(content, metrics, keywords, industry);
    
    return analysis;
  }

  /**
   * Calculate enhanced quality metrics
   */
  private static async calculateQualityMetrics(
    content: string,
    keywords: string[],
    industry: string
  ): Promise<QualityMetrics> {
    const cleanText = this.stripHtml(content);
    const wordCount = cleanText.split(/\s+/).length;

    return {
      overall_score: 0, // Will be calculated as average
      expert_authority: this.analyzeExpertAuthority(content, industry),
      actionability: this.analyzeActionability(content),
      specificity: this.analyzeSpecificity(content),
      current_relevance: this.analyzeCurrentRelevance(content),
      engagement: this.analyzeEngagement(content),
      seo_optimization: this.analyzeSEOOptimization(content, keywords),
      content_depth: this.analyzeContentDepth(content, wordCount),
      technical_accuracy: this.analyzeTechnicalAccuracy(content, industry)
    };
  }

  /**
   * Analyze expert authority indicators
   */
  private static analyzeExpertAuthority(content: string, industry: string): number {
    let score = 0;
    const lowerContent = content.toLowerCase();

    // Check for credibility markers
    const credibilityMarkers = [
      'years of experience', 'former', 'led', 'managed', 'founded',
      'expert', 'specialist', 'consultant', 'advisor', 'researcher',
      'published', 'certified', 'award', 'recognized'
    ];

    credibilityMarkers.forEach(marker => {
      if (lowerContent.includes(marker)) score += 5;
    });

    // Check for specific metrics and data
    const dataPatterns = [
      /\d+%/, /\$\d+/, /\d+x/, /\d+\+/, /\d+ years?/,
      /increased by \d+/, /reduced by \d+/, /improved by \d+/
    ];

    dataPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score += matches.length * 3;
    });

    // Check for case studies and examples
    const exampleIndicators = [
      'case study', 'example', 'for instance', 'real-world',
      'in my experience', 'i\'ve seen', 'companies like'
    ];

    exampleIndicators.forEach(indicator => {
      if (lowerContent.includes(indicator)) score += 8;
    });

    return Math.min(100, score);
  }

  /**
   * Analyze actionability of content
   */
  private static analyzeActionability(content: string): number {
    let score = 0;
    const lowerContent = content.toLowerCase();

    // Check for action words and phrases
    const actionWords = [
      'implement', 'start', 'begin', 'create', 'build', 'develop',
      'optimize', 'improve', 'increase', 'reduce', 'follow these steps',
      'here\'s how', 'action plan', 'next steps', 'to do this'
    ];

    actionWords.forEach(word => {
      const count = (lowerContent.match(new RegExp(word, 'g')) || []).length;
      score += count * 3;
    });

    // Check for numbered lists and step-by-step instructions
    const stepPatterns = [
      /step \d+/gi, /\d+\./g, /first,|second,|third,/gi,
      /<ol>/gi, /<li>/gi
    ];

    stepPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score += matches.length * 2;
    });

    // Check for tools and resources mentioned
    const toolIndicators = [
      'tool', 'software', 'platform', 'service', 'app',
      'framework', 'template', 'checklist', 'calculator'
    ];

    toolIndicators.forEach(indicator => {
      if (lowerContent.includes(indicator)) score += 5;
    });

    return Math.min(100, score);
  }

  /**
   * Analyze content specificity
   */
  private static analyzeSpecificity(content: string): number {
    let score = 0;

    // Check for specific numbers and metrics
    const numberPatterns = [
      /\d+%/, /\$\d+/, /\d+x/, /\d+ days?/, /\d+ weeks?/, /\d+ months?/,
      /\d+k/, /\d+m/, /\d+b/, /\d+\.\d+/
    ];

    numberPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score += matches.length * 4;
    });

    // Check for specific company names and brands
    const companyPatterns = [
      /google/gi, /microsoft/gi, /amazon/gi, /apple/gi, /facebook/gi,
      /salesforce/gi, /hubspot/gi, /slack/gi, /zoom/gi, /shopify/gi
    ];

    companyPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score += matches.length * 3;
    });

    // Check for specific terminology and jargon
    const technicalTerms = content.match(/[A-Z]{2,}/g) || [];
    score += technicalTerms.length * 2;

    // Penalize vague language
    const vagueWords = [
      'many', 'some', 'often', 'usually', 'generally', 'typically',
      'most', 'several', 'various', 'numerous'
    ];

    vagueWords.forEach(word => {
      const count = (content.toLowerCase().match(new RegExp(word, 'g')) || []).length;
      score -= count * 2;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyze current relevance
   */
  private static analyzeCurrentRelevance(content: string): number {
    let score = 50; // Base score
    const currentYear = new Date().getFullYear();
    const lowerContent = content.toLowerCase();

    // Check for current year mentions
    if (content.includes(currentYear.toString())) score += 20;
    if (content.includes((currentYear - 1).toString())) score += 10;

    // Check for trend indicators
    const trendWords = [
      'latest', 'current', 'recent', 'new', 'emerging', 'trending',
      'updated', '2024', '2023', 'this year', 'recently'
    ];

    trendWords.forEach(word => {
      if (lowerContent.includes(word)) score += 5;
    });

    // Check for technology trends
    const techTrends = [
      'ai', 'artificial intelligence', 'machine learning', 'gpt',
      'automation', 'cloud', 'saas', 'api', 'mobile-first'
    ];

    techTrends.forEach(trend => {
      if (lowerContent.includes(trend)) score += 3;
    });

    return Math.min(100, score);
  }

  /**
   * Analyze engagement potential
   */
  private static analyzeEngagement(content: string): number {
    let score = 0;
    const lowerContent = content.toLowerCase();

    // Check for questions
    const questionCount = (content.match(/\?/g) || []).length;
    score += Math.min(30, questionCount * 5);

    // Check for personal pronouns
    const personalPronouns = ['you', 'your', 'we', 'our', 'i', 'my'];
    personalPronouns.forEach(pronoun => {
      const count = (lowerContent.match(new RegExp(`\\b${pronoun}\\b`, 'g')) || []).length;
      score += count * 1;
    });

    // Check for emotional language
    const emotionalWords = [
      'amazing', 'incredible', 'powerful', 'essential', 'critical',
      'important', 'valuable', 'effective', 'successful', 'proven'
    ];

    emotionalWords.forEach(word => {
      if (lowerContent.includes(word)) score += 3;
    });

    // Check for calls to action
    const ctaWords = [
      'download', 'subscribe', 'contact', 'learn more', 'get started',
      'try', 'book', 'schedule', 'sign up', 'join'
    ];

    ctaWords.forEach(word => {
      if (lowerContent.includes(word)) score += 5;
    });

    return Math.min(100, score);
  }

  /**
   * Analyze SEO optimization
   */
  private static analyzeSEOOptimization(content: string, keywords: string[]): number {
    if (!keywords.length) return 50;

    let score = 0;
    const lowerContent = content.toLowerCase();
    const primaryKeyword = keywords[0].toLowerCase();

    // Check keyword density
    const keywordCount = (lowerContent.match(new RegExp(primaryKeyword, 'g')) || []).length;
    const wordCount = this.stripHtml(content).split(/\s+/).length;
    const density = (keywordCount / wordCount) * 100;

    if (density >= 0.5 && density <= 2.5) score += 25;
    else if (density > 0 && density < 3) score += 15;

    // Check title optimization
    if (content.match(new RegExp(`<h1[^>]*>.*${primaryKeyword}.*</h1>`, 'i'))) score += 20;

    // Check heading structure
    const h2Count = (content.match(/<h2[^>]*>/g) || []).length;
    const h3Count = (content.match(/<h3[^>]*>/g) || []).length;
    if (h2Count >= 3) score += 15;
    if (h3Count >= 2) score += 10;

    // Check meta description
    if (content.includes('meta_description') || content.includes('description')) score += 10;

    // Check internal/external links
    if (content.includes('<a href')) score += 10;

    // Check image alt text
    if (content.includes('alt=')) score += 10;

    return Math.min(100, score);
  }

  /**
   * Analyze content depth
   */
  private static analyzeContentDepth(content: string, wordCount: number): number {
    let score = 0;

    // Base score from word count
    if (wordCount >= 2000) score += 30;
    else if (wordCount >= 1500) score += 25;
    else if (wordCount >= 1000) score += 20;
    else if (wordCount >= 500) score += 15;
    else score += 10;

    // Check for multiple sections
    const sectionCount = (content.match(/<h[2-6][^>]*>/g) || []).length;
    score += Math.min(25, sectionCount * 3);

    // Check for lists and structured content
    const listCount = (content.match(/<[uo]l>/g) || []).length;
    score += Math.min(15, listCount * 5);

    // Check for tables and data
    const tableCount = (content.match(/<table>/g) || []).length;
    score += Math.min(15, tableCount * 10);

    // Check for code examples
    const codeCount = (content.match(/<code>|<pre>/g) || []).length;
    score += Math.min(15, codeCount * 5);

    return Math.min(100, score);
  }

  /**
   * Analyze technical accuracy
   */
  private static analyzeTechnicalAccuracy(content: string, industry: string): number {
    let score = 70; // Base score assuming accuracy

    // Check for disclaimer or sources
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('source') || lowerContent.includes('according to')) score += 10;
    if (lowerContent.includes('disclaimer') || lowerContent.includes('note:')) score += 5;

    // Check for specific dates and versions
    if (content.match(/v\d+\.\d+/g) || content.match(/version \d+/gi)) score += 10;

    // Check for proper citations
    if (content.includes('[') && content.includes(']')) score += 5;

    return Math.min(100, score);
  }

  /**
   * Generate comprehensive quality analysis
   */
  private static generateQualityAnalysis(
    content: string,
    metrics: QualityMetrics,
    keywords: string[],
    industry: string
  ): QualityAnalysis {
    // Calculate overall score
    const scores = Object.values(metrics).filter(score => score > 0);
    metrics.overall_score = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const missing_elements: string[] = [];

    // Analyze each metric
    if (metrics.expert_authority >= 70) {
      strengths.push("Strong expert authority with credible sources and experience");
    } else {
      weaknesses.push("Lacks expert credibility and authority markers");
      recommendations.push("Add specific credentials, experience, and case studies");
    }

    if (metrics.actionability >= 70) {
      strengths.push("Highly actionable with clear steps and tools");
    } else {
      weaknesses.push("Content lacks actionable advice and implementation steps");
      recommendations.push("Include step-by-step guides, tools, and specific actions");
    }

    if (metrics.specificity >= 70) {
      strengths.push("Specific and detailed with concrete examples");
    } else {
      weaknesses.push("Too generic, lacks specific examples and data");
      recommendations.push("Add specific metrics, company examples, and concrete data");
    }

    if (metrics.current_relevance >= 70) {
      strengths.push("Current and relevant with latest trends");
    } else {
      weaknesses.push("Content feels outdated or lacks current relevance");
      recommendations.push("Include 2024 trends, recent data, and current examples");
    }

    // Check for missing elements
    if (!content.includes('example') && !content.includes('case study')) {
      missing_elements.push("Real-world examples and case studies");
    }

    if (!content.match(/\d+%/) && !content.match(/\$\d+/)) {
      missing_elements.push("Specific statistics and metrics");
    }

    if (!content.includes('<ol>') && !content.includes('step')) {
      missing_elements.push("Step-by-step instructions or numbered lists");
    }

    return {
      metrics,
      strengths,
      weaknesses,
      recommendations,
      missing_elements,
      improvement_suggestions: this.generateImprovementSuggestions(metrics, industry)
    };
  }

  /**
   * Generate specific improvement suggestions
   */
  private static generateImprovementSuggestions(metrics: QualityMetrics, industry: string): string[] {
    const suggestions: string[] = [];

    if (metrics.expert_authority < 70) {
      suggestions.push("Add author bio with specific credentials and experience");
      suggestions.push("Include quotes from industry experts or thought leaders");
      suggestions.push("Reference specific studies, reports, or authoritative sources");
    }

    if (metrics.actionability < 70) {
      suggestions.push("Create numbered action steps or implementation checklist");
      suggestions.push("Recommend specific tools, software, or resources");
      suggestions.push("Add downloadable templates or worksheets");
    }

    if (metrics.specificity < 70) {
      suggestions.push("Replace vague statements with specific metrics and data");
      suggestions.push("Include real company names and case study examples");
      suggestions.push("Add specific timeframes, costs, and ROI figures");
    }

    if (metrics.current_relevance < 70) {
      suggestions.push("Include 2024 trends and recent industry developments");
      suggestions.push("Reference latest tools, technologies, or methodologies");
      suggestions.push("Add current market data and statistics");
    }

    return suggestions;
  }

  /**
   * Check if content meets quality threshold
   */
  static meetsQualityThreshold(analysis: QualityAnalysis): boolean {
    return analysis.metrics.overall_score >= this.QUALITY_THRESHOLD;
  }

  /**
   * Check if content should be retried
   */
  static shouldRetryGeneration(analysis: QualityAnalysis): boolean {
    return analysis.metrics.overall_score < this.MIN_RETRY_THRESHOLD;
  }

  /**
   * Strip HTML tags from content
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Get content requirements for industry
   */
  static getContentRequirements(industry: string, contentType: string): ContentRequirements {
    const baseRequirements: ContentRequirements = {
      min_examples: 3,
      min_statistics: 5,
      min_actionable_steps: 5,
      required_sections: ['introduction', 'main_content', 'examples', 'action_steps', 'conclusion'],
      min_word_count: 1500,
      max_word_count: 4000
    };

    // Adjust based on industry
    if (industry.toLowerCase().includes('tech') || industry.toLowerCase().includes('saas')) {
      baseRequirements.min_examples = 5;
      baseRequirements.min_statistics = 8;
      baseRequirements.required_sections.push('tools_and_resources', 'implementation_guide');
    }

    return baseRequirements;
  }
}

export default ContentQualityService;
