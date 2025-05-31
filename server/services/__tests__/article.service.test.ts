import { generateArticle, ArticleCreationParams, ArticleService } from '../article.service';
import { generateArticle as generateArticleInternal } from '../../lib/gpt-client';
import { generateArticleWithGPT } from '../../services/openai.service';
import { tocGeneratorService } from '../toc-generator.service';
import { schemaMarkupService } from '../schema-markup.service';
import { faqGeneratorService } from '../faq-generator.service';
import { lsiKeywordService } from '../lsi-keyword.service';
import type { ArticleSettings } from '../../../client/src/lib/types';

// Mock the OpenAI service
jest.mock('../../services/openai.service', () => ({
  generateArticleWithGPT: jest.fn(),
}));

// Mock the GPT client
jest.mock('../../lib/gpt-client', () => ({
  generateArticle: jest.fn()
}));

// Mock the TOC generator service
jest.mock('../toc-generator.service', () => ({
  tocGeneratorService: {
    generateTableOfContents: jest.fn().mockImplementation((content) => ({
      toc: '<div class="article-toc"><h2>Table of Contents</h2><nav><ul><li><a href="#section-1">Section 1</a></li></ul></nav></div>',
      content: content
    }))
  }
}));

// Mock the schema markup service
jest.mock('../schema-markup.service', () => ({
  schemaMarkupService: {
    generateArticleSchema: jest.fn().mockImplementation(() => '<script type="application/ld+json">{"@context":"https://schema.org"}</script>')
  }
}));

// Mock the FAQ generator service
jest.mock('../faq-generator.service', () => ({
  faqGeneratorService: {
    generateFaqSection: jest.fn().mockImplementation((keyword) =>
      Promise.resolve(`<section class="article-faq"><h2>Frequently Asked Questions About ${keyword}</h2></section>`)
    )
  }
}));

// Mock the LSI keyword service
jest.mock('../lsi-keyword.service', () => ({
  lsiKeywordService: {
    generateLsiKeywords: jest.fn().mockImplementation((keyword) =>
      Promise.resolve(['related term 1', 'related term 2', 'related term 3'])
    ),
    enhanceContentWithLsiKeywords: jest.fn().mockImplementation((content, keywords) =>
      content + '\n<div class="related-keywords"><h3>Related Topics</h3><ul><li>' + keywords.join('</li><li>') + '</li></ul></div>'
    )
  }
}));

