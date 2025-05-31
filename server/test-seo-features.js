// Simple test script to verify SEO optimization features
import { schemaMarkupService } from './services/schema-markup.service';
import { tocGeneratorService } from './services/toc-generator.service';
import { faqGeneratorService } from './services/faq-generator.service';
import { lsiKeywordService } from './services/lsi-keyword.service';

// Mock article response for testing
const mockArticle = {
  content: `
    <h1>Test Article</h1>
    <p>This is a test article about SEO optimization.</p>
    <h2>First Section</h2>
    <p>Content of first section</p>
    <h3>Subsection 1.1</h3>
    <p>Content of subsection</p>
    <h2>Second Section</h2>
    <p>Content of second section</p>
  `,
  wordCount: 500,
  readingTime: 3,
  settings: {
    keyword: 'SEO optimization',
    wordCount: 500,
    tone: 'professional'
  }
};

// Test schema markup generation
console.log('\n=== Testing Schema Markup Generation ===');
try {
  const schemaMarkup = schemaMarkupService.generateArticleSchema(mockArticle);
  console.log('Schema markup generated successfully:');
  console.log(schemaMarkup.substring(0, 200) + '...');
} catch (error) {
  console.error('Error generating schema markup:', error);
}

// Test table of contents generation
console.log('\n=== Testing Table of Contents Generation ===');
try {
  const { toc, content } = tocGeneratorService.generateTableOfContents(mockArticle.content);
  console.log('Table of contents generated successfully:');
  console.log(toc.substring(0, 200) + '...');
  console.log('Content with anchors (excerpt):');
  console.log(content.substring(0, 200) + '...');
} catch (error) {
  console.error('Error generating table of contents:', error);
}

// Test LSI keyword enhancement
console.log('\n=== Testing LSI Keyword Enhancement ===');
try {
  const mockKeywords = ['keyword research', 'search engine optimization', 'meta tags'];
  const enhancedContent = lsiKeywordService.enhanceContentWithLsiKeywords(
    mockArticle.content,
    mockKeywords
  );
  console.log('Content enhanced with LSI keywords successfully:');
  console.log(enhancedContent.substring(enhancedContent.length - 200) + '...');
} catch (error) {
  console.error('Error enhancing content with LSI keywords:', error);
}

// Note: FAQ generation requires API calls, so we're not testing it here
console.log('\n=== FAQ Generation requires API calls and is not tested here ===');

console.log('\nAll tests completed.');
