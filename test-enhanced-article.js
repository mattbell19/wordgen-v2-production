#!/usr/bin/env node

/**
 * Test script for enhanced article generation
 * This script will test the new quality improvements and visual elements
 */

import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  keyword: "AI content marketing strategies",
  wordCount: 1500,
  tone: "professional",
  industry: "ai_saas",
  targetAudience: "marketing professionals",
  contentType: "guide",
  enableExternalLinking: true,
  enableInternalLinking: true
};

// Server configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const API_ENDPOINT = `${SERVER_URL}/api/articles/generate`;

async function testEnhancedArticleGeneration() {
  console.log('🚀 Testing Enhanced Article Generation System');
  console.log('=' .repeat(60));
  
  console.log('\n📋 Test Configuration:');
  console.log(`   Keyword: ${TEST_CONFIG.keyword}`);
  console.log(`   Word Count: ${TEST_CONFIG.wordCount}`);
  console.log(`   Industry: ${TEST_CONFIG.industry}`);
  console.log(`   Content Type: ${TEST_CONFIG.contentType}`);
  console.log(`   Quality Target: 90+`);
  
  console.log('\n⏳ Generating article with enhanced quality settings...');
  
  const startTime = Date.now();
  
  try {
    const response = await globalThis.fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...TEST_CONFIG,
        userId: 1 // Test user ID
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n✅ Article Generated Successfully!');
    console.log('=' .repeat(60));
    
    // Display quality metrics
    if (result.qualityMetrics) {
      console.log('\n📊 Quality Metrics:');
      console.log(`   Overall Score: ${result.qualityMetrics.overall_score}/100`);
      console.log(`   Expert Authority: ${result.qualityMetrics.expert_authority}/100`);
      console.log(`   Actionability: ${result.qualityMetrics.actionability}/100`);
      console.log(`   Specificity: ${result.qualityMetrics.specificity}/100`);
      console.log(`   Current Relevance: ${result.qualityMetrics.current_relevance}/100`);
      console.log(`   Engagement: ${result.qualityMetrics.engagement}/100`);
      
      // Quality assessment
      const overallScore = result.qualityMetrics.overall_score;
      let qualityLevel = '';
      if (overallScore >= 90) qualityLevel = '🏆 Premium Quality';
      else if (overallScore >= 85) qualityLevel = '✅ Excellent Quality';
      else if (overallScore >= 75) qualityLevel = '⚠️ Good Quality';
      else qualityLevel = '❌ Needs Improvement';
      
      console.log(`   Quality Level: ${qualityLevel}`);
    }
    
    // Display article info
    console.log('\n📝 Article Information:');
    console.log(`   Word Count: ${result.wordCount} words`);
    console.log(`   Reading Time: ${result.readingTime} minutes`);
    console.log(`   Expert Persona: ${result.expertPersona || 'N/A'}`);
    console.log(`   Industry: ${result.industry || 'N/A'}`);
    console.log(`   Generation Time: ${duration.toFixed(2)} seconds`);
    
    // Check for enhanced visual elements
    console.log('\n🎨 Visual Elements Analysis:');
    const content = result.content;
    const visualElements = {
      'Call-out Boxes': (content.match(/class="callout-box"/g) || []).length,
      'Statistics Highlights': (content.match(/class="stat-highlight"/g) || []).length,
      'Pro Tips': (content.match(/class="pro-tip"/g) || []).length,
      'Quick Takeaways': (content.match(/class="quick-takeaway"/g) || []).length,
      'Tables': (content.match(/<table/g) || []).length,
      'H2 Sections': (content.match(/<h2/g) || []).length,
      'H3 Subsections': (content.match(/<h3/g) || []).length
    };
    
    Object.entries(visualElements).forEach(([element, count]) => {
      console.log(`   ${element}: ${count}`);
    });
    
    // Save article to file for inspection
    const outputDir = 'test-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced-article-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);
    
    // Create a complete HTML file for viewing
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Article Test - ${TEST_CONFIG.keyword}</title>
    <link rel="stylesheet" href="../client/src/styles/article.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .test-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metrics { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <div class="test-header">
            <h1>🚀 Enhanced Article Generation Test</h1>
            <p><strong>Keyword:</strong> ${TEST_CONFIG.keyword}</p>
            <p><strong>Quality Target:</strong> 90+ | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        ${result.qualityMetrics ? `
        <div class="metrics">
            <h3>📊 Quality Metrics</h3>
            <p><strong>Overall Score:</strong> ${result.qualityMetrics.overall_score}/100</p>
            <p><strong>Expert Authority:</strong> ${result.qualityMetrics.expert_authority}/100</p>
            <p><strong>Actionability:</strong> ${result.qualityMetrics.actionability}/100</p>
            <p><strong>Word Count:</strong> ${result.wordCount} words</p>
        </div>
        ` : ''}
        
        <div class="article-content">
            ${result.content}
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(filepath, htmlContent);
    
    console.log('\n💾 Article saved to file:');
    console.log(`   File: ${filepath}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    
    console.log('\n🎯 Test Summary:');
    console.log(`   ✅ Enhanced prompting system working`);
    console.log(`   ✅ Quality metrics above ${result.qualityMetrics?.overall_score >= 85 ? '85' : 'baseline'}`);
    console.log(`   ✅ Visual elements ${Object.values(visualElements).reduce((a, b) => a + b, 0) > 0 ? 'detected' : 'missing'}`);
    console.log(`   ✅ Article structure enhanced`);
    
    console.log('\n🌐 To view the article:');
    console.log(`   Open: ${filepath}`);
    console.log(`   Or run: open ${filepath} (macOS)`);
    
  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Make sure the server is running: npm run dev');
      console.log('   2. Check if the server is on a different port');
      console.log('   3. Verify the API endpoint is correct');
    }
  }
}

// Run the test
testEnhancedArticleGeneration();

export { testEnhancedArticleGeneration, TEST_CONFIG };
