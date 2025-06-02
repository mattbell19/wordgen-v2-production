import { generateArticleWithGPT } from './openai.service';
import { schemaMarkupService } from './schema-markup.service';
import { tocGeneratorService } from './toc-generator.service';
import { faqGeneratorService } from './faq-generator.service';
import { lsiKeywordService } from './lsi-keyword.service';
import type { ArticleSettings } from '../../client/src/lib/types';

export interface ArticleStructureSections {
  whatIs?: boolean;
  whyMatters?: boolean;
  howTo?: boolean;
  bestPractices?: boolean;
  challenges?: boolean;
  caseStudies?: boolean;
  comparison?: boolean;
  futureTrends?: boolean;
}

export interface VisualElements {
  quickTakeaways?: boolean;
  proTips?: boolean;
  statHighlights?: boolean;
  comparisonTables?: boolean;
  calloutBoxes?: boolean;
  imageSuggestions?: boolean;
}

export interface SeoFeatures {
  tableOfContents?: boolean;
  faqSection?: boolean;
  relatedTopics?: boolean;
  metaDescription?: boolean;
}

export interface ContentStyle {
  tone?: string;
  readingLevel?: string;
  contentDensity?: number;
  targetAudience?: string;
}

export interface ArticleStructure {
  sections?: ArticleStructureSections;
  visualElements?: VisualElements;
  seoFeatures?: SeoFeatures;
  contentStyle?: ContentStyle;
}

export interface ArticleCreationParams {
  keyword: string;
  keywords?: string[];
  wordCount: number;
  tone: string;
  includeIntroduction?: boolean;
  includeConclusion?: boolean;
  enableInternalLinking?: boolean;
  enableExternalLinking?: boolean;
  userId?: number;
  language?: string;
  title?: string;
  callToAction?: string;
  structure?: ArticleStructure;
  // Additional fields from frontend
  industry?: string;
  targetAudience?: string;
  contentType?: string;
}

export interface ArticleResponse {
  content: string;
  wordCount: number;
  readingTime: number;
  settings: ArticleSettings;
  qualityMetrics?: {
    overall_score: number;
    expert_authority: number;
    actionability: number;
    specificity: number;
    current_relevance: number;
    engagement: number;
  };
  expertPersona?: string;
  industry?: string;
}

export interface Article {
  id?: number;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: number;
}

export interface ArticleServiceResponse {
  ok: boolean;
  article?: Article;
  error?: string;
}

