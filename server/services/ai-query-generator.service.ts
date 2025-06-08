import { db } from '../db/index';
import { brandMonitoring, type SelectBrandMonitoring } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Interface for a generated query with metadata
 */
export interface GeneratedQuery {
  text: string;
  category: 'direct' | 'comparative' | 'use_case' | 'problem_solving' | 'industry_specific';
  priority: number; // 1-100, higher = more important
  estimatedRelevance: number; // 1-100, how relevant this query is for the brand
  explanation?: string; // Why this query was generated
}

/**
 * Query generation request parameters
 */
export interface QueryGenerationRequest {
  brandName: string;
  industry?: string;
  description?: string;
  targetAudience?: string;
  keyProducts?: string[];
  competitors?: string[];
  existingQueries?: string[]; // To avoid duplicates
  count?: number; // Number of queries to generate (default: 25)
  categories?: string[]; // Specific categories to focus on
}

/**
 * Query generation response
 */
export interface QueryGenerationResponse {
  queries: GeneratedQuery[];
  metadata: {
    totalGenerated: number;
    categoryBreakdown: Record<string, number>;
    estimatedCost: number;
    processingTimeMs: number;
  };
}

/**
 * AI Query Generation Service
 * 
 * This service uses AI to automatically generate relevant test queries for brand monitoring.
 * It creates diverse, high-quality queries across multiple categories to ensure comprehensive
 * brand visibility testing across LLM platforms.
 */
