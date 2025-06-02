#!/usr/bin/env node

/**
 * Test script to verify article generation fixes
 * This script tests the article generation with the same parameters
 * that the frontend sends to identify and fix the 400 error
 */

const { generateArticle } = require('./server/services/article.service');

async function testArticleGeneration() {
  console.log('🧪 Testing article generation with frontend parameters...\n');

  // Test parameters that match what the frontend sends
  const testParams = {
    keyword: 'best coffee machines',
    tone: 'professional',
    wordCount: 1500,
    enableInternalLinking: false,
    enableExternalLinking: true,
    userId: 1,
    language: 'english',
    callToAction: 'Learn more about coffee machines by contacting our experts today!',
    industry: 'marketing',
    targetAudience: 'professional',
    contentType: 'guide'
  };

  console.log('📋 Test Parameters:', JSON.stringify(testParams, null, 2));
  console.log('\n🚀 Starting article generation...\n');

  try {
    const startTime = Date.now();
    const result = await generateArticle(testParams);
    const endTime = Date.now();

    console.log('✅ Article generation successful!');
    console.log(`⏱️  Generation time: ${endTime - startTime}ms`);
    console.log(`📝 Word count: ${result.wordCount}`);
    console.log(`⏰ Reading time: ${result.readingTime} minutes`);
    
    if (result.qualityMetrics) {
      console.log(`📊 Quality score: ${result.qualityMetrics.overall_score}/100`);
    }
    
    if (result.expertPersona) {
      console.log(`👨‍💼 Expert persona: ${result.expertPersona}`);
    }
    
    if (result.industry) {
      console.log(`🏢 Industry: ${result.industry}`);
    }

    console.log('\n📄 Content preview (first 200 characters):');
    console.log(result.content.substring(0, 200) + '...');

    console.log('\n🎉 Test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Article generation failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide specific guidance based on error type
    if (error.message.includes('API key')) {
      console.log('\n💡 Fix: Set a valid OpenAI API key in your .env file:');
      console.log('   OPENAI_API_KEY=sk-your-actual-openai-api-key');
    } else if (error.message.includes('Invalid settings')) {
      console.log('\n💡 Fix: Check the input parameters for validation errors');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Fix: Try reducing the word count or check network connectivity');
    } else {
      console.log('\n💡 Check the server logs for more details');
    }
    
    return false;
  }
}

// Test with different parameter combinations
async function runAllTests() {
  console.log('🔬 Running comprehensive article generation tests...\n');

  const testCases = [
    {
      name: 'Standard Request',
      params: {
        keyword: 'SEO optimization',
        tone: 'professional',
        wordCount: 1000,
        enableInternalLinking: false,
        enableExternalLinking: false,
        userId: 1,
        language: 'english',
        industry: 'marketing',
        targetAudience: 'professional',
        contentType: 'guide'
      }
    },
    {
      name: 'Minimal Request',
      params: {
        keyword: 'test keyword',
        tone: 'casual',
        wordCount: 500,
        userId: 1
      }
    },
    {
      name: 'AI Industry Request',
      params: {
        keyword: 'machine learning algorithms',
        tone: 'professional',
        wordCount: 2000,
        enableInternalLinking: true,
        enableExternalLinking: true,
        userId: 1,
        language: 'english',
        industry: 'ai_saas',
        targetAudience: 'technical',
        contentType: 'analysis'
      }
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}/${totalTests}: ${testCase.name}`);
    console.log('Parameters:', JSON.stringify(testCase.params, null, 2));
    
    try {
      const result = await generateArticle(testCase.params);
      console.log(`✅ ${testCase.name} - PASSED`);
      console.log(`   Word count: ${result.wordCount}, Reading time: ${result.readingTime}min`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${testCase.name} - FAILED`);
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Article generation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testArticleGeneration, runAllTests };
