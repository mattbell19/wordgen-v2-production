/**
 * Test Script for Article Generation Improvements
 * 
 * This script tests the article generation with the improved features
 */

const fs = require('fs');
const path = require('path');
const { ArticleService } = require('./services/article.service');
const { TocGeneratorService } = require('./services/toc-generator.service');
const { FaqGeneratorService } = require('./services/faq-generator.service');
const { LsiKeywordService } = require('./services/lsi-keyword.service');

// Create service instances
const tocGeneratorService = new TocGeneratorService();
const faqGeneratorService = new FaqGeneratorService();
const lsiKeywordService = new LsiKeywordService();
const articleService = new ArticleService(tocGeneratorService, faqGeneratorService, lsiKeywordService);

// Configuration
const TEST_KEYWORDS = [
  'digital marketing strategies',
  'best coffee machines',
  'how to train for a marathon'
];
const TEST_TONES = ['professional', 'casual', 'friendly'];
const TEST_WORD_COUNTS = [1000, 1500];
const OUTPUT_DIR = path.join(__dirname, 'test-results');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate article
async function generateArticle(keyword, tone, wordCount) {
  try {
    console.log(`Generating article for keyword: "${keyword}" with tone: ${tone} and word count: ${wordCount}`);
    
    const params = {
      keyword,
      tone,
      wordCount,
      enableInternalLinking: false,
      enableExternalLinking: true,
      callToAction: `Learn more about ${keyword} by contacting our experts today!`,
      language: 'english'
    };
    
    const article = await articleService.generateArticle(params);
    return article;
  } catch (error) {
    console.error('Article generation error:', error);
    throw error;
  }
}

