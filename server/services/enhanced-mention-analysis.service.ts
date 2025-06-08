import { logger } from '../lib/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Detected brand mention with enhanced analysis
 */
export interface BrandMention {
  brandName: string;
  mentionText: string;
  startPosition: number;
  endPosition: number;
  mentionType: 'direct' | 'indirect' | 'implied' | 'competitor_comparison';
  contextSnippet: string;
  contextWindow: number; // Characters before and after mention
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysis {
  score: number; // -1.0 (very negative) to 1.0 (very positive)
  confidence: number; // 0.0 to 1.0
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  reasoning?: string;
  emotionalTone?: string[];
}

/**
 * Context analysis result
 */
export interface ContextAnalysis {
  relevanceScore: number; // 0-100, how relevant the mention is
  authorityLevel: 'low' | 'medium' | 'high'; // How authoritative the context is
  contextType: 'recommendation' | 'comparison' | 'criticism' | 'neutral_mention' | 'question';
  keyTopics: string[]; // Main topics discussed in context
  competitorMentions: string[]; // Other brands mentioned in same context
  userIntent: 'research' | 'purchase' | 'comparison' | 'troubleshooting' | 'general_inquiry';
}

/**
 * Position analysis result
 */
export interface PositionAnalysis {
  rankingPosition: number; // 1-based position in response
  isEarlyMention: boolean; // Mentioned in first 25% of response
  isMainFocus: boolean; // Brand is primary focus of response
  relativeImportance: number; // 0-100, importance relative to other mentions
}

/**
 * Comprehensive mention analysis result
 */
export interface MentionAnalysisResult {
  mention: BrandMention;
  sentiment: SentimentAnalysis;
  context: ContextAnalysis;
  position: PositionAnalysis;
  overallScore: number; // Composite score 0-100
  confidenceLevel: number; // Overall confidence in analysis
  recommendations: string[]; // Actionable insights
}

/**
 * Analysis request parameters
 */
export interface AnalysisRequest {
  query: string;
  response: string;
  brandName: string;
  competitors?: string[];
  llmPlatform: string;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * Enhanced Mention Analysis Service
 * 
 * This service provides advanced analysis of brand mentions in LLM responses,
 * including sophisticated sentiment analysis, context understanding, and
 * actionable insights for brand optimization.
 */
export class EnhancedMentionAnalysisService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    this.initializeAIClients();
  }

