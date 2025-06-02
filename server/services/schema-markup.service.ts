import { ArticleResponse, ArticleCreationParams } from './article.service';
import { DOMParser } from '@xmldom/xmldom';

/**
 * Schema Markup Service
 *
 * This service generates JSON-LD schema markup for articles to improve SEO.
 */
export class SchemaMarkupService {
  /**
   * Generate JSON-LD schema markup for an article
   *
   * @param article The article response object
   * @param authorName The author name (defaults to site name if not provided)
   * @param publisherName The publisher name (defaults to site name)
   * @param publisherLogo The publisher logo URL
   * @returns JSON-LD schema markup as a string
   */
  generateArticleSchema(
    article: ArticleResponse,
    authorName?: string,
    publisherName: string = 'WordGen',
    publisherLogo: string = 'https://wordgen.io/logo.png'
  ): string {
    try {
      // Extract title from content or use keyword as fallback
      const title = this.extractTitle(article.content) ||
                   `${article.settings.keyword} - Comprehensive Guide`;

      // Extract description from content or generate one
      const description = this.extractDescription(article.content) ||
                         `A comprehensive guide about ${article.settings.keyword}`;

      // Create schema object
      const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "wordCount": article.wordCount,
        "author": {
          "@type": "Person",
          "name": authorName || publisherName
        },
        "publisher": {
          "@type": "Organization",
          "name": publisherName,
          "logo": {
            "@type": "ImageObject",
            "url": publisherLogo
          }
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://wordgen.io/articles/${encodeURIComponent(article.settings.keyword)}`
        }
      };

      return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
    } catch (error) {
      console.error('Error generating schema markup:', error);
      return '';
    }
  }

  /**
   * Extract title from article content
   *
   * @param content HTML content of the article
   * @returns The extracted title or null if not found
   */
  private extractTitle(content: string): string | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // Try to find h1 tag
      const h1Elements = doc.getElementsByTagName('h1');
      if (h1Elements.length > 0 && h1Elements[0].textContent) {
        return h1Elements[0].textContent.trim();
      }

      return null;
    } catch (error) {
      console.error('Error extracting title:', error);
      return null;
    }
  }

  /**
   * Extract description from article content
   *
   * @param content HTML content of the article
   * @returns The extracted description or null if not found
   */
  private extractDescription(content: string): string | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // Try to find the first paragraph
      const pElements = doc.getElementsByTagName('p');
      if (pElements.length > 0 && pElements[0].textContent) {
        const text = pElements[0].textContent.trim();
        // Limit to ~155 characters for meta description
        return text.length > 155 ? text.substring(0, 152) + '...' : text;
      }

      return null;
    } catch (error) {
      console.error('Error extracting description:', error);
      return null;
    }
  }
}

// Export singleton instance
export const schemaMarkupService = new SchemaMarkupService();
