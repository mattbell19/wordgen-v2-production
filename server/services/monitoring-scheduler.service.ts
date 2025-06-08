import { db } from '../db/index';
import { 
  brandMonitoring, 
  monitoringJobs, 
  llmMentions,
  type SelectBrandMonitoring,
  type SelectMonitoringJob,
  type InsertMonitoringJob
} from '../../db/schema';
import { eq, and, gte, lte, desc, inArray, sql } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { llmMonitoringService } from './llm-monitoring.service';
import { enhancedMentionAnalysisService } from './enhanced-mention-analysis.service';
import { brandRecommendationService } from './brand-recommendation.service';
import { aiQueryGeneratorService } from './ai-query-generator.service';

/**
 * Job types supported by the monitoring system
 */
export type MonitoringJobType = 
  | 'brand_scan'           // Scan all queries for a brand across LLM platforms
  | 'query_analysis'       // Analyze specific queries with enhanced analysis
  | 'trend_analysis'       // Generate trend reports for a timeframe
  | 'recommendation_sync'  // Generate and update recommendations
  | 'competitive_scan'     // Scan for competitive mentions
  | 'health_check';        // System health and status check

/**
 * Job priority levels
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Job execution status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Monitoring schedule configuration
 */
export interface MonitoringSchedule {
  id?: number;
  brandId: number;
  jobType: MonitoringJobType;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
  config: Record<string, any>;
}

/**
 * Job queue item
 */
export interface QueuedJob {
  id?: number;
  brandId: number;
  jobType: MonitoringJobType;
  priority: JobPriority;
  status: JobStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  progress: number; // 0-100
  results?: Record<string, any>;
  config: Record<string, any>;
  retryCount: number;
  maxRetries: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  successRate: number;
}

/**
 * Monitoring Scheduler Service
 * 
 * This service manages the scheduling and execution of brand monitoring jobs,
 * coordinating between different analysis services to provide comprehensive
 * brand monitoring automation.
 */
export class MonitoringSchedulerService {
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly QUEUE_PROCESS_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONCURRENT_JOBS = 5;
  private readonly JOB_TIMEOUT = 300000; // 5 minutes
  private currentlyProcessing = new Set<number>();

