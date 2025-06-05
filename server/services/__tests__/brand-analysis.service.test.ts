import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BrandAnalysisService } from '../brand-analysis.service.js';
import { db } from '../../db/index.js';
import { logger } from '../../lib/logger.js';

// Mock dependencies
vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('BrandAnalysisService', () => {
  let service: BrandAnalysisService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = db as any;
    service = new BrandAnalysisService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBrandAnalytics', () => {
    it('should generate comprehensive brand analytics', async () => {
      const brandId = 1;
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Mock mentions data
      const mockMentions = [
        {
          id: 1,
          brandId: 1,
          llmPlatform: 'openai',
          query: 'best CRM software',
          response: 'Salesforce is great',
          mentionType: 'direct',
          brandMentioned: 'Test Brand',
          rankingPosition: 1,
          sentiment: 'positive',
          confidenceScore: 95,
          contextSnippet: 'Test Brand is excellent',
          responseMetadata: {},
          createdAt: new Date('2024-01-15')
        },
        {
          id: 2,
          brandId: 1,
          llmPlatform: 'anthropic',
          query: 'project management tools',
          response: 'Many options available',
          mentionType: 'indirect',
          brandMentioned: null,
          rankingPosition: null,
          sentiment: 'neutral',
          confidenceScore: 30,
          contextSnippet: null,
          responseMetadata: {},
          createdAt: new Date('2024-01-20')
        }
      ];

      const mockCompetitorMentions = [
        {
          id: 1,
          brandId: 1,
          competitorName: 'Competitor A',
          llmPlatform: 'openai',
          query: 'best CRM software',
          response: 'Competitor A is good',
          rankingPosition: 2,
          sentiment: 'positive',
          confidenceScore: 90,
          contextSnippet: 'Competitor A works well',
          responseMetadata: {},
          createdAt: new Date('2024-01-15')
        }
      ];

      const mockDailyAnalytics = [
        {
          id: 1,
          brandId: 1,
          date: new Date('2024-01-15'),
          totalMentions: 1,
          positiveMentions: 1,
          neutralMentions: 0,
          negativeMentions: 0,
          avgRankingPosition: 1,
          competitorMentions: 1,
          llmPlatformBreakdown: { openai: 1 },
          queryPerformance: {},
          createdAt: new Date()
        }
      ];

      // Mock database calls
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockImplementation(() => {
              // Return different data based on the call
              const callCount = mockDb.select.mock.calls.length;
              if (callCount <= 2) return Promise.resolve([{ count: 2 }]); // Total mentions
              if (callCount <= 4) return Promise.resolve(mockMentions); // Brand mentions
              if (callCount <= 6) return Promise.resolve(mockCompetitorMentions); // Competitor mentions
              return Promise.resolve(mockDailyAnalytics); // Daily analytics
            }),
            limit: vi.fn().mockResolvedValue([])
          })
        })
      }));

      const result = await service.getBrandAnalytics(brandId, dateRange);

      expect(result).toMatchObject({
        totalMentions: expect.any(Number),
        mentionTrend: expect.stringMatching(/^(up|down|stable)$/),
        sentimentBreakdown: {
          positive: expect.any(Number),
          neutral: expect.any(Number),
          negative: expect.any(Number)
        },
        platformBreakdown: expect.any(Object),
        competitorComparison: expect.any(Array),
        topQueries: expect.any(Array),
        timeSeriesData: expect.any(Array)
      });

      expect(logger.info).toHaveBeenCalledWith('Generating analytics for brand 1');
    });

    it('should handle errors gracefully', async () => {
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      }));

      await expect(service.getBrandAnalytics(1, {
        startDate: new Date(),
        endDate: new Date()
      })).rejects.toThrow('Failed to generate brand analytics');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateBrandHealthScore', () => {
    it('should calculate brand health score correctly', async () => {
      const brandId = 1;

      // Mock getBrandAnalytics method
      const mockAnalytics = {
        totalMentions: 10,
        mentionTrend: 'up' as const,
        sentimentBreakdown: { positive: 8, neutral: 2, negative: 0 },
        platformBreakdown: { openai: 5, anthropic: 5 },
        avgRankingPosition: 2,
        competitorComparison: [
          { competitorName: 'Competitor A', mentionCount: 5, marketShare: 30, avgRankingPosition: 3, sentimentScore: 70 }
        ],
        topQueries: [],
        timeSeriesData: []
      };

      vi.spyOn(service, 'getBrandAnalytics').mockResolvedValue(mockAnalytics);

      const result = await service.calculateBrandHealthScore(brandId);

      expect(result).toMatchObject({
        overallScore: expect.any(Number),
        visibility: expect.any(Number),
        sentiment: expect.any(Number),
        positioning: expect.any(Number),
        competitiveAdvantage: expect.any(Number),
        factors: expect.any(Array)
      });

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.sentiment).toBeGreaterThan(70); // Should be high due to positive sentiment
    });

    it('should handle calculation errors', async () => {
      vi.spyOn(service, 'getBrandAnalytics').mockRejectedValue(new Error('Analytics error'));

      await expect(service.calculateBrandHealthScore(1)).rejects.toThrow(
        'Failed to calculate brand health score'
      );
    });
  });

  describe('generateBrandInsights', () => {
    it('should generate meaningful insights from brand data', async () => {
      const brandId = 1;

      // Mock two periods of analytics data
      const currentPeriodAnalytics = {
        totalMentions: 15,
        mentionTrend: 'up' as const,
        sentimentBreakdown: { positive: 12, neutral: 3, negative: 0 },
        platformBreakdown: { openai: 10, anthropic: 5 },
        avgRankingPosition: 1,
        competitorComparison: [
          { competitorName: 'Competitor A', mentionCount: 20, marketShare: 40, avgRankingPosition: 2, sentimentScore: 75 }
        ],
        topQueries: [],
        timeSeriesData: []
      };

      const previousPeriodAnalytics = {
        totalMentions: 10,
        mentionTrend: 'stable' as const,
        sentimentBreakdown: { positive: 6, neutral: 3, negative: 1 },
        platformBreakdown: { openai: 7, anthropic: 3 },
        avgRankingPosition: 2,
        competitorComparison: [],
        topQueries: [],
        timeSeriesData: []
      };

      vi.spyOn(service, 'getBrandAnalytics')
        .mockResolvedValueOnce(currentPeriodAnalytics)
        .mockResolvedValueOnce(previousPeriodAnalytics);

      const insights = await service.generateBrandInsights(brandId);

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
      
      // Should have mention increase insight
      const mentionInsight = insights.find(i => i.title.includes('Increased Brand Mentions'));
      expect(mentionInsight).toBeDefined();
      expect(mentionInsight?.type).toBe('opportunity');

      // Should have sentiment improvement insight
      const sentimentInsight = insights.find(i => i.title.includes('Improved Brand Sentiment'));
      expect(sentimentInsight).toBeDefined();

      // Should have competitor threat insight
      const competitorInsight = insights.find(i => i.title.includes('Competitor Outperforming'));
      expect(competitorInsight).toBeDefined();
      expect(competitorInsight?.type).toBe('threat');
    });

    it('should prioritize insights correctly', async () => {
      const brandId = 1;

      // Mock analytics with significant changes
      const currentAnalytics = {
        totalMentions: 20,
        mentionTrend: 'up' as const,
        sentimentBreakdown: { positive: 5, neutral: 5, negative: 10 }, // Negative trend
        platformBreakdown: { openai: 20 },
        avgRankingPosition: 1,
        competitorComparison: [],
        topQueries: [],
        timeSeriesData: []
      };

      const previousAnalytics = {
        totalMentions: 5,
        mentionTrend: 'stable' as const,
        sentimentBreakdown: { positive: 4, neutral: 1, negative: 0 }, // Was positive
        platformBreakdown: { openai: 5 },
        avgRankingPosition: 1,
        competitorComparison: [],
        topQueries: [],
        timeSeriesData: []
      };

      vi.spyOn(service, 'getBrandAnalytics')
        .mockResolvedValueOnce(currentAnalytics)
        .mockResolvedValueOnce(previousAnalytics);

      const insights = await service.generateBrandInsights(brandId);

      // High priority insights should come first
      expect(insights[0].priority).toBe('high');
    });
  });

  describe('compareWithCompetitors', () => {
    it('should compare brand performance with competitors', async () => {
      const brandId = 1;
      const competitorNames = ['Competitor A', 'Competitor B'];
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockBrandMentions = [
        { id: 1, brandId: 1, llmPlatform: 'openai', createdAt: new Date() }
      ];

      const mockCompetitorMentions = [
        {
          id: 1,
          brandId: 1,
          competitorName: 'Competitor A',
          llmPlatform: 'openai',
          query: 'test query',
          response: 'test response',
          rankingPosition: 2,
          sentiment: 'positive',
          confidenceScore: 85,
          contextSnippet: 'test snippet',
          responseMetadata: {},
          createdAt: new Date()
        }
      ];

      // Mock the private method calls
      vi.spyOn(service as any, 'getBrandMentions').mockResolvedValue(mockBrandMentions);
      vi.spyOn(service as any, 'getCompetitorMentions').mockResolvedValue(mockCompetitorMentions);

      const result = await service.compareWithCompetitors(brandId, competitorNames, dateRange);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(competitorNames.length);
      
      const competitorA = result.find(c => c.competitorName === 'Competitor A');
      expect(competitorA).toBeDefined();
      expect(competitorA?.mentionCount).toBe(1);
      expect(competitorA?.marketShare).toBeGreaterThan(0);
    });
  });

  describe('getOrCreateDailyAnalytics', () => {
    it('should return existing daily analytics if available', async () => {
      const brandId = 1;
      const date = new Date('2024-01-15');

      const existingAnalytics = {
        id: 1,
        brandId: 1,
        date: date,
        totalMentions: 5,
        positiveMentions: 4,
        neutralMentions: 1,
        negativeMentions: 0,
        avgRankingPosition: 2,
        competitorMentions: 2,
        llmPlatformBreakdown: { openai: 3, anthropic: 2 },
        queryPerformance: {},
        createdAt: new Date()
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingAnalytics])
          })
        })
      });

      const result = await service.getOrCreateDailyAnalytics(brandId, date);

      expect(result).toEqual(existingAnalytics);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should create new daily analytics if none exist', async () => {
      const brandId = 1;
      const date = new Date('2024-01-15');

      // Mock no existing analytics
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing analytics
          })
        })
      });

      // Mock mentions data for the day
      const mockMentions = [
        {
          id: 1,
          brandId: 1,
          llmPlatform: 'openai',
          query: 'test query',
          sentiment: 'positive',
          rankingPosition: 1,
          createdAt: date
        }
      ];

      // Mock subsequent calls for getting mentions
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockMentions),
            limit: vi.fn().mockResolvedValue([])
          })
        })
      }));

      const newAnalytics = {
        id: 1,
        brandId: 1,
        date: date,
        totalMentions: 1,
        positiveMentions: 1,
        neutralMentions: 0,
        negativeMentions: 0,
        avgRankingPosition: 1,
        competitorMentions: 0,
        llmPlatformBreakdown: { openai: 1 },
        queryPerformance: {},
        createdAt: new Date()
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newAnalytics])
        })
      });

      const result = await service.getOrCreateDailyAnalytics(brandId, date);

      expect(result).toEqual(newAnalytics);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('sentiment analysis helper methods', () => {
    it('should calculate sentiment score correctly', () => {
      const sentimentBreakdown = { positive: 8, neutral: 2, negative: 0 };
      const score = (service as any).calculateSentimentScore(sentimentBreakdown);
      
      expect(score).toBe(90); // (8/10 - 0/10) * 50 + 50 = 90
    });

    it('should handle zero mentions in sentiment calculation', () => {
      const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
      const score = (service as any).calculateSentimentScore(sentimentBreakdown);
      
      expect(score).toBe(50); // Default neutral score
    });

    it('should calculate negative sentiment correctly', () => {
      const sentimentBreakdown = { positive: 2, neutral: 2, negative: 6 };
      const score = (service as any).calculateSentimentScore(sentimentBreakdown);
      
      expect(score).toBe(30); // (2/10 - 6/10) * 50 + 50 = 30
    });
  });

  describe('visibility score calculation', () => {
    it('should calculate visibility score with trend bonus', () => {
      const analytics = {
        totalMentions: 5,
        mentionTrend: 'up' as const,
        sentimentBreakdown: { positive: 3, neutral: 2, negative: 0 },
        platformBreakdown: {},
        avgRankingPosition: 1,
        competitorComparison: [],
        topQueries: [],
        timeSeriesData: []
      };

      const score = (service as any).calculateVisibilityScore(analytics);
      expect(score).toBe(60); // (5 * 10) + 10 = 60
    });

    it('should cap visibility score at 100', () => {
      const analytics = {
        totalMentions: 20,
        mentionTrend: 'up' as const,
        sentimentBreakdown: { positive: 15, neutral: 5, negative: 0 },
        platformBreakdown: {},
        avgRankingPosition: 1,
        competitorComparison: [],
        topQueries: [],
        timeSeriesData: []
      };

      const score = (service as any).calculateVisibilityScore(analytics);
      expect(score).toBe(100); // Capped at 100
    });
  });

  describe('positioning score calculation', () => {
    it('should calculate high positioning score for top rankings', () => {
      const score = (service as any).calculatePositioningScore(1);
      expect(score).toBe(100); // Top position gets 100
    });

    it('should calculate lower score for poor rankings', () => {
      const score = (service as any).calculatePositioningScore(5);
      expect(score).toBe(20); // 100 - (5-1) * 20 = 20
    });

    it('should handle null ranking position', () => {
      const score = (service as any).calculatePositioningScore(null);
      expect(score).toBe(50); // Default neutral score
    });
  });

  describe('error handling', () => {
    it('should handle database errors in analytics generation', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(service.getBrandAnalytics(1, {
        startDate: new Date(),
        endDate: new Date()
      })).rejects.toThrow('Failed to generate brand analytics');
    });

    it('should handle empty data gracefully', async () => {
      // Mock empty results
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
            limit: vi.fn().mockResolvedValue([])
          })
        })
      }));

      const result = await service.getBrandAnalytics(1, {
        startDate: new Date(),
        endDate: new Date()
      });

      expect(result.totalMentions).toBe(0);
      expect(result.sentimentBreakdown).toEqual({ positive: 0, neutral: 0, negative: 0 });
    });
  });
});