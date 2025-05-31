import { DOMParser } from 'xmldom';
import { randomUUID } from 'crypto';

/**
 * Table of Contents Generator Service
 *
 * This service generates a table of contents for articles based on headings.
 */
export class TocGeneratorService {
  /**
   * Generate a table of contents for an article
   *
   * @param content HTML content of the article
   * @returns HTML string with the table of contents and the modified content with anchor IDs
   */
  generateTableOfContents(content: string): { toc: string; content: string } {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // Find all headings (h2, h3, h4)
      const headings = this.extractHeadings(doc);

      if (headings.length === 0) {
        return { toc: '', content };
      }

      // Generate TOC HTML
      const tocHtml = this.buildTocHtml(headings);

      // Add IDs to headings in the content
      const contentWithAnchors = this.addAnchorsToContent(content, headings);

      return {
        toc: tocHtml,
        content: contentWithAnchors
      };
    } catch (error) {
      console.error('Error generating table of contents:', error);
      return { toc: '', content };
    }
  }

  /**
   * Extract headings from HTML document
   *
   * @param doc DOM document
   * @returns Array of heading objects with text, level, and ID
   */
  private extractHeadings(doc: Document): Array<{ text: string; level: number; id: string }> {
    const headings: Array<{ text: string; level: number; id: string }> = [];

    // Get all h2, h3, and h4 elements
    ['h2', 'h3', 'h4'].forEach(tag => {
      const elements = doc.getElementsByTagName(tag);

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const text = element.textContent?.trim() || '';

        if (text) {
          // Generate a slug-like ID from the heading text
          const id = this.generateHeadingId(text);

          headings.push({
            text,
            level: parseInt(tag.charAt(1)),
            id
          });
        }
      }
    });

    return headings;
  }

  /**
   * Generate a unique ID for a heading
   *
   * @param text Heading text
   * @returns Unique ID for the heading
   */
  private generateHeadingId(text: string): string {
    // Create a slug from the text
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Add a short unique suffix to avoid collisions
    return `${slug}-${randomUUID().substring(0, 8)}`;
  }

  /**
   * Build HTML for the table of contents
   *
   * @param headings Array of heading objects
   * @returns HTML string for the table of contents
   */
  private buildTocHtml(headings: Array<{ text: string; level: number; id: string }>): string {
    if (headings.length === 0) {
      return '';
    }

    // Create a more visually appealing and structured table of contents
    let html = '<div class="article-toc">\n';
    html += '<h2>Table of Contents</h2>\n';
    html += '<nav aria-label="Table of contents">\n<ul class="toc-list">\n';

    let currentLevel = 2;
    let sectionCount = 0;

    headings.forEach(heading => {
      // Only count level 2 headings (main sections) for numbering
      if (heading.level === 2) {
        sectionCount++;
      }

      if (heading.level > currentLevel) {
        // Start a new nested list with appropriate class
        html += '<ul class="toc-sublist">\n';
        currentLevel = heading.level;
      } else if (heading.level < currentLevel) {
        // Close the current nested list
        html += '</ul>\n';
        currentLevel = heading.level;
      }

      // Add section numbers for better navigation
      const sectionPrefix = heading.level === 2 ? `${sectionCount}. ` : '';
      html += `<li class="toc-item toc-level-${heading.level}"><a href="#${heading.id}">${sectionPrefix}${heading.text}</a></li>\n`;
    });

    // Close any remaining nested lists
    while (currentLevel > 2) {
      html += '</ul>\n';
      currentLevel--;
    }

    html += '</ul>\n</nav>\n</div>';

    return html;
  }

  /**
   * Add anchor IDs to headings in the content
   *
   * @param content Original HTML content
   * @param headings Array of heading objects with IDs
   * @returns Modified HTML content with anchor IDs
   */
  private addAnchorsToContent(content: string, headings: Array<{ text: string; level: number; id: string }>): string {
    let modifiedContent = content;

    headings.forEach(heading => {
      const tagName = `h${heading.level}`;
      const regex = new RegExp(`<${tagName}([^>]*)>(${heading.text})</${tagName}>`, 'g');

      modifiedContent = modifiedContent.replace(
        regex,
        `<${tagName}$1 id="${heading.id}"><a class="heading-anchor" href="#${heading.id}">${heading.text}</a></${tagName}>`
      );
    });

    return modifiedContent;
  }
}

// Export singleton instance
export const tocGeneratorService = new TocGeneratorService();
