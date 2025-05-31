/**
 * Test Script for Article Generation
 * 
 * This script generates test articles with different keywords and settings
 * to verify the content quality improvements.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Change to your local development URL
const TEST_KEYWORDS = [
  'digital marketing strategies',
  'best coffee machines',
  'how to train for a marathon',
  'investment tips for beginners',
  'artificial intelligence in healthcare'
];
const TEST_TONES = ['professional', 'casual', 'friendly'];
const TEST_WORD_COUNTS = [1000, 1500, 2000];
const OUTPUT_DIR = path.join(__dirname, '../test-results');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Authentication
async function login() {
  try {
    console.log('Logging in...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'password123',
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const cookies = response.headers.get('set-cookie');
    console.log('Login successful');
    return cookies;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Generate article
async function generateArticle(keyword, tone, wordCount, cookies) {
  try {
    console.log(`Generating article for keyword: "${keyword}" with tone: ${tone} and word count: ${wordCount}`);
    
    const response = await fetch(`${BASE_URL}/api/ai/article/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        keyword,
        tone,
        wordCount,
        enableInternalLinking: false,
        enableExternalLinking: true,
        callToAction: `Learn more about ${keyword} by contacting our experts today!`
      })
    });

    if (!response.ok) {
      throw new Error(`Article generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
    /* Include the article.css styles here */
    ${fs.readFileSync(path.join(__dirname, '../client/src/styles/article.css'), 'utf8')}
  </style>
</head>
<body>
  <div class="test-info">
    <h1>Test Article</h1>
    <p><strong>Keyword:</strong> ${keyword}</p>
    <p><strong>Tone:</strong> ${tone}</p>
    <p><strong>Word Count:</strong> ${wordCount}</p>
    <p><strong>Actual Word Count:</strong> ${article.wordCount}</p>
    <p><strong>Reading Time:</strong> ${article.readingTime} min</p>
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
        <th>Actual Word Count</th>
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
          <td>${result.article.wordCount}</td>
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
    // Login to get cookies
    const cookies = await login();
    
    // Store test results
    const results = [];
    
    // Generate articles for each combination
    for (const keyword of TEST_KEYWORDS) {
      // Use a subset of tones and word counts to reduce the number of tests
      const tone = TEST_TONES[Math.floor(Math.random() * TEST_TONES.length)];
      const wordCount = TEST_WORD_COUNTS[Math.floor(Math.random() * TEST_WORD_COUNTS.length)];
      
      // Generate article
      const article = await generateArticle(keyword, tone, wordCount, cookies);
      
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
      
      // Add a delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Generate test report
    const reportPath = generateTestReport(results);
    
    console.log('Testing completed successfully!');
    console.log(`Open ${reportPath} to view the test report.`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the main function
main();
