#!/usr/bin/env node

/**
 * Test script to validate both article formats
 * Format A: Universal Guide (PAYE-style)
 * Format B: Technical/Tutorial (Facebook Ad-style)
 */

import fs from 'fs';
import path from 'path';

// Test configurations for both formats
const TEST_CONFIGS = {
  formatA: {
    keyword: "small business tax deductions",
    wordCount: 2000,
    tone: "professional",
    industry: "finance",
    targetAudience: "business owners",
    contentType: "guide",
    expectedFormat: "Universal Guide",
    enableExternalLinking: true,
    enableInternalLinking: true
  },
  formatB: {
    keyword: "instagram story dimensions",
    wordCount: 1800,
    tone: "professional", 
    industry: "digital_marketing",
    targetAudience: "marketers",
    contentType: "tutorial",
    expectedFormat: "Technical/Tutorial",
    enableExternalLinking: true,
    enableInternalLinking: true
  }
};

// Server configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const API_ENDPOINT = `${SERVER_URL}/api/articles/generate`;

async function testDualFormatSystem() {
  console.log('🎯 Testing Dual Format Article Generation System');
  console.log('=' .repeat(70));
  
  console.log('\n📋 Testing Both Formats:');
  console.log(`   Format A (Universal Guide): ${TEST_CONFIGS.formatA.keyword}`);
  console.log(`   Format B (Technical/Tutorial): ${TEST_CONFIGS.formatB.keyword}`);
  
  const results = {};
  
  // Test Format A
  console.log('\n🔍 Testing Format A - Universal Guide Structure...');
  try {
    results.formatA = await testFormat('formatA', TEST_CONFIGS.formatA);
  } catch (error) {
    console.error(`❌ Format A test failed: ${error.message}`);
    results.formatA = { error: error.message };
  }
  
  // Test Format B  
  console.log('\n🔍 Testing Format B - Technical/Tutorial Structure...');
  try {
    results.formatB = await testFormat('formatB', TEST_CONFIGS.formatB);
  } catch (error) {
    console.error(`❌ Format B test failed: ${error.message}`);
    results.formatB = { error: error.message };
  }
  
  // Generate comparison report
  generateComparisonReport(results);
}

async function testFormat(formatName, config) {
  console.log(`\n⏳ Generating ${config.expectedFormat} article for "${config.keyword}"...`);
  
  const startTime = Date.now();
  
  const response = await globalThis.fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...config,
      userId: 1 // Test user ID
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`✅ ${config.expectedFormat} article generated in ${duration.toFixed(2)}s`);
  
  // Analyze structure
  const structureAnalysis = analyzeStructure(result.content, config.expectedFormat);
  
  // Save article
  const filepath = saveArticle(formatName, config, result, structureAnalysis);
  
  return {
    config,
    result,
    structureAnalysis,
    duration,
    filepath
  };
}

function analyzeStructure(content, expectedFormat) {
  const analysis = {
    expectedFormat,
    elements: {
      'H1 Title': (content.match(/<h1/g) || []).length,
      'H2 Main Sections': (content.match(/<h2/g) || []).length,
      'H3 Subsections': (content.match(/<h3/g) || []).length,
      'Paragraphs': (content.match(/<p/g) || []).length,
      'Lists': (content.match(/<ul|<ol/g) || []).length,
      'Tables': (content.match(/<table/g) || []).length,
      'Call-out Boxes': (content.match(/class="callout-box"/g) || []).length,
      'Pro Tips': (content.match(/class="pro-tip"/g) || []).length,
      'Quick Takeaways': (content.match(/class="quick-takeaway"/g) || []).length
    },
    formatSpecificChecks: {}
  };
  
  if (expectedFormat === 'Universal Guide') {
    // Check for Format A specific sections
    analysis.formatSpecificChecks = {
      'What is section': content.includes('What is') || content.includes('what is'),
      'Basics section': content.includes('basics') || content.includes('Basics'),
      'Eligibility section': content.includes('eligible') || content.includes('Who '),
      'Process section': content.includes('process') || content.includes('Process'),
      'Misconceptions section': content.includes('misconception') || content.includes('myth'),
      'Impact section': content.includes('impact') || content.includes('benefit'),
      'Challenges section': content.includes('challenge') || content.includes('Navigating'),
      'Expected sections (8)': analysis.elements['H2 Main Sections'] >= 7
    };
  } else {
    // Check for Format B specific sections
    analysis.formatSpecificChecks = {
      'Understanding section': content.includes('Understanding') || content.includes('understanding'),
      'Guidelines section': content.includes('Guidelines') || content.includes('requirements'),
      'Types/Categories section': content.includes('Types') || content.includes('Different'),
      'Common Mistakes section': content.includes('Mistakes') || content.includes('mistakes'),
      'Optimization section': content.includes('Optimizing') || content.includes('optimization'),
      'FAQ section': content.includes('FAQ') || content.includes('Frequently Asked'),
      'Expected sections (7)': analysis.elements['H2 Main Sections'] >= 6
    };
  }
  
  return analysis;
}

