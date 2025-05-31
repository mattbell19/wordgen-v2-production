import { describe, it, expect, vi } from 'vitest';
import { tocGeneratorService } from '../toc-generator.service';

// Mock uuid to return predictable values
vi.mock('uuid', () => ({
  v4: () => '12345678-1234-1234-1234-123456789012'
}));

describe('TocGeneratorService', () => {
  describe('generateTableOfContents', () => {
    it('should generate a table of contents for an article with headings', () => {
      const content = `
        <h1>Main Title</h1>
        <p>Introduction paragraph</p>
        <h2>First Section</h2>
        <p>Content of first section</p>
        <h3>Subsection 1.1</h3>
        <p>Content of subsection</p>
        <h2>Second Section</h2>
        <p>Content of second section</p>
        <h3>Subsection 2.1</h3>
        <p>More content</p>
        <h4>Deeper level</h4>
        <p>Even more content</p>
      `;
      
      const { toc, content: modifiedContent } = tocGeneratorService.generateTableOfContents(content);
      
      // Check that TOC contains all headings
      expect(toc).toContain('First Section');
      expect(toc).toContain('Subsection 1.1');
      expect(toc).toContain('Second Section');
      expect(toc).toContain('Subsection 2.1');
      expect(toc).toContain('Deeper level');
      
      // Check that TOC has proper structure
      expect(toc).toContain('<div class="article-toc">');
      expect(toc).toContain('<h2>Table of Contents</h2>');
      expect(toc).toContain('<nav>');
      expect(toc).toContain('<ul>');
      expect(toc).toContain('</ul>');
      expect(toc).toContain('</nav>');
      expect(toc).toContain('</div>');
      
      // Check that content has been modified with anchor IDs
      expect(modifiedContent).toContain('id="first-section-12345678"');
      expect(modifiedContent).toContain('id="subsection-1-1-12345678"');
      expect(modifiedContent).toContain('id="second-section-12345678"');
      expect(modifiedContent).toContain('id="subsection-2-1-12345678"');
      expect(modifiedContent).toContain('id="deeper-level-12345678"');
      
      // Check that content has anchor links
      expect(modifiedContent).toContain('<a class="heading-anchor" href="#first-section-12345678">First Section</a>');
    });
    
    it('should return empty TOC for content without headings', () => {
      const content = `
        <h1>Main Title</h1>
        <p>This is a paragraph without any headings.</p>
        <p>Another paragraph.</p>
      `;
      
      const { toc, content: modifiedContent } = tocGeneratorService.generateTableOfContents(content);
      
      expect(toc).toBe('');
      expect(modifiedContent).toBe(content);
    });
    
    it('should handle errors gracefully', () => {
      // Test with invalid HTML
      const invalidContent = '<h2>Unclosed tag';
      
      const { toc, content: modifiedContent } = tocGeneratorService.generateTableOfContents(invalidContent);
      
      expect(toc).toBe('');
      expect(modifiedContent).toBe(invalidContent);
    });
  });
});
