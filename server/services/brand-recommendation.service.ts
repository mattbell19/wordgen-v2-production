import { db } from '../db/index';
import { 
  brandMonitoring, 
  llmMentions, 
  optimizationRecommendations,
  type SelectBrandMonitoring,
  type SelectLlmMention,
  type InsertOptimizationRecommendation,
  type SelectOptimizationRecommendation
} from '../../db/schema';
import { eq, and, desc, gte, lte, sql, avg, count } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { enhancedMentionAnalysisService, type MentionAnalysisResult } from './enhanced-mention-analysis.service';
import { aiQueryGeneratorService } from './ai-query-generator.service';

/**
 * Recommendation category types
 */
export type RecommendationCategory = 
  | 'content_strategy'
  | 'sentiment_improvement'
  | 'competitive_positioning'
  | 'query_optimization'
  | 'authority_building'
  | 'performance_enhancement';

/**
 * Recommendation priority levels
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Individual recommendation item
 */
export interface Recommendation {
  id?: number;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: number; // 1-100
  estimatedEffort: number; // 1-100 (time/resources required)
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  expectedOutcomes: string[];
  metrics: string[]; // How to measure success
  relatedMentions?: number[]; // LLM mention IDs that triggered this recommendation
}

/**
 * Comprehensive brand analysis report
 */
export interface BrandAnalysisReport {
  brandId: number;
  brandName: string;
  analysisDate: Date;
  timeframe: {
    startDate: Date;
    endDate: Date;
  };
  overallScore: number; // 0-100
  performance: {
    totalMentions: number;
    positivePercentage: number;
    neutralPercentage: number;
    negativePercentage: number;
    averageRankingPosition: number | null;
    topPerformingQueries: string[];
    poorPerformingQueries: string[];
  };
  recommendations: Recommendation[];
  competitorAnalysis: {
    mentionedCompetitors: string[];
    competitiveGaps: string[];
    opportunities: string[];
  };
  trendAnalysis: {
    sentimentTrend: 'improving' | 'declining' | 'stable';
    mentionsTrend: 'increasing' | 'decreasing' | 'stable';
    rankingTrend: 'improving' | 'declining' | 'stable';
  };
}

/**
 * Brand Recommendation Service
 * 
 * This service analyzes brand performance across LLM platforms and generates
 * actionable recommendations to improve brand visibility, sentiment, and ranking.
 */
export class BrandRecommendationService {
  
