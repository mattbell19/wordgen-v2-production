import { OpenAI } from 'openai';
import { env } from '../env';

/**
 * LSI Keyword Service
 *
 * This service generates Latent Semantic Indexing (LSI) keywords for articles.
 */
export class LsiKeywordService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate LSI keywords for a target keyword
   *
   * @param keyword The target keyword
   * @param count Number of LSI keywords to generate (default: 10)
   * @returns Array of LSI keywords
   */
  async generateLsiKeywords(keyword: string, count: number = 10): Promise<string[]> {
    try {
      const prompt = `Generate ${count} LSI (Latent Semantic Indexing) keywords for the main keyword "${keyword}".
LSI keywords are semantically related terms that search engines use to understand content context.
Return only a JSON array of strings with no additional text or explanation.
Make sure the keywords are diverse and cover different aspects of the topic.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates SEO-optimized keywords.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsedContent = JSON.parse(content);

      if (!Array.isArray(parsedContent.keywords)) {
        throw new Error('Invalid response format from OpenAI');
      }

      return parsedContent.keywords;
    } catch (error) {
      console.error('Error generating LSI keywords:', error);
      return [];
    }
  }

  /**
   * Enhance article content with LSI keywords
   *
   * @param content Original article content
   * @param lsiKeywords Array of LSI keywords
   * @returns Enhanced content with LSI keywords
   */
  enhanceContentWithLsiKeywords(content: string, lsiKeywords: string[]): string {
    if (!content || !lsiKeywords || lsiKeywords.length === 0) {
      return content;
    }

    // Add LSI keywords section at the end of the article
    const lsiSection = this.buildLsiKeywordsSection(lsiKeywords);

    return content + '\n' + lsiSection;
  }

  /**
   * Build HTML for the LSI keywords section
   *
   * @param keywords Array of LSI keywords
   * @returns HTML string for the LSI keywords section
   */
  private buildLsiKeywordsSection(keywords: string[]): string {
    if (keywords.length === 0) {
      return '';
    }

    // Create a more visually appealing related keywords section
    let html = '<div class="related-keywords">\n';
    html += '<h3>Related Topics</h3>\n';
    html += '<p class="related-keywords-description">Explore these related topics to deepen your understanding:</p>\n';
    html += '<ul class="keywords-list">\n';

    // Format and clean up keywords
    keywords.forEach(keyword => {
      // Capitalize first letter of each keyword for consistency
      const formattedKeyword = keyword.trim();
      const capitalizedKeyword = formattedKeyword.charAt(0).toUpperCase() + formattedKeyword.slice(1);
      html += `  <li>${capitalizedKeyword}</li>\n`;
    });

    html += '</ul>\n';
    html += '</div>';

    return html;
  }
}

// Export singleton instance
export const lsiKeywordService = new LsiKeywordService();
