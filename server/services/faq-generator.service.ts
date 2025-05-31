import { OpenAI } from 'openai';
import { env } from '../env';

/**
 * FAQ Generator Service
 *
 * This service generates FAQ sections for articles based on keyword research.
 */
export class FaqGeneratorService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate FAQ section for an article based on a keyword
   *
   * @param keyword The target keyword
   * @param count Number of FAQ items to generate (default: 5)
   * @returns HTML string with the FAQ section
   */
  async generateFaqSection(keyword: string, count: number = 5): Promise<string> {
    try {
      const faqs = await this.generateFaqItems(keyword, count);

      if (!faqs || faqs.length === 0) {
        return '';
      }

      return this.buildFaqHtml(faqs, keyword);
    } catch (error) {
      console.error('Error generating FAQ section:', error);
      return '';
    }
  }

  /**
   * Generate FAQ items using OpenAI
   *
   * @param keyword The target keyword
   * @param count Number of FAQ items to generate
   * @returns Array of FAQ items with questions and answers
   */
  private async generateFaqItems(keyword: string, count: number): Promise<Array<{ question: string; answer: string }>> {
    try {
      const prompt = `Generate ${count} frequently asked questions and answers about "${keyword}".
Format the response as a JSON array of objects with "question" and "answer" properties.
Make sure the questions are diverse and cover different aspects of the topic.
Keep answers concise but informative (2-3 sentences each).
Do not include any explanatory text, just return the JSON array.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates SEO-optimized FAQ content.'
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

      if (!Array.isArray(parsedContent.faqs)) {
        throw new Error('Invalid response format from OpenAI');
      }

      return parsedContent.faqs;
    } catch (error) {
      console.error('Error generating FAQ items:', error);
      return [];
    }
  }

  /**
   * Build HTML for the FAQ section
   *
   * @param faqs Array of FAQ items
   * @param keyword The target keyword
   * @returns HTML string for the FAQ section
   */
  private buildFaqHtml(faqs: Array<{ question: string; answer: string }>, keyword: string): string {
    if (faqs.length === 0) {
      return '';
    }

    // Create a more visually appealing FAQ section with better formatting
    let html = `<section class="article-faq" itemscope itemtype="https://schema.org/FAQPage">\n`;
    html += `<h2>Frequently Asked Questions About ${keyword}</h2>\n`;
    html += `<div class="faq-items">\n`;

    faqs.forEach((faq, index) => {
      // Format the answer text to handle potential line breaks and improve readability
      const formattedAnswer = faq.answer
        .replace(/\n/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      html += `<div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n`;
      html += `  <h3 itemprop="name">${index + 1}. ${faq.question}</h3>\n`;
      html += `  <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n`;
      html += `    <div itemprop="text">\n`;
      html += `      <p>${formattedAnswer}</p>\n`;
      html += `    </div>\n`;
      html += `  </div>\n`;
      html += `</div>\n`;
    });

    html += `</div>\n`; // Close faq-items div
    html += `</section>`;

    return html;
  }
}

// Export singleton instance
export const faqGeneratorService = new FaqGeneratorService();
