import { db } from '../db/index.js';
import { 
  brandMonitoring,
  llmMentions, 
  competitorMentions,
  llmAnalyticsDaily,
  type SelectLlmMention,
  type SelectCompetitorMention,
  type InsertLlmAnalyticsDaily,
  type SelectLlmAnalyticsDaily
} from '../../db/schema.js';
import { eq, and, desc, gte, lte, sql, count, avg } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

export interface BrandAnalyticsData {
  totalMentions: number;
  mentionTrend: 'up' | 'down' | 'stable';
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  platformBreakdown: Record<string, number>;
  avgRankingPosition: number | null;
  competitorComparison: CompetitorAnalysis[];
  topQueries: QueryPerformance[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface CompetitorAnalysis {
  competitorName: string;
  mentionCount: number;
  avgRankingPosition: number | null;
  sentimentScore: number;
  marketShare: number;
}

export interface QueryPerformance {
  query: string;
  mentionCount: number;
  avgRankingPosition: number | null;
  lastMentioned: Date;
  sentimentScore: number;
}

export interface TimeSeriesPoint {
  date: string;
  mentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  avgRankingPosition: number | null;
}

export interface BrandHealthScore {
  overallScore: number;
  visibility: number;
  sentiment: number;
  positioning: number;
  competitiveAdvantage: number;
  factors: HealthFactor[];
}

export interface HealthFactor {
  name: string;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface MentionInsight {
  type: 'opportunity' | 'threat' | 'trend' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, any>;
  createdAt: Date;
}

export class BrandAnalysisService {
  /**
   * Get comprehensive brand analytics data
   */
  async getBrandAnalytics(
    brandId: number, 
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<BrandAnalyticsData> {
    try {
      logger.info(`Generating analytics for brand ${brandId}`);

      const [
        totalMentions,
        sentimentBreakdown,
        platformBreakdown,
        avgRanking,
        competitorData,
        topQueries,
        timeSeriesData
      ] = await Promise.all([
        this.getTotalMentions(brandId, dateRange),
        this.getSentimentBreakdown(brandId, dateRange),
        this.getPlatformBreakdown(brandId, dateRange),
        this.getAverageRanking(brandId, dateRange),
        this.getCompetitorAnalysis(brandId, dateRange),
        this.getTopQueries(brandId, dateRange),
        this.getTimeSeriesData(brandId, dateRange)
      ]);

      const mentionTrend = await this.calculateMentionTrend(brandId, dateRange);

      return {
        totalMentions,
        mentionTrend,
        sentimentBreakdown,
        platformBreakdown,
        avgRankingPosition: avgRanking,
        competitorComparison: competitorData,
        topQueries,
        timeSeriesData
      };
    } catch (error) {
      logger.error('Failed to generate brand analytics:', error);
      throw new Error('Failed to generate brand analytics');
    }
  }

  /**
   * Calculate brand health score
   */
  async calculateBrandHealthScore(brandId: number): Promise<BrandHealthScore> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

      const analytics = await this.getBrandAnalytics(brandId, { startDate, endDate });
      
      // Calculate individual scores
      const visibility = this.calculateVisibilityScore(analytics);
      const sentiment = this.calculateSentimentScore(analytics.sentimentBreakdown);
      const positioning = this.calculatePositioningScore(analytics.avgRankingPosition);
      const competitiveAdvantage = this.calculateCompetitiveScore(analytics.competitorComparison);

      // Calculate overall score
      const overallScore = Math.round(
        (visibility * 0.3 + sentiment * 0.3 + positioning * 0.25 + competitiveAdvantage * 0.15)
      );

      const factors = this.generateHealthFactors(analytics, {
        visibility,
        sentiment,
        positioning,
        competitiveAdvantage
      });

      return {
        overallScore,
        visibility,
        sentiment,
        positioning,
        competitiveAdvantage,
        factors
      };
    } catch (error) {
      logger.error('Failed to calculate brand health score:', error);
      throw new Error('Failed to calculate brand health score');
    }
  }

  /**
   * Generate insights from brand mentions
   */
  async generateBrandInsights(brandId: number): Promise<MentionInsight[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [currentPeriod, previousPeriod] = await Promise.all([
        this.getBrandAnalytics(brandId, { startDate, endDate }),
        this.getBrandAnalytics(brandId, { startDate: previousStartDate, endDate: startDate })
      ]);

      const insights: MentionInsight[] = [];

      // Mention volume insights
      const mentionChange = currentPeriod.totalMentions - previousPeriod.totalMentions;
      if (Math.abs(mentionChange) > 2) {
        insights.push({
          type: mentionChange > 0 ? 'opportunity' : 'threat',
          title: `${mentionChange > 0 ? 'Increased' : 'Decreased'} Brand Mentions`,
          description: `Brand mentions ${mentionChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(mentionChange)} this week`,
          priority: Math.abs(mentionChange) > 5 ? 'high' : 'medium',
          data: { change: mentionChange, current: currentPeriod.totalMentions, previous: previousPeriod.totalMentions },
          createdAt: new Date()
        });
      }

      // Sentiment insights
      const currentPositiveRatio = currentPeriod.sentimentBreakdown.positive / currentPeriod.totalMentions;
      const previousPositiveRatio = previousPeriod.totalMentions > 0 
        ? previousPeriod.sentimentBreakdown.positive / previousPeriod.totalMentions 
        : 0;
      
      const sentimentChange = currentPositiveRatio - previousPositiveRatio;
      if (Math.abs(sentimentChange) > 0.1) {
        insights.push({
          type: sentimentChange > 0 ? 'achievement' : 'threat',
          title: `${sentimentChange > 0 ? 'Improved' : 'Declining'} Brand Sentiment`,
          description: `Positive sentiment ${sentimentChange > 0 ? 'increased' : 'decreased'} by ${Math.round(Math.abs(sentimentChange) * 100)}%`,
          priority: Math.abs(sentimentChange) > 0.2 ? 'high' : 'medium',
          data: { change: sentimentChange, currentRatio: currentPositiveRatio, previousRatio: previousPositiveRatio },
          createdAt: new Date()
        });
      }

      // Ranking position insights
      if (currentPeriod.avgRankingPosition && previousPeriod.avgRankingPosition) {
        const rankingImprovement = previousPeriod.avgRankingPosition - currentPeriod.avgRankingPosition;
        if (Math.abs(rankingImprovement) >= 1) {
          insights.push({
            type: rankingImprovement > 0 ? 'achievement' : 'threat',
            title: `${rankingImprovement > 0 ? 'Improved' : 'Declined'} Average Ranking`,
            description: `Average mention position ${rankingImprovement > 0 ? 'improved' : 'declined'} by ${Math.abs(rankingImprovement)} positions`,
            priority: Math.abs(rankingImprovement) >= 2 ? 'high' : 'medium',
            data: { change: rankingImprovement, current: currentPeriod.avgRankingPosition, previous: previousPeriod.avgRankingPosition },
            createdAt: new Date()
          });
        }
      }

      // Competitor insights
      const topCompetitor = currentPeriod.competitorComparison[0];
      if (topCompetitor && topCompetitor.mentionCount > currentPeriod.totalMentions) {
        insights.push({
          type: 'threat',
          title: 'Competitor Outperforming',
          description: `${topCompetitor.competitorName} has ${topCompetitor.mentionCount - currentPeriod.totalMentions} more mentions than your brand`,
          priority: 'high',
          data: { competitor: topCompetitor.competitorName, gap: topCompetitor.mentionCount - currentPeriod.totalMentions },
          createdAt: new Date()
        });
      }

      // Platform opportunity insights
      const platformEntries = Object.entries(currentPeriod.platformBreakdown);
      const underperformingPlatforms = platformEntries.filter(([_, count]) => count < currentPeriod.totalMentions * 0.2);
      
      if (underperformingPlatforms.length > 0) {
        insights.push({
          type: 'opportunity',
          title: 'Platform Expansion Opportunity',
          description: `Low presence on ${underperformingPlatforms.map(([platform]) => platform).join(', ')}`,
          priority: 'medium',
          data: { platforms: underperformingPlatforms },
          createdAt: new Date()
        });
      }

      return insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      logger.error('Failed to generate brand insights:', error);
      throw new Error('Failed to generate brand insights');
    }
  }

  /**
   * Compare brand performance with competitors
   */
  async compareWithCompetitors(
    brandId: number, 
    competitorNames: string[],
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<CompetitorAnalysis[]> {
    try {
      const brandMentions = await this.getBrandMentions(brandId, dateRange);
      const competitorAnalyses: CompetitorAnalysis[] = [];

      for (const competitorName of competitorNames) {
        const competitorMentions = await this.getCompetitorMentions(brandId, competitorName, dateRange);
        
        const analysis = this.analyzeCompetitorPerformance(competitorMentions, competitorName);
        competitorAnalyses.push(analysis);
      }

      // Calculate market share
      const totalMentions = brandMentions.length + competitorAnalyses.reduce((sum, comp) => sum + comp.mentionCount, 0);
      competitorAnalyses.forEach(comp => {
        comp.marketShare = totalMentions > 0 ? (comp.mentionCount / totalMentions) * 100 : 0;
      });

      return competitorAnalyses.sort((a, b) => b.mentionCount - a.mentionCount);
    } catch (error) {
      logger.error('Failed to compare with competitors:', error);
      throw new Error('Failed to compare with competitors');
    }
  }

  /**
   * Get daily analytics and aggregate if needed
   */
  async getOrCreateDailyAnalytics(brandId: number, date: Date): Promise<SelectLlmAnalyticsDaily> {
    try {
      // Check if analytics exist for this date
      const existingAnalytics = await db
        .select()
        .from(llmAnalyticsDaily)
        .where(and(
          eq(llmAnalyticsDaily.brandId, brandId),
          eq(llmAnalyticsDaily.date, date)
        ))
        .limit(1);

      if (existingAnalytics[0]) {
        return existingAnalytics[0];
      }

      // Generate analytics for the date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [mentions, competitors] = await Promise.all([
        this.getBrandMentions(brandId, { startDate: startOfDay, endDate: endOfDay }),
        this.getCompetitorMentions(brandId, '', { startDate: startOfDay, endDate: endOfDay })
      ]);

      const sentimentCounts = this.aggregateSentimentCounts(mentions);
      const platformBreakdown = this.aggregatePlatformBreakdown(mentions);
      const avgRanking = this.calculateAverageRanking(mentions);

      const analyticsData: Omit<InsertLlmAnalyticsDaily, 'id' | 'createdAt'> = {
        brandId,
        date,
        totalMentions: mentions.length,
        positiveMentions: sentimentCounts.positive,
        neutralMentions: sentimentCounts.neutral,
        negativeMentions: sentimentCounts.negative,
        avgRankingPosition: avgRanking,
        competitorMentions: competitors.length,
        llmPlatformBreakdown: platformBreakdown,
        queryPerformance: this.aggregateQueryPerformance(mentions)
      };

      const [result] = await db
        .insert(llmAnalyticsDaily)
        .values(analyticsData)
        .returning();

      return result;
    } catch (error) {
      logger.error('Failed to get or create daily analytics:', error);
      throw new Error('Failed to get or create daily analytics');
    }
  }

