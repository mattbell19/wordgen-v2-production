import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lsiKeywordService } from '../lsi-keyword.service';
import { OpenAI } from 'openai';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

describe('LsiKeywordService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('generateLsiKeywords', () => {
    it('should generate LSI keywords for a target keyword', async () => {
      // Mock OpenAI response
      const mockKeywords = {
        keywords: [
          'search engine optimization',
          'search engine ranking',
          'keyword research',
          'meta tags',
          'backlinks'
        ]
      };
      
      // Setup the mock implementation
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockKeywords)
            }
          }
        ]
      });
      
      // Apply the mock
      const openaiInstance = new OpenAI();
      openaiInstance.chat.completions.create = mockCreate;
      
      const result = await lsiKeywordService.generateLsiKeywords('SEO', 5);
      
      // Check that the result contains the expected keywords
      expect(result).toEqual(mockKeywords.keywords);
      expect(result).toHaveLength(5);
      expect(result).toContain('search engine optimization');
      expect(result).toContain('keyword research');
      
      // Verify OpenAI was called with the right parameters
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Generate 5 LSI')
            })
          ]),
          response_format: { type: 'json_object' }
        })
      );
    });
    
    it('should return empty array when OpenAI returns no content', async () => {
      // Setup the mock implementation with empty response
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      });
      
      // Apply the mock
      const openaiInstance = new OpenAI();
      openaiInstance.chat.completions.create = mockCreate;
      
      const result = await lsiKeywordService.generateLsiKeywords('Empty Test', 3);
      
      expect(result).toEqual([]);
    });
    
    it('should handle OpenAI errors gracefully', async () => {
      // Setup the mock implementation to throw an error
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
      
      // Apply the mock
      const openaiInstance = new OpenAI();
      openaiInstance.chat.completions.create = mockCreate;
      
      const result = await lsiKeywordService.generateLsiKeywords('Error Test', 3);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('enhanceContentWithLsiKeywords', () => {
    it('should add LSI keywords section to content', () => {
      const content = '<h1>Test Article</h1><p>This is a test article.</p>';
      const keywords = ['keyword1', 'keyword2', 'keyword3'];
      
      const result = lsiKeywordService.enhanceContentWithLsiKeywords(content, keywords);
      
      expect(result).toContain(content);
      expect(result).toContain('<div class="related-keywords">');
      expect(result).toContain('<h3>Related Topics</h3>');
      expect(result).toContain('<li>keyword1</li>');
      expect(result).toContain('<li>keyword2</li>');
      expect(result).toContain('<li>keyword3</li>');
    });
    
    it('should return original content when keywords array is empty', () => {
      const content = '<h1>Test Article</h1><p>This is a test article.</p>';
      
      const result = lsiKeywordService.enhanceContentWithLsiKeywords(content, []);
      
      expect(result).toBe(content);
    });
    
    it('should return original content when content is empty', () => {
      const result = lsiKeywordService.enhanceContentWithLsiKeywords('', ['keyword1', 'keyword2']);
      
      expect(result).toBe('');
    });
  });
});
