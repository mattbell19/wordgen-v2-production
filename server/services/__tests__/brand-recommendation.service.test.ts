import { BrandRecommendationService, type BrandAnalysisReport, type Recommendation } from '../brand-recommendation.service';
import { db } from '../../db/index';
import { brandMonitoring, llmMentions, optimizationRecommendations } from '../../../db/schema';
import { logger } from '../../lib/logger';
import { enhancedMentionAnalysisService } from '../enhanced-mention-analysis.service';
import { aiQueryGeneratorService } from '../ai-query-generator.service';

// Mock dependencies
jest.mock('../../db/index', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../enhanced-mention-analysis.service', () => ({
  enhancedMentionAnalysisService: {
    analyzeMentions: jest.fn()
  }
}));

jest.mock('../ai-query-generator.service', () => ({
  aiQueryGeneratorService: {
    generateQueriesForBrand: jest.fn()
  }
}));

describe('BrandRecommendationService', () => {
  let service: BrandRecommendationService;
  let mockDb: any;

  // Sample data for testing
  const mockBrand = {
    id: 1,
    userId: 1,
    teamId: 1,
    brandName: 'TestBrand',
    description: 'Test brand description',
    trackingQueries: ['What is TestBrand?', 'TestBrand vs competitors'],
    competitors: ['CompetitorA', 'CompetitorB'],
    monitoringFrequency: 'daily',
    isActive: true,
    settings: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockMentions = [
    {
      id: 1,
      brandId: 1,
      llmPlatform: 'openai',
      query: 'What is the best CRM?',
      response: 'TestBrand is an excellent CRM solution.',
      mentionType: 'direct',
      brandMentioned: 'TestBrand',
      rankingPosition: 1,
      sentiment: 'positive',
      confidenceScore: 95,
      contextSnippet: 'TestBrand is excellent',
      responseMetadata: {},
      createdAt: new Date('2024-01-15')
    },
    {
      id: 2,
      brandId: 1,
      llmPlatform: 'anthropic',
      query: 'CRM comparison',
      response: 'TestBrand vs CompetitorA comparison shows mixed results.',
      mentionType: 'competitor_comparison',
      brandMentioned: 'TestBrand',
      rankingPosition: 3,
      sentiment: 'neutral',
      confidenceScore: 80,
      contextSnippet: 'TestBrand vs CompetitorA',
      responseMetadata: {},
      createdAt: new Date('2024-01-20')
    },
    {
      id: 3,
      brandId: 1,
      llmPlatform: 'openai',
      query: 'Worst CRM platforms',
      response: 'TestBrand has terrible support and poor features.',
      mentionType: 'direct',
      brandMentioned: 'TestBrand',
      rankingPosition: 1,
      sentiment: 'negative',
      confidenceScore: 90,
      contextSnippet: 'TestBrand has terrible support',
      responseMetadata: {},
      createdAt: new Date('2024-01-25')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = db as any;
    service = new BrandRecommendationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateBrandAnalysisReport', () => {
    const timeframe = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      
      // Setup sequential mock calls for the service
      mockDb.select
        // First call: get brand
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockBrand])
          })
        })
        // Second call: get mentions
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockMentions)
            })
          })
        })
        // Third call: first half for trend analysis
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockMentions.slice(0, 1))
          })
        })
        // Fourth call: second half for trend analysis
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockMentions.slice(1))
          })
        });

      // Mock store recommendations
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });
    });

    it('should generate comprehensive analysis report', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      expect(result).toBeDefined();
      expect(result.brandId).toBe(1);
      expect(result.brandName).toBe('TestBrand');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.performance.totalMentions).toBe(3);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(logger.info).toHaveBeenCalledWith('[BrandRecommendation] Generating analysis report for brand: 1');
    });

    it('should calculate performance metrics correctly', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      expect(result.performance.totalMentions).toBe(3);
      expect(result.performance.positivePercentage).toBe(33); // 1 out of 3
      expect(result.performance.neutralPercentage).toBe(33); // 1 out of 3
      expect(result.performance.negativePercentage).toBe(33); // 1 out of 3
      expect(result.performance.averageRankingPosition).toBe(2); // (1+3+1)/3 = 1.67 rounded to 2
    });

    it('should generate appropriate recommendations for negative sentiment', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      const sentimentRecommendation = result.recommendations.find(r => 
        r.category === 'sentiment_improvement'
      );
      
      expect(sentimentRecommendation).toBeDefined();
      expect(sentimentRecommendation!.priority).toBe('critical');
      expect(sentimentRecommendation!.title).toContain('Address Negative Sentiment');
    });

    it('should generate content strategy recommendations for low mentions', async () => {
      // Reset and setup mocks for low mentions scenario
      jest.clearAllMocks();
      const lowMentions = mockMentions.slice(0, 2); // Only 2 mentions (below threshold of 10)

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockBrand])
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(lowMentions)
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(lowMentions.slice(0, 1))
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(lowMentions.slice(1))
          })
        });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });

      const result = await service.generateBrandAnalysisReport(1, timeframe);

      const contentRecommendation = result.recommendations.find(r => 
        r.category === 'content_strategy'
      );
      
      expect(contentRecommendation).toBeDefined();
      expect(contentRecommendation!.priority).toBe('high');
      expect(contentRecommendation!.title).toContain('Increase Content Production');
    });

    it('should generate competitive positioning recommendations', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      const competitiveRecommendation = result.recommendations.find(r => 
        r.category === 'competitive_positioning'
      );
      
      expect(competitiveRecommendation).toBeDefined();
      expect(competitiveRecommendation!.title).toContain('Competitive Positioning');
    });

    it('should handle brand not found error', async () => {
      jest.clearAllMocks();
      
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await expect(service.generateBrandAnalysisReport(999, timeframe))
        .rejects.toThrow('Brand not found: 999');
    });

    it('should analyze competitor mentions correctly', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      expect(result.competitorAnalysis.mentionedCompetitors).toContain('CompetitorA');
      expect(result.competitorAnalysis.competitiveGaps.length).toBeGreaterThan(0);
    });

    it('should calculate trend analysis correctly', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      expect(['improving', 'declining', 'stable']).toContain(result.trendAnalysis.sentimentTrend);
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trendAnalysis.mentionsTrend);
      expect(['improving', 'declining', 'stable']).toContain(result.trendAnalysis.rankingTrend);
    });

    it('should prioritize recommendations correctly', async () => {
      const result = await service.generateBrandAnalysisReport(1, timeframe);

      // Check that critical recommendations come first
      const priorities = result.recommendations.map(r => r.priority);
      const criticalIndex = priorities.indexOf('critical');
      const lowIndex = priorities.indexOf('low');

      if (criticalIndex !== -1 && lowIndex !== -1) {
        expect(criticalIndex).toBeLessThan(lowIndex);
      }
    });
  });

  describe('getBrandRecommendations', () => {
    const mockRecommendations = [
      {
        id: 1,
        brandId: 1,
        category: 'content_strategy',
        priority: 'high',
        title: 'Test Recommendation',
        description: 'Test Description',
        actionItems: ['Action 1', 'Action 2'],
        estimatedImpact: 75,
        estimatedEffort: 60,
        timeframe: 'medium_term',
        expectedOutcomes: ['Outcome 1'],
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should get brand recommendations with no filters', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockRecommendations)
          })
        })
      });

      const result = await service.getBrandRecommendations(1);

      expect(result).toEqual(mockRecommendations);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter recommendations by category', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockRecommendations)
          })
        })
      });

      const result = await service.getBrandRecommendations(1, { 
        category: 'content_strategy' 
      });

      expect(result).toEqual(mockRecommendations);
    });

    it('should filter recommendations by priority', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockRecommendations)
          })
        })
      });

      const result = await service.getBrandRecommendations(1, { 
        priority: 'high' 
      });

      expect(result).toEqual(mockRecommendations);
    });

    it('should limit results when specified', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockRecommendations.slice(0, 1))
            })
          })
        })
      });

      const result = await service.getBrandRecommendations(1, { limit: 1 });

      expect(result).toHaveLength(1);
    });

    it('should handle database errors', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      await expect(service.getBrandRecommendations(1))
        .rejects.toThrow('Failed to get brand recommendations');
    });
  });

  describe('updateRecommendationStatus', () => {
    it('should update recommendation status successfully', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      await service.updateRecommendationStatus(1, 'in_progress', 50);

      expect(mockDb.update).toHaveBeenCalledWith(optimizationRecommendations);
      expect(logger.info).toHaveBeenCalledWith(
        '[BrandRecommendation] Updated recommendation 1 status to in_progress'
      );
    });

    it('should clamp progress values between 0 and 100', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      await service.updateRecommendationStatus(1, 'completed', 150);

      const setCall = mockDb.update().set.mock.calls[0][0];
      expect(setCall.progress).toBe(100);
    });

    it('should handle update errors', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Update failed'))
        })
      });

      await expect(service.updateRecommendationStatus(1, 'completed'))
        .rejects.toThrow('Failed to update recommendation status');
    });
  });

  describe('generateQuerySuggestions', () => {
    it('should generate query suggestions successfully', async () => {
      const mockSuggestions = {
        queries: [
          { text: 'What is TestBrand pricing?', category: 'direct', priority: 80, estimatedRelevance: 85, explanation: 'Pricing inquiry' },
          { text: 'TestBrand vs alternatives', category: 'comparative', priority: 75, estimatedRelevance: 80, explanation: 'Comparison query' }
        ],
        metadata: { totalGenerated: 2, categoryBreakdown: {}, estimatedCost: 0.01, processingTimeMs: 100 }
      };

      // Mock recent mentions query
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockMentions)
        })
      });

      (aiQueryGeneratorService.generateQueriesForBrand as jest.Mock)
        .mockResolvedValue(mockSuggestions);

      const result = await service.generateQuerySuggestions(1, 2);

      expect(result).toEqual(['What is TestBrand pricing?', 'TestBrand vs alternatives']);
      expect(aiQueryGeneratorService.generateQueriesForBrand).toHaveBeenCalledWith(1, 2);
    });

    it('should handle query generation errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockMentions)
        })
      });

      (aiQueryGeneratorService.generateQueriesForBrand as jest.Mock)
        .mockRejectedValue(new Error('AI service error'));

      const result = await service.generateQuerySuggestions(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        '[BrandRecommendation] Failed to generate query suggestions:',
        expect.any(Error)
      );
    });
  });

  describe('performance metric calculations', () => {
    it('should handle empty mentions array', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.performance.totalMentions).toBe(0);
      expect(result.performance.positivePercentage).toBe(0);
      expect(result.performance.averageRankingPosition).toBeNull();
      expect(result.performance.topPerformingQueries).toEqual([]);
    });

    it('should calculate query performance scores correctly', async () => {
      // Create mentions with varying performance for the same query
      const performanceMentions = [
        { ...mockMentions[0], query: 'Test Query', sentiment: 'positive', rankingPosition: 1 },
        { ...mockMentions[1], query: 'Test Query', sentiment: 'positive', rankingPosition: 2 },
        { ...mockMentions[2], query: 'Test Query', sentiment: 'negative', rankingPosition: 5 },
        { ...mockMentions[0], query: 'Poor Query', sentiment: 'negative', rankingPosition: 10 }
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(performanceMentions)
          })
        })
      });

      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.performance.topPerformingQueries).toContain('Test Query');
      expect(result.performance.poorPerformingQueries).toContain('Poor Query');
    });
  });

  describe('trend analysis', () => {
    it('should detect improving sentiment trend', async () => {
      const improvingMentions = [
        { ...mockMentions[0], sentiment: 'negative', createdAt: new Date('2024-01-05') },
        { ...mockMentions[1], sentiment: 'positive', createdAt: new Date('2024-01-25') },
        { ...mockMentions[2], sentiment: 'positive', createdAt: new Date('2024-01-30') }
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(improvingMentions)
          })
        })
      });

      // Mock trend queries with proper data split
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([improvingMentions[0]]) // First half: negative
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(improvingMentions.slice(1)) // Second half: positive
        })
      });

      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.trendAnalysis.sentimentTrend).toBe('improving');
    });

    it('should handle trend analysis errors gracefully', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockMentions)
          })
        })
      });

      // Mock trend queries to throw errors
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Trend analysis error'))
        })
      });

      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.trendAnalysis.sentimentTrend).toBe('stable');
      expect(logger.warn).toHaveBeenCalledWith(
        '[BrandRecommendation] Failed to analyze trends:',
        expect.any(Error)
      );
    });
  });

  describe('overall score calculation', () => {
    it('should calculate realistic overall scores', async () => {
      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(typeof result.overallScore).toBe('number');
    });

    it('should give higher scores for better performance', async () => {
      // Test with all positive mentions
      const positiveMentions = mockMentions.map(m => ({
        ...m,
        sentiment: 'positive',
        rankingPosition: 1
      }));

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(positiveMentions)
          })
        })
      });

      const positiveResult = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(positiveResult.overallScore).toBeGreaterThan(50);
    });
  });

  describe('recommendation storage', () => {
    it('should store recommendations in database', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });

      await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(mockDb.insert).toHaveBeenCalledWith(optimizationRecommendations);
    });

    it('should handle storage errors gracefully', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error('Storage error'))
      });

      // Should not throw despite storage error
      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        '[BrandRecommendation] Failed to store recommendations:',
        expect.any(Error)
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection errors', async () => {
      jest.clearAllMocks();
      
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Connection failed'))
        })
      });

      await expect(service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })).rejects.toThrow('Failed to generate brand analysis report');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle null ranking positions', async () => {
      jest.clearAllMocks();
      
      const mentionsWithNullRanking = mockMentions.map(m => ({
        ...m,
        rankingPosition: null
      }));

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockBrand])
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mentionsWithNullRanking)
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mentionsWithNullRanking.slice(0, 1))
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mentionsWithNullRanking.slice(1))
          })
        });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });

      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.performance.averageRankingPosition).toBeNull();
    });

    it('should handle empty competitor list', async () => {
      jest.clearAllMocks();
      
      const brandWithoutCompetitors = {
        ...mockBrand,
        competitors: []
      };

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([brandWithoutCompetitors])
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockMentions)
            })
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockMentions.slice(0, 1))
          })
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockMentions.slice(1))
          })
        });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });

      const result = await service.generateBrandAnalysisReport(1, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.competitorAnalysis.mentionedCompetitors).toEqual([]);
    });
  });
});