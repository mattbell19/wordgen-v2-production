import { db } from '../db/index.js';
import { 
  brandMonitoring,
  llmMentions,
  optimizationRecommendations,
  competitorMentions,
  type InsertOptimizationRecommendation,
  type SelectOptimizationRecommendation,
  type SelectBrandMonitoring,
  type SelectLlmMention
} from '../../db/schema.js';
import { eq, and, desc, gte, count, avg } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { BrandAnalysisService } from './brand-analysis.service.js';

export interface OptimizationStrategy {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'positioning' | 'sentiment' | 'visibility' | 'competitive';
  priority: 'high' | 'medium' | 'low';
  impactEstimate: 'high' | 'medium' | 'low';
  effortEstimate: 'high' | 'medium' | 'low';
  actionItems: string[];
  expectedOutcomes: string[];
  metrics: string[];
  timeframe: string;
}

export interface ContentGap {
  topic: string;
  competitorAdvantage: number;
  recommendedAction: string;
  priority: 'high' | 'medium' | 'low';
  keywords: string[];
}

export interface OptimizationReport {
  brandId: number;
  brandName: string;
  overallScore: number;
  recommendations: OptimizationStrategy[];
  contentGaps: ContentGap[];
  quickWins: string[];
  longTermGoals: string[];
  nextActions: string[];
  generatedAt: Date;
}

export class OptimizationEngine {
  private brandAnalysisService: BrandAnalysisService;

  constructor() {
    this.brandAnalysisService = new BrandAnalysisService();
  }

  /**
   * Generate comprehensive optimization recommendations for a brand
   */
  async generateOptimizationReport(brandId: number): Promise<OptimizationReport> {
    try {
      logger.info(`Generating optimization report for brand ${brandId}`);

      // Get brand data
      const brand = await this.getBrandById(brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }

      // Get analytics data for the last 30 days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [analytics, healthScore] = await Promise.all([
        this.brandAnalysisService.getBrandAnalytics(brandId, { startDate, endDate }),
        this.brandAnalysisService.calculateBrandHealthScore(brandId)
      ]);

      // Generate different types of recommendations
      const [
        contentRecommendations,
        positioningRecommendations,
        sentimentRecommendations,
        visibilityRecommendations,
        competitiveRecommendations
      ] = await Promise.all([
        this.generateContentRecommendations(brand, analytics),
        this.generatePositioningRecommendations(brand, analytics),
        this.generateSentimentRecommendations(brand, analytics),
        this.generateVisibilityRecommendations(brand, analytics),
        this.generateCompetitiveRecommendations(brand, analytics)
      ]);

      const allRecommendations = [
        ...contentRecommendations,
        ...positioningRecommendations,
        ...sentimentRecommendations,
        ...visibilityRecommendations,
        ...competitiveRecommendations
      ];

      // Generate content gaps analysis
      const contentGaps = await this.analyzeContentGaps(brand, analytics);

      // Categorize recommendations
      const quickWins = this.identifyQuickWins(allRecommendations);
      const longTermGoals = this.identifyLongTermGoals(allRecommendations);
      const nextActions = this.prioritizeNextActions(allRecommendations);

      // Store recommendations in database
      await this.storeRecommendations(brandId, allRecommendations);

