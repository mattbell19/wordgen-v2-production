import { generateArticle } from '../gpt-client';
import OpenAI from 'openai';
import type { ArticleCreationParams } from '../../services/article.service';
import { internalLinkService } from '../../services/internal-link.service';
import { searchUsageService } from '../../services/search-usage.service';
import { ExternalLinkService } from '../../services/external-link.service';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

// Mock internal link service
jest.mock('../../services/internal-link.service', () => ({
  internalLinkService: {
    findRelevantLinks: jest.fn()
  }
}));

// Mock search usage service
jest.mock('../../services/search-usage.service', () => ({
  searchUsageService: {
    hasSearchQuotaRemaining: jest.fn(),
    incrementSearchUsage: jest.fn()
  }
}));

// Mock external link service
jest.mock('../../services/external-link.service', () => ({
  ExternalLinkService: jest.fn().mockImplementation(() => ({
    findLinkingOpportunities: jest.fn()
  }))
}));

describe('GPT Client', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;

    // Reset mock implementations
    (internalLinkService.findRelevantLinks as jest.Mock).mockResolvedValue([]);
    (searchUsageService.hasSearchQuotaRemaining as jest.Mock).mockResolvedValue(true);
    (searchUsageService.incrementSearchUsage as jest.Mock).mockResolvedValue({});
  });

  const mockParams: ArticleCreationParams = {
    keyword: 'test keyword',
    wordCount: 1000,
    tone: 'professional',
    callToAction: 'Sign up now!',
    enableInternalLinking: true,
    enableExternalLinking: true,
    userId: 123
  };

  const mockGptResponse = {
    choices: [
      {
        message: {
          content: `<h1>Test Article</h1>
<p>This is a test article about test keyword.</p>
<div class="quick-takeaway"><p>Key point here</p></div>
<h2>Section 1</h2>
<p>More content about test keyword.</p>
<div class="pro-tip"><p>Expert advice here</p></div>
<div class="stat-highlight"><p>Important statistic: 75% of users...</p></div>
<p>${mockParams.callToAction}</p>`
        }
      }
    ]
  };

  describe('HTML Formatting', () => {
    it('should generate an article with proper HTML structure', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      const result = await generateArticle(mockParams);

      // Check basic HTML structure
      expect(result).toContain('<h1>');
      expect(result).toContain('</h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });

    it('should include all required special elements', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      const result = await generateArticle(mockParams);

      // Check special elements
      expect(result).toContain('<div class="quick-takeaway">');
      expect(result).toContain('<div class="pro-tip">');
      expect(result).toContain('<div class="stat-highlight">');
    });

    it('should maintain proper HTML nesting', async () => {
      const nestedResponse = {
        choices: [
          {
            message: {
              content: `<h1>Test</h1>
<div class="section">
  <h2>Section Title</h2>
  <p>Content here</p>
  <div class="quick-takeaway">
    <p>Takeaway point</p>
  </div>
</div>`
            }
          }
        ]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(nestedResponse);
      const result = await generateArticle(mockParams);

      expect(result).toContain('<div class="section">');
      expect(result).toContain('</div>');
      expect(result.indexOf('<div class="section">')).toBeLessThan(result.indexOf('</div>'));
    });
  });

  describe('Content Requirements', () => {
    it('should include the keyword with proper density', async () => {
      const keywordResponse = {
        choices: [
          {
            message: {
              content: `<h1>Article about ${mockParams.keyword}</h1>
<p>First mention of ${mockParams.keyword} here.</p>
<h2>Understanding ${mockParams.keyword}</h2>
<p>More about ${mockParams.keyword} in detail.</p>
<p>Final thoughts on ${mockParams.keyword}.</p>`
            }
          }
        ]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(keywordResponse);
      const result = await generateArticle(mockParams);

      // Count keyword occurrences (should be 5-7 times as per requirements)
      const keywordCount = (result.match(new RegExp(mockParams.keyword, 'gi')) || []).length;
      expect(keywordCount).toBeGreaterThanOrEqual(5);
      expect(keywordCount).toBeLessThanOrEqual(7);
    });

    it('should include a call to action when provided', async () => {
      const ctaResponse = {
        choices: [
          {
            message: {
              content: `<h1>Test</h1>
<p>Content here</p>
<p class="cta">${mockParams.callToAction}</p>`
            }
          }
        ]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(ctaResponse);
      const result = await generateArticle(mockParams);

      expect(result).toContain(mockParams.callToAction);
      expect(result).toContain('class="cta"');
    });

    it('should generate content with proper word count distribution', async () => {
      const longContent = `<h1>Test Article</h1>
${Array(15).fill('<p>This is a test sentence for word count.</p>').join('\n')}
<h2>Main Section</h2>
${Array(70).fill('<p>This is main content for testing word distribution.</p>').join('\n')}
<h2>Conclusion</h2>
${Array(15).fill('<p>This is conclusion content.</p>').join('\n')}`;

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: longContent } }]
      });

      const result = await generateArticle({ ...mockParams, wordCount: 1000 });

      // Count words in each section (after removing HTML tags)
      const sections = result.split('<h2>');
      const introWords = sections[0].replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
      const mainWords = sections[1].replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
      const conclusionWords = sections[2].replace(/<[^>]*>/g, '').trim().split(/\s+/).length;

      // Check word count distribution (15% intro, 70% main, 15% conclusion)
      expect(introWords).toBeGreaterThanOrEqual(mockParams.wordCount * 0.13); // Allow 2% margin
      expect(introWords).toBeLessThanOrEqual(mockParams.wordCount * 0.17);
      expect(mainWords).toBeGreaterThanOrEqual(mockParams.wordCount * 0.68);
      expect(mainWords).toBeLessThanOrEqual(mockParams.wordCount * 0.72);
      expect(conclusionWords).toBeGreaterThanOrEqual(mockParams.wordCount * 0.13);
      expect(conclusionWords).toBeLessThanOrEqual(mockParams.wordCount * 0.17);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'API Error';
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
      await expect(generateArticle(mockParams)).rejects.toThrow(errorMessage);
    });

    it('should handle empty API responses', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [{ message: { content: null } }]
      });
      await expect(generateArticle(mockParams)).rejects.toThrow('No content received from OpenAI');
    });

    it('should handle malformed HTML in response', async () => {
      const malformedResponse = {
        choices: [
          {
            message: {
              content: `<h1>Test</h1><p>Unclosed paragraph<div>Nested incorrectly</p></div>`
            }
          }
        ]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(malformedResponse);
      const result = await generateArticle(mockParams);

      // Should still return content even if HTML is malformed
      expect(result).toBeTruthy();
      expect(result).toContain('Test');
      expect(result).toContain('Unclosed paragraph');
    });
  });

  describe('API Parameters', () => {
    it('should pass correct parameters to OpenAI API', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle(mockParams);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          max_tokens: 4000,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining(mockParams.keyword)
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(mockParams.keyword)
            })
          ])
        })
      );
    });

    it('should check for internal links when internal linking is enabled', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle(mockParams);

      expect(internalLinkService.findRelevantLinks).toHaveBeenCalledWith(
        mockParams.userId,
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should not check for internal links when internal linking is disabled', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle({ ...mockParams, enableInternalLinking: false });

      expect(internalLinkService.findRelevantLinks).not.toHaveBeenCalled();
    });

    it('should check search quota when external linking is enabled', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle(mockParams);

      expect(searchUsageService.hasSearchQuotaRemaining).toHaveBeenCalledWith(mockParams.userId);
    });

    it('should not check search quota when external linking is disabled', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle({ ...mockParams, enableExternalLinking: false });

      expect(searchUsageService.hasSearchQuotaRemaining).not.toHaveBeenCalled();
    });

    it('should increment search usage after successful external link search', async () => {
      // Mock external link service to return some links
      const mockExternalLinkService = new ExternalLinkService();
      (mockExternalLinkService.findLinkingOpportunities as jest.Mock).mockResolvedValue([
        { url: 'https://example.com', title: 'Example', relevance: 1, authority: 1, snippet: 'Example snippet' }
      ]);

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle(mockParams);

      expect(searchUsageService.incrementSearchUsage).toHaveBeenCalledWith(mockParams.userId);
    });

    it('should include all required prompt elements in system message', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockGptResponse);
      await generateArticle(mockParams);

      const systemMessage = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0]
        .messages.find((m: any) => m.role === 'system').content;

      // Check for all required prompt elements
      expect(systemMessage).toContain('HTML formatting');
      expect(systemMessage).toContain('SEO Requirements');
      expect(systemMessage).toContain('Content Structure');
      expect(systemMessage).toContain('quick-takeaway');
      expect(systemMessage).toContain('pro-tip');
      expect(systemMessage).toContain('stat-highlight');
      expect(systemMessage).toContain('Word Count Distribution');
    });
  });
});