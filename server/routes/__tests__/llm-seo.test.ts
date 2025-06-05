import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { llmSeoRoutes } from '../llm-seo.js';
import { LLMMonitoringService } from '../../services/llm-monitoring.service.js';
import { BrandAnalysisService } from '../../services/brand-analysis.service.js';

// Mock services
vi.mock('../../services/llm-monitoring.service.js');
vi.mock('../../services/brand-analysis.service.js');
vi.mock('../../middleware/consolidated-auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 1, activeTeamId: 1 };
    next();
  }
}));

describe('LLM SEO API Routes', () => {
  let app: express.Application;
  let mockLLMMonitoringService: any;
  let mockBrandAnalysisService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/llm-seo', llmSeoRoutes);

    mockLLMMonitoringService = {
      createBrandMonitoring: vi.fn(),
      getBrandMonitoringByUser: vi.fn(),
      updateBrandMonitoring: vi.fn(),
      deleteBrandMonitoring: vi.fn(),
      createMonitoringJob: vi.fn(),
      executeMonitoringJob: vi.fn(),
      getMonitoringJobs: vi.fn(),
      getBrandMentions: vi.fn(),
      getSupportedPlatforms: vi.fn(),
      testPlatformConnection: vi.fn()
    };

    mockBrandAnalysisService = {
      getBrandAnalytics: vi.fn(),
      calculateBrandHealthScore: vi.fn(),
      generateBrandInsights: vi.fn(),
      compareWithCompetitors: vi.fn()
    };

    // Mock the constructor calls
    vi.mocked(LLMMonitoringService).mockImplementation(() => mockLLMMonitoringService);
    vi.mocked(BrandAnalysisService).mockImplementation(() => mockBrandAnalysisService);
  });

  describe('POST /api/llm-seo/brands', () => {
    it('should create a new brand monitoring configuration', async () => {
      const brandData = {
        brandName: 'Test Brand',
        description: 'Test Description',
        trackingQueries: ['What is the best CRM?'],
        competitors: ['Competitor A'],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {}
      };

      const mockResult = {
        id: 1,
        ...brandData,
        userId: 1,
        teamId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockLLMMonitoringService.createBrandMonitoring.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/llm-seo/brands')
        .send(brandData)
        .expect(201);

      expect(response.body).toEqual(mockResult);
      expect(mockLLMMonitoringService.createBrandMonitoring).toHaveBeenCalledWith({
        ...brandData,
        userId: 1,
        teamId: 1
      });
    });

    it('should return 400 for invalid brand data', async () => {
      const invalidData = {
        brandName: '', // Invalid empty name
        trackingQueries: []
      };

      await request(app)
        .post('/api/llm-seo/brands')
        .send(invalidData)
        .expect(400);
    });

    it('should handle service errors', async () => {
      const brandData = {
        brandName: 'Test Brand',
        trackingQueries: ['test query'],
        competitors: [],
        monitoringFrequency: 'daily'
      };

      mockLLMMonitoringService.createBrandMonitoring.mockRejectedValue(
        new Error('Service error')
      );

      await request(app)
        .post('/api/llm-seo/brands')
        .send(brandData)
        .expect(500);
    });
  });

  describe('GET /api/llm-seo/brands', () => {
    it('should fetch all brand monitoring configurations', async () => {
      const mockBrands = [
        {
          id: 1,
          brandName: 'Brand 1',
          userId: 1,
          trackingQueries: ['query 1'],
          competitors: [],
          monitoringFrequency: 'daily',
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue(mockBrands);

      const response = await request(app)
        .get('/api/llm-seo/brands')
        .expect(200);

      expect(response.body).toEqual(mockBrands);
      expect(mockLLMMonitoringService.getBrandMonitoringByUser).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('GET /api/llm-seo/brands/:id', () => {
    it('should fetch specific brand monitoring configuration', async () => {
      const mockBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: ['query 1'],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([mockBrand]);

      const response = await request(app)
        .get('/api/llm-seo/brands/1')
        .expect(200);

      expect(response.body).toEqual(mockBrand);
    });

    it('should return 404 for non-existent brand', async () => {
      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([]);

      await request(app)
        .get('/api/llm-seo/brands/999')
        .expect(404);
    });

    it('should return 400 for invalid brand ID', async () => {
      await request(app)
        .get('/api/llm-seo/brands/invalid')
        .expect(400);
    });
  });

  describe('PUT /api/llm-seo/brands/:id', () => {
    it('should update brand monitoring configuration', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: ['query 1'],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updates = {
        brandName: 'Updated Brand',
        isActive: false
      };

      const updatedBrand = { ...existingBrand, ...updates };

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockLLMMonitoringService.updateBrandMonitoring.mockResolvedValue(updatedBrand);

      const response = await request(app)
        .put('/api/llm-seo/brands/1')
        .send(updates)
        .expect(200);

      expect(response.body).toEqual(updatedBrand);
      expect(mockLLMMonitoringService.updateBrandMonitoring).toHaveBeenCalledWith(1, updates);
    });

    it('should return 404 for non-existent brand', async () => {
      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([]);

      await request(app)
        .put('/api/llm-seo/brands/999')
        .send({ brandName: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/llm-seo/brands/:id', () => {
    it('should delete brand monitoring configuration', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockLLMMonitoringService.deleteBrandMonitoring.mockResolvedValue(undefined);

      await request(app)
        .delete('/api/llm-seo/brands/1')
        .expect(204);

      expect(mockLLMMonitoringService.deleteBrandMonitoring).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('POST /api/llm-seo/monitoring/:brandId/start', () => {
    it('should start monitoring campaign', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockJob = {
        id: 1,
        brandId: 1,
        jobType: 'mention_scan',
        status: 'pending',
        scheduledAt: new Date(),
        createdAt: new Date()
      };

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockLLMMonitoringService.createMonitoringJob.mockResolvedValue(mockJob);
      mockLLMMonitoringService.executeMonitoringJob.mockResolvedValue({});

      const response = await request(app)
        .post('/api/llm-seo/monitoring/1/start')
        .expect(202);

      expect(response.body).toMatchObject({
        message: 'Monitoring job started',
        jobId: 1,
        status: 'running'
      });
    });
  });

  describe('GET /api/llm-seo/monitoring/:brandId/status', () => {
    it('should get monitoring status', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockJobs = [
        {
          id: 1,
          brandId: 1,
          jobType: 'mention_scan',
          status: 'completed',
          completedAt: new Date(),
          createdAt: new Date()
        }
      ];

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockLLMMonitoringService.getMonitoringJobs.mockResolvedValue(mockJobs);

      const response = await request(app)
        .get('/api/llm-seo/monitoring/1/status')
        .expect(200);

      expect(response.body).toMatchObject({
        isActive: true,
        monitoringFrequency: 'daily',
        lastJobStatus: 'completed'
      });
    });
  });

  describe('GET /api/llm-seo/analytics/:brandId/dashboard', () => {
    it('should get analytics dashboard data', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAnalytics = {
        totalMentions: 10,
        mentionTrend: 'up',
        sentimentBreakdown: { positive: 8, neutral: 2, negative: 0 },
        platformBreakdown: { openai: 5, anthropic: 5 },
        avgRankingPosition: 2,
        competitorComparison: [],
        topQueries: [],
        timeSeriesData: []
      };

      const mockHealthScore = {
        overallScore: 85,
        visibility: 80,
        sentiment: 90,
        positioning: 85,
        competitiveAdvantage: 75,
        factors: []
      };

      const mockInsights = [
        {
          type: 'opportunity',
          title: 'Increased Brand Mentions',
          description: 'Brand mentions increased by 5 this week',
          priority: 'medium',
          data: {},
          createdAt: new Date()
        }
      ];

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockBrandAnalysisService.getBrandAnalytics.mockResolvedValue(mockAnalytics);
      mockBrandAnalysisService.calculateBrandHealthScore.mockResolvedValue(mockHealthScore);
      mockBrandAnalysisService.generateBrandInsights.mockResolvedValue(mockInsights);

      const response = await request(app)
        .get('/api/llm-seo/analytics/1/dashboard')
        .expect(200);

      expect(response.body).toMatchObject({
        analytics: mockAnalytics,
        healthScore: mockHealthScore,
        insights: mockInsights
      });
    });

    it('should accept date range parameters', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockBrandAnalysisService.getBrandAnalytics.mockResolvedValue({});
      mockBrandAnalysisService.calculateBrandHealthScore.mockResolvedValue({});
      mockBrandAnalysisService.generateBrandInsights.mockResolvedValue([]);

      await request(app)
        .get('/api/llm-seo/analytics/1/dashboard')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      expect(mockBrandAnalysisService.getBrandAnalytics).toHaveBeenCalledWith(
        1,
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      );
    });
  });

  describe('GET /api/llm-seo/analytics/:brandId/mentions', () => {
    it('should get brand mentions with filters', async () => {
      const existingBrand = {
        id: 1,
        brandName: 'Test Brand',
        userId: 1,
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMentions = [
        {
          id: 1,
          brandId: 1,
          llmPlatform: 'openai',
          query: 'test query',
          response: 'test response',
          mentionType: 'direct',
          sentiment: 'positive',
          createdAt: new Date()
        }
      ];

      mockLLMMonitoringService.getBrandMonitoringByUser.mockResolvedValue([existingBrand]);
      mockLLMMonitoringService.getBrandMentions.mockResolvedValue(mockMentions);

      const response = await request(app)
        .get('/api/llm-seo/analytics/1/mentions')
        .query({
          platform: 'openai',
          sentiment: 'positive',
          limit: '10',
          offset: '0'
        })
        .expect(200);

      expect(response.body.mentions).toEqual(mockMentions);
      expect(response.body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
        total: 1
      });
    });
  });

  describe('GET /api/llm-seo/platforms/supported', () => {
    it('should get supported platforms', async () => {
      const mockPlatforms = [
        {
          name: 'openai',
          enabled: true,
          rateLimitPerMinute: 60,
          costPerRequest: 0.002
        },
        {
          name: 'anthropic',
          enabled: true,
          rateLimitPerMinute: 60,
          costPerRequest: 0.003
        }
      ];

      mockLLMMonitoringService.getSupportedPlatforms.mockReturnValue(mockPlatforms);

      const response = await request(app)
        .get('/api/llm-seo/platforms/supported')
        .expect(200);

      expect(response.body.platforms).toEqual(mockPlatforms);
    });
  });

  describe('POST /api/llm-seo/platforms/test-connection', () => {
    it('should test platform connection successfully', async () => {
      mockLLMMonitoringService.testPlatformConnection.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/llm-seo/platforms/test-connection')
        .send({ platform: 'openai' })
        .expect(200);

      expect(response.body).toMatchObject({
        platform: 'openai',
        connected: true,
        message: 'Connection successful'
      });
    });

    it('should handle failed connection test', async () => {
      mockLLMMonitoringService.testPlatformConnection.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/llm-seo/platforms/test-connection')
        .send({ platform: 'anthropic' })
        .expect(200);

      expect(response.body).toMatchObject({
        platform: 'anthropic',
        connected: false,
        message: 'Connection failed'
      });
    });

    it('should return 400 for invalid platform', async () => {
      await request(app)
        .post('/api/llm-seo/platforms/test-connection')
        .send({ platform: 'invalid' })
        .expect(400);
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/llm-seo/brands')
        .send({
          brandName: '', // Invalid
          trackingQueries: 'not an array' // Invalid
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle service errors gracefully', async () => {
      mockLLMMonitoringService.getBrandMonitoringByUser.mockRejectedValue(
        new Error('Database error')
      );

      await request(app)
        .get('/api/llm-seo/brands')
        .expect(500);
    });

    it('should handle authentication errors', async () => {
      // Create app without auth middleware
      const noAuthApp = express();
      noAuthApp.use(express.json());
      
      // Mock auth middleware that fails
      const failingAuthMiddleware = (req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      };

      noAuthApp.use('/api/llm-seo', failingAuthMiddleware, llmSeoRoutes);

      await request(noAuthApp)
        .get('/api/llm-seo/brands')
        .expect(401);
    });
  });
});