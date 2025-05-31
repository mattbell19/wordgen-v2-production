/**
 * Simple test script to verify visual elements in article content
 */

// Sample article content with visual elements
const sampleArticle = `
<h1>AI SaaS Tools - Essential Guide</h1>

<div class="article-toc">
  <h2>Table of Contents</h2>
  <nav>
    <ul>
      <li><a href="#what-is-ai-saas-tools">What is AI SaaS Tools?</a></li>
      <li><a href="#why-ai-saas-tools-matters">Why AI SaaS Tools Matters</a></li>
      <li><a href="#best-practices">Best Practices for Using AI SaaS Tools</a></li>
      <li><a href="#challenges">Common Challenges and Solutions</a></li>
      <li><a href="#conclusion">Conclusion</a></li>
    </ul>
  </nav>
</div>

<p>Welcome to our guide about AI SaaS tools. This article provides key information about this important topic.</p>

<h2 id="what-is-ai-saas-tools">What is AI SaaS Tools?</h2>

<p>AI SaaS tools refers to strategies and techniques used by businesses to improve their market position and customer acquisition.</p>

<div class="quick-takeaway">
  <p>AI SaaS tools combine artificial intelligence with software-as-a-service delivery models to provide scalable, accessible AI solutions.</p>
</div>

<p>Understanding the basics of AI SaaS tools can transform your business approach.</p>

<h2 id="why-ai-saas-tools-matters">Why AI SaaS Tools Matters</h2>

<p>In today's competitive landscape, implementing effective AI SaaS tools strategies can make the difference between success and failure.</p>

<div class="stat-highlight">
  <p>Important statistic: 78% of businesses report increased efficiency after implementing AI SaaS tools.</p>
</div>

<h3>Benefits of AI SaaS Tools</h3>

<p>There are numerous benefits to using AI SaaS tools in your business:</p>

<div class="comparison-table">
  <table>
    <tr>
      <th>Traditional Software</th>
      <th>AI SaaS Tools</th>
    </tr>
    <tr>
      <td>High upfront costs</td>
      <td>Subscription-based pricing</td>
    </tr>
    <tr>
      <td>Manual updates</td>
      <td>Automatic updates</td>
    </tr>
    <tr>
      <td>Limited scalability</td>
      <td>Highly scalable</td>
    </tr>
  </table>
</div>

<h2 id="best-practices">Best Practices for Using AI SaaS Tools</h2>

<p>To get the most out of AI SaaS tools, follow these best practices:</p>

<div class="pro-tip">
  <p>Start with a specific business problem rather than adopting AI for its own sake. This ensures your implementation addresses real needs.</p>
</div>

<div class="image-suggestion">Suggest an image of a business team collaborating around a computer showing AI analytics</div>

<h2 id="challenges">Common Challenges and Solutions</h2>

<div class="callout-box">
  <h4>Important Note</h4>
  <p>Always ensure your AI SaaS implementation complies with relevant data privacy regulations.</p>
</div>

<h2 id="conclusion">Conclusion</h2>

<p>We hope this guide has helped you understand the importance of AI SaaS tools.</p>

<div class="call-to-action">
  <h3>Ready to Get Started?</h3>
  <p>Contact our experts today to learn more about implementing AI SaaS tools in your business!</p>
</div>

<section class="article-faq" itemscope itemtype="https://schema.org/FAQPage">
  <h2>Frequently Asked Questions About AI SaaS Tools</h2>
  <div class="faq-items">
    <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 itemprop="name">1. What are the most popular AI SaaS tools?</h3>
      <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <div itemprop="text">
          <p>The most popular AI SaaS tools include chatbots, predictive analytics platforms, and automated marketing tools.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="related-keywords">
  <h3>Related Topics</h3>
  <p class="related-keywords-description">Explore these related topics to deepen your understanding:</p>
  <ul class="keywords-list">
    <li>Machine learning platforms</li>
    <li>AI integration strategies</li>
    <li>SaaS pricing models</li>
  </ul>
</div>

<div class="meta-suggestion">
  <p>Suggested meta description: Discover how AI SaaS tools can transform your business with our comprehensive guide covering benefits, best practices, and implementation strategies.</p>
</div>
`;

// Function to analyze visual elements in the article
function analyzeVisualElements(content) {
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
      howTo: content.includes('Best Practices'),
      challenges: content.includes('Challenges'),
      conclusion: content.toLowerCase().includes('conclusion')
    }
  };

  return analysis;
}

// Run the analysis
const analysis = analyzeVisualElements(sampleArticle);

