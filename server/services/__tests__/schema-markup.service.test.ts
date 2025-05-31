import { describe, it, expect } from 'vitest';
import { schemaMarkupService } from '../schema-markup.service';
import { ArticleResponse } from '../article.service';

describe('SchemaMarkupService', () => {
  const mockArticle: ArticleResponse = {
    content: '<h1>Test Article</h1><p>This is a test article about SEO.</p>',
    wordCount: 500,
    readingTime: 3,
    settings: {
      keyword: 'test keyword',
      wordCount: 500,
      tone: 'professional',
    }
  };

  describe('generateArticleSchema', () => {
    it('should generate valid JSON-LD schema markup', () => {
      const schemaMarkup = schemaMarkupService.generateArticleSchema(mockArticle);
      
      // Check that it's a script tag with application/ld+json type
      expect(schemaMarkup).toContain('<script type="application/ld+json">');
      expect(schemaMarkup).toContain('</script>');
      
      // Extract the JSON content
      const jsonContent = schemaMarkup.replace(/<script type="application\/ld\+json">(.+)<\/script>/s, '$1');
      const schemaObject = JSON.parse(jsonContent);
      
      // Check schema structure
      expect(schemaObject['@context']).toBe('https://schema.org');
      expect(schemaObject['@type']).toBe('Article');
      expect(schemaObject.headline).toBe('Test Article');
      expect(schemaObject.wordCount).toBe(500);
      expect(schemaObject.author).toBeDefined();
      expect(schemaObject.publisher).toBeDefined();
    });

    it('should extract title from content', () => {
      const schemaMarkup = schemaMarkupService.generateArticleSchema(mockArticle);
      const jsonContent = schemaMarkup.replace(/<script type="application\/ld\+json">(.+)<\/script>/s, '$1');
      const schemaObject = JSON.parse(jsonContent);
      
      expect(schemaObject.headline).toBe('Test Article');
    });

    it('should use keyword as fallback when no title is found', () => {
      const articleWithoutTitle: ArticleResponse = {
        ...mockArticle,
        content: '<p>This is a test article without a title.</p>'
      };
      
      const schemaMarkup = schemaMarkupService.generateArticleSchema(articleWithoutTitle);
      const jsonContent = schemaMarkup.replace(/<script type="application\/ld\+json">(.+)<\/script>/s, '$1');
      const schemaObject = JSON.parse(jsonContent);
      
      expect(schemaObject.headline).toBe('test keyword - Comprehensive Guide');
    });

    it('should extract description from content', () => {
      const schemaMarkup = schemaMarkupService.generateArticleSchema(mockArticle);
      const jsonContent = schemaMarkup.replace(/<script type="application\/ld\+json">(.+)<\/script>/s, '$1');
      const schemaObject = JSON.parse(jsonContent);
      
      expect(schemaObject.description).toBe('This is a test article about SEO.');
    });

    it('should handle errors gracefully', () => {
      // Create an invalid article object that would cause parsing errors
      const invalidArticle = {
        ...mockArticle,
        content: null
      } as unknown as ArticleResponse;
      
      const schemaMarkup = schemaMarkupService.generateArticleSchema(invalidArticle);
      
      // Should return empty string on error
      expect(schemaMarkup).toBe('');
    });
  });
});