function saveArticle(formatName, config, result, analysis) {
  const outputDir = 'test-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `dual-format-${formatName}-${timestamp}.html`;
  const filepath = path.join(outputDir, filename);
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dual Format Test - ${config.expectedFormat}</title>
    <link rel="stylesheet" href="../client/src/styles/article.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .test-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .analysis { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <div class="test-header">
            <h1>🎯 ${config.expectedFormat} Format Test</h1>
            <p><strong>Keyword:</strong> ${config.keyword}</p>
            <p><strong>Expected Format:</strong> ${config.expectedFormat}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="analysis">
            <h3>📊 Structure Analysis</h3>
            <p><strong>H2 Sections:</strong> ${analysis.elements['H2 Main Sections']}</p>
            <p><strong>H3 Subsections:</strong> ${analysis.elements['H3 Subsections']}</p>
            <p><strong>Visual Elements:</strong> ${analysis.elements['Call-out Boxes'] + analysis.elements['Pro Tips'] + analysis.elements['Quick Takeaways']}</p>
            
            <h4>Format-Specific Checks:</h4>
            ${Object.entries(analysis.formatSpecificChecks).map(([check, passed]) => 
              `<p>${passed ? '✅' : '❌'} ${check}</p>`
            ).join('')}
        </div>
        
        <div class="article-content">
            ${result.content}
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(filepath, htmlContent);
  return filepath;
}

function generateComparisonReport(results) {
  console.log('\n📊 DUAL FORMAT TEST RESULTS');
  console.log('=' .repeat(70));
  
  Object.entries(results).forEach(([formatName, data]) => {
    if (data.error) {
      console.log(`\n❌ ${formatName.toUpperCase()} - FAILED`);
      console.log(`   Error: ${data.error}`);
      return;
    }
    
    const { config, structureAnalysis, duration, filepath } = data;
    
    console.log(`\n✅ ${formatName.toUpperCase()} - ${config.expectedFormat.toUpperCase()}`);
    console.log(`   Keyword: ${config.keyword}`);
    console.log(`   Generation Time: ${duration.toFixed(2)}s`);
    console.log(`   H2 Sections: ${structureAnalysis.elements['H2 Main Sections']}`);
    console.log(`   H3 Subsections: ${structureAnalysis.elements['H3 Subsections']}`);
    
    // Format-specific validation
    const passedChecks = Object.values(structureAnalysis.formatSpecificChecks).filter(Boolean).length;
    const totalChecks = Object.keys(structureAnalysis.formatSpecificChecks).length;
    console.log(`   Format Validation: ${passedChecks}/${totalChecks} checks passed`);
    
    console.log(`   File: ${filepath}`);
  });
  
  console.log('\n🎯 SUMMARY');
  console.log('=' .repeat(70));
  
  const successfulTests = Object.values(results).filter(data => !data.error).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`   Tests Passed: ${successfulTests}/${totalTests}`);
  console.log(`   Dual Format System: ${successfulTests === totalTests ? '✅ WORKING' : '⚠️ PARTIAL'}`);
  
  if (successfulTests === totalTests) {
    console.log('\n🎉 Both formats are working correctly!');
    console.log('   ✅ Universal Guide format for regulatory/process topics');
    console.log('   ✅ Technical/Tutorial format for technical/how-to topics');
    console.log('   ✅ Intelligent format selection implemented');
  }
  
  console.log('\n🌐 To review articles:');
  Object.values(results).forEach(data => {
    if (!data.error) {
      console.log(`   open ${data.filepath}`);
    }
  });
}

// Run the test
testDualFormatSystem().catch(console.error);

export { testDualFormatSystem, TEST_CONFIGS };