  // Private helper methods

  private async getTotalMentions(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(llmMentions)
      .where(and(
        eq(llmMentions.brandId, brandId),
        gte(llmMentions.createdAt, dateRange.startDate),
        lte(llmMentions.createdAt, dateRange.endDate)
      ));

    return result[0]?.count || 0;
  }

  private async getSentimentBreakdown(brandId: number, dateRange: { startDate: Date; endDate: Date }) {
    const mentions = await this.getBrandMentions(brandId, dateRange);
    return this.aggregateSentimentCounts(mentions);
  }

  private async getPlatformBreakdown(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<Record<string, number>> {
    const mentions = await this.getBrandMentions(brandId, dateRange);
    return this.aggregatePlatformBreakdown(mentions);
  }

  private async getAverageRanking(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<number | null> {
    const mentions = await this.getBrandMentions(brandId, dateRange);
    return this.calculateAverageRanking(mentions);
  }

  private async getBrandMentions(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<SelectLlmMention[]> {
    return await db
      .select()
      .from(llmMentions)
      .where(and(
        eq(llmMentions.brandId, brandId),
        gte(llmMentions.createdAt, dateRange.startDate),
        lte(llmMentions.createdAt, dateRange.endDate)
      ))
      .orderBy(desc(llmMentions.createdAt));
  }

  private async getCompetitorMentions(
    brandId: number, 
    competitorName: string, 
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<SelectCompetitorMention[]> {
    let conditions = and(
      eq(competitorMentions.brandId, brandId),
      gte(competitorMentions.createdAt, dateRange.startDate),
      lte(competitorMentions.createdAt, dateRange.endDate)
    );

    if (competitorName) {
      conditions = and(conditions, eq(competitorMentions.competitorName, competitorName));
    }

    return await db
      .select()
      .from(competitorMentions)
      .where(conditions)
      .orderBy(desc(competitorMentions.createdAt));
  }

  private async getCompetitorAnalysis(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<CompetitorAnalysis[]> {
    const competitors = await this.getCompetitorMentions(brandId, '', dateRange);
    
    const competitorMap = new Map<string, SelectCompetitorMention[]>();
    competitors.forEach(mention => {
      if (!competitorMap.has(mention.competitorName)) {
        competitorMap.set(mention.competitorName, []);
      }
      competitorMap.get(mention.competitorName)!.push(mention);
    });

    return Array.from(competitorMap.entries()).map(([name, mentions]) => 
      this.analyzeCompetitorPerformance(mentions, name)
    );
  }

  private async getTopQueries(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<QueryPerformance[]> {
    const mentions = await this.getBrandMentions(brandId, dateRange);
    
    const queryMap = new Map<string, SelectLlmMention[]>();
    mentions.forEach(mention => {
      if (!queryMap.has(mention.query)) {
        queryMap.set(mention.query, []);
      }
      queryMap.get(mention.query)!.push(mention);
    });

    return Array.from(queryMap.entries())
      .map(([query, queryMentions]) => ({
        query,
        mentionCount: queryMentions.length,
        avgRankingPosition: this.calculateAverageRanking(queryMentions),
        lastMentioned: new Date(Math.max(...queryMentions.map(m => m.createdAt.getTime()))),
        sentimentScore: this.calculateSentimentScore(this.aggregateSentimentCounts(queryMentions))
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10);
  }

  private async getTimeSeriesData(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<TimeSeriesPoint[]> {
    const dailyAnalytics = await db
      .select()
      .from(llmAnalyticsDaily)
      .where(and(
        eq(llmAnalyticsDaily.brandId, brandId),
        gte(llmAnalyticsDaily.date, dateRange.startDate),
        lte(llmAnalyticsDaily.date, dateRange.endDate)
      ))
      .orderBy(llmAnalyticsDaily.date);

    return dailyAnalytics.map(day => ({
      date: day.date.toISOString().split('T')[0],
      mentions: day.totalMentions,
      positiveMentions: day.positiveMentions,
      neutralMentions: day.neutralMentions,
      negativeMentions: day.negativeMentions,
      avgRankingPosition: day.avgRankingPosition
    }));
  }

  private async calculateMentionTrend(brandId: number, dateRange: { startDate: Date; endDate: Date }): Promise<'up' | 'down' | 'stable'> {
    const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousStart = new Date(dateRange.startDate.getTime() - periodLength);
    const previousEnd = dateRange.startDate;

    const [current, previous] = await Promise.all([
      this.getTotalMentions(brandId, dateRange),
      this.getTotalMentions(brandId, { startDate: previousStart, endDate: previousEnd })
    ]);

    const change = current - previous;
    if (Math.abs(change) <= 1) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private analyzeCompetitorPerformance(mentions: SelectCompetitorMention[], competitorName: string): CompetitorAnalysis {
    const avgRanking = mentions.length > 0 
      ? mentions.reduce((sum, m) => sum + (m.rankingPosition || 0), 0) / mentions.filter(m => m.rankingPosition).length 
      : null;

    const sentimentCounts = this.aggregateSentimentCounts(mentions);
    const sentimentScore = this.calculateSentimentScore(sentimentCounts);

    return {
      competitorName,
      mentionCount: mentions.length,
      avgRankingPosition: avgRanking,
      sentimentScore,
      marketShare: 0 // Will be calculated later
    };
  }

  private aggregateSentimentCounts(mentions: (SelectLlmMention | SelectCompetitorMention)[]): { positive: number; neutral: number; negative: number } {
    return mentions.reduce(
      (acc, mention) => {
        if (mention.sentiment === 'positive') acc.positive++;
        else if (mention.sentiment === 'negative') acc.negative++;
        else acc.neutral++;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );
  }

  private aggregatePlatformBreakdown(mentions: SelectLlmMention[]): Record<string, number> {
    return mentions.reduce((acc, mention) => {
      acc[mention.llmPlatform] = (acc[mention.llmPlatform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageRanking(mentions: (SelectLlmMention | SelectCompetitorMention)[]): number | null {
    const validRankings = mentions
      .map(m => m.rankingPosition)
      .filter((pos): pos is number => pos !== null);
    
    return validRankings.length > 0 
      ? Math.round(validRankings.reduce((sum, pos) => sum + pos, 0) / validRankings.length)
      : null;
  }

  private aggregateQueryPerformance(mentions: SelectLlmMention[]): Record<string, any> {
    const queryMap = new Map<string, SelectLlmMention[]>();
    mentions.forEach(mention => {
      if (!queryMap.has(mention.query)) {
        queryMap.set(mention.query, []);
      }
      queryMap.get(mention.query)!.push(mention);
    });

    return Object.fromEntries(
      Array.from(queryMap.entries()).map(([query, queryMentions]) => [
        query,
        {
          count: queryMentions.length,
          avgRanking: this.calculateAverageRanking(queryMentions),
          sentiment: this.aggregateSentimentCounts(queryMentions)
        }
      ])
    );
  }

  private calculateVisibilityScore(analytics: BrandAnalyticsData): number {
    const mentionScore = Math.min(analytics.totalMentions * 10, 100);
    const trendBonus = analytics.mentionTrend === 'up' ? 10 : analytics.mentionTrend === 'down' ? -10 : 0;
    return Math.max(0, Math.min(100, mentionScore + trendBonus));
  }

  private calculateSentimentScore(sentimentBreakdown: { positive: number; neutral: number; negative: number }): number {
    const total = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative;
    if (total === 0) return 50;
    
    const positiveRatio = sentimentBreakdown.positive / total;
    const negativeRatio = sentimentBreakdown.negative / total;
    
    return Math.round((positiveRatio - negativeRatio) * 50 + 50);
  }

  private calculatePositioningScore(avgRankingPosition: number | null): number {
    if (!avgRankingPosition) return 50;
    return Math.max(0, Math.min(100, 100 - (avgRankingPosition - 1) * 20));
  }

  private calculateCompetitiveScore(competitors: CompetitorAnalysis[]): number {
    if (competitors.length === 0) return 50;
    
    const topCompetitor = competitors[0];
    if (!topCompetitor) return 50;
    
    // Compare market share (simplified)
    return Math.round(Math.max(0, Math.min(100, 100 - topCompetitor.marketShare)));
  }

  private generateHealthFactors(analytics: BrandAnalyticsData, scores: any): HealthFactor[] {
    const factors: HealthFactor[] = [];

    if (scores.visibility < 30) {
      factors.push({
        name: 'Low Visibility',
        score: scores.visibility,
        impact: 'negative',
        description: 'Brand mentions are below average. Consider increasing content marketing efforts.'
      });
    }

    if (scores.sentiment > 70) {
      factors.push({
        name: 'Positive Sentiment',
        score: scores.sentiment,
        impact: 'positive',
        description: 'Brand sentiment is overwhelmingly positive. Great brand reputation!'
      });
    }

    if (analytics.avgRankingPosition && analytics.avgRankingPosition > 3) {
      factors.push({
        name: 'Low Ranking Position',
        score: scores.positioning,
        impact: 'negative',
        description: 'Brand typically appears later in LLM responses. Focus on authoritative content.'
      });
    }

    return factors;
  }
}