// Display the results
console.log('Visual Elements Analysis:');
console.log('------------------------');
console.log('Quick Takeaways:', analysis.quickTakeaways);
console.log('Pro Tips:', analysis.proTips);
console.log('Stat Highlights:', analysis.statHighlights);
console.log('Comparison Tables:', analysis.comparisonTables);
console.log('Callout Boxes:', analysis.calloutBoxes);
console.log('Image Suggestions:', analysis.imageSuggestions);
console.log('');
console.log('SEO Features:');
console.log('------------');
console.log('Table of Contents:', analysis.hasTOC ? '✅' : '❌');
console.log('FAQ Section:', analysis.hasFAQ ? '✅' : '❌');
console.log('Related Topics:', analysis.hasRelatedTopics ? '✅' : '❌');
console.log('Meta Suggestion:', analysis.hasMetaSuggestion ? '✅' : '❌');
console.log('Call to Action:', analysis.hasCTA ? '✅' : '❌');
console.log('');
console.log('Content Structure:');
console.log('-----------------');
console.log('Introduction:', analysis.sections.introduction ? '✅' : '❌');
console.log('What Is Section:', analysis.sections.whatIs ? '✅' : '❌');
console.log('Why Matters Section:', analysis.sections.whyMatters ? '✅' : '❌');
console.log('Best Practices Section:', analysis.sections.howTo ? '✅' : '❌');
console.log('Challenges Section:', analysis.sections.challenges ? '✅' : '❌');
console.log('Conclusion:', analysis.sections.conclusion ? '✅' : '❌');

// Create an HTML report
const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Elements Test Report</title>
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
    .report-section {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .element-count {
      font-weight: bold;
      color: #2563eb;
    }
    .success {
      color: green;
    }
    .error {
      color: red;
    }
    .sample-article {
      margin-top: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
      background-color: #f9f9f9;
    }

    /* Article styling for preview */
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

    .article-content .meta-suggestion {
      background-color: #f0f9ff;
      border: 1px dashed #38bdf8;
      padding: 1rem;
      margin: 2rem 0;
      border-radius: 0.375rem;
      font-style: italic;
      color: #0369a1;
    }

    .article-content .image-suggestion {
      background-color: #faf5ff;
      border: 1px dashed #a855f7;
      padding: 1rem;
      margin: 1.5rem 0;
      border-radius: 0.375rem;
      color: #7e22ce;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>Visual Elements Test Report</h1>

  <div class="report-section">
    <h2>Visual Elements Analysis</h2>
    <p>Quick Takeaways: <span class="element-count">${analysis.quickTakeaways}</span></p>
    <p>Pro Tips: <span class="element-count">${analysis.proTips}</span></p>
    <p>Stat Highlights: <span class="element-count">${analysis.statHighlights}</span></p>
    <p>Comparison Tables: <span class="element-count">${analysis.comparisonTables}</span></p>
    <p>Callout Boxes: <span class="element-count">${analysis.calloutBoxes}</span></p>
    <p>Image Suggestions: <span class="element-count">${analysis.imageSuggestions}</span></p>
  </div>

  <div class="report-section">
    <h2>SEO Features</h2>
    <p>Table of Contents: <span class="${analysis.hasTOC ? 'success' : 'error'}">${analysis.hasTOC ? '✅' : '❌'}</span></p>
    <p>FAQ Section: <span class="${analysis.hasFAQ ? 'success' : 'error'}">${analysis.hasFAQ ? '✅' : '❌'}</span></p>
    <p>Related Topics: <span class="${analysis.hasRelatedTopics ? 'success' : 'error'}">${analysis.hasRelatedTopics ? '✅' : '❌'}</span></p>
    <p>Meta Suggestion: <span class="${analysis.hasMetaSuggestion ? 'success' : 'error'}">${analysis.hasMetaSuggestion ? '✅' : '❌'}</span></p>
    <p>Call to Action: <span class="${analysis.hasCTA ? 'success' : 'error'}">${analysis.hasCTA ? '✅' : '❌'}</span></p>
  </div>

  <div class="report-section">
    <h2>Content Structure</h2>
    <p>Introduction: <span class="${analysis.sections.introduction ? 'success' : 'error'}">${analysis.sections.introduction ? '✅' : '❌'}</span></p>
    <p>What Is Section: <span class="${analysis.sections.whatIs ? 'success' : 'error'}">${analysis.sections.whatIs ? '✅' : '❌'}</span></p>
    <p>Why Matters Section: <span class="${analysis.sections.whyMatters ? 'success' : 'error'}">${analysis.sections.whyMatters ? '✅' : '❌'}</span></p>
    <p>Best Practices Section: <span class="${analysis.sections.howTo ? 'success' : 'error'}">${analysis.sections.howTo ? '✅' : '❌'}</span></p>
    <p>Challenges Section: <span class="${analysis.sections.challenges ? 'success' : 'error'}">${analysis.sections.challenges ? '✅' : '❌'}</span></p>
    <p>Conclusion: <span class="${analysis.sections.conclusion ? 'success' : 'error'}">${analysis.sections.conclusion ? '✅' : '❌'}</span></p>
  </div>

  <div class="sample-article">
    <h2>Sample Article Preview</h2>
    <div class="article-content">
      ${sampleArticle}
    </div>
  </div>
</body>
</html>
`;

// Save the HTML report
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test-results directory if it doesn't exist
const outputDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Save the HTML report
const reportPath = path.join(outputDir, 'visual-elements-test-report.html');
fs.writeFileSync(reportPath, htmlReport);

console.log(`\nHTML report saved to: ${reportPath}`);