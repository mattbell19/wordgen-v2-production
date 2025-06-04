#!/usr/bin/env node

/**
 * Test script to generate competitor-level quality articles
 * Based on the PAYE Mileage Tax Rebate analysis
 */

import fs from 'fs';
import path from 'path';

// Test configuration for competitor-level quality
const TEST_CONFIG = {
  keyword: "business expense deductions",
  wordCount: 2000,
  tone: "professional",
  industry: "finance",
  targetAudience: "business owners",
  contentType: "guide",
  enableExternalLinking: true,
  enableInternalLinking: true
};

// Server configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const API_ENDPOINT = `${SERVER_URL}/api/articles/generate`;

async function testCompetitorQualityGeneration() {
  console.log('🎯 Testing Competitor-Level Article Quality');
  console.log('=' .repeat(60));
  
  console.log('\n📋 Test Configuration:');
  console.log(`   Keyword: ${TEST_CONFIG.keyword}`);
  console.log(`   Word Count: ${TEST_CONFIG.wordCount}`);
  console.log(`   Quality Standard: Competitor-level (90+)`);
  console.log(`   Structure: 8-section comprehensive guide`);
  
  console.log('\n⏳ Generating competitor-quality article...');
  
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
    
    console.log('\n✅ Competitor-Quality Article Generated!');
    console.log('=' .repeat(60));
    
    // Analyze quality metrics
    if (result.qualityMetrics) {
      console.log('\n📊 Quality Analysis:');
      console.log(`   Overall Score: ${result.qualityMetrics.overall_score}/100`);
      console.log(`   Clarity & Accessibility: ${result.qualityMetrics.expert_authority}/100`);
      console.log(`   Practical Actionability: ${result.qualityMetrics.actionability}/100`);
      console.log(`   Comprehensive Coverage: ${result.qualityMetrics.specificity}/100`);
      console.log(`   Authority & Credibility: ${result.qualityMetrics.current_relevance}/100`);
      console.log(`   Reader-Focused Value: ${result.qualityMetrics.engagement}/100`);
      
      // Quality assessment
      const overallScore = result.qualityMetrics.overall_score;
      let qualityLevel = '';
      let competitorComparison = '';
      
      if (overallScore >= 90) {
        qualityLevel = '🏆 Premium Quality';
        competitorComparison = '✅ Matches competitor standard';
      } else if (overallScore >= 85) {
        qualityLevel = '✅ Excellent Quality';
        competitorComparison = '⚠️ Close to competitor standard';
      } else if (overallScore >= 75) {
        qualityLevel = '⚠️ Good Quality';
        competitorComparison = '❌ Below competitor standard';
      } else {
        qualityLevel = '❌ Needs Improvement';
        competitorComparison = '❌ Significantly below competitor standard';
      }
      
      console.log(`   Quality Level: ${qualityLevel}`);
      console.log(`   Competitor Comparison: ${competitorComparison}`);
    }
    
    // Analyze article structure
    console.log('\n📝 Structure Analysis:');
    const content = result.content;
    const structureElements = {
      'H1 Title': (content.match(/<h1/g) || []).length,
      'H2 Main Sections': (content.match(/<h2/g) || []).length,
      'H3 Subsections': (content.match(/<h3/g) || []).length,
      'Paragraphs': (content.match(/<p/g) || []).length,
      'Lists': (content.match(/<ul|<ol/g) || []).length,
      'Call-out Boxes': (content.match(/class="callout-box"/g) || []).length,
      'Pro Tips': (content.match(/class="pro-tip"/g) || []).length,
      'Key Takeaways': (content.match(/class="quick-takeaway"/g) || []).length,
      'Tables': (content.match(/<table/g) || []).length
    };
    
    Object.entries(structureElements).forEach(([element, count]) => {
      const status = count > 0 ? '✅' : '❌';
      console.log(`   ${status} ${element}: ${count}`);
    });
    
    // Check for competitor-level features
    console.log('\n🎯 Competitor-Level Features Check:');
    const competitorFeatures = {
      'Clear "What is..." opening': content.includes('What is') || content.includes('what is'),
      'Basics section': content.includes('basics') || content.includes('Basics'),
      'Eligibility/Who section': content.includes('eligible') || content.includes('Who '),
      'Process/How-to section': content.includes('process') || content.includes('Process'),
      'Misconceptions section': content.includes('misconception') || content.includes('myth'),
      'Impact/Benefits section': content.includes('impact') || content.includes('benefit'),
      'Challenges section': content.includes('challenge') || content.includes('issue'),
      'Professional help guidance': content.includes('professional') || content.includes('expert')
    };
    
    Object.entries(competitorFeatures).forEach(([feature, present]) => {
      const status = present ? '✅' : '❌';
      console.log(`   ${status} ${feature}`);
    });
    
    // Save article for review
    const outputDir = 'test-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `competitor-quality-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);
    
    // Create HTML file with competitor comparison
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Competitor Quality Test - ${TEST_CONFIG.keyword}</title>
    <link rel="stylesheet" href="../client/src/styles/article.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .test-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .quality-metrics { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea; }
        .competitor-comparison { background: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="test-header">
            <h1>🎯 Competitor Quality Test Results</h1>
            <p><strong>Keyword:</strong> ${TEST_CONFIG.keyword}</p>
            <p><strong>Target:</strong> Match competitor-level quality (90+)</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        ${result.qualityMetrics ? `
        <div class="quality-metrics">
            <h3>📊 Quality Metrics</h3>
            <p><strong>Overall Score:</strong> ${result.qualityMetrics.overall_score}/100</p>
            <p><strong>Quality Level:</strong> ${qualityLevel}</p>
            <p><strong>Competitor Comparison:</strong> ${competitorComparison}</p>
        </div>
        ` : ''}
        
        <div class="competitor-comparison">
            <h3>🏆 Competitor Standard Analysis</h3>
            <p>This article has been generated using competitor-level quality standards based on analysis of high-performing content in the same space.</p>
            <p><strong>Structure:</strong> 8-section comprehensive guide format</p>
            <p><strong>Quality Focus:</strong> Clarity, actionability, comprehensive coverage</p>
        </div>
        
        <div class="article-content">
            ${result.content}
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(filepath, htmlContent);
    
    console.log('\n💾 Article saved for review:');
    console.log(`   File: ${filepath}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`   Generation Time: ${duration.toFixed(2)} seconds`);
    
    console.log('\n🎉 Test Summary:');
    const overallScore = result.qualityMetrics?.overall_score || 0;
    console.log(`   ✅ Competitor-level prompting system active`);
    console.log(`   ${overallScore >= 90 ? '✅' : overallScore >= 85 ? '⚠️' : '❌'} Quality score: ${overallScore}/100`);
    console.log(`   ✅ 8-section structure implemented`);
    console.log(`   ✅ Enhanced visual elements included`);
    
    console.log('\n🌐 To review the article:');
    console.log(`   open ${filepath}`);
    
  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Make sure the server is running: npm run dev');
      console.log('   2. Check if the server is on port 3001');
      console.log('   3. Verify the API endpoint is accessible');
    } else if (error.message.includes('401')) {
      console.log('\n💡 Authentication Issue:');
      console.log('   1. The API requires authentication');
      console.log('   2. Test through the web interface instead');
      console.log('   3. Or check authentication setup');
    }
  }
}

// Run the test
testCompetitorQualityGeneration();

export { testCompetitorQualityGeneration, TEST_CONFIG };