  /**
   * Generate comprehensive analysis report for a brand
   */
  async generateBrandAnalysisReport(
    brandId: number,
    timeframe: { startDate: Date; endDate: Date }
  ): Promise<BrandAnalysisReport> {
    try {
      logger.info(`[BrandRecommendation] Generating analysis report for brand: ${brandId}`);

      // Get brand configuration
      const [brand] = await db
        .select()
        .from(brandMonitoring)
        .where(eq(brandMonitoring.id, brandId));

      if (!brand) {
        throw new Error(`Brand not found: ${brandId}`);
      }

      // Get mentions within timeframe
      const mentions = await db
        .select()
        .from(llmMentions)
        .where(
          and(
            eq(llmMentions.brandId, brandId),
            gte(llmMentions.createdAt, timeframe.startDate),
            lte(llmMentions.createdAt, timeframe.endDate)
          )
        )
        .orderBy(desc(llmMentions.createdAt));

      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(mentions);
      
      // Analyze trends
      const trendAnalysis = await this.analyzeTrends(brandId, timeframe);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(brand, mentions, performance);
      
      // Analyze competitors
      const competitorAnalysis = this.analyzeCompetitors(mentions, brand.competitors || []);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(performance, trendAnalysis);

      const report: BrandAnalysisReport = {
        brandId,
        brandName: brand.brandName,
        analysisDate: new Date(),
        timeframe,
        overallScore,
        performance,
        recommendations,
        competitorAnalysis,
        trendAnalysis
      };

      // Store recommendations in database
      await this.storeRecommendations(brandId, recommendations);

      logger.info(`[BrandRecommendation] Generated ${recommendations.length} recommendations for brand: ${brandId}`);
      return report;

    } catch (error) {
      logger.error('[BrandRecommendation] Failed to generate analysis report:', error);
      throw new Error(`Failed to generate brand analysis report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate performance metrics from mentions
   */
  private calculatePerformanceMetrics(mentions: SelectLlmMention[]) {
    const totalMentions = mentions.length;
    
    if (totalMentions === 0) {
      return {
        totalMentions: 0,
        positivePercentage: 0,
        neutralPercentage: 0,
        negativePercentage: 0,
        averageRankingPosition: null,
        topPerformingQueries: [],
        poorPerformingQueries: []
      };
    }

    // Calculate sentiment distribution
    const sentimentCounts = mentions.reduce((acc, mention) => {
      const sentiment = mention.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positivePercentage = Math.round((sentimentCounts.positive || 0) / totalMentions * 100);
    const neutralPercentage = Math.round((sentimentCounts.neutral || 0) / totalMentions * 100);
    const negativePercentage = Math.round((sentimentCounts.negative || 0) / totalMentions * 100);

    // Calculate average ranking position
    const validPositions = mentions
      .map(m => m.rankingPosition)
      .filter((pos): pos is number => pos !== null);
    
    const averageRankingPosition = validPositions.length > 0
      ? Math.round(validPositions.reduce((sum, pos) => sum + pos, 0) / validPositions.length)
      : null;

    // Identify top and poor performing queries
    const queryPerformance = mentions.reduce((acc, mention) => {
      const query = mention.query;
      if (!acc[query]) {
        acc[query] = { mentions: 0, positiveCount: 0, totalRanking: 0, validRankings: 0 };
      }
      acc[query].mentions++;
      if (mention.sentiment === 'positive') acc[query].positiveCount++;
      if (mention.rankingPosition) {
        acc[query].totalRanking += mention.rankingPosition;
        acc[query].validRankings++;
      }
      return acc;
    }, {} as Record<string, any>);

    const queryScores = Object.entries(queryPerformance).map(([query, data]) => ({
      query,
      score: this.calculateQueryScore(data),
      ...data
    }));

    queryScores.sort((a, b) => b.score - a.score);

    const topPerformingQueries = queryScores.slice(0, 5).map(q => q.query);
    const poorPerformingQueries = queryScores.slice(-5).map(q => q.query);

    return {
      totalMentions,
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      averageRankingPosition,
      topPerformingQueries,
      poorPerformingQueries
    };
  }

  /**
   * Calculate query performance score
   */
  private calculateQueryScore(data: any): number {
    const sentimentScore = data.mentions > 0 ? (data.positiveCount / data.mentions) * 50 : 0;
    const rankingScore = data.validRankings > 0 
      ? Math.max(0, 50 - (data.totalRanking / data.validRankings)) 
      : 25;
    
    return Math.round(sentimentScore + rankingScore);
  }

  /**
   * Analyze trends over time
   */
  private async analyzeTrends(
    brandId: number, 
    timeframe: { startDate: Date; endDate: Date }
  ) {
    try {
      // Calculate midpoint for trend comparison
      const midpoint = new Date(
        timeframe.startDate.getTime() + 
        (timeframe.endDate.getTime() - timeframe.startDate.getTime()) / 2
      );

      // Get first half mentions
      const firstHalf = await db
        .select()
        .from(llmMentions)
        .where(
          and(
            eq(llmMentions.brandId, brandId),
            gte(llmMentions.createdAt, timeframe.startDate),
            lte(llmMentions.createdAt, midpoint)
          )
        );

      // Get second half mentions
      const secondHalf = await db
        .select()
        .from(llmMentions)
        .where(
          and(
            eq(llmMentions.brandId, brandId),
            gte(llmMentions.createdAt, midpoint),
            lte(llmMentions.createdAt, timeframe.endDate)
          )
        );

      // Analyze trends
      const sentimentTrend = this.calculateSentimentTrend(firstHalf, secondHalf);
      const mentionsTrend = this.calculateMentionsTrend(firstHalf, secondHalf);
      const rankingTrend = this.calculateRankingTrend(firstHalf, secondHalf);

      return {
        sentimentTrend,
        mentionsTrend,
        rankingTrend
      };

    } catch (error) {
      logger.warn('[BrandRecommendation] Failed to analyze trends:', error);
      return {
        sentimentTrend: 'stable' as const,
        mentionsTrend: 'stable' as const,
        rankingTrend: 'stable' as const
      };
    }
  }

  /**
   * Calculate sentiment trend
   */
  private calculateSentimentTrend(
    firstHalf: SelectLlmMention[], 
    secondHalf: SelectLlmMention[]
  ): 'improving' | 'declining' | 'stable' {
    const firstPositive = firstHalf.filter(m => m.sentiment === 'positive').length;
    const firstTotal = firstHalf.length;
    const secondPositive = secondHalf.filter(m => m.sentiment === 'positive').length;
    const secondTotal = secondHalf.length;

    if (firstTotal === 0 || secondTotal === 0) return 'stable';

    const firstRatio = firstPositive / firstTotal;
    const secondRatio = secondPositive / secondTotal;
    const change = secondRatio - firstRatio;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Calculate mentions trend
   */
  private calculateMentionsTrend(
    firstHalf: SelectLlmMention[], 
    secondHalf: SelectLlmMention[]
  ): 'increasing' | 'decreasing' | 'stable' {
    const change = (secondHalf.length - firstHalf.length) / Math.max(firstHalf.length, 1);
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate ranking trend
   */
  private calculateRankingTrend(
    firstHalf: SelectLlmMention[], 
    secondHalf: SelectLlmMention[]
  ): 'improving' | 'declining' | 'stable' {
    const firstPositions = firstHalf
      .map(m => m.rankingPosition)
      .filter((pos): pos is number => pos !== null);
    const secondPositions = secondHalf
      .map(m => m.rankingPosition)
      .filter((pos): pos is number => pos !== null);

    if (firstPositions.length === 0 || secondPositions.length === 0) return 'stable';

    const firstAvg = firstPositions.reduce((sum, pos) => sum + pos, 0) / firstPositions.length;
    const secondAvg = secondPositions.reduce((sum, pos) => sum + pos, 0) / secondPositions.length;
    
    const change = (firstAvg - secondAvg) / firstAvg; // Lower ranking position is better
    
    if (change > 0.15) return 'improving'; // Ranking improved (lower numbers)
    if (change < -0.15) return 'declining'; // Ranking declined (higher numbers)
    return 'stable';
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    brand: SelectBrandMonitoring,
    mentions: SelectLlmMention[],
    performance: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Content Strategy Recommendations
    if (performance.totalMentions < 10) {
      recommendations.push({
        category: 'content_strategy',
        priority: 'high',
        title: 'Increase Content Production',
        description: 'Your brand has limited visibility in AI responses. Increase content production to improve mention frequency.',
        actionItems: [
          'Create 10+ high-quality blog posts targeting your key topics',
          'Develop comprehensive guides and tutorials',
          'Publish case studies and success stories',
          'Create FAQ content addressing common customer questions'
        ],
        estimatedImpact: 75,
        estimatedEffort: 60,
        timeframe: 'medium_term',
        expectedOutcomes: [
          'Increased brand mentions in AI responses',
          'Better topic authority recognition',
          'Higher ranking positions'
        ],
        metrics: ['Mention frequency', 'Content visibility', 'Topic coverage'],
        relatedMentions: []
      });
    }

    // Sentiment Improvement Recommendations
    if (performance.negativePercentage > 30) {
      recommendations.push({
        category: 'sentiment_improvement',
        priority: 'critical',
        title: 'Address Negative Sentiment',
        description: `${performance.negativePercentage}% of mentions have negative sentiment. Immediate action required.`,
        actionItems: [
          'Identify root causes of negative feedback',
          'Improve customer support and response times',
          'Address product/service issues mentioned in negative feedback',
          'Create positive content highlighting strengths and improvements'
        ],
        estimatedImpact: 85,
        estimatedEffort: 70,
        timeframe: 'immediate',
        expectedOutcomes: [
          'Reduced negative sentiment percentage',
          'Improved customer perception',
          'Better overall brand score'
        ],
        metrics: ['Sentiment ratio', 'Customer satisfaction', 'Support metrics'],
        relatedMentions: mentions
          .filter(m => m.sentiment === 'negative')
          .map(m => m.id)
          .slice(0, 10)
      });
    }

    // Competitive Positioning Recommendations
    const competitorMentions = mentions.filter(m => 
      brand.competitors?.some(comp => 
        m.response.toLowerCase().includes(comp.toLowerCase())
      )
    );

    if (competitorMentions.length > mentions.length * 0.5) {
      recommendations.push({
        category: 'competitive_positioning',
        priority: 'high',
        title: 'Strengthen Competitive Positioning',
        description: 'You\'re frequently mentioned alongside competitors. Differentiate your unique value proposition.',
        actionItems: [
          'Create comparison content highlighting unique advantages',
          'Develop thought leadership content in your specialty areas',
          'Showcase customer success stories and testimonials',
          'Highlight awards, certifications, and recognitions'
        ],
        estimatedImpact: 70,
        estimatedEffort: 50,
        timeframe: 'short_term',
        expectedOutcomes: [
          'Improved positioning vs competitors',
          'Higher ranking when compared',
          'Clearer value proposition recognition'
        ],
        metrics: ['Competitive mentions ratio', 'Unique value recognition', 'Ranking in comparisons'],
        relatedMentions: competitorMentions.map(m => m.id).slice(0, 10)
      });
    }

    // Ranking Improvement Recommendations
    if (performance.averageRankingPosition && performance.averageRankingPosition > 3) {
      recommendations.push({
        category: 'performance_enhancement',
        priority: 'high',
        title: 'Improve Ranking Position',
        description: `Average ranking position is ${performance.averageRankingPosition}. Aim for top 3 positions.`,
        actionItems: [
          'Optimize content for key industry terms',
          'Build more authoritative backlinks',
          'Create comprehensive resource pages',
          'Improve content quality and depth'
        ],
        estimatedImpact: 65,
        estimatedEffort: 55,
        timeframe: 'medium_term',
        expectedOutcomes: [
          'Higher ranking positions in AI responses',
          'Increased brand authority',
          'Better visibility for key queries'
        ],
        metrics: ['Average ranking position', 'Top 3 mention percentage', 'Query performance'],
        relatedMentions: mentions
          .filter(m => m.rankingPosition && m.rankingPosition > 3)
          .map(m => m.id)
          .slice(0, 10)
      });
    }

    // Authority Building Recommendations
    if (performance.positivePercentage < 40) {
      recommendations.push({
        category: 'authority_building',
        priority: 'medium',
        title: 'Build Industry Authority',
        description: 'Strengthen your position as an industry leader to improve sentiment and mentions.',
        actionItems: [
          'Publish research reports and industry insights',
          'Speak at industry conferences and events',
          'Collaborate with industry influencers',
          'Create educational content and webinars'
        ],
        estimatedImpact: 60,
        estimatedEffort: 65,
        timeframe: 'long_term',
        expectedOutcomes: [
          'Increased positive sentiment',
          'Recognition as industry authority',
          'More mentions in expertise-related queries'
        ],
        metrics: ['Industry authority score', 'Expert mention frequency', 'Thought leadership metrics'],
        relatedMentions: []
      });
    }

    // Query Optimization Recommendations
    if (performance.poorPerformingQueries.length > 0) {
      recommendations.push({
        category: 'query_optimization',
        priority: 'medium',
        title: 'Optimize Poor-Performing Queries',
        description: 'Several queries show poor performance. Target these with specific content.',
        actionItems: [
          'Create targeted content for poor-performing queries',
          'Optimize existing content for these query patterns',
          'Build FAQ sections addressing these topics',
          'Create video content explaining these concepts'
        ],
        estimatedImpact: 55,
        estimatedEffort: 40,
        timeframe: 'short_term',
        expectedOutcomes: [
          'Improved performance for targeted queries',
          'Better query coverage',
          'Increased mention relevance'
        ],
        metrics: ['Query performance scores', 'Content relevance', 'Topic coverage'],
        relatedMentions: mentions
          .filter(m => performance.poorPerformingQueries.includes(m.query))
          .map(m => m.id)
          .slice(0, 10)
      });
    }

    // Sort recommendations by priority and impact
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedImpact - a.estimatedImpact;
    });

    return recommendations;
  }

  /**
   * Analyze competitor performance
   */
  private analyzeCompetitors(mentions: SelectLlmMention[], competitors: string[]) {
    const mentionedCompetitors: string[] = [];
    const competitiveGaps: string[] = [];
    const opportunities: string[] = [];

    // Find which competitors are mentioned
    competitors.forEach(competitor => {
      const competitorMentions = mentions.filter(m => 
        m.response.toLowerCase().includes(competitor.toLowerCase())
      );
      
      if (competitorMentions.length > 0) {
        mentionedCompetitors.push(competitor);
      }
    });

    // Identify gaps and opportunities
    const comparisonMentions = mentions.filter(m => 
      m.mentionType === 'competitor_comparison'
    );

    if (comparisonMentions.length > 0) {
      // Basic analysis of comparison content
      comparisonMentions.forEach(mention => {
        if (mention.sentiment === 'negative') {
          competitiveGaps.push(`Improve positioning vs competitors in: ${mention.query}`);
        } else if (mention.sentiment === 'positive') {
          opportunities.push(`Leverage strength in: ${mention.query}`);
        }
      });
    }

    // Add generic recommendations if no specific gaps found
    if (competitiveGaps.length === 0 && mentionedCompetitors.length > 0) {
      competitiveGaps.push('Create more comparison content highlighting unique advantages');
    }

    if (opportunities.length === 0 && mentionedCompetitors.length > 0) {
      opportunities.push('Leverage positive comparisons in marketing materials');
    }

    return {
      mentionedCompetitors,
      competitiveGaps: competitiveGaps.slice(0, 5),
      opportunities: opportunities.slice(0, 5)
    };
  }

  /**
   * Calculate overall brand score
   */
  private calculateOverallScore(performance: any, trendAnalysis: any): number {
    let score = 50; // Base score

    // Performance factors (40% weight)
    if (performance.totalMentions > 0) {
      score += (performance.positivePercentage - performance.negativePercentage) * 0.3;
      
      if (performance.averageRankingPosition) {
        const rankingScore = Math.max(0, 100 - performance.averageRankingPosition * 20);
        score += rankingScore * 0.1;
      }
    }

    // Trend factors (30% weight)
    if (trendAnalysis.sentimentTrend === 'improving') score += 10;
    if (trendAnalysis.sentimentTrend === 'declining') score -= 10;
    
    if (trendAnalysis.mentionsTrend === 'increasing') score += 10;
    if (trendAnalysis.mentionsTrend === 'decreasing') score -= 5;
    
    if (trendAnalysis.rankingTrend === 'improving') score += 10;
    if (trendAnalysis.rankingTrend === 'declining') score -= 10;

    // Volume factor (30% weight)
    const volumeScore = Math.min(30, performance.totalMentions * 2);
    score += volumeScore;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(brandId: number, recommendations: Recommendation[]): Promise<void> {
    try {
      for (const rec of recommendations) {
        const recommendationData: Omit<InsertOptimizationRecommendation, 'id' | 'createdAt' | 'updatedAt'> = {
          brandId,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          actionItems: rec.actionItems,
          estimatedImpact: rec.estimatedImpact,
          estimatedEffort: rec.estimatedEffort,
          timeframe: rec.timeframe,
          expectedOutcomes: rec.expectedOutcomes,
          status: 'pending',
          progress: 0
        };

        await db.insert(optimizationRecommendations).values(recommendationData);
      }
    } catch (error) {
      logger.warn('[BrandRecommendation] Failed to store recommendations:', error);
    }
  }

  /**
   * Get stored recommendations for a brand
   */
  async getBrandRecommendations(
    brandId: number,
    filters: {
      category?: RecommendationCategory;
      priority?: RecommendationPriority;
      status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
      limit?: number;
    } = {}
  ): Promise<SelectOptimizationRecommendation[]> {
    try {
      let conditions = eq(optimizationRecommendations.brandId, brandId);

      if (filters.category) {
        conditions = and(conditions, eq(optimizationRecommendations.category, filters.category));
      }

      if (filters.priority) {
        conditions = and(conditions, eq(optimizationRecommendations.priority, filters.priority));
      }

      if (filters.status) {
        conditions = and(conditions, eq(optimizationRecommendations.status, filters.status));
      }

      let query = db
        .select()
        .from(optimizationRecommendations)
        .where(conditions)
        .orderBy(desc(optimizationRecommendations.createdAt));

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      return await query;

    } catch (error) {
      logger.error('[BrandRecommendation] Failed to get recommendations:', error);
      throw new Error('Failed to get brand recommendations');
    }
  }

  /**
   * Update recommendation status and progress
   */
  async updateRecommendationStatus(
    recommendationId: number,
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed',
    progress: number = 0
  ): Promise<void> {
    try {
      await db
        .update(optimizationRecommendations)
        .set({ 
          status, 
          progress: Math.max(0, Math.min(100, progress)),
          updatedAt: new Date()
        })
        .where(eq(optimizationRecommendations.id, recommendationId));

      logger.info(`[BrandRecommendation] Updated recommendation ${recommendationId} status to ${status}`);

    } catch (error) {
      logger.error('[BrandRecommendation] Failed to update recommendation status:', error);
      throw new Error('Failed to update recommendation status');
    }
  }

  /**
   * Generate query suggestions for improving brand visibility
   */
  async generateQuerySuggestions(brandId: number, count: number = 10): Promise<string[]> {
    try {
      // Get recent poor-performing or missing coverage areas
      const recentMentions = await db
        .select()
        .from(llmMentions)
        .where(
          and(
            eq(llmMentions.brandId, brandId),
            gte(llmMentions.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          )
        );

      // Use AI Query Generator to create new suggestions
      const suggestions = await aiQueryGeneratorService.generateQueriesForBrand(brandId, count);
      
      return suggestions.queries.map(q => q.text);

    } catch (error) {
      logger.error('[BrandRecommendation] Failed to generate query suggestions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const brandRecommendationService = new BrandRecommendationService();