  /**
   * Start the monitoring scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[MonitoringScheduler] Scheduler is already running');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('[MonitoringScheduler] Starting monitoring scheduler');

      // Schedule pending jobs for active brands
      await this.scheduleActiveBrands();

      // Start the job processing loop
      this.processingInterval = setInterval(async () => {
        try {
          await this.processJobQueue();
        } catch (error) {
          logger.error('[MonitoringScheduler] Error in processing loop:', error);
        }
      }, this.QUEUE_PROCESS_INTERVAL);

      logger.info('[MonitoringScheduler] Monitoring scheduler started successfully');

    } catch (error) {
      this.isRunning = false;
      logger.error('[MonitoringScheduler] Failed to start scheduler:', error);
      throw new Error(`Failed to start monitoring scheduler: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop the monitoring scheduler
   */
  async stop(): Promise<void> {
    logger.info('[MonitoringScheduler] Stopping monitoring scheduler');
    
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Wait for currently processing jobs to complete
    let attempts = 0;
    while (this.currentlyProcessing.size > 0 && attempts < 30) {
      logger.info(`[MonitoringScheduler] Waiting for ${this.currentlyProcessing.size} jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (this.currentlyProcessing.size > 0) {
      logger.warn(`[MonitoringScheduler] Force stopping with ${this.currentlyProcessing.size} jobs still running`);
    }

    logger.info('[MonitoringScheduler] Monitoring scheduler stopped');
  }

  /**
   * Schedule jobs for all active brands
   */
  private async scheduleActiveBrands(): Promise<void> {
    try {
      const activeBrands = await db
        .select()
        .from(brandMonitoring)
        .where(eq(brandMonitoring.isActive, true));

      logger.info(`[MonitoringScheduler] Found ${activeBrands.length} active brands to schedule`);

      for (const brand of activeBrands) {
        await this.scheduleBrandJobs(brand);
      }

    } catch (error) {
      logger.error('[MonitoringScheduler] Failed to schedule active brands:', error);
    }
  }

  /**
   * Schedule jobs for a specific brand
   */
  async scheduleBrandJobs(brand: SelectBrandMonitoring): Promise<void> {
    try {
      const now = new Date();
      const jobs: Omit<InsertMonitoringJob, 'id' | 'createdAt'>[] = [];

      // Schedule brand scan based on monitoring frequency
      const lastScan = await this.getLastJobRun(brand.id, 'brand_scan');
      const scanInterval = this.getIntervalMs(brand.monitoringFrequency);
      
      if (!lastScan || (now.getTime() - lastScan.getTime()) >= scanInterval) {
        jobs.push({
          brandId: brand.id,
          jobType: 'brand_scan',
          status: 'pending',
          scheduledAt: now,
          config: {
            queries: brand.trackingQueries,
            platforms: ['openai', 'anthropic'],
            priority: 'normal'
          }
        });
      }

      // Schedule weekly trend analysis
      const lastTrend = await this.getLastJobRun(brand.id, 'trend_analysis');
      const weekInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (!lastTrend || (now.getTime() - lastTrend.getTime()) >= weekInterval) {
        jobs.push({
          brandId: brand.id,
          jobType: 'trend_analysis',
          status: 'pending',
          scheduledAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes delay
          config: {
            timeframe: 'weekly',
            generateReport: true
          }
        });
      }

      // Schedule monthly recommendation sync
      const lastRecommendation = await this.getLastJobRun(brand.id, 'recommendation_sync');
      const monthInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (!lastRecommendation || (now.getTime() - lastRecommendation.getTime()) >= monthInterval) {
        jobs.push({
          brandId: brand.id,
          jobType: 'recommendation_sync',
          status: 'pending',
          scheduledAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutes delay
          config: {
            generateNewQueries: true,
            updateExisting: true
          }
        });
      }

      // Insert jobs into database
      if (jobs.length > 0) {
        for (const job of jobs) {
          await db.insert(monitoringJobs).values(job);
        }
        logger.info(`[MonitoringScheduler] Scheduled ${jobs.length} jobs for brand: ${brand.brandName}`);
      }

    } catch (error) {
      logger.error(`[MonitoringScheduler] Failed to schedule jobs for brand ${brand.id}:`, error);
    }
  }

  /**
   * Process the job queue
   */
  private async processJobQueue(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Check for stuck jobs (running too long)
      await this.checkStuckJobs();

      // Get pending jobs ordered by priority and scheduled time
      const availableSlots = this.MAX_CONCURRENT_JOBS - this.currentlyProcessing.size;
      
      if (availableSlots <= 0) {
        return; // All slots occupied
      }

      const pendingJobs = await db
        .select()
        .from(monitoringJobs)
        .where(
          and(
            eq(monitoringJobs.status, 'pending'),
            lte(monitoringJobs.scheduledAt, new Date())
          )
        )
        .orderBy(desc(monitoringJobs.scheduledAt))
        .limit(availableSlots);

      if (pendingJobs.length === 0) {
        return; // No pending jobs
      }

      logger.info(`[MonitoringScheduler] Processing ${pendingJobs.length} pending jobs`);

      // Process jobs concurrently
      const promises = pendingJobs.map(job => this.executeJob(job));
      await Promise.allSettled(promises);

    } catch (error) {
      logger.error('[MonitoringScheduler] Error processing job queue:', error);
    }
  }

  /**
   * Execute a monitoring job
   */
  private async executeJob(job: SelectMonitoringJob): Promise<void> {
    const jobId = job.id;
    this.currentlyProcessing.add(jobId);

    try {
      logger.info(`[MonitoringScheduler] Starting job ${jobId} (${job.jobType}) for brand ${job.brandId}`);

      // Update job status to running
      await db
        .update(monitoringJobs)
        .set({ 
          status: 'running', 
          startedAt: new Date(),
          progress: 0
        })
        .where(eq(monitoringJobs.id, jobId));

      // Execute job based on type
      const results = await this.executeJobByType(job);

      // Update job as completed
      await db
        .update(monitoringJobs)
        .set({ 
          status: 'completed', 
          completedAt: new Date(),
          progress: 100,
          results
        })
        .where(eq(monitoringJobs.id, jobId));

      logger.info(`[MonitoringScheduler] Completed job ${jobId} successfully`);

    } catch (error) {
      logger.error(`[MonitoringScheduler] Job ${jobId} failed:`, error);

      // Update job as failed
      await db
        .update(monitoringJobs)
        .set({ 
          status: 'failed', 
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(monitoringJobs.id, jobId));

      // Consider retry logic here if needed

    } finally {
      this.currentlyProcessing.delete(jobId);
    }
  }

  /**
   * Execute job based on its type
   */
  private async executeJobByType(job: SelectMonitoringJob): Promise<Record<string, any>> {
    switch (job.jobType) {
      case 'brand_scan':
        return await this.executeBrandScan(job);
      
      case 'query_analysis':
        return await this.executeQueryAnalysis(job);
      
      case 'trend_analysis':
        return await this.executeTrendAnalysis(job);
      
      case 'recommendation_sync':
        return await this.executeRecommendationSync(job);
      
      case 'competitive_scan':
        return await this.executeCompetitiveScan(job);
      
      case 'health_check':
        return await this.executeHealthCheck(job);
      
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
  }

  /**
   * Execute brand scan job
   */
  private async executeBrandScan(job: SelectMonitoringJob): Promise<Record<string, any>> {
    const config = job.config as any;
    const queries = config.queries || [];
    const platforms = config.platforms || ['openai', 'anthropic'];
    
    let mentionsFound = 0;
    let errors: string[] = [];

    // Get brand info
    const [brand] = await db
      .select()
      .from(brandMonitoring)
      .where(eq(brandMonitoring.id, job.brandId));

    if (!brand) {
      throw new Error(`Brand not found: ${job.brandId}`);
    }

    // Update progress
    await this.updateJobProgress(job.id, 10);

    // Process each query on each platform
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      for (const platform of platforms) {
        try {
          // Query the LLM platform
          const result = await llmMonitoringService.queryLLMPlatform(
            platform as any,
            query,
            brand.brandName
          );

          // If brand was mentioned, analyze it further
          if (result.brandMentioned) {
            const analysisResult = await enhancedMentionAnalysisService.analyzeMentions({
              query: result.query,
              response: result.response,
              brandName: brand.brandName,
              competitors: brand.competitors || [],
              llmPlatform: platform,
              analysisDepth: 'detailed'
            });

            mentionsFound += analysisResult.length;
          }

          // Update progress
          const progress = 10 + ((i * platforms.length + platforms.indexOf(platform) + 1) / (queries.length * platforms.length)) * 80;
          await this.updateJobProgress(job.id, Math.round(progress));

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          const errorMsg = `Failed to query ${platform} for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.warn(`[MonitoringScheduler] ${errorMsg}`);
        }
      }
    }

