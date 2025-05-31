import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faqGeneratorService } from '../faq-generator.service';
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

describe('FaqGeneratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('generateFaqSection', () => {
    it('should generate a FAQ section with schema markup', async () => {
      // Mock OpenAI response
      const mockFaqs = {
        faqs: [
          {
            question: 'What is SEO?',
            answer: 'SEO (Search Engine Optimization) is the practice of optimizing websites to rank higher in search engine results pages.'
          },
          {
            question: 'Why is SEO important?',
            answer: 'SEO is important because it increases visibility, drives organic traffic, and builds credibility for your website.'
          }
        ]
      };
      
      // Setup the mock implementation
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockFaqs)
            }
          }
        ]
      });
      
      // Apply the mock
      const openaiInstance = new OpenAI();
      openaiInstance.chat.completions.create = mockCreate;
      
      const result = await faqGeneratorService.generateFaqSection('SEO', 2);
      
      // Check that the result contains the expected content
      expect(result).toContain('<section class="article-faq" itemscope itemtype="https://schema.org/FAQPage">');
      expect(result).toContain('<h2>Frequently Asked Questions About SEO</h2>');
      expect(result).toContain('What is SEO?');
      expect(result).toContain('Why is SEO important?');
      
      // Check that schema markup is included
      expect(result).toContain('itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"');
      expect(result).toContain('itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"');
      
      // Verify OpenAI was called with the right parameters
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Generate 2 frequently asked questions')
            })
          ]),
          response_format: { type: 'json_object' }
        })
      );
    });
    
    it('should return empty string when OpenAI returns no content', async () => {
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
      
      const result = await faqGeneratorService.generateFaqSection('Empty Test', 3);
      
      expect(result).toBe('');
    });
    
    it('should handle OpenAI errors gracefully', async () => {
      // Setup the mock implementation to throw an error
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
      
      // Apply the mock
      const openaiInstance = new OpenAI();
      openaiInstance.chat.completions.create = mockCreate;
      
      const result = await faqGeneratorService.generateFaqSection('Error Test', 3);
      
      expect(result).toBe('');
    });
    
    it('should handle invalid response format', async () => {
      // Setup the mock implementation with invalid format
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"invalid": "format"}'
            }
          }
        ]
      });
      
      // Apply the mock
      const openaiInstance = new OpenAI();
      openaiInstance.chat.completions.create = mockCreate;
      
      const result = await faqGeneratorService.generateFaqSection('Invalid Format', 3);
      
      expect(result).toBe('');
    });
  });
});