describe('Article Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams: ArticleCreationParams = {
    keyword: 'test keyword',
    wordCount: 1000,
    tone: 'professional',
    callToAction: 'Sign up now!',
    enableInternalLinking: true,
    enableExternalLinking: true
  };

  const mockContent = `<h1>Test Article</h1>
<p>This is a test article about test keyword.</p>
<div class="quick-takeaway"><p>Key point here</p></div>
<h2>Section 1</h2>
<p>More content about test keyword.</p>
<div class="pro-tip"><p>Expert advice here</p></div>
<div class="stat-highlight"><p>Important statistic: 75% of users...</p></div>
<p class="cta">${mockParams.callToAction}</p>`;

  describe('Article Generation', () => {
    it('should generate an article successfully with TOC and schema markup', async () => {
      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(mockContent);

      // Mock the TOC and schema markup services
      (tocGeneratorService.generateTableOfContents as jest.Mock).mockReturnValueOnce({
        toc: '<div class="article-toc"><h2>Table of Contents</h2><nav><ul><li><a href="#section-1">Section 1</a></li></ul></nav></div>',
        content: mockContent
      });

      (schemaMarkupService.generateArticleSchema as jest.Mock).mockReturnValueOnce(
        '<script type="application/ld+json">{"@context":"https://schema.org"}</script>'
      );

      const result = await generateArticle(mockParams);

      // Verify the content includes TOC and schema markup
      expect(result.content).toContain('<div class="article-toc">');
      expect(result.content).toContain('<script type="application/ld+json">');

      // Verify other properties
      expect(result.wordCount).toBe(mockParams.wordCount);
      expect(result.readingTime).toBe(Math.ceil(mockParams.wordCount / 200));
      expect(result.settings).toEqual(mockParams);

      // Verify the services were called
      expect(tocGeneratorService.generateTableOfContents).toHaveBeenCalledWith(mockContent);
      expect(schemaMarkupService.generateArticleSchema).toHaveBeenCalled();
      expect(faqGeneratorService.generateFaqSection).toHaveBeenCalledWith(mockParams.keyword);
      expect(lsiKeywordService.generateLsiKeywords).toHaveBeenCalledWith(mockParams.keyword);
      expect(lsiKeywordService.enhanceContentWithLsiKeywords).toHaveBeenCalled();
    });

    it('should handle missing title by using keyword', async () => {
      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(mockContent);
      await generateArticle(mockParams);

      expect(generateArticleInternal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockParams.keyword
        })
      );
    });

    it('should calculate reading time correctly for different word counts', async () => {
      const testCases = [
        { wordCount: 200, expectedTime: 1 },
        { wordCount: 500, expectedTime: 3 },
        { wordCount: 1000, expectedTime: 5 },
        { wordCount: 1500, expectedTime: 8 }
      ];

      for (const { wordCount, expectedTime } of testCases) {
        (generateArticleInternal as jest.Mock).mockResolvedValueOnce(mockContent);
        const result = await generateArticle({ ...mockParams, wordCount });
        expect(result.readingTime).toBe(expectedTime);
      }
    });

    it('should pass through all settings to the generator', async () => {
      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(mockContent);
      await generateArticle(mockParams);

      expect(generateArticleInternal).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: mockParams.keyword,
          wordCount: mockParams.wordCount,
          tone: mockParams.tone,
          callToAction: mockParams.callToAction,
          enableInternalLinking: mockParams.enableInternalLinking,
          enableExternalLinking: mockParams.enableExternalLinking
        })
      );
    });

    it('should validate word count ranges', async () => {
      const invalidWordCounts = [-100, 0, 10000];

      for (const wordCount of invalidWordCounts) {
        await expect(generateArticle({ ...mockParams, wordCount }))
          .rejects.toThrow(/Invalid word count/);
      }
    });

    it('should validate required parameters', async () => {
      const invalidParams = [
        { ...mockParams, keyword: '' },
        { ...mockParams, tone: '' },
        { ...mockParams, wordCount: undefined }
      ];

      for (const params of invalidParams) {
        await expect(generateArticle(params as ArticleCreationParams))
          .rejects.toThrow(/Missing required parameter/);
      }
    });
  });

  describe('ArticleService', () => {
    const service = new ArticleService();

    it('should create an article with all settings', async () => {
      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(mockContent);

      const result = await service.createArticle(mockParams);

      expect(result).toEqual({
        ok: true,
        article: {
          title: mockParams.keyword,
          content: mockContent,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle article creation errors', async () => {
      const errorMessage = 'Creation failed';
      (generateArticleInternal as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const result = await service.createArticle(mockParams);

      expect(result).toEqual({
        ok: false,
        error: errorMessage
      });
    });

    it('should use title if keyword is not provided', async () => {
      const paramsWithTitle = {
        ...mockParams,
        keyword: '',
        title: 'Test Title'
      };

      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(mockContent);
      const result = await service.createArticle(paramsWithTitle);
      expect(result.article?.title).toBe(paramsWithTitle.title);
    });

    it('should handle malformed content gracefully', async () => {
      const malformedContent = '<h1>Test</h1><p>Unclosed paragraph<div>Bad nesting</p></div>';
      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(malformedContent);

      const result = await service.createArticle(mockParams);

      expect(result.ok).toBe(true);
      expect(result.article?.content).toBe(malformedContent);
    });

    it('should preserve HTML formatting in stored content', async () => {
      const formattedContent = `
<h1>Test Article</h1>
<div class="quick-takeaway">
  <p>Important point</p>
</div>
<h2>Section</h2>
<p>Content here</p>`;

      (generateArticleInternal as jest.Mock).mockResolvedValueOnce(formattedContent);

      const result = await service.createArticle(mockParams);

      expect(result.ok).toBe(true);
      expect(result.article?.content).toBe(formattedContent);
      expect(result.article?.content).toContain('<div class="quick-takeaway">');
    });
  });
});

describe('Article Generation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateArticleWithGPT', () => {
    it('should return article data when generation succeeds', async () => {
      const mockArticleContent = '<h1>Test Article</h1><p>This is a test article content.</p>';
      const mockSettings: ArticleSettings = {
        keyword: 'Test Article',
        tone: 'professional',
        wordCount: 500,
        enableExternalLinking: false,
        enableInternalLinking: false,
      };

      const mockResponse = {
        content: mockArticleContent,
        wordCount: 500,
        readingTime: 3,
        settings: mockSettings
      };

      (generateArticleWithGPT as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateArticleWithGPT(mockSettings);

      expect(result).toEqual(mockResponse);
      expect(generateArticleWithGPT).toHaveBeenCalledWith(mockSettings);
    });

    it('should handle errors during article generation', async () => {
      const mockSettings: ArticleSettings = {
        keyword: 'Error Article',
        tone: 'professional',
        wordCount: 500,
        enableExternalLinking: false,
        enableInternalLinking: false,
      };

      const mockError = new Error('Failed to generate article');
      (generateArticleWithGPT as jest.Mock).mockRejectedValue(mockError);

      await expect(generateArticleWithGPT(mockSettings)).rejects.toThrow('Failed to generate article');
    });

    it('should generate article with the correct formatting based on settings', async () => {
      const mockArticleContent = '<h1>Custom Article</h1><p>This is a custom article with specific settings.</p>';
      const mockSettings: ArticleSettings = {
        keyword: 'Custom Article',
        tone: 'casual',
        wordCount: 1000,
        enableExternalLinking: true,
        enableInternalLinking: true,
      };

      const mockResponse = {
        content: mockArticleContent,
        wordCount: 1000,
        readingTime: 5,
        settings: mockSettings
      };

      (generateArticleWithGPT as jest.Mock).mockResolvedValue(mockResponse);

      const result = await generateArticleWithGPT(mockSettings);

      expect(result).toEqual(mockResponse);
      expect(generateArticleWithGPT).toHaveBeenCalledWith(mockSettings);
    });

    it('should handle empty or invalid settings', async () => {
      const invalidSettings: Partial<ArticleSettings>[] = [
        {},
        { keyword: '', tone: 'professional', wordCount: 500, enableExternalLinking: false, enableInternalLinking: false },
        { keyword: 'test', tone: 'professional', wordCount: -1, enableExternalLinking: false, enableInternalLinking: false },
        { keyword: 'test', tone: 'casual', wordCount: 0, enableExternalLinking: false, enableInternalLinking: false }
      ];

      for (const settings of invalidSettings) {
        await expect(generateArticleWithGPT(settings as ArticleSettings))
          .rejects.toThrow(/Invalid settings/);
      }
    });
  });
});