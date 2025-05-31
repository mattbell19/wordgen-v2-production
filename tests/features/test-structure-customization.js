/**
 * Test Script for Article Structure Customization
 *
 * This script tests the article generation with custom structure settings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateArticle } from '../../server/lib/gpt-client.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test different structure configurations
async function testArticleStructure() {
  console.log('Testing Article Structure Customization...');

  // Test case 1: Minimal structure
  const minimalStructure = {
    sections: {
      whatIs: true,
      whyMatters: true,
      howTo: false,
      bestPractices: false,
      challenges: false,
      caseStudies: false,
      comparison: false,
      futureTrends: false,
    },
    visualElements: {
      quickTakeaways: true,
      proTips: false,
      statHighlights: false,
      comparisonTables: false,
      calloutBoxes: false,
      imageSuggestions: false,
    },
    seoFeatures: {
      tableOfContents: true,
      faqSection: false,
      relatedTopics: true,
      metaDescription: true,
    },
    contentStyle: {
      tone: 'professional',
      readingLevel: 'basic',
      contentDensity: 1,
      targetAudience: 'beginners',
    },
  };

  // Test case 2: Comprehensive structure
  const comprehensiveStructure = {
    sections: {
      whatIs: true,
      whyMatters: true,
      howTo: true,
      bestPractices: true,
      challenges: true,
      caseStudies: true,
      comparison: true,
      futureTrends: true,
    },
    visualElements: {
      quickTakeaways: true,
      proTips: true,
      statHighlights: true,
      comparisonTables: true,
      calloutBoxes: true,
      imageSuggestions: true,
    },
    seoFeatures: {
      tableOfContents: true,
      faqSection: true,
      relatedTopics: true,
      metaDescription: true,
    },
    contentStyle: {
      tone: 'professional',
      readingLevel: 'advanced',
      contentDensity: 5,
      targetAudience: 'experts',
    },
  };

  // Create test directory if it doesn't exist
  const testDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  try {
    // Test minimal structure
    console.log('Generating article with minimal structure...');
    const minimalArticle = await generateArticle({
      keyword: 'content marketing strategies',
      wordCount: 800,
      tone: 'professional',
      structure: minimalStructure
    });

    fs.writeFileSync(
      path.join(testDir, 'minimal-structure-article.html'),
      minimalArticle
    );
    console.log('Minimal structure article generated successfully.');

    // Test comprehensive structure
    console.log('Generating article with comprehensive structure...');
    const comprehensiveArticle = await generateArticle({
      keyword: 'content marketing strategies',
      wordCount: 1200,
      tone: 'professional',
      structure: comprehensiveStructure
    });

    fs.writeFileSync(
      path.join(testDir, 'comprehensive-structure-article.html'),
      comprehensiveArticle
    );
    console.log('Comprehensive structure article generated successfully.');

    // Analyze the results
    analyzeArticles(minimalArticle, comprehensiveArticle);

  } catch (error) {
    console.error('Error testing article structure:', error);
  }
}

// Analyze the generated articles
function analyzeArticles(minimalArticle, comprehensiveArticle) {
  console.log('\nAnalyzing generated articles...');

  // Check for sections in minimal article
  const minimalSections = {
    whatIs: minimalArticle.includes('What is Content Marketing') || minimalArticle.includes('What are Content Marketing'),
    whyMatters: minimalArticle.includes('Why Content Marketing') && (minimalArticle.includes('Matters') || minimalArticle.includes('Important')),
    howTo: minimalArticle.includes('How to') && minimalArticle.includes('Content Marketing'),
    bestPractices: minimalArticle.includes('Best Practices'),
    challenges: minimalArticle.includes('Challenges') || minimalArticle.includes('Common Problems'),
    caseStudies: minimalArticle.includes('Case Studies') || minimalArticle.includes('Examples'),
    comparison: minimalArticle.includes('Comparison') || minimalArticle.includes('Versus'),
    futureTrends: minimalArticle.includes('Future') && minimalArticle.includes('Trends'),
  };

  // Check for visual elements in minimal article
  const minimalElements = {
    quickTakeaways: minimalArticle.includes('<div class="quick-takeaway">'),
    proTips: minimalArticle.includes('<div class="pro-tip">'),
    statHighlights: minimalArticle.includes('<div class="stat-highlight">'),
    comparisonTables: minimalArticle.includes('<div class="comparison-table">'),
    calloutBoxes: minimalArticle.includes('<div class="callout-box">'),
    imageSuggestions: minimalArticle.includes('<div class="image-suggestion">'),
  };

  // Check for sections in comprehensive article
  const comprehensiveSections = {
    whatIs: comprehensiveArticle.includes('What is Content Marketing') || comprehensiveArticle.includes('What are Content Marketing'),
    whyMatters: comprehensiveArticle.includes('Why Content Marketing') && (comprehensiveArticle.includes('Matters') || comprehensiveArticle.includes('Important')),
    howTo: comprehensiveArticle.includes('How to') && comprehensiveArticle.includes('Content Marketing'),
    bestPractices: comprehensiveArticle.includes('Best Practices'),
    challenges: comprehensiveArticle.includes('Challenges') || comprehensiveArticle.includes('Common Problems'),
    caseStudies: comprehensiveArticle.includes('Case Studies') || comprehensiveArticle.includes('Examples'),
    comparison: comprehensiveArticle.includes('Comparison') || comprehensiveArticle.includes('Versus'),
    futureTrends: comprehensiveArticle.includes('Future') && comprehensiveArticle.includes('Trends'),
  };

  // Check for visual elements in comprehensive article
  const comprehensiveElements = {
    quickTakeaways: comprehensiveArticle.includes('<div class="quick-takeaway">'),
    proTips: comprehensiveArticle.includes('<div class="pro-tip">'),
    statHighlights: comprehensiveArticle.includes('<div class="stat-highlight">'),
    comparisonTables: comprehensiveArticle.includes('<div class="comparison-table">'),
    calloutBoxes: comprehensiveArticle.includes('<div class="callout-box">'),
    imageSuggestions: comprehensiveArticle.includes('<div class="image-suggestion">'),
  };

  // Print results
  console.log('\nMinimal Article Analysis:');
  console.log('Sections:');
  Object.entries(minimalSections).forEach(([section, present]) => {
    console.log(`- ${section}: ${present ? '✅ Present' : '❌ Not present'}`);
  });

  console.log('\nVisual Elements:');
  Object.entries(minimalElements).forEach(([element, present]) => {
    console.log(`- ${element}: ${present ? '✅ Present' : '❌ Not present'}`);
  });

  console.log('\nComprehensive Article Analysis:');
  console.log('Sections:');
  Object.entries(comprehensiveSections).forEach(([section, present]) => {
    console.log(`- ${section}: ${present ? '✅ Present' : '❌ Not present'}`);
  });

  console.log('\nVisual Elements:');
  Object.entries(comprehensiveElements).forEach(([element, present]) => {
    console.log(`- ${element}: ${present ? '✅ Present' : '❌ Not present'}`);
  });

  // Generate HTML report
  const reportContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Article Structure Test Results</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #333;
    }
    .test-results {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .result-column {
      flex: 1;
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    .present {
      color: green;
      font-weight: bold;
    }
    .not-present {
      color: red;
    }
    .article-preview {
      margin-top: 30px;
    }
    .article-content {
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 5px;
      max-height: 500px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <h1>Article Structure Test Results</h1>

  <div class="test-results">
    <div class="result-column">
      <h2>Minimal Structure</h2>

      <h3>Sections</h3>
      <table>
        <tr>
          <th>Section</th>
          <th>Expected</th>
          <th>Actual</th>
        </tr>
        <tr>
          <td>What Is</td>
          <td>Yes</td>
          <td class="${minimalSections.whatIs ? 'present' : 'not-present'}">${minimalSections.whatIs ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Why Matters</td>
          <td>Yes</td>
          <td class="${minimalSections.whyMatters ? 'present' : 'not-present'}">${minimalSections.whyMatters ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>How To</td>
          <td>No</td>
          <td class="${!minimalSections.howTo ? 'present' : 'not-present'}">${minimalSections.howTo ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Best Practices</td>
          <td>No</td>
          <td class="${!minimalSections.bestPractices ? 'present' : 'not-present'}">${minimalSections.bestPractices ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Challenges</td>
          <td>No</td>
          <td class="${!minimalSections.challenges ? 'present' : 'not-present'}">${minimalSections.challenges ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Case Studies</td>
          <td>No</td>
          <td class="${!minimalSections.caseStudies ? 'present' : 'not-present'}">${minimalSections.caseStudies ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Comparison</td>
          <td>No</td>
          <td class="${!minimalSections.comparison ? 'present' : 'not-present'}">${minimalSections.comparison ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Future Trends</td>
          <td>No</td>
          <td class="${!minimalSections.futureTrends ? 'present' : 'not-present'}">${minimalSections.futureTrends ? 'Present' : 'Not present'}</td>
        </tr>
      </table>

      <h3>Visual Elements</h3>
      <table>
        <tr>
          <th>Element</th>
          <th>Expected</th>
          <th>Actual</th>
        </tr>
        <tr>
          <td>Quick Takeaways</td>
          <td>Yes</td>
          <td class="${minimalElements.quickTakeaways ? 'present' : 'not-present'}">${minimalElements.quickTakeaways ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Pro Tips</td>
          <td>No</td>
          <td class="${!minimalElements.proTips ? 'present' : 'not-present'}">${minimalElements.proTips ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Stat Highlights</td>
          <td>No</td>
          <td class="${!minimalElements.statHighlights ? 'present' : 'not-present'}">${minimalElements.statHighlights ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Comparison Tables</td>
          <td>No</td>
          <td class="${!minimalElements.comparisonTables ? 'present' : 'not-present'}">${minimalElements.comparisonTables ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Callout Boxes</td>
          <td>No</td>
          <td class="${!minimalElements.calloutBoxes ? 'present' : 'not-present'}">${minimalElements.calloutBoxes ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Image Suggestions</td>
          <td>No</td>
          <td class="${!minimalElements.imageSuggestions ? 'present' : 'not-present'}">${minimalElements.imageSuggestions ? 'Present' : 'Not present'}</td>
        </tr>
      </table>
    </div>

    <div class="result-column">
      <h2>Comprehensive Structure</h2>

      <h3>Sections</h3>
      <table>
        <tr>
          <th>Section</th>
          <th>Expected</th>
          <th>Actual</th>
        </tr>
        <tr>
          <td>What Is</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.whatIs ? 'present' : 'not-present'}">${comprehensiveSections.whatIs ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Why Matters</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.whyMatters ? 'present' : 'not-present'}">${comprehensiveSections.whyMatters ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>How To</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.howTo ? 'present' : 'not-present'}">${comprehensiveSections.howTo ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Best Practices</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.bestPractices ? 'present' : 'not-present'}">${comprehensiveSections.bestPractices ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Challenges</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.challenges ? 'present' : 'not-present'}">${comprehensiveSections.challenges ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Case Studies</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.caseStudies ? 'present' : 'not-present'}">${comprehensiveSections.caseStudies ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Comparison</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.comparison ? 'present' : 'not-present'}">${comprehensiveSections.comparison ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Future Trends</td>
          <td>Yes</td>
          <td class="${comprehensiveSections.futureTrends ? 'present' : 'not-present'}">${comprehensiveSections.futureTrends ? 'Present' : 'Not present'}</td>
        </tr>
      </table>

      <h3>Visual Elements</h3>
      <table>
        <tr>
          <th>Element</th>
          <th>Expected</th>
          <th>Actual</th>
        </tr>
        <tr>
          <td>Quick Takeaways</td>
          <td>Yes</td>
          <td class="${comprehensiveElements.quickTakeaways ? 'present' : 'not-present'}">${comprehensiveElements.quickTakeaways ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Pro Tips</td>
          <td>Yes</td>
          <td class="${comprehensiveElements.proTips ? 'present' : 'not-present'}">${comprehensiveElements.proTips ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Stat Highlights</td>
          <td>Yes</td>
          <td class="${comprehensiveElements.statHighlights ? 'present' : 'not-present'}">${comprehensiveElements.statHighlights ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Comparison Tables</td>
          <td>Yes</td>
          <td class="${comprehensiveElements.comparisonTables ? 'present' : 'not-present'}">${comprehensiveElements.comparisonTables ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Callout Boxes</td>
          <td>Yes</td>
          <td class="${comprehensiveElements.calloutBoxes ? 'present' : 'not-present'}">${comprehensiveElements.calloutBoxes ? 'Present' : 'Not present'}</td>
        </tr>
        <tr>
          <td>Image Suggestions</td>
          <td>Yes</td>
          <td class="${comprehensiveElements.imageSuggestions ? 'present' : 'not-present'}">${comprehensiveElements.imageSuggestions ? 'Present' : 'Not present'}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="article-preview">
    <h2>Article Previews</h2>

    <h3>Minimal Structure Article</h3>
    <div class="article-content">
      ${minimalArticle}
    </div>

    <h3>Comprehensive Structure Article</h3>
    <div class="article-content">
      ${comprehensiveArticle}
    </div>
  </div>
</body>
</html>
  `;

  fs.writeFileSync(
    path.join(testDir, 'structure-test-results.html'),
    reportContent
  );

  console.log('\nTest results saved to test-results/structure-test-results.html');
}

// Run the test
testArticleStructure();