export class AIQueryGeneratorService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    this.initializeAIClients();
  }

  /**
   * Initialize AI clients based on available API keys
   */
  private initializeAIClients(): void {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder_openai_key') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 15000, // 15 second timeout
        maxRetries: 2,
      });
      logger.info('[AIQueryGenerator] OpenAI client initialized with timeout');
    }

    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder_anthropic_key') {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        timeout: 15000, // 15 second timeout
        maxRetries: 2,
      });
      logger.info('[AIQueryGenerator] Anthropic client initialized with timeout');
    }

    if (!this.openai && !this.anthropic) {
      logger.warn('[AIQueryGenerator] No AI clients available - query generation will be limited');
    }
  }

  /**
   * Generate queries for a brand
   */
  async generateQueries(request: QueryGenerationRequest): Promise<QueryGenerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info(`[AIQueryGenerator] Generating queries for brand: ${request.brandName}`);

      // Validate request
      this.validateRequest(request);

      // Use the best available AI client
      const aiClient = this.getBestAvailableClient();
      if (!aiClient) {
        throw new Error('No AI clients available for query generation');
      }

      // Generate queries using AI with fallback
      let queries: GeneratedQuery[];
      try {
        queries = await this.generateQueriesWithAI(request, aiClient);
      } catch (error) {
        logger.warn('[AIQueryGenerator] All AI services failed, using fallback templates:', error);
        queries = this.generateFallbackQueries(request);
      }

      // Post-process and enhance queries
      const enhancedQueries = await this.enhanceQueries(queries, request);

      // Calculate metadata
      const processingTimeMs = Date.now() - startTime;
      const categoryBreakdown = this.calculateCategoryBreakdown(enhancedQueries);
      const estimatedCost = this.calculateEstimatedCost(enhancedQueries.length);

      const response: QueryGenerationResponse = {
        queries: enhancedQueries,
        metadata: {
          totalGenerated: enhancedQueries.length,
          categoryBreakdown,
          estimatedCost,
          processingTimeMs
        }
      };

      logger.info(`[AIQueryGenerator] Generated ${enhancedQueries.length} queries in ${processingTimeMs}ms`);
      return response;

    } catch (error) {
      logger.error('[AIQueryGenerator] Query generation failed:', error);
      throw new Error(`Failed to generate queries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate queries for an existing brand monitoring configuration
   */
  async generateQueriesForBrand(brandId: number, count: number = 25): Promise<QueryGenerationResponse> {
    try {
      // Fetch brand configuration
      const [brand] = await db
        .select()
        .from(brandMonitoring)
        .where(eq(brandMonitoring.id, brandId));

      if (!brand) {
        throw new Error(`Brand monitoring configuration not found: ${brandId}`);
      }

      // Build request from brand configuration
      const request: QueryGenerationRequest = {
        brandName: brand.brandName,
        description: brand.description || undefined,
        competitors: brand.competitors || [],
        existingQueries: brand.trackingQueries || [],
        count
      };

      return await this.generateQueries(request);

    } catch (error) {
      logger.error(`[AIQueryGenerator] Failed to generate queries for brand ${brandId}:`, error);
      throw error;
    }
  }

  /**
   * Validate query generation request
   */
  private validateRequest(request: QueryGenerationRequest): void {
    if (!request.brandName || request.brandName.trim().length === 0) {
      throw new Error('Brand name is required');
    }

    if (request.count && (request.count < 1 || request.count > 100)) {
      throw new Error('Count must be between 1 and 100');
    }

    if (request.brandName.length > 100) {
      throw new Error('Brand name is too long (max 100 characters)');
    }
  }

  /**
   * Get the best available AI client
   */
  private getBestAvailableClient(): 'openai' | 'anthropic' | null {
    // Prefer OpenAI for query generation due to better instruction following
    if (this.openai) return 'openai';
    if (this.anthropic) return 'anthropic';
    return null;
  }

  /**
   * Generate queries using AI with fallback mechanism
   */
  private async generateQueriesWithAI(
    request: QueryGenerationRequest,
    client: 'openai' | 'anthropic'
  ): Promise<GeneratedQuery[]> {

    const prompt = this.buildQueryGenerationPrompt(request);

    // Try primary client first
    try {
      if (client === 'openai' && this.openai) {
        logger.info('[AIQueryGenerator] Attempting OpenAI generation');
        return await this.generateWithOpenAI(prompt, request);
      } else if (client === 'anthropic' && this.anthropic) {
        logger.info('[AIQueryGenerator] Attempting Anthropic generation');
        return await this.generateWithAnthropic(prompt, request);
      }
    } catch (error) {
      logger.warn(`[AIQueryGenerator] Primary AI client (${client}) failed, trying fallback:`, error);

      // Try fallback client
      try {
        if (client === 'openai' && this.anthropic) {
          logger.info('[AIQueryGenerator] Falling back to Anthropic');
          return await this.generateWithAnthropic(prompt, request);
        } else if (client === 'anthropic' && this.openai) {
          logger.info('[AIQueryGenerator] Falling back to OpenAI');
          return await this.generateWithOpenAI(prompt, request);
        }
      } catch (fallbackError) {
        logger.error('[AIQueryGenerator] Fallback AI client also failed:', fallbackError);
      }

      // If both fail, throw the original error
      throw error;
    }

    throw new Error(`No AI clients available`);
  }

  /**
   * Build the AI prompt for query generation
   */
  private buildQueryGenerationPrompt(request: QueryGenerationRequest): string {
    const count = request.count || 25;
    const categories = request.categories || ['direct', 'comparative', 'use_case', 'problem_solving', 'industry_specific'];
    
    return `You are an expert brand strategist and SEO specialist. Generate ${count} diverse, high-quality test queries to evaluate how well a brand performs in AI/LLM responses.

Brand Information:
- Name: "${request.brandName}"
${request.industry ? `- Industry: ${request.industry}` : ''}
${request.description ? `- Description: ${request.description}` : ''}
${request.targetAudience ? `- Target Audience: ${request.targetAudience}` : ''}
${request.keyProducts?.length ? `- Key Products/Services: ${request.keyProducts.join(', ')}` : ''}
${request.competitors?.length ? `- Main Competitors: ${request.competitors.join(', ')}` : ''}
${request.existingQueries?.length ? `- Existing Queries (avoid duplicating): ${request.existingQueries.slice(0, 10).join(', ')}` : ''}

Generate queries across these categories:
${categories.map(cat => `- ${cat.replace('_', ' ')}`).join('\n')}

Requirements:
1. Queries should be natural and conversational
2. Include both specific and broad queries
3. Consider different user personas and contexts
4. Include industry-specific terminology where relevant
5. Vary query length and complexity
6. Focus on queries that would realistically mention the brand
7. Avoid duplicate or near-duplicate queries
8. Each query should test different aspects of brand visibility

Response format: JSON array of objects with:
{
  "text": "the actual query text",
  "category": "direct|comparative|use_case|problem_solving|industry_specific",
  "priority": 1-100 (higher = more important),
  "estimatedRelevance": 1-100 (how likely this query would mention the brand),
  "explanation": "brief explanation of why this query is valuable"
}

Generate exactly ${count} high-quality, diverse queries:`;
  }

  /**
   * Generate queries using OpenAI
   */
  private async generateWithOpenAI(prompt: string, request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    if (!this.openai) throw new Error('OpenAI client not available');

    try {
      logger.info('[AIQueryGenerator] Starting OpenAI query generation');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Faster model to reduce timeout risk
        messages: [
          {
            role: 'system',
            content: 'You are an expert brand strategist who generates high-quality test queries for brand monitoring. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // Slightly reduced for faster processing
        max_tokens: 2000, // Reduced to speed up response
        response_format: { type: 'json_object' }
      });

      logger.info('[AIQueryGenerator] OpenAI response received');

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);

      // Handle different response formats
      let queries: any[] = [];
      if (Array.isArray(parsed)) {
        queries = parsed;
      } else if (parsed.queries && Array.isArray(parsed.queries)) {
        queries = parsed.queries;
      } else {
        throw new Error('Invalid response format from OpenAI');
      }

      logger.info(`[AIQueryGenerator] Successfully parsed ${queries.length} queries from OpenAI`);
      return this.validateAndNormalizeQueries(queries);

    } catch (error) {
      logger.error('[AIQueryGenerator] OpenAI generation failed:', error);
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate queries using Anthropic Claude
   */
  private async generateWithAnthropic(prompt: string, request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    if (!this.anthropic) throw new Error('Anthropic client not available');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.8,
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nRespond with ONLY the JSON array, no additional text.'
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Anthropic');
      }

      // Parse the JSON response
      const parsed = JSON.parse(content.text);
      
      // Handle different response formats
      let queries: any[] = [];
      if (Array.isArray(parsed)) {
        queries = parsed;
      } else if (parsed.queries && Array.isArray(parsed.queries)) {
        queries = parsed.queries;
      } else {
        throw new Error('Invalid response format from Anthropic');
      }

      return this.validateAndNormalizeQueries(queries);

    } catch (error) {
      logger.error('[AIQueryGenerator] Anthropic generation failed:', error);
      throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and normalize AI-generated queries
   */
  private validateAndNormalizeQueries(rawQueries: any[]): GeneratedQuery[] {
    const validQueries: GeneratedQuery[] = [];
    const validCategories = ['direct', 'comparative', 'use_case', 'problem_solving', 'industry_specific'];

    for (const query of rawQueries) {
      try {
        // Validate required fields
        if (!query.text || typeof query.text !== 'string') continue;
        if (!query.category || !validCategories.includes(query.category)) continue;

        // Normalize fields
        const normalizedQuery: GeneratedQuery = {
          text: query.text.trim(),
          category: query.category,
          priority: Math.max(1, Math.min(100, parseInt(query.priority) || 50)),
          estimatedRelevance: Math.max(1, Math.min(100, parseInt(query.estimatedRelevance) || 50)),
          explanation: query.explanation?.trim() || undefined
        };

        // Additional validation
        if (normalizedQuery.text.length < 5 || normalizedQuery.text.length > 500) continue;
        if (normalizedQuery.text.includes('undefined') || normalizedQuery.text.includes('null')) continue;

        validQueries.push(normalizedQuery);

      } catch (error) {
        logger.warn('[AIQueryGenerator] Skipping invalid query:', error);
        continue;
      }
    }

    if (validQueries.length === 0) {
      throw new Error('No valid queries generated');
    }

    return validQueries;
  }

  /**
   * Enhance generated queries with additional processing
   */
  private async enhanceQueries(queries: GeneratedQuery[], request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    // Remove duplicates
    const uniqueQueries = this.removeDuplicateQueries(queries, request.existingQueries || []);

    // Sort by priority and relevance
    uniqueQueries.sort((a, b) => {
      const scoreA = (a.priority * 0.6) + (a.estimatedRelevance * 0.4);
      const scoreB = (b.priority * 0.6) + (b.estimatedRelevance * 0.4);
      return scoreB - scoreA; // Descending order
    });

    // Ensure category distribution
    const balancedQueries = this.ensureCategoryBalance(uniqueQueries, request.count || 25);

    return balancedQueries;
  }

  /**
   * Remove duplicate queries
   */
  private removeDuplicateQueries(queries: GeneratedQuery[], existingQueries: string[]): GeneratedQuery[] {
    const seen = new Set<string>();
    const normalized = new Set<string>();

    // Add existing queries to seen set
    existingQueries.forEach(query => {
      seen.add(query.toLowerCase().trim());
      normalized.add(this.normalizeQuery(query));
    });

    return queries.filter(query => {
      const lowerText = query.text.toLowerCase().trim();
      const normalizedText = this.normalizeQuery(query.text);

      // Check for exact duplicates
      if (seen.has(lowerText)) return false;

      // Check for semantic duplicates
      if (normalized.has(normalizedText)) return false;

      seen.add(lowerText);
      normalized.add(normalizedText);
      return true;
    });
  }

  /**
   * Normalize query for duplicate detection
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Ensure balanced category distribution
   */
  private ensureCategoryBalance(queries: GeneratedQuery[], targetCount: number): GeneratedQuery[] {
    const categories = ['direct', 'comparative', 'use_case', 'problem_solving', 'industry_specific'];
    const targetPerCategory = Math.floor(targetCount / categories.length);
    const remainder = targetCount % categories.length;

    const balanced: GeneratedQuery[] = [];
    const byCategory: Record<string, GeneratedQuery[]> = {};

    // Group queries by category
    queries.forEach(query => {
      if (!byCategory[query.category]) {
        byCategory[query.category] = [];
      }
      byCategory[query.category].push(query);
    });

    // Take queries from each category
    categories.forEach((category, index) => {
      const categoryQueries = byCategory[category] || [];
      const take = targetPerCategory + (index < remainder ? 1 : 0);
      balanced.push(...categoryQueries.slice(0, take));
    });

    // If we don't have enough, fill with remaining high-priority queries
    if (balanced.length < targetCount) {
      const remaining = queries.filter(q => !balanced.includes(q));
      balanced.push(...remaining.slice(0, targetCount - balanced.length));
    }

    return balanced.slice(0, targetCount);
  }

  /**
   * Calculate category breakdown for metadata
   */
  private calculateCategoryBreakdown(queries: GeneratedQuery[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    queries.forEach(query => {
      breakdown[query.category] = (breakdown[query.category] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Calculate estimated cost for query generation
   */
  private calculateEstimatedCost(queryCount: number): number {
    // Rough estimate based on token usage
    const avgTokensPerQuery = 150; // Including prompt and response
    const totalTokens = queryCount * avgTokensPerQuery;
    const costPer1kTokens = 0.01; // Approximate cost

    return (totalTokens / 1000) * costPer1kTokens;
  }

  /**
   * Get query suggestions for improving existing query set
   */
  async suggestQueryImprovements(brandId: number): Promise<{
    suggestions: string[];
    missingCategories: string[];
    lowPerformingQueries: string[];
  }> {
    try {
      // This would analyze existing query performance and suggest improvements
      // For now, return a basic structure
      return {
        suggestions: [
          'Add more industry-specific queries',
          'Include queries about recent product launches',
          'Test queries from different user personas'
        ],
        missingCategories: [],
        lowPerformingQueries: []
      };

    } catch (error) {
      logger.error('[AIQueryGenerator] Failed to generate query suggestions:', error);
      throw error;
    }
  }

  /**
   * Generate fallback queries when AI services are unavailable
   */
  private generateFallbackQueries(request: QueryGenerationRequest): GeneratedQuery[] {
    const { brandName, competitors = [], count = 10 } = request;
    const templates = [
      { text: `What is ${brandName}?`, category: 'direct' },
      { text: `How does ${brandName} work?`, category: 'direct' },
      { text: `${brandName} features and benefits`, category: 'direct' },
      { text: `${brandName} pricing and plans`, category: 'direct' },
      { text: `${brandName} vs competitors`, category: 'comparative' },
      { text: `Best alternatives to ${brandName}`, category: 'comparative' },
      { text: `${brandName} reviews and ratings`, category: 'use_case' },
      { text: `How to use ${brandName} effectively`, category: 'use_case' },
      { text: `${brandName} customer support`, category: 'problem_solving' },
      { text: `${brandName} integration options`, category: 'industry_specific' },
    ];

    // Add competitor comparison queries
    competitors.forEach(competitor => {
      templates.push(
        { text: `${brandName} vs ${competitor}`, category: 'comparative' },
        { text: `Should I choose ${brandName} or ${competitor}?`, category: 'comparative' }
      );
    });

    // Convert templates to GeneratedQuery format
    const queries: GeneratedQuery[] = templates.slice(0, count).map(template => ({
      text: template.text,
      category: template.category,
      priority: 50,
      estimatedRelevance: 70,
      explanation: `Fallback template query for ${template.category} category`
    }));

    logger.info(`[AIQueryGenerator] Generated ${queries.length} fallback queries`);
    return queries;
  }

  /**
   * Get supported query categories with descriptions
   */
  getQueryCategories(): Array<{
    id: string;
    name: string;
    description: string;
    examples: string[];
  }> {
    return [
      {
        id: 'direct',
        name: 'Direct Brand Queries',
        description: 'Queries that directly ask about the brand',
        examples: [
          'What is [Brand]?',
          'Tell me about [Brand]',
          'How does [Brand] work?'
        ]
      },
      {
        id: 'comparative',
        name: 'Comparative Queries',
        description: 'Queries comparing the brand to competitors',
        examples: [
          '[Brand] vs [Competitor]',
          'Should I choose [Brand] or [Competitor]?',
          'Compare [Brand] to alternatives'
        ]
      },
      {
        id: 'use_case',
        name: 'Use Case Queries',
        description: 'Queries about specific use cases or applications',
        examples: [
          'Best tools for [use case]',
          'Software for [specific need]',
          'Solutions for [problem]'
        ]
      },
      {
        id: 'problem_solving',
        name: 'Problem-Solving Queries',
        description: 'Queries seeking solutions to specific problems',
        examples: [
          'How to solve [problem]?',
          'Need help with [challenge]',
          'Looking for [solution type]'
        ]
      },
      {
        id: 'industry_specific',
        name: 'Industry-Specific Queries',
        description: 'Queries focused on industry trends and leaders',
        examples: [
          'Top [industry] companies',
          'Best [industry] tools in 2024',
          'Leading [industry] solutions'
        ]
      }
    ];
  }
}

// Export singleton instance
export const aiQueryGeneratorService = new AIQueryGeneratorService();