import { db } from '../db/index';
import { 
  brandMonitoring, 
  llmMentions, 
  monitoringJobs, 
  competitorMentions,
  type InsertBrandMonitoring,
  type SelectBrandMonitoring,
  type InsertLlmMention,
  type SelectLlmMention,
  type InsertMonitoringJob,
  type SelectMonitoringJob
} from '../../db/schema';
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm';
import { logger } from '../lib/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMPlatformConfig {
  name: 'openai' | 'anthropic' | 'google' | 'other';
  apiKey: string;
  enabled: boolean;
  rateLimitPerMinute: number;
  costPerRequest: number;
}

export interface BrandMentionResult {
  query: string;
  response: string;
  brandMentioned: string | null;
  mentionType: 'direct' | 'indirect' | 'competitor';
  rankingPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  confidenceScore: number;
  contextSnippet: string | null;
}

export interface MonitoringJobResult {
  totalQueries: number;
  mentionsFound: number;
  competitorMentions: number;
  avgRankingPosition: number | null;
  platformBreakdown: Record<string, number>;
  errors: string[];
}

export class LLMMonitoringService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private platforms: LLMPlatformConfig[] = [];

  constructor() {
    this.initializePlatforms();
  }

  private initializePlatforms() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.platforms.push({
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        enabled: true,
        rateLimitPerMinute: 60,
        costPerRequest: 0.002
      });
    }

    // Initialize Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.platforms.push({
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        enabled: true,
        rateLimitPerMinute: 60,
        costPerRequest: 0.003
      });
    }
  }

  /**
   * Create a new brand monitoring configuration
   */
  async createBrandMonitoring(data: Omit<InsertBrandMonitoring, 'id' | 'createdAt' | 'updatedAt'>): Promise<SelectBrandMonitoring> {
    try {
      logger.info(`Creating brand monitoring for: ${data.brandName}`);
      
      const [result] = await db
        .insert(brandMonitoring)
        .values(data)
        .returning();

      logger.info(`Brand monitoring created with ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Failed to create brand monitoring:', error);
      throw new Error('Failed to create brand monitoring configuration');
    }
  }

  /**
   * Get brand monitoring configurations for a user
   */
  async getBrandMonitoringByUser(userId: number, teamId?: number): Promise<SelectBrandMonitoring[]> {
    try {
      const conditions = teamId 
        ? and(eq(brandMonitoring.userId, userId), eq(brandMonitoring.teamId, teamId))
        : eq(brandMonitoring.userId, userId);

      return await db
        .select()
        .from(brandMonitoring)
        .where(conditions)
        .orderBy(desc(brandMonitoring.createdAt));
    } catch (error) {
      logger.error('Failed to fetch brand monitoring configurations:', error);
      throw new Error('Failed to fetch brand monitoring configurations');
    }
  }

  /**
   * Update brand monitoring configuration
   */
  async updateBrandMonitoring(
    id: number, 
    updates: Partial<Omit<InsertBrandMonitoring, 'id' | 'userId' | 'createdAt'>>
  ): Promise<SelectBrandMonitoring> {
    try {
      const [result] = await db
        .update(brandMonitoring)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(brandMonitoring.id, id))
        .returning();

      if (!result) {
        throw new Error('Brand monitoring configuration not found');
      }

      return result;
    } catch (error) {
      logger.error('Failed to update brand monitoring:', error);
      throw new Error('Failed to update brand monitoring configuration');
    }
  }

  /**
   * Delete brand monitoring configuration
   */
  async deleteBrandMonitoring(id: number, userId: number): Promise<void> {
    try {
      const result = await db
        .delete(brandMonitoring)
        .where(and(eq(brandMonitoring.id, id), eq(brandMonitoring.userId, userId)));

      logger.info(`Deleted brand monitoring configuration: ${id}`);
    } catch (error) {
      logger.error('Failed to delete brand monitoring:', error);
      throw new Error('Failed to delete brand monitoring configuration');
    }
  }

  /**
   * Query an LLM platform for brand mentions
   */
  async queryLLMPlatform(
    platform: 'openai' | 'anthropic',
    query: string,
    brandName: string
  ): Promise<BrandMentionResult> {
    try {
      let response: string;

      switch (platform) {
        case 'openai':
          if (!this.openai) {
            throw new Error('OpenAI not configured');
          }
          const openaiResponse = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: query }],
            max_tokens: 500,
            temperature: 0.7,
          });
          response = openaiResponse.choices[0]?.message?.content || '';
          break;

        case 'anthropic':
          if (!this.anthropic) {
            throw new Error('Anthropic not configured');
          }
          const anthropicResponse = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [{ role: 'user', content: query }],
          });
          response = anthropicResponse.content[0]?.type === 'text' 
            ? anthropicResponse.content[0].text 
            : '';
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Analyze the response for brand mentions
      return this.analyzeBrandMention(query, response, brandName);
    } catch (error) {
      logger.error(`Failed to query ${platform}:`, error);
      throw new Error(`Failed to query ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze LLM response for brand mentions
   */
  private analyzeBrandMention(
    query: string, 
    response: string, 
    brandName: string
  ): BrandMentionResult {
    const lowerResponse = response.toLowerCase();
    const lowerBrandName = brandName.toLowerCase();
    
    // Check for direct mention
    const directMention = lowerResponse.includes(lowerBrandName);
    
    // Find brand position in response (approximate)
    let rankingPosition: number | null = null;
    if (directMention) {
      const sentences = response.split(/[.!?]+/);
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].toLowerCase().includes(lowerBrandName)) {
          rankingPosition = i + 1;
          break;
        }
      }
    }

    // Extract context snippet
    let contextSnippet: string | null = null;
    if (directMention) {
      const brandIndex = lowerResponse.indexOf(lowerBrandName);
      const start = Math.max(0, brandIndex - 50);
      const end = Math.min(response.length, brandIndex + lowerBrandName.length + 50);
      contextSnippet = response.substring(start, end);
    }

    // Simple sentiment analysis (basic implementation)
    const sentiment = this.analyzeSentiment(contextSnippet || response, brandName);

    return {
      query,
      response,
      brandMentioned: directMention ? brandName : null,
      mentionType: directMention ? 'direct' : 'indirect',
      rankingPosition,
      sentiment,
      confidenceScore: directMention ? 95 : 30,
      contextSnippet
    };
  }

  /**
   * Basic sentiment analysis
   */
  private analyzeSentiment(text: string, brandName: string): 'positive' | 'neutral' | 'negative' {
    const lowerText = text.toLowerCase();
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'best', 'outstanding', 'fantastic', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'horrible', 'disappointing', 'poor', 'inadequate'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Create a monitoring job
   */
  async createMonitoringJob(
    brandId: number, 
    jobType: 'mention_scan' | 'competitor_analysis' | 'optimization_check',
    scheduledAt: Date = new Date()
  ): Promise<SelectMonitoringJob> {
    try {
      const [result] = await db
        .insert(monitoringJobs)
        .values({
          brandId,
          jobType,
          scheduledAt,
          status: 'pending'
        })
        .returning();

      logger.info(`Created monitoring job: ${result.id} for brand: ${brandId}`);
      return result;
    } catch (error) {
      logger.error('Failed to create monitoring job:', error);
      throw new Error('Failed to create monitoring job');
    }
  }

  /**
   * Execute a monitoring job
   */
  async executeMonitoringJob(jobId: number): Promise<MonitoringJobResult> {
    try {
      // Update job status to running
      await db
        .update(monitoringJobs)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(monitoringJobs.id, jobId));

      // Get job details
      const job = await db
        .select()
        .from(monitoringJobs)
        .where(eq(monitoringJobs.id, jobId))
        .limit(1);

      if (!job[0]) {
        throw new Error('Monitoring job not found');
      }

      // Get brand configuration
      const brand = await db
        .select()
        .from(brandMonitoring)
        .where(eq(brandMonitoring.id, job[0].brandId))
        .limit(1);

      if (!brand[0]) {
        throw new Error('Brand configuration not found');
      }

      const results: MonitoringJobResult = {
        totalQueries: 0,
        mentionsFound: 0,
        competitorMentions: 0,
        avgRankingPosition: null,
        platformBreakdown: {},
        errors: []
      };

      // Process each tracking query
      for (const query of brand[0].trackingQueries || []) {
        results.totalQueries++;

        // Query each enabled platform
        for (const platform of this.platforms.filter(p => p.enabled)) {
          try {
            if (platform.name === 'openai' || platform.name === 'anthropic') {
              const mentionResult = await this.queryLLMPlatform(platform.name, query, brand[0].brandName);
              
              // Store the mention
              const mentionData: Omit<InsertLlmMention, 'id' | 'createdAt'> = {
                brandId: brand[0].id,
                llmPlatform: platform.name,
                query: mentionResult.query,
                response: mentionResult.response,
                mentionType: mentionResult.mentionType,
                brandMentioned: mentionResult.brandMentioned,
                rankingPosition: mentionResult.rankingPosition,
                sentiment: mentionResult.sentiment,
                confidenceScore: mentionResult.confidenceScore,
                contextSnippet: mentionResult.contextSnippet,
                responseMetadata: {}
              };

              await db.insert(llmMentions).values(mentionData);

              // Update results
              if (mentionResult.brandMentioned) {
                results.mentionsFound++;
                results.platformBreakdown[platform.name] = (results.platformBreakdown[platform.name] || 0) + 1;
              }

              // Add small delay to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            const errorMessage = `Platform ${platform.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMessage);
            logger.error(errorMessage);
          }
        }
      }

      // Calculate average ranking position
      if (results.mentionsFound > 0) {
        const mentions = await db
          .select()
          .from(llmMentions)
          .where(and(
            eq(llmMentions.brandId, brand[0].id),
            gte(llmMentions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          ));

        const validPositions = mentions
          .map(m => m.rankingPosition)
          .filter((pos): pos is number => pos !== null);
        
        if (validPositions.length > 0) {
          results.avgRankingPosition = Math.round(
            validPositions.reduce((sum, pos) => sum + pos, 0) / validPositions.length
          );
        }
      }

      // Update job as completed
      await db
        .update(monitoringJobs)
        .set({ 
          status: 'completed', 
          completedAt: new Date(),
          results: results
        })
        .where(eq(monitoringJobs.id, jobId));

      logger.info(`Completed monitoring job: ${jobId}`);
      return results;
    } catch (error) {
      // Update job as failed
      await db
        .update(monitoringJobs)
        .set({ 
          status: 'failed', 
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(monitoringJobs.id, jobId));

      logger.error('Failed to execute monitoring job:', error);
      throw error;
    }
  }

  /**
   * Get brand mentions with filtering
   */
  async getBrandMentions(
    brandId: number,
    filters: {
      platform?: string;
      sentiment?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SelectLlmMention[]> {
    try {
      let conditions = eq(llmMentions.brandId, brandId);

      if (filters.platform) {
        conditions = and(conditions, eq(llmMentions.llmPlatform, filters.platform));
      }

      if (filters.sentiment) {
        conditions = and(conditions, eq(llmMentions.sentiment, filters.sentiment));
      }

      if (filters.startDate) {
        conditions = and(conditions, gte(llmMentions.createdAt, filters.startDate));
      }

      if (filters.endDate) {
        conditions = and(conditions, lte(llmMentions.createdAt, filters.endDate));
      }

      let query = db
        .select()
        .from(llmMentions)
        .where(conditions)
        .orderBy(desc(llmMentions.createdAt));

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      logger.error('Failed to fetch brand mentions:', error);
      throw new Error('Failed to fetch brand mentions');
    }
  }

  /**
   * Get monitoring job history
   */
  async getMonitoringJobs(brandId: number, limit: number = 50): Promise<SelectMonitoringJob[]> {
    try {
      return await db
        .select()
        .from(monitoringJobs)
        .where(eq(monitoringJobs.brandId, brandId))
        .orderBy(desc(monitoringJobs.createdAt))
        .limit(limit);
    } catch (error) {
      logger.error('Failed to fetch monitoring jobs:', error);
      throw new Error('Failed to fetch monitoring jobs');
    }
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): LLMPlatformConfig[] {
    return this.platforms;
  }

  /**
   * Test platform connection
   */
  async testPlatformConnection(platform: 'openai' | 'anthropic'): Promise<boolean> {
    try {
      const testQuery = "Hello, this is a test query.";
      await this.queryLLMPlatform(platform, testQuery, "test");
      return true;
    } catch (error) {
      logger.error(`Platform ${platform} connection test failed:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const llmMonitoringService = new LLMMonitoringService();