// Save article to file
function saveArticle(article, keyword, tone, wordCount) {
  const filename = `${keyword.replace(/\s+/g, '-')}_${tone}_${wordCount}.html`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  // Create a simple HTML wrapper for the article content
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Article: ${keyword}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .test-info {
      background-color: #f0f0f0;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    .article-content {
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 5px;
    }
    /* Include basic article styles */
    .article-content h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
      color: #1a1a1a;
      line-height: 1.2;
    }
    
    .article-content h2 {
      font-size: 1.875rem;
      font-weight: 700;
      margin-top: 2.5rem;
      margin-bottom: 1.25rem;
      color: #2a2a2a;
      line-height: 1.3;
    }
    
    .article-content h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: #3a3a3a;
      line-height: 1.4;
    }
    
    .article-content p {
      margin-bottom: 1.25rem;
      line-height: 1.75;
      color: #333;
      font-size: 1.05rem;
    }
    
    .article-content .article-toc {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    
    .article-content .article-faq {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    
    .article-content .related-keywords {
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    
    .article-content .quick-takeaway {
      background-color: #f0fdfa;
      border-left: 4px solid #2dd4bf;
      padding: 1.25rem;
      margin: 1.5rem 0;
      border-radius: 0.375rem;
    }
    
    .article-content .pro-tip {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1.25rem;
      margin: 1.5rem 0;
      border-radius: 0.375rem;
    }
    
    .article-content .stat-highlight {
      background-color: #ede9fe;
      border-left: 4px solid #8b5cf6;
      padding: 1.25rem;
      margin: 1.5rem 0;
      border-radius: 0.375rem;
    }
    
    .article-content .comparison-table {
      margin: 2rem 0;
      overflow-x: auto;
    }
    
    .article-content .callout-box {
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin: 2rem 0;
    }
    
    .article-content .call-to-action {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin: 2rem 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="test-info">
    <h1>Test Article</h1>
    <p><strong>Keyword:</strong> ${keyword}</p>
    <p><strong>Tone:</strong> ${tone}</p>
    <p><strong>Word Count:</strong> ${wordCount}</p>
    <p><strong>Generated Date:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="article-content">
    ${article.content}
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(filepath, htmlContent);
  console.log(`Article saved to ${filepath}`);
  
  return filepath;
}

// Analyze article content
function analyzeArticle(article) {
  const content = article.content;
  
  // Check for visual elements
  const analysis = {
    quickTakeaways: (content.match(/<div class="quick-takeaway">/g) || []).length,
    proTips: (content.match(/<div class="pro-tip">/g) || []).length,
    statHighlights: (content.match(/<div class="stat-highlight">/g) || []).length,
    comparisonTables: (content.match(/<div class="comparison-table">/g) || []).length,
    calloutBoxes: (content.match(/<div class="callout-box">/g) || []).length,
    imageSuggestions: (content.match(/<div class="image-suggestion">/g) || []).length,
    hasTOC: content.includes('<div class="article-toc">'),
    hasFAQ: content.includes('<section class="article-faq"'),
    hasRelatedTopics: content.includes('<div class="related-keywords">'),
    hasMetaSuggestion: content.includes('<div class="meta-suggestion">'),
    hasCTA: content.includes('<div class="call-to-action">'),
    sections: {
      introduction: content.includes('<h1>'),
      whatIs: content.includes('What is') || content.includes('What are'),
      whyMatters: content.includes('Why') && (content.includes('Matters') || content.includes('Important')),
      howTo: content.includes('How to') || content.includes('Best Practices'),
      challenges: content.includes('Challenges') || content.includes('FAQ'),
      conclusion: content.toLowerCase().includes('conclusion')
    }
  };
  
  return analysis;
}

// Generate test report
function generateTestReport(results) {
  const reportPath = path.join(OUTPUT_DIR, 'test-report.html');
  
  const reportContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Article Generation Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .success {
      color: green;
    }
    .warning {
      color: orange;
    }
    .error {
      color: red;
    }
    .summary {
      background-color: #f0f0f0;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <h1>Article Generation Test Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Tests:</strong> ${results.length}</p>
    <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Keyword</th>
        <th>Tone</th>
        <th>Word Count</th>
        <th>Visual Elements</th>
        <th>Structure</th>
        <th>SEO Features</th>
        <th>File</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(result => `
        <tr>
          <td>${result.keyword}</td>
          <td>${result.tone}</td>
          <td>${result.wordCount}</td>
          <td>
            <ul>
              <li>Quick Takeaways: ${result.analysis.quickTakeaways}</li>
              <li>Pro Tips: ${result.analysis.proTips}</li>
              <li>Stat Highlights: ${result.analysis.statHighlights}</li>
              <li>Comparison Tables: ${result.analysis.comparisonTables}</li>
              <li>Callout Boxes: ${result.analysis.calloutBoxes}</li>
              <li>Image Suggestions: ${result.analysis.imageSuggestions}</li>
            </ul>
          </td>
          <td>
            <ul>
              <li>Introduction: ${result.analysis.sections.introduction ? '✅' : '❌'}</li>
              <li>What Is: ${result.analysis.sections.whatIs ? '✅' : '❌'}</li>
              <li>Why Matters: ${result.analysis.sections.whyMatters ? '✅' : '❌'}</li>
              <li>How To: ${result.analysis.sections.howTo ? '✅' : '❌'}</li>
              <li>Challenges/FAQ: ${result.analysis.sections.challenges ? '✅' : '❌'}</li>
              <li>Conclusion: ${result.analysis.sections.conclusion ? '✅' : '❌'}</li>
            </ul>
          </td>
          <td>
            <ul>
              <li>Table of Contents: ${result.analysis.hasTOC ? '✅' : '❌'}</li>
              <li>FAQ Section: ${result.analysis.hasFAQ ? '✅' : '❌'}</li>
              <li>Related Topics: ${result.analysis.hasRelatedTopics ? '✅' : '❌'}</li>
              <li>Meta Suggestion: ${result.analysis.hasMetaSuggestion ? '✅' : '❌'}</li>
              <li>Call to Action: ${result.analysis.hasCTA ? '✅' : '❌'}</li>
            </ul>
          </td>
          <td><a href="${path.basename(result.filepath)}" target="_blank">View Article</a></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Test report saved to ${reportPath}`);
  
  return reportPath;
}

// Main function
async function main() {
  try {
    // Store test results
    const results = [];
    
    // Generate articles for each combination
    for (const keyword of TEST_KEYWORDS) {
      // Use a subset of tones and word counts to reduce the number of tests
      const tone = TEST_TONES[Math.floor(Math.random() * TEST_TONES.length)];
      const wordCount = TEST_WORD_COUNTS[Math.floor(Math.random() * TEST_WORD_COUNTS.length)];
      
      try {
        // Generate article
        const article = await generateArticle(keyword, tone, wordCount);
        
        // Save article to file
        const filepath = saveArticle(article, keyword, tone, wordCount);
        
        // Analyze article
        const analysis = analyzeArticle(article);
        
        // Store result
        results.push({
          keyword,
          tone,
          wordCount,
          article,
          analysis,
          filepath
        });
        
        console.log(`Successfully generated and analyzed article for "${keyword}"`);
        console.log('Analysis:', JSON.stringify(analysis, null, 2));
        
      } catch (error) {
        console.error(`Failed to generate article for "${keyword}":`, error);
      }
    }
    
    if (results.length > 0) {
      // Generate test report
      const reportPath = generateTestReport(results);
      console.log('Testing completed successfully!');
      console.log(`Open ${reportPath} to view the test report.`);
    } else {
      console.log('No articles were successfully generated. Check the errors above.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the main function
main();