      return {
        brandId,
        brandName: brand.brandName,
        overallScore: healthScore.overallScore,
        recommendations: allRecommendations,
        contentGaps,
        quickWins,
        longTermGoals,
        nextActions,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to generate optimization report:', error);
      throw new Error('Failed to generate optimization report');
    }
  }

  /**
   * Generate content-focused recommendations
   */
  private async generateContentRecommendations(
    brand: SelectBrandMonitoring,
    analytics: any
  ): Promise<OptimizationStrategy[]> {
    const recommendations: OptimizationStrategy[] = [];

    // Low mention volume
    if (analytics.totalMentions < 5) {
      recommendations.push({
        id: 'content-volume-boost',
        title: 'Increase Content Volume and Authority',
        description: 'Your brand has low mention frequency in LLM responses. Create more authoritative content to improve visibility.',
        category: 'content',
        priority: 'high',
        impactEstimate: 'high',
        effortEstimate: 'medium',
        actionItems: [
          'Publish 2-3 high-quality blog posts per week',
          'Create comprehensive guides and whitepapers',
          'Develop case studies showcasing your expertise',
          'Guest post on authoritative industry websites',
          'Optimize existing content for entity recognition'
        ],
        expectedOutcomes: [
          'Increased brand mentions in LLM responses',
          'Higher ranking positions',
          'Better brand authority recognition'
        ],
        metrics: ['Total mentions', 'Average ranking position', 'Content indexed'],
        timeframe: '3-6 months'
      });
    }

    // Poor content diversity
    if (analytics.topQueries.length < 3) {
      recommendations.push({
        id: 'content-diversification',
        title: 'Diversify Content Topics',
        description: 'Expand content coverage to appear in more diverse query types and contexts.',
        category: 'content',
        priority: 'medium',
        impactEstimate: 'medium',
        effortEstimate: 'low',
        actionItems: [
          'Research related keywords and topics in your industry',
          'Create content around different use cases',
          'Address various customer pain points',
          'Develop educational content series',
          'Create comparison and alternative content'
        ],
        expectedOutcomes: [
          'Mentions across more query types',
          'Broader topic association',
          'Increased total mention volume'
        ],
        metrics: ['Query diversity', 'Topic coverage', 'Content reach'],
        timeframe: '2-4 months'
      });
    }

    return recommendations;
  }

  /**
   * Generate positioning-focused recommendations
   */
  private async generatePositioningRecommendations(
    brand: SelectBrandMonitoring,
    analytics: any
  ): Promise<OptimizationStrategy[]> {
    const recommendations: OptimizationStrategy[] = [];

    // Poor ranking position
    if (analytics.avgRankingPosition && analytics.avgRankingPosition > 3) {
      recommendations.push({
        id: 'improve-ranking-position',
        title: 'Improve Ranking Position in LLM Responses',
        description: 'Your brand typically appears later in LLM responses. Enhance content authority and relevance.',
        category: 'positioning',
        priority: 'high',
        impactEstimate: 'high',
        effortEstimate: 'high',
        actionItems: [
          'Create more comprehensive and authoritative content',
          'Increase content depth and expertise signals',
          'Build more high-quality backlinks',
          'Optimize for featured snippets and knowledge panels',
          'Strengthen entity associations in content'
        ],
        expectedOutcomes: [
          'Higher ranking positions in LLM responses',
          'First or second position mentions',
          'Increased click-through rates'
        ],
        metrics: ['Average ranking position', 'Top 3 position mentions', 'Authority score'],
        timeframe: '4-8 months'
      });
    }

    return recommendations;
  }

  /**
   * Generate sentiment-focused recommendations
   */
  private async generateSentimentRecommendations(
    brand: SelectBrandMonitoring,
    analytics: any
  ): Promise<OptimizationStrategy[]> {
    const recommendations: OptimizationStrategy[] = [];

    const totalMentions = analytics.sentimentBreakdown.positive + 
                         analytics.sentimentBreakdown.neutral + 
                         analytics.sentimentBreakdown.negative;

    const negativeRatio = totalMentions > 0 ? analytics.sentimentBreakdown.negative / totalMentions : 0;

    // High negative sentiment
    if (negativeRatio > 0.3) {
      recommendations.push({
        id: 'improve-sentiment',
        title: 'Address Negative Sentiment Issues',
        description: 'Your brand has a high proportion of negative mentions. Focus on reputation management and positive content.',
        category: 'sentiment',
        priority: 'high',
        impactEstimate: 'high',
        effortEstimate: 'medium',
        actionItems: [
          'Identify and address specific negative feedback points',
          'Create positive case studies and testimonials',
          'Engage in proactive customer support',
          'Publish thought leadership content',
          'Monitor and respond to negative reviews'
        ],
        expectedOutcomes: [
          'Reduced negative sentiment ratio',
          'Increased positive mentions',
          'Better brand perception'
        ],
        metrics: ['Sentiment ratio', 'Positive mention growth', 'Brand sentiment score'],
        timeframe: '3-6 months'
      });
    }

    // Low positive sentiment
    const positiveRatio = totalMentions > 0 ? analytics.sentimentBreakdown.positive / totalMentions : 0;
    if (positiveRatio < 0.4 && negativeRatio < 0.2) {
      recommendations.push({
        id: 'boost-positive-sentiment',
        title: 'Amplify Positive Brand Associations',
        description: 'Increase positive sentiment by highlighting successes and customer value.',
        category: 'sentiment',
        priority: 'medium',
        impactEstimate: 'medium',
        effortEstimate: 'low',
        actionItems: [
          'Showcase customer success stories',
          'Highlight awards and achievements',
          'Create value-driven content',
          'Develop community engagement initiatives',
          'Share positive customer feedback'
        ],
        expectedOutcomes: [
          'Increased positive sentiment ratio',
          'Better brand association',
          'Higher customer advocacy'
        ],
        metrics: ['Positive sentiment growth', 'Customer satisfaction', 'Brand advocacy'],
        timeframe: '2-4 months'
      });
    }

    return recommendations;
  }

  /**
   * Generate visibility-focused recommendations
   */
  private async generateVisibilityRecommendations(
    brand: SelectBrandMonitoring,
    analytics: any
  ): Promise<OptimizationStrategy[]> {
    const recommendations: OptimizationStrategy[] = [];

    // Platform distribution analysis
    const platforms = Object.keys(analytics.platformBreakdown);
    if (platforms.length < 2) {
      recommendations.push({
        id: 'expand-platform-presence',
        title: 'Expand Multi-Platform Presence',
        description: 'Your brand appears on limited LLM platforms. Diversify content strategy for broader visibility.',
        category: 'visibility',
        priority: 'medium',
        impactEstimate: 'medium',
        effortEstimate: 'medium',
        actionItems: [
          'Research content preferences for different LLM platforms',
          'Optimize content for various AI training sources',
          'Increase presence on academic and professional platforms',
          'Develop platform-specific content strategies',
          'Monitor emerging LLM platforms'
        ],
        expectedOutcomes: [
          'Mentions across multiple LLM platforms',
          'Reduced platform dependency',
          'Broader audience reach'
        ],
        metrics: ['Platform coverage', 'Cross-platform mentions', 'Visibility score'],
        timeframe: '3-5 months'
      });
    }

    return recommendations;
  }

  /**
   * Generate competitive-focused recommendations
   */
  private async generateCompetitiveRecommendations(
    brand: SelectBrandMonitoring,
    analytics: any
  ): Promise<OptimizationStrategy[]> {
    const recommendations: OptimizationStrategy[] = [];

    // Competitor analysis
    const topCompetitor = analytics.competitorComparison[0];
    if (topCompetitor && topCompetitor.mentionCount > analytics.totalMentions) {
      recommendations.push({
        id: 'competitive-gap-analysis',
        title: 'Close Competitive Gap',
        description: `${topCompetitor.competitorName} significantly outperforms your brand in LLM mentions. Analyze and adapt their strategy.`,
        category: 'competitive',
        priority: 'high',
        impactEstimate: 'high',
        effortEstimate: 'high',
        actionItems: [
          `Analyze ${topCompetitor.competitorName}'s content strategy`,
          'Identify content gaps and opportunities',
          'Develop competitive content alternatives',
          'Focus on underserved market segments',
          'Strengthen unique value proposition messaging'
        ],
        expectedOutcomes: [
          'Reduced competitive gap',
          'Increased market share',
          'Better competitive positioning'
        ],
        metrics: ['Competitive mention ratio', 'Market share growth', 'Position vs competitors'],
        timeframe: '6-12 months'
      });
    }

    return recommendations;
  }

  /**
   * Analyze content gaps compared to competitors
   */
  private async analyzeContentGaps(
    brand: SelectBrandMonitoring,
    analytics: any
  ): Promise<ContentGap[]> {
    const contentGaps: ContentGap[] = [];

    // Analyze competitor topics and identify gaps
    for (const competitor of analytics.competitorComparison) {
      if (competitor.mentionCount > analytics.totalMentions) {
        contentGaps.push({
          topic: `${competitor.competitorName} advantage areas`,
          competitorAdvantage: competitor.mentionCount - analytics.totalMentions,
          recommendedAction: `Research and create content in areas where ${competitor.competitorName} excels`,
          priority: competitor.mentionCount > analytics.totalMentions * 2 ? 'high' : 'medium',
          keywords: [] // Would be populated with actual keyword analysis
        });
      }
    }

    return contentGaps;
  }

  /**
   * Identify quick wins from recommendations
   */
  private identifyQuickWins(recommendations: OptimizationStrategy[]): string[] {
    return recommendations
      .filter(r => r.effortEstimate === 'low' && r.impactEstimate !== 'low')
      .map(r => r.title)
      .slice(0, 3);
  }

  /**
   * Identify long-term goals from recommendations
   */
  private identifyLongTermGoals(recommendations: OptimizationStrategy[]): string[] {
    return recommendations
      .filter(r => r.effortEstimate === 'high' && r.impactEstimate === 'high')
      .map(r => r.title);
  }

  /**
   * Prioritize next actions
   */
  private prioritizeNextActions(recommendations: OptimizationStrategy[]): string[] {
    const prioritized = recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5)
      .map(r => r.actionItems[0]); // Take first action item from top 5 recommendations

    return prioritized;
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(
    brandId: number,
    recommendations: OptimizationStrategy[]
  ): Promise<void> {
    try {
      // Clear existing recommendations
      await db
        .delete(optimizationRecommendations)
        .where(eq(optimizationRecommendations.brandId, brandId));

      // Insert new recommendations
      const recommendationData = recommendations.map(rec => ({
        brandId,
        recommendationType: rec.category,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        status: 'pending' as const,
        impactEstimate: rec.impactEstimate,
        effortEstimate: rec.effortEstimate,
        data: {
          actionItems: rec.actionItems,
          expectedOutcomes: rec.expectedOutcomes,
          metrics: rec.metrics,
          timeframe: rec.timeframe
        }
      }));

      await db.insert(optimizationRecommendations).values(recommendationData);
    } catch (error) {
      logger.error('Failed to store recommendations:', error);
      throw error;
    }
  }

  /**
   * Get stored recommendations for a brand
   */
  async getStoredRecommendations(brandId: number): Promise<SelectOptimizationRecommendation[]> {
    try {
      return await db
        .select()
        .from(optimizationRecommendations)
        .where(eq(optimizationRecommendations.brandId, brandId))
        .orderBy(desc(optimizationRecommendations.createdAt));
    } catch (error) {
      logger.error('Failed to get stored recommendations:', error);
      throw new Error('Failed to get stored recommendations');
    }
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(
    recommendationId: number,
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  ): Promise<SelectOptimizationRecommendation> {
    try {
      const [result] = await db
        .update(optimizationRecommendations)
        .set({ status, updatedAt: new Date() })
        .where(eq(optimizationRecommendations.id, recommendationId))
        .returning();

      if (!result) {
        throw new Error('Recommendation not found');
      }

      return result;
    } catch (error) {
      logger.error('Failed to update recommendation status:', error);
      throw new Error('Failed to update recommendation status');
    }
  }

  /**
   * Generate ROI projections for recommendations
   */
  async generateROIProjections(brandId: number): Promise<Record<string, any>> {
    try {
      const recommendations = await this.getStoredRecommendations(brandId);
      const currentAnalytics = await this.brandAnalysisService.getBrandAnalytics(
        brandId,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      );

      const projections = {
        currentBaseline: {
          totalMentions: currentAnalytics.totalMentions,
          avgRankingPosition: currentAnalytics.avgRankingPosition,
          positiveSentiment: currentAnalytics.sentimentBreakdown.positive
        },
        projectedImpact: {
          mentionIncrease: 0,
          rankingImprovement: 0,
          sentimentImprovement: 0
        },
        implementationTimeline: {
          quickWins: '1-2 months',
          mediumTerm: '3-6 months',
          longTerm: '6-12 months'
        }
      };

      // Calculate projected improvements based on recommendation types
      recommendations.forEach(rec => {
        const impactMultiplier = rec.impactEstimate === 'high' ? 0.3 : 
                                rec.impactEstimate === 'medium' ? 0.2 : 0.1;

        if (rec.recommendationType === 'content' || rec.recommendationType === 'visibility') {
          projections.projectedImpact.mentionIncrease += impactMultiplier;
        }
        if (rec.recommendationType === 'positioning') {
          projections.projectedImpact.rankingImprovement += impactMultiplier;
        }
        if (rec.recommendationType === 'sentiment') {
          projections.projectedImpact.sentimentImprovement += impactMultiplier;
        }
      });

      return projections;
    } catch (error) {
      logger.error('Failed to generate ROI projections:', error);
      throw new Error('Failed to generate ROI projections');
    }
  }

  /**
   * Helper method to get brand by ID
   */
  private async getBrandById(brandId: number): Promise<SelectBrandMonitoring | null> {
    try {
      const result = await db
        .select()
        .from(brandMonitoring)
        .where(eq(brandMonitoring.id, brandId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get brand by ID:', error);
      throw error;
    }
  }
}