import { MonitoringSchedulerService, type MonitoringJobType, type JobPriority } from '../monitoring-scheduler.service';
import { db } from '../../db/index';
import { brandMonitoring, monitoringJobs, llmMentions } from '../../../db/schema';
import { logger } from '../../lib/logger';
import { llmMonitoringService } from '../llm-monitoring.service';
import { enhancedMentionAnalysisService } from '../enhanced-mention-analysis.service';
import { brandRecommendationService } from '../brand-recommendation.service';

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

jest.mock('../llm-monitoring.service', () => ({
  llmMonitoringService: {
    queryLLMPlatform: jest.fn()
  }
}));

jest.mock('../enhanced-mention-analysis.service', () => ({
  enhancedMentionAnalysisService: {
    analyzeMentions: jest.fn()
  }
}));

jest.mock('../brand-recommendation.service', () => ({
  brandRecommendationService: {
    generateBrandAnalysisReport: jest.fn(),
    generateQuerySuggestions: jest.fn(),
    getBrandRecommendations: jest.fn(),
    updateRecommendationStatus: jest.fn()
  }
}));

describe('MonitoringSchedulerService', () => {
  let service: MonitoringSchedulerService;
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

  const mockJob = {
    id: 1,
    brandId: 1,
    jobType: 'brand_scan' as MonitoringJobType,
    status: 'pending' as const,
    scheduledAt: new Date(),
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    progress: 0,
    results: {},
    config: {
      queries: ['What is TestBrand?'],
      platforms: ['openai', 'anthropic']
    },
    createdAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = db as any;
    service = new MonitoringSchedulerService();

    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('start and stop', () => {
    it('should start the scheduler successfully', async () => {
      // Mock active brands query
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      // Mock last job run query
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      // Mock job insertion
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });

      await service.start();

      expect(service.getStatus().isRunning).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('[MonitoringScheduler] Starting monitoring scheduler');
      expect(logger.info).toHaveBeenCalledWith('[MonitoringScheduler] Monitoring scheduler started successfully');
    });

    it('should not start if already running', async () => {
      // Mock first start
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await service.start();
      
      // Try to start again
      await service.start();

      expect(logger.warn).toHaveBeenCalledWith('[MonitoringScheduler] Scheduler is already running');
    });

    it('should stop the scheduler gracefully', async () => {
      // Start first
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await service.start();
      await service.stop();

      expect(service.getStatus().isRunning).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('[MonitoringScheduler] Stopping monitoring scheduler');
      expect(logger.info).toHaveBeenCalledWith('[MonitoringScheduler] Monitoring scheduler stopped');
    });

    it('should handle start errors', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      await expect(service.start()).rejects.toThrow('Failed to start monitoring scheduler');
      expect(service.getStatus().isRunning).toBe(false);
    });
  });

  describe('scheduleBrandJobs', () => {
    beforeEach(() => {
      // Mock last job run queries to return empty (no previous jobs)
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      // Mock job insertion
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      });
    });

    it('should schedule jobs for active brand', async () => {
      await service.scheduleBrandJobs(mockBrand);

      expect(mockDb.insert).toHaveBeenCalledWith(monitoringJobs);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled') && expect.stringContaining('jobs for brand: TestBrand')
      );
    });

    it('should not schedule jobs if recent jobs exist', async () => {
      const recentJob = {
        ...mockJob,
        completedAt: new Date() // Very recent job
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([recentJob])
            })
          })
        })
      });

      await service.scheduleBrandJobs(mockBrand);

      // Should not insert any jobs
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle scheduling errors gracefully', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error('Insert failed'))
      });

      // Should not throw
      await service.scheduleBrandJobs(mockBrand);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule jobs for brand 1'),
        expect.any(Error)
      );
    });
  });

  describe('job execution', () => {
    beforeEach(() => {
      // Mock brand query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      // Mock job update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });
    });

    it('should execute brand scan job successfully', async () => {
      // Mock setTimeout to avoid real delays
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return null as any;
      });
      const brandScanJob = {
        ...mockJob,
        jobType: 'brand_scan' as MonitoringJobType,
        config: {
          queries: ['What is TestBrand?'],
          platforms: ['openai']
        }
      };

      // Mock LLM response
      (llmMonitoringService.queryLLMPlatform as jest.Mock).mockResolvedValue({
        query: 'What is TestBrand?',
        response: 'TestBrand is a great platform',
        brandMentioned: 'TestBrand',
        mentionType: 'direct',
        rankingPosition: 1,
        sentiment: 'positive',
        confidenceScore: 95,
        contextSnippet: 'TestBrand is great'
      });

      // Mock enhanced analysis
      (enhancedMentionAnalysisService.analyzeMentions as jest.Mock).mockResolvedValue([
        {
          mention: { brandName: 'TestBrand', mentionText: 'TestBrand' },
          sentiment: { score: 0.8, label: 'positive' },
          overallScore: 85
        }
      ]);

      // Execute the job using the private method
      const executeJobByType = (service as any).executeJobByType.bind(service);
      const result = await executeJobByType(brandScanJob);

      expect(result.queriesProcessed).toBe(1);
      expect(result.platformsQueried).toBe(1);
      expect(result.mentionsFound).toBe(1);
      expect(llmMonitoringService.queryLLMPlatform).toHaveBeenCalledWith(
        'openai',
        'What is TestBrand?',
        'TestBrand'
      );
    });

    it('should execute trend analysis job successfully', async () => {
      const trendJob = {
        ...mockJob,
        jobType: 'trend_analysis' as MonitoringJobType,
        config: { timeframe: 'weekly' }
      };

      // Mock brand analysis report
      (brandRecommendationService.generateBrandAnalysisReport as jest.Mock).mockResolvedValue({
        overallScore: 75,
        performance: { totalMentions: 10 },
        recommendations: [{ title: 'Test recommendation' }]
      });

      const executeJobByType = (service as any).executeJobByType.bind(service);
      const result = await executeJobByType(trendJob);

      expect(result.timeframe).toBe('weekly');
      expect(result.reportGenerated).toBe(true);
      expect(result.overallScore).toBe(75);
      expect(brandRecommendationService.generateBrandAnalysisReport).toHaveBeenCalled();
    });

    it('should execute recommendation sync job successfully', async () => {
      const syncJob = {
        ...mockJob,
        jobType: 'recommendation_sync' as MonitoringJobType,
        config: { 
          generateNewQueries: true,
          updateExisting: true
        }
      };

      // Mock query suggestions
      (brandRecommendationService.generateQuerySuggestions as jest.Mock).mockResolvedValue([
        'New query 1',
        'New query 2'
      ]);

      // Mock brand update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      // Mock recommendations query
      (brandRecommendationService.getBrandRecommendations as jest.Mock).mockResolvedValue([
        { id: 1, progress: 100 }
      ]);

      const executeJobByType = (service as any).executeJobByType.bind(service);
      const result = await executeJobByType(syncJob);

      expect(result.newQueriesGenerated).toBe(2);
      expect(result.syncCompleted).toBe(true);
      expect(brandRecommendationService.generateQuerySuggestions).toHaveBeenCalledWith(1, 10);
    });

    it('should execute health check job successfully', async () => {
      const healthJob = {
        ...mockJob,
        jobType: 'health_check' as MonitoringJobType
      };

      // Mock count query
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 5 }])
        })
      });

      const executeJobByType = (service as any).executeJobByType.bind(service);
      const result = await executeJobByType(healthJob);

      expect(result.scheduler).toBe(false); // Not started in test
      expect(result.queueSize).toBe(5);
      expect(result.processingJobs).toBe(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle unknown job types', async () => {
      const unknownJob = {
        ...mockJob,
        jobType: 'unknown_type' as MonitoringJobType
      };

      const executeJobByType = (service as any).executeJobByType.bind(service);
      await expect(executeJobByType(unknownJob)).rejects.toThrow('Unknown job type: unknown_type');
    });
  });

  describe('queueJob', () => {
    it('should queue a job successfully', async () => {
      const mockJobId = 123;

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: mockJobId }])
        })
      });

      const jobId = await service.queueJob(1, 'brand_scan', { test: true });

      expect(jobId).toBe(mockJobId);
      expect(mockDb.insert).toHaveBeenCalledWith(monitoringJobs);
      expect(logger.info).toHaveBeenCalledWith(
        '[MonitoringScheduler] Queued brand_scan job for brand 1: 123'
      );
    });

    it('should handle queue errors', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Queue failed'))
        })
      });

      await expect(service.queueJob(1, 'brand_scan')).rejects.toThrow('Failed to queue job');
    });
  });

  describe('cancelJob', () => {
    it('should cancel a pending job successfully', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      await service.cancelJob(1);

      expect(mockDb.update).toHaveBeenCalledWith(monitoringJobs);
      expect(logger.info).toHaveBeenCalledWith('[MonitoringScheduler] Cancelled job 1');
    });

    it('should handle cancel errors', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Cancel failed'))
        })
      });

      await expect(service.cancelJob(1)).rejects.toThrow('Failed to cancel job');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = [
        { status: 'pending', count: 5 },
        { status: 'running', count: 2 },
        { status: 'completed', count: 20 },
        { status: 'failed', count: 3 }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockResolvedValue(mockStats)
        })
      });

      const stats = await service.getQueueStats();

      expect(stats.total).toBe(30);
      expect(stats.pending).toBe(5);
      expect(stats.running).toBe(2);
      expect(stats.completed).toBe(20);
      expect(stats.failed).toBe(3);
      expect(stats.successRate).toBe(87); // 20 / (20 + 3) * 100
    });

    it('should handle stats query errors', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockRejectedValue(new Error('Stats failed'))
        })
      });

      const stats = await service.getQueueStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('interval calculations', () => {
    it('should calculate correct intervals for different frequencies', () => {
      const getIntervalMs = (service as any).getIntervalMs.bind(service);

      expect(getIntervalMs('hourly')).toBe(60 * 60 * 1000);
      expect(getIntervalMs('daily')).toBe(24 * 60 * 60 * 1000);
      expect(getIntervalMs('weekly')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(getIntervalMs('monthly')).toBe(30 * 24 * 60 * 60 * 1000);
      expect(getIntervalMs('unknown')).toBe(24 * 60 * 60 * 1000); // Default to daily
    });
  });

  describe('job progress updates', () => {
    it('should update job progress successfully', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      const updateJobProgress = (service as any).updateJobProgress.bind(service);
      await updateJobProgress(1, 50);

      expect(mockDb.update).toHaveBeenCalledWith(monitoringJobs);
    });

    it('should clamp progress values', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      const updateJobProgress = (service as any).updateJobProgress.bind(service);
      await updateJobProgress(1, 150); // Over 100

      const setCall = mockDb.update().set.mock.calls[0][0];
      expect(setCall.progress).toBe(100);
    });

    it('should handle progress update errors gracefully', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Update failed'))
        })
      });

      const updateJobProgress = (service as any).updateJobProgress.bind(service);
      
      // Should not throw
      await updateJobProgress(1, 50);

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('stuck job detection', () => {
    it('should detect and mark stuck jobs as failed', async () => {
      const stuckJob = {
        id: 1,
        status: 'running',
        startedAt: new Date(Date.now() - 400000) // 6+ minutes ago
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([stuckJob])
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });

      const checkStuckJobs = (service as any).checkStuckJobs.bind(service);
      await checkStuckJobs();

      expect(logger.warn).toHaveBeenCalledWith(
        '[MonitoringScheduler] Found 1 stuck jobs, marking as failed'
      );
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle stuck job detection errors', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Query failed'))
        })
      });

      const checkStuckJobs = (service as any).checkStuckJobs.bind(service);
      await checkStuckJobs();

      expect(logger.error).toHaveBeenCalledWith(
        '[MonitoringScheduler] Error checking stuck jobs:',
        expect.any(Error)
      );
    });
  });

  describe('getStatus', () => {
    it('should return current scheduler status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('currentlyProcessing');
      expect(status).toHaveProperty('maxConcurrentJobs');
      expect(status).toHaveProperty('queueProcessInterval');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.currentlyProcessing).toBe('number');
    });
  });

  describe('error handling in job execution', () => {
    beforeEach(() => {
      // Mock brand query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      // Mock job update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      });
    });

    it('should handle LLM query errors in brand scan', async () => {
      const brandScanJob = {
        ...mockJob,
        jobType: 'brand_scan' as MonitoringJobType,
        config: {
          queries: ['What is TestBrand?'],
          platforms: ['openai']
        }
      };

      // Mock LLM error
      (llmMonitoringService.queryLLMPlatform as jest.Mock).mockRejectedValue(
        new Error('LLM service error')
      );

      const executeJobByType = (service as any).executeJobByType.bind(service);
      const result = await executeJobByType(brandScanJob);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('LLM service error');
    });

    it('should handle brand not found error', async () => {
      // Mock brand not found
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const brandScanJob = {
        ...mockJob,
        jobType: 'brand_scan' as MonitoringJobType
      };

      const executeJobByType = (service as any).executeJobByType.bind(service);
      await expect(executeJobByType(brandScanJob)).rejects.toThrow('Brand not found: 1');
    });
  });

  describe('concurrent job processing', () => {
    it('should respect max concurrent job limits', () => {
      const status = service.getStatus();
      expect(status.maxConcurrentJobs).toBeGreaterThan(0);
      expect(status.currentlyProcessing).toBe(0);
    });

    it('should track currently processing jobs', () => {
      const currentlyProcessing = (service as any).currentlyProcessing;
      expect(currentlyProcessing).toBeInstanceOf(Set);
      expect(currentlyProcessing.size).toBe(0);
    });
  });
});