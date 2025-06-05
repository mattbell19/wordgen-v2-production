import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { LLMMonitoringService } from '../llm-monitoring.service.js';
import { db } from '../../db/index.js';
import { brandMonitoring, llmMentions, monitoringJobs } from '../../../db/schema.js';
import { logger } from '../../lib/logger.js';

// Mock dependencies
vi.mock('../../db/index.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
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

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

describe('LLMMonitoringService', () => {
  let service: LLMMonitoringService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = db as any;
    
    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    
    service = new LLMMonitoringService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBrandMonitoring', () => {
    it('should create a new brand monitoring configuration', async () => {
      const mockBrandData = {
        userId: 1,
        teamId: 1,
        brandName: 'Test Brand',
        description: 'Test Description',
        trackingQueries: ['What is the best CRM?', 'Top project management tools'],
        competitors: ['Competitor A', 'Competitor B'],
        monitoringFrequency: 'daily' as const,
        isActive: true,
        settings: {}
      };

      const mockResult = {
        id: 1,
        ...mockBrandData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockResult])
        })
      });

      const result = await service.createBrandMonitoring(mockBrandData);

      expect(mockDb.insert).toHaveBeenCalledWith(brandMonitoring);
      expect(result).toEqual(mockResult);
      expect(logger.info).toHaveBeenCalledWith('Creating brand monitoring for: Test Brand');
    });

    it('should throw error when creation fails', async () => {
      const mockBrandData = {
        userId: 1,
        brandName: 'Test Brand',
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily' as const,
        isActive: true,
        settings: {}
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      await expect(service.createBrandMonitoring(mockBrandData)).rejects.toThrow(
        'Failed to create brand monitoring configuration'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getBrandMonitoringByUser', () => {
    it('should fetch brand monitoring configurations for a user', async () => {
      const mockResults = [
        {
          id: 1,
          userId: 1,
          brandName: 'Brand 1',
          trackingQueries: [],
          competitors: [],
          monitoringFrequency: 'daily',
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockResults)
          })
        })
      });

      const result = await service.getBrandMonitoringByUser(1);

      expect(result).toEqual(mockResults);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      await expect(service.getBrandMonitoringByUser(1)).rejects.toThrow(
        'Failed to fetch brand monitoring configurations'
      );
    });
  });

  describe('updateBrandMonitoring', () => {
    it('should update brand monitoring configuration', async () => {
      const updates = {
        brandName: 'Updated Brand',
        isActive: false
      };

      const mockResult = {
        id: 1,
        userId: 1,
        brandName: 'Updated Brand',
        isActive: false,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockResult])
          })
        })
      });

      const result = await service.updateBrandMonitoring(1, updates);

      expect(result).toEqual(mockResult);
      expect(mockDb.update).toHaveBeenCalledWith(brandMonitoring);
    });

    it('should throw error when brand not found', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([])
          })
        })
      });

      await expect(service.updateBrandMonitoring(1, {})).rejects.toThrow(
        'Failed to update brand monitoring configuration'
      );
    });
  });

  describe('deleteBrandMonitoring', () => {
    it('should delete brand monitoring configuration', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      });

      await service.deleteBrandMonitoring(1, 1);

      expect(mockDb.delete).toHaveBeenCalledWith(brandMonitoring);
      expect(logger.info).toHaveBeenCalledWith('Deleted brand monitoring configuration: 1');
    });

    it('should handle deletion errors', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(service.deleteBrandMonitoring(1, 1)).rejects.toThrow(
        'Failed to delete brand monitoring configuration'
      );
    });
  });

  describe('analyzeBrandMention', () => {
    it('should detect direct brand mentions', async () => {
      const query = 'What is the best CRM software?';
      const response = 'Salesforce is a great CRM. HubSpot is also excellent for small businesses.';
      const brandName = 'Salesforce';

      // Access private method via any cast for testing
      const result = (service as any).analyzeBrandMention(query, response, brandName);

      expect(result.brandMentioned).toBe('Salesforce');
      expect(result.mentionType).toBe('direct');
      expect(result.rankingPosition).toBe(1);
      expect(result.confidenceScore).toBe(95);
      expect(result.sentiment).toBe('positive');
      expect(result.contextSnippet).toContain('Salesforce');
    });

    it('should handle no brand mentions', async () => {
      const query = 'What is the best CRM software?';
      const response = 'There are many great CRM options available in the market today.';
      const brandName = 'MyBrand';

      const result = (service as any).analyzeBrandMention(query, response, brandName);

      expect(result.brandMentioned).toBeNull();
      expect(result.mentionType).toBe('indirect');
      expect(result.rankingPosition).toBeNull();
      expect(result.confidenceScore).toBe(30);
    });

    it('should detect negative sentiment', async () => {
      const query = 'What do you think about Brand X?';
      const response = 'Brand X is terrible and disappointing. The worst software I have used.';
      const brandName = 'Brand X';

      const result = (service as any).analyzeBrandMention(query, response, brandName);

      expect(result.sentiment).toBe('negative');
      expect(result.brandMentioned).toBe('Brand X');
    });
  });

  describe('createMonitoringJob', () => {
    it('should create a new monitoring job', async () => {
      const mockJob = {
        id: 1,
        brandId: 1,
        jobType: 'mention_scan' as const,
        status: 'pending' as const,
        scheduledAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        results: {},
        createdAt: new Date()
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockJob])
        })
      });

      const result = await service.createMonitoringJob(1, 'mention_scan');

      expect(result).toEqual(mockJob);
      expect(mockDb.insert).toHaveBeenCalledWith(monitoringJobs);
      expect(logger.info).toHaveBeenCalledWith('Created monitoring job: 1 for brand: 1');
    });
  });

  describe('getBrandMentions', () => {
    it('should fetch brand mentions with filters', async () => {
      const mockMentions = [
        {
          id: 1,
          brandId: 1,
          llmPlatform: 'openai',
          query: 'test query',
          response: 'test response',
          mentionType: 'direct',
          brandMentioned: 'Test Brand',
          rankingPosition: 1,
          sentiment: 'positive',
          confidenceScore: 95,
          contextSnippet: 'Test Brand is great',
          responseMetadata: {},
          createdAt: new Date()
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockMentions)
          })
        })
      });

      const result = await service.getBrandMentions(1, {
        platform: 'openai',
        sentiment: 'positive',
        limit: 10
      });

      expect(result).toEqual(mockMentions);
    });
  });

  describe('getMonitoringJobs', () => {
    it('should fetch monitoring job history', async () => {
      const mockJobs = [
        {
          id: 1,
          brandId: 1,
          jobType: 'mention_scan',
          status: 'completed',
          scheduledAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          errorMessage: null,
          results: { mentionsFound: 5 },
          createdAt: new Date()
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockJobs)
            })
          })
        })
      });

      const result = await service.getMonitoringJobs(1);

      expect(result).toEqual(mockJobs);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return list of supported platforms', () => {
      const platforms = service.getSupportedPlatforms();

      expect(platforms).toHaveLength(2);
      expect(platforms[0].name).toBe('openai');
      expect(platforms[1].name).toBe('anthropic');
      expect(platforms[0].enabled).toBe(true);
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const text = 'This is a great and excellent product with amazing features';
      const result = (service as any).analyzeSentiment(text, 'TestBrand');
      expect(result).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const text = 'This is a terrible and awful product with bad quality';
      const result = (service as any).analyzeSentiment(text, 'TestBrand');
      expect(result).toBe('negative');
    });

    it('should detect neutral sentiment', () => {
      const text = 'This is a product with some features';
      const result = (service as any).analyzeSentiment(text, 'TestBrand');
      expect(result).toBe('neutral');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Connection failed'))
          })
        })
      });

      await expect(service.getBrandMonitoringByUser(1)).rejects.toThrow(
        'Failed to fetch brand monitoring configurations'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch brand monitoring configurations:',
        expect.any(Error)
      );
    });

    it('should handle invalid data inputs', async () => {
      const invalidData = {
        userId: 1,
        brandName: '', // Invalid empty brand name
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'invalid' as any,
        isActive: true,
        settings: {}
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Validation error'))
        })
      });

      await expect(service.createBrandMonitoring(invalidData)).rejects.toThrow(
        'Failed to create brand monitoring configuration'
      );
    });
  });

  describe('platform integration', () => {
    it('should handle missing API keys gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const newService = new LLMMonitoringService();
      const platforms = newService.getSupportedPlatforms();

      expect(platforms).toHaveLength(0);
    });

    it('should respect rate limits', async () => {
      const platforms = service.getSupportedPlatforms();
      
      expect(platforms[0].rateLimitPerMinute).toBe(60);
      expect(platforms[1].rateLimitPerMinute).toBe(60);
    });

    it('should track API costs', () => {
      const platforms = service.getSupportedPlatforms();
      
      expect(platforms[0].costPerRequest).toBe(0.002);
      expect(platforms[1].costPerRequest).toBe(0.003);
    });
  });
});