  /**
   * Initialize AI clients for advanced analysis
   */
  private initializeAIClients(): void {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.info('[EnhancedMentionAnalysis] OpenAI client initialized');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      logger.info('[EnhancedMentionAnalysis] Anthropic client initialized');
    }
  }

  /**
   * Perform comprehensive mention analysis
   */
  async analyzeMentions(request: AnalysisRequest): Promise<MentionAnalysisResult[]> {
    try {
      logger.info(`[EnhancedMentionAnalysis] Analyzing mentions for brand: ${request.brandName}`);

      // Step 1: Detect all brand mentions
      const mentions = await this.detectBrandMentions(request.response, request.brandName);

      if (mentions.length === 0) {
        logger.info(`[EnhancedMentionAnalysis] No mentions found for brand: ${request.brandName}`);
        return [];
      }

      // Step 2: Analyze each mention comprehensively
      const analysisResults: MentionAnalysisResult[] = [];

      for (const mention of mentions) {
        try {
          const analysis = await this.analyzeSingleMention(mention, request);
          analysisResults.push(analysis);
        } catch (error) {
          logger.warn(`[EnhancedMentionAnalysis] Failed to analyze mention: ${mention.mentionText}`, error);
        }
      }

      logger.info(`[EnhancedMentionAnalysis] Analyzed ${analysisResults.length} mentions`);
      return analysisResults;

    } catch (error) {
      logger.error('[EnhancedMentionAnalysis] Mention analysis failed:', error);
      throw new Error(`Failed to analyze mentions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect brand mentions in response text
   */
  private async detectBrandMentions(response: string, brandName: string): Promise<BrandMention[]> {
    const mentions: BrandMention[] = [];
    const lowercaseResponse = response.toLowerCase();
    const lowercaseBrandName = brandName.toLowerCase();
    
    // Find direct mentions
    let searchIndex = 0;
    while (true) {
      const index = lowercaseResponse.indexOf(lowercaseBrandName, searchIndex);
      if (index === -1) break;

      const startPosition = index;
      const endPosition = index + brandName.length;
      const contextWindow = 150; // Characters before and after
      
      const contextStart = Math.max(0, startPosition - contextWindow);
      const contextEnd = Math.min(response.length, endPosition + contextWindow);
      const contextSnippet = response.substring(contextStart, contextEnd);

      // Determine mention type based on context
      const mentionType = this.determineMentionType(response, startPosition, endPosition, brandName);

      mentions.push({
        brandName,
        mentionText: response.substring(startPosition, endPosition),
        startPosition,
        endPosition,
        mentionType,
        contextSnippet,
        contextWindow
      });

      searchIndex = endPosition;
    }

    // TODO: Add indirect mention detection using AI
    // This would detect mentions like "the CRM platform" when referring to a specific brand

    return mentions;
  }

  /**
   * Determine the type of mention based on context
   */
  private determineMentionType(
    response: string, 
    startPos: number, 
    endPos: number, 
    brandName: string
  ): BrandMention['mentionType'] {
    const contextBefore = response.substring(Math.max(0, startPos - 50), startPos).toLowerCase();
    const contextAfter = response.substring(endPos, Math.min(response.length, endPos + 50)).toLowerCase();
    
    // Look for comparison keywords
    if (contextBefore.includes('vs') || contextBefore.includes('versus') || 
        contextAfter.includes('vs') || contextAfter.includes('versus') ||
        contextBefore.includes('compared to') || contextAfter.includes('compared to')) {
      return 'competitor_comparison';
    }

    // Look for indirect reference patterns
    if (contextBefore.includes('like') || contextBefore.includes('such as') ||
        contextBefore.includes('including') || contextBefore.includes('similar to')) {
      return 'indirect';
    }

    // Default to direct mention
    return 'direct';
  }

  /**
   * Analyze a single mention comprehensively
   */
  private async analyzeSingleMention(
    mention: BrandMention, 
    request: AnalysisRequest
  ): Promise<MentionAnalysisResult> {
    
    // Run all analyses in parallel for efficiency
    const [sentiment, context, position] = await Promise.all([
      this.analyzeSentiment(mention, request),
      this.analyzeContext(mention, request),
      this.analyzePosition(mention, request.response)
    ]);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(sentiment, context, position);
    
    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(sentiment, context, position);

    // Generate recommendations
    const recommendations = this.generateRecommendations(mention, sentiment, context, position);

    return {
      mention,
      sentiment,
      context,
      position,
      overallScore,
      confidenceLevel,
      recommendations
    };
  }

  /**
   * Perform advanced sentiment analysis using AI
   */
  private async analyzeSentiment(
    mention: BrandMention, 
    request: AnalysisRequest
  ): Promise<SentimentAnalysis> {
    
    if (request.analysisDepth === 'basic') {
      return this.basicSentimentAnalysis(mention.contextSnippet, mention.brandName);
    }

    // Use AI for advanced sentiment analysis
    return await this.aiSentimentAnalysis(mention, request);
  }

  /**
   * Basic sentiment analysis using keyword matching
   */
  private basicSentimentAnalysis(context: string, brandName: string): SentimentAnalysis {
    const positiveWords = [
      'excellent', 'great', 'amazing', 'best', 'outstanding', 'recommend', 
      'love', 'perfect', 'fantastic', 'superior', 'impressive', 'reliable',
      'efficient', 'powerful', 'innovative', 'user-friendly', 'helpful'
    ];

    const negativeWords = [
      'terrible', 'awful', 'worst', 'bad', 'disappointing', 'useless',
      'buggy', 'slow', 'expensive', 'complicated', 'frustrating', 'poor',
      'lacking', 'inferior', 'problematic', 'confusing', 'limited'
    ];

    const lowerContext = context.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContext.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContext.includes(word)).length;

    let score = 0;
    let label: SentimentAnalysis['label'] = 'neutral';
    let confidence = 0.6; // Basic analysis has lower confidence

    if (positiveCount > negativeCount) {
      score = Math.min(0.8, 0.2 + (positiveCount * 0.2));
      label = score > 0.6 ? 'very_positive' : 'positive';
    } else if (negativeCount > positiveCount) {
      score = Math.max(-0.8, -0.2 - (negativeCount * 0.2));
      label = score < -0.6 ? 'very_negative' : 'negative';
    }

    return {
      score,
      confidence,
      label,
      reasoning: `Basic keyword analysis: ${positiveCount} positive, ${negativeCount} negative keywords`
    };
  }

  /**
   * AI-powered sentiment analysis
   */
  private async aiSentimentAnalysis(
    mention: BrandMention, 
    request: AnalysisRequest
  ): Promise<SentimentAnalysis> {
    
    if (!this.openai && !this.anthropic) {
      return this.basicSentimentAnalysis(mention.contextSnippet, mention.brandName);
    }

    const prompt = `Analyze the sentiment towards "${mention.brandName}" in this context:

Context: "${mention.contextSnippet}"

Provide a detailed sentiment analysis with:
1. Sentiment score from -1.0 (very negative) to 1.0 (very positive)
2. Confidence level from 0.0 to 1.0
3. Sentiment label (very_negative, negative, neutral, positive, very_positive)
4. Brief reasoning for the sentiment
5. Emotional tone keywords

Response format: JSON
{
  "score": 0.0,
  "confidence": 0.0,
  "label": "neutral",
  "reasoning": "explanation",
  "emotionalTone": ["keyword1", "keyword2"]
}`;

    try {
      if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert sentiment analysis specialist. Provide accurate sentiment analysis in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistent analysis
          max_tokens: 500,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            score: Math.max(-1, Math.min(1, parsed.score || 0)),
            confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
            label: parsed.label || 'neutral',
            reasoning: parsed.reasoning,
            emotionalTone: parsed.emotionalTone || []
          };
        }
      }

      // Fallback to basic analysis
      return this.basicSentimentAnalysis(mention.contextSnippet, mention.brandName);

    } catch (error) {
      logger.warn('[EnhancedMentionAnalysis] AI sentiment analysis failed, using basic analysis', error);
      return this.basicSentimentAnalysis(mention.contextSnippet, mention.brandName);
    }
  }

  /**
   * Analyze context and extract insights
   */
  private async analyzeContext(
    mention: BrandMention, 
    request: AnalysisRequest
  ): Promise<ContextAnalysis> {
    
    const context = mention.contextSnippet.toLowerCase();
    
    // Determine context type
    let contextType: ContextAnalysis['contextType'] = 'neutral_mention';
    
    if (context.includes('recommend') || context.includes('suggest') || context.includes('should use')) {
      contextType = 'recommendation';
    } else if (context.includes('compare') || context.includes('vs') || context.includes('versus')) {
      contextType = 'comparison';
    } else if (context.includes('problem') || context.includes('issue') || context.includes('complaint')) {
      contextType = 'criticism';
    } else if (context.includes('?') || context.includes('what is') || context.includes('how to')) {
      contextType = 'question';
    }

    // Determine user intent
    let userIntent: ContextAnalysis['userIntent'] = 'general_inquiry';
    
    if (context.includes('buy') || context.includes('purchase') || context.includes('pricing')) {
      userIntent = 'purchase';
    } else if (context.includes('compare') || context.includes('vs') || context.includes('alternatives')) {
      userIntent = 'comparison';
    } else if (context.includes('problem') || context.includes('help') || context.includes('fix')) {
      userIntent = 'troubleshooting';
    } else if (context.includes('research') || context.includes('learn') || context.includes('understand')) {
      userIntent = 'research';
    }

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(mention, request);

    // Determine authority level
    const authorityLevel = this.determineAuthorityLevel(context);

    // Extract key topics (basic implementation)
    const keyTopics = this.extractKeyTopics(context);

    // Find competitor mentions
    const competitorMentions = this.findCompetitorMentions(context, request.competitors || []);

    return {
      relevanceScore,
      authorityLevel,
      contextType,
      keyTopics,
      competitorMentions,
      userIntent
    };
  }

  /**
   * Analyze position and ranking within response
   */
  private async analyzePosition(mention: BrandMention, response: string): Promise<PositionAnalysis> {
    const responseLength = response.length;
    const mentionPosition = mention.startPosition;
    
    // Calculate ranking position (how many brands mentioned before this one)
    const brandMentions = response.toLowerCase().match(/\b[a-z]+\s*(corp|inc|llc|ltd|company|co\.|corporation|solutions|technologies|tech|soft|systems|platform|app|tool|service)\b/gi) || [];
    const rankingPosition = brandMentions.findIndex(match => 
      response.toLowerCase().indexOf(match.toLowerCase()) >= mentionPosition
    ) + 1;

    // Check if mentioned early in response
    const isEarlyMention = mentionPosition < (responseLength * 0.25);

    // Check if brand is main focus (mentioned multiple times or in key positions)
    const brandCount = (response.toLowerCase().match(new RegExp(mention.brandName.toLowerCase(), 'g')) || []).length;
    const isMainFocus = brandCount > 1 || isEarlyMention;

    // Calculate relative importance based on position and context
    const positionScore = Math.max(0, 100 - (mentionPosition / responseLength * 100));
    const frequencyScore = Math.min(100, brandCount * 20);
    const relativeImportance = Math.round((positionScore + frequencyScore) / 2);

    return {
      rankingPosition: rankingPosition || 1,
      isEarlyMention,
      isMainFocus,
      relativeImportance
    };
  }

  /**
   * Calculate overall score combining all factors
   */
  private calculateOverallScore(
    sentiment: SentimentAnalysis,
    context: ContextAnalysis,
    position: PositionAnalysis
  ): number {
    // Weighted scoring algorithm
    const sentimentWeight = 0.35;
    const contextWeight = 0.35;
    const positionWeight = 0.30;

    // Normalize sentiment score to 0-100
    const sentimentScore = Math.round((sentiment.score + 1) * 50);
    
    // Context score based on relevance and authority
    const contextScore = context.relevanceScore;
    
    // Position score
    const positionScore = position.relativeImportance;

    // Calculate weighted average
    const overallScore = Math.round(
      (sentimentScore * sentimentWeight) +
      (contextScore * contextWeight) +
      (positionScore * positionWeight)
    );

    return Math.max(0, Math.min(100, overallScore));
  }

  /**
   * Calculate confidence level in the analysis
   */
  private calculateConfidenceLevel(
    sentiment: SentimentAnalysis,
    context: ContextAnalysis,
    position: PositionAnalysis
  ): number {
    // Base confidence on sentiment analysis confidence and other factors
    let confidence = sentiment.confidence * 0.5;
    
    // Add confidence based on context clarity
    if (context.contextType !== 'neutral_mention') {
      confidence += 0.2;
    }
    
    // Add confidence based on position clarity
    if (position.isMainFocus) {
      confidence += 0.2;
    }
    
    // Add confidence based on relevance
    confidence += (context.relevanceScore / 100) * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    mention: BrandMention,
    sentiment: SentimentAnalysis,
    context: ContextAnalysis,
    position: PositionAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Sentiment-based recommendations
    if (sentiment.score < -0.3) {
      recommendations.push('Address negative sentiment by improving customer experience and communication');
    } else if (sentiment.score > 0.6) {
      recommendations.push('Leverage positive sentiment in marketing materials and testimonials');
    }

    // Position-based recommendations
    if (!position.isEarlyMention && position.rankingPosition > 3) {
      recommendations.push('Improve content strategy to achieve earlier mentions in AI responses');
    }

    // Context-based recommendations
    if (context.contextType === 'comparison' && context.competitorMentions.length > 0) {
      recommendations.push('Create competitive comparison content highlighting unique advantages');
    }

    if (context.relevanceScore < 50) {
      recommendations.push('Increase content relevance and thought leadership in core areas');
    }

    // User intent recommendations
    if (context.userIntent === 'purchase' && sentiment.score < 0.5) {
      recommendations.push('Optimize sales and conversion content to address purchase concerns');
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private calculateRelevanceScore(mention: BrandMention, request: AnalysisRequest): number {
    const context = mention.contextSnippet.toLowerCase();
    const query = request.query.toLowerCase();
    
    // Simple relevance scoring based on keyword overlap
    const queryWords = query.split(/\s+/).filter(word => word.length > 3);
    const contextWords = context.split(/\s+/);
    
    // Handle edge case where no query words are longer than 3 characters
    if (queryWords.length === 0) {
      return 50; // Default moderate relevance score
    }
    
    const overlap = queryWords.filter(word => contextWords.includes(word)).length;
    const relevanceScore = Math.min(100, (overlap / queryWords.length) * 100);
    
    return Math.round(relevanceScore);
  }

  private determineAuthorityLevel(context: string): ContextAnalysis['authorityLevel'] {
    const authorityKeywords = ['expert', 'professional', 'industry', 'leading', 'established', 'proven'];
    const lowAuthorityKeywords = ['maybe', 'might', 'possibly', 'unclear', 'unsure'];
    
    const authorityCount = authorityKeywords.filter(keyword => context.includes(keyword)).length;
    const lowAuthorityCount = lowAuthorityKeywords.filter(keyword => context.includes(keyword)).length;
    
    if (authorityCount > lowAuthorityCount && authorityCount > 0) return 'high';
    if (lowAuthorityCount > 0) return 'low';
    return 'medium';
  }

  private extractKeyTopics(context: string): string[] {
    // Simple topic extraction using common keywords
    const topics: string[] = [];
    const topicKeywords = {
      'pricing': ['price', 'pricing', 'cost', 'expensive', 'affordable', 'cheap'],
      'usability': ['user-friendly', 'easy', 'difficult', 'complex', 'intuitive'],
      'performance': ['fast', 'slow', 'performance', 'speed', 'efficient'],
      'features': ['feature', 'functionality', 'capability', 'tool', 'option'],
      'support': ['support', 'help', 'customer service', 'documentation'],
      'reliability': ['reliable', 'stable', 'bug', 'crash', 'downtime']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => context.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private findCompetitorMentions(context: string, competitors: string[]): string[] {
    return competitors.filter(competitor => 
      context.toLowerCase().includes(competitor.toLowerCase())
    );
  }
}

// Export singleton instance
export const enhancedMentionAnalysisService = new EnhancedMentionAnalysisService();