    return {
      queriesProcessed: queries.length,
      platformsQueried: platforms.length,
      mentionsFound,
      errors,
      brandId: job.brandId,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Execute query analysis job
   */
  private async executeQueryAnalysis(job: SelectMonitoringJob): Promise<Record<string, any>> {
    const config = job.config as any;
    const queryIds = config.queryIds || [];
    
    // Get mentions to analyze
    const mentions = await db
      .select()
      .from(llmMentions)
      .where(inArray(llmMentions.id, queryIds));

    await this.updateJobProgress(job.id, 20);

    const analysisResults = [];
    
    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i];
      
      try {
        const analysis = await enhancedMentionAnalysisService.analyzeMentions({
          query: mention.query,
          response: mention.response,
          brandName: mention.brandMentioned || '',
          llmPlatform: mention.llmPlatform,
          analysisDepth: 'comprehensive'
        });

        analysisResults.push(...analysis);

        const progress = 20 + ((i + 1) / mentions.length) * 70;
        await this.updateJobProgress(job.id, Math.round(progress));

      } catch (error) {
        logger.warn(`[MonitoringScheduler] Failed to analyze mention ${mention.id}:`, error);
      }
    }

    return {
      mentionsAnalyzed: mentions.length,
      analysisResults: analysisResults.length,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Execute trend analysis job
   */
  private async executeTrendAnalysis(job: SelectMonitoringJob): Promise<Record<string, any>> {
    const config = job.config as any;
    const timeframe = config.timeframe || 'weekly';
    
    await this.updateJobProgress(job.id, 20);

    // Calculate timeframe dates
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    await this.updateJobProgress(job.id, 40);

    // Generate brand analysis report
    const report = await brandRecommendationService.generateBrandAnalysisReport(
      job.brandId,
      { startDate, endDate }
    );

    await this.updateJobProgress(job.id, 90);

    return {
      timeframe,
      reportGenerated: true,
      overallScore: report.overallScore,
      totalMentions: report.performance.totalMentions,
      recommendationsCount: report.recommendations.length,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Execute recommendation sync job
   */
  private async executeRecommendationSync(job: SelectMonitoringJob): Promise<Record<string, any>> {
    const config = job.config as any;
    
    await this.updateJobProgress(job.id, 20);

    let newQueriesGenerated = 0;
    
    // Generate new queries if requested
    if (config.generateNewQueries) {
      try {
        const suggestions = await brandRecommendationService.generateQuerySuggestions(
          job.brandId,
          10
        );
        newQueriesGenerated = suggestions.length;

        await this.updateJobProgress(job.id, 60);

        // Update brand monitoring with new queries (if any good ones found)
        if (suggestions.length > 0) {
          const [brand] = await db
            .select()
            .from(brandMonitoring)
            .where(eq(brandMonitoring.id, job.brandId));

          if (brand) {
            const updatedQueries = [...(brand.trackingQueries || []), ...suggestions.slice(0, 5)];
            await db
              .update(brandMonitoring)
              .set({ 
                trackingQueries: updatedQueries,
                updatedAt: new Date()
              })
              .where(eq(brandMonitoring.id, job.brandId));
          }
        }

      } catch (error) {
        logger.warn(`[MonitoringScheduler] Failed to generate new queries for brand ${job.brandId}:`, error);
      }
    }

    await this.updateJobProgress(job.id, 80);

    // Update existing recommendations if requested
    if (config.updateExisting) {
      const recommendations = await brandRecommendationService.getBrandRecommendations(
        job.brandId,
        { status: 'in_progress', limit: 10 }
      );

      // Auto-complete recommendations that are 100% progress
      for (const rec of recommendations) {
        if (rec.progress >= 100) {
          await brandRecommendationService.updateRecommendationStatus(
            rec.id,
            'completed',
            100
          );
        }
      }
    }

    return {
      newQueriesGenerated,
      syncCompleted: true,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Execute competitive scan job
   */
  private async executeCompetitiveScan(job: SelectMonitoringJob): Promise<Record<string, any>> {
    // Implementation for competitive scanning
    await this.updateJobProgress(job.id, 50);
    
    // This would involve scanning for competitor mentions and analysis
    // For now, return basic results
    
    return {
      competitiveScanCompleted: true,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Execute health check job
   */
  private async executeHealthCheck(job: SelectMonitoringJob): Promise<Record<string, any>> {
    await this.updateJobProgress(job.id, 25);

    const healthStatus = {
      scheduler: this.isRunning,
      queueSize: 0,
      processingJobs: this.currentlyProcessing.size,
      timestamp: new Date().toISOString()
    };

    // Check queue size
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(monitoringJobs)
      .where(eq(monitoringJobs.status, 'pending'));

    healthStatus.queueSize = count;

    await this.updateJobProgress(job.id, 100);

    return healthStatus;
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: number, progress: number): Promise<void> {
    try {
      await db
        .update(monitoringJobs)
        .set({ progress: Math.max(0, Math.min(100, progress)) })
        .where(eq(monitoringJobs.id, jobId));
    } catch (error) {
      // Don't throw on progress update errors
      logger.warn(`[MonitoringScheduler] Failed to update progress for job ${jobId}:`, error);
    }
  }

  /**
   * Check for stuck jobs and mark them as failed
   */
  private async checkStuckJobs(): Promise<void> {
    try {
      const stuckJobsThreshold = new Date(Date.now() - this.JOB_TIMEOUT);
      
      const stuckJobs = await db
        .select()
        .from(monitoringJobs)
        .where(
          and(
            eq(monitoringJobs.status, 'running'),
            lte(monitoringJobs.startedAt!, stuckJobsThreshold)
          )
        );

      if (stuckJobs.length > 0) {
        logger.warn(`[MonitoringScheduler] Found ${stuckJobs.length} stuck jobs, marking as failed`);
        
        for (const job of stuckJobs) {
          await db
            .update(monitoringJobs)
            .set({ 
              status: 'failed', 
              completedAt: new Date(),
              errorMessage: 'Job timeout - exceeded maximum execution time'
            })
            .where(eq(monitoringJobs.id, job.id));

          this.currentlyProcessing.delete(job.id);
        }
      }

    } catch (error) {
      logger.error('[MonitoringScheduler] Error checking stuck jobs:', error);
    }
  }

  /**
   * Get last job run time for a brand and job type
   */
  private async getLastJobRun(brandId: number, jobType: MonitoringJobType): Promise<Date | null> {
    try {
      const [lastJob] = await db
        .select()
        .from(monitoringJobs)
        .where(
          and(
            eq(monitoringJobs.brandId, brandId),
            eq(monitoringJobs.jobType, jobType),
            eq(monitoringJobs.status, 'completed')
          )
        )
        .orderBy(desc(monitoringJobs.completedAt))
        .limit(1);

      return lastJob?.completedAt || null;

    } catch (error) {
      logger.warn(`[MonitoringScheduler] Failed to get last job run for brand ${brandId}:`, error);
      return null;
    }
  }

  /**
   * Get interval in milliseconds for monitoring frequency
   */
  private getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const stats = await db
        .select({
          status: monitoringJobs.status,
          count: sql<number>`count(*)`
        })
        .from(monitoringJobs)
        .groupBy(monitoringJobs.status);

      const statMap = stats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {} as Record<string, number>);

      const total = stats.reduce((sum, stat) => sum + stat.count, 0);
      const completed = statMap.completed || 0;
      const failed = statMap.failed || 0;
      const successRate = total > 0 ? Math.round((completed / (completed + failed)) * 100) : 0;

      // Calculate average processing time (simplified)
      const avgProcessingTime = 120; // Default 2 minutes, would need more complex query for real calculation

      return {
        total,
        pending: statMap.pending || 0,
        running: statMap.running || 0,
        completed,
        failed,
        avgProcessingTime,
        successRate
      };

    } catch (error) {
      logger.error('[MonitoringScheduler] Failed to get queue stats:', error);
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        successRate: 0
      };
    }
  }

  /**
   * Manually queue a job
   */
  async queueJob(
    brandId: number,
    jobType: MonitoringJobType,
    config: Record<string, any> = {},
    priority: JobPriority = 'normal',
    scheduledAt: Date = new Date()
  ): Promise<number> {
    try {
      const [job] = await db
        .insert(monitoringJobs)
        .values({
          brandId,
          jobType,
          status: 'pending',
          scheduledAt,
          config
        })
        .returning();

      logger.info(`[MonitoringScheduler] Queued ${jobType} job for brand ${brandId}: ${job.id}`);
      return job.id;

    } catch (error) {
      logger.error('[MonitoringScheduler] Failed to queue job:', error);
      throw new Error(`Failed to queue job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: number): Promise<void> {
    try {
      await db
        .update(monitoringJobs)
        .set({ 
          status: 'cancelled', 
          completedAt: new Date()
        })
        .where(
          and(
            eq(monitoringJobs.id, jobId),
            eq(monitoringJobs.status, 'pending')
          )
        );

      logger.info(`[MonitoringScheduler] Cancelled job ${jobId}`);

    } catch (error) {
      logger.error(`[MonitoringScheduler] Failed to cancel job ${jobId}:`, error);
      throw new Error('Failed to cancel job');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    currentlyProcessing: number;
    maxConcurrentJobs: number;
    queueProcessInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      currentlyProcessing: this.currentlyProcessing.size,
      maxConcurrentJobs: this.MAX_CONCURRENT_JOBS,
      queueProcessInterval: this.QUEUE_PROCESS_INTERVAL
    };
  }
}

// Export singleton instance
export const monitoringSchedulerService = new MonitoringSchedulerService();