export async function generateArticle(params: ArticleCreationParams): Promise<ArticleResponse> {
  try {
    // Validate required parameters
    if (!params.keyword) {
      throw new Error('Keyword is required for article generation');
    }

    if (!params.wordCount || params.wordCount < 100 || params.wordCount > 5000) {
      throw new Error('Word count must be between 100 and 5000');
    }

    // Convert ArticleCreationParams to ArticleSettings for the OpenAI service
    const articleSettings: ArticleSettings = {
      keyword: params.keyword,
      tone: (params.tone as 'professional' | 'casual' | 'friendly') || 'professional',
      wordCount: params.wordCount,
      enableInternalLinking: params.enableInternalLinking || false,
      enableExternalLinking: params.enableExternalLinking || false,
      userId: params.userId,
      callToAction: params.callToAction,
      language: params.language || 'english',
      industry: params.industry || 'marketing',
      targetAudience: params.targetAudience || params.tone || 'general',
      contentType: params.contentType || 'guide'
    };

    console.log('Generating article with enhanced OpenAI service:', articleSettings);

    // Use the enhanced OpenAI service
    const result = await generateArticleWithGPT(articleSettings);

    const wordCount = result.wordCount || params.wordCount || 0;
    const readingTime = Math.ceil(wordCount / 200);

    // Generate table of contents
    const { toc, content: contentWithToc } = tocGeneratorService.generateTableOfContents(result.content);

    // Insert TOC after the first heading (h1) if it exists
    let enhancedContent = contentWithToc;
    if (toc) {
      const h1EndIndex = enhancedContent.indexOf('</h1>');
      if (h1EndIndex !== -1) {
        enhancedContent = [
          enhancedContent.slice(0, h1EndIndex + 5), // Include the closing </h1> tag
          toc,
          enhancedContent.slice(h1EndIndex + 5)
        ].join('');
      } else {
        // If no h1, add TOC at the beginning
        enhancedContent = toc + enhancedContent;
      }
    }

    // TEMPORARILY DISABLED: Additional AI features to prevent Heroku timeout
    // These features make additional OpenAI API calls that push total time over 30s
    if (params.keyword) {
      // TODO: Re-enable these features with async processing or job queue
      console.log('Skipping additional AI features to prevent timeout for keyword:', params.keyword);

      /*
      // Generate FAQ section if keyword is provided
      try {
        console.log('Generating FAQ section for keyword:', params.keyword);
        const faqSection = await faqGeneratorService.generateFaqSection(params.keyword);
        if (faqSection) {
          // Add FAQ section at the end of the content, before any closing tags
          enhancedContent = enhancedContent + '\n' + faqSection;
          console.log('FAQ section added successfully');
        } else {
          console.log('FAQ section generation returned empty result');
        }
      } catch (faqError) {
        console.error('Error generating FAQ section:', faqError);
        // Continue without FAQ section if there's an error
      }

      // Generate LSI keywords
      try {
        console.log('Generating LSI keywords for keyword:', params.keyword);
        const lsiKeywords = await lsiKeywordService.generateLsiKeywords(params.keyword);
        if (lsiKeywords && lsiKeywords.length > 0) {
          // Enhance content with LSI keywords
          enhancedContent = lsiKeywordService.enhanceContentWithLsiKeywords(enhancedContent, lsiKeywords);
          console.log('LSI keywords added successfully:', lsiKeywords.length);
        } else {
          console.log('LSI keywords generation returned empty result');
        }
      } catch (lsiError) {
        console.error('Error generating LSI keywords:', lsiError);
        // Continue without LSI keywords if there's an error
      }
      */

      // Add a call-to-action section if enabled
      if (params.callToAction) {
        try {
          console.log('Adding call-to-action section');
          const ctaHtml = `\n<div class="call-to-action">\n<h3>Ready to Learn More?</h3>\n<p>${params.callToAction}</p>\n<a href="#" class="cta-button">Get Started</a>\n</div>\n`;
          enhancedContent = enhancedContent + ctaHtml;
        } catch (ctaError) {
          console.error('Error adding call-to-action section:', ctaError);
        }
      }
    }

    // Create the article response object with enhanced data
    const articleResponse: ArticleResponse = {
      content: enhancedContent,
      wordCount,
      readingTime,
      settings: articleSettings,
      qualityMetrics: result.qualityMetrics,
      expertPersona: result.expertPersona,
      industry: result.industry
    };

    // Generate schema markup and append it to the content
    const schemaMarkup = schemaMarkupService.generateArticleSchema(articleResponse);
    if (schemaMarkup) {
      // Add the schema markup at the end of the content
      articleResponse.content = articleResponse.content + '\n' + schemaMarkup;
    }

    return articleResponse;
  } catch (error) {
    console.error('Error generating article:', error);
    throw error;
  }
}

export class ArticleService {
  async createArticle(params: ArticleCreationParams): Promise<ArticleServiceResponse> {
    try {
      const articleResponse = await generateArticle(params);

      const article: Article = {
        title: params.keyword || params.title || '',
        content: articleResponse.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        ok: true,
        article,
      };
    } catch (error) {
      console.error('Error creating article:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Note: This function is commented out as it seems to be using a Prisma model that doesn't exist
// If you need to create articles, use the ArticleService class above
/*
export async function createArticle(data: {
  title: string;
  content: string;
  userId: string;
  teamId?: string;
}) {
  return prisma.article.create({
    data: {
      title: data.title,
      content: data.content,
      userId: data.userId,
      teamId: data.teamId,
    },
  });
}
*/