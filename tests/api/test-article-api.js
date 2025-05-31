// Simple script to test the article generation API
const fetch = require('node-fetch');

async function testArticleGeneration() {
  try {
    console.log('Testing article generation API...');
    
    // First, let's check if the server is running
    const healthCheck = await fetch('http://localhost:3001/api/debug/proxy-test');
    if (!healthCheck.ok) {
      console.error('Server health check failed:', await healthCheck.text());
      return;
    }
    console.log('Server is running');
    
    // Now test the article generation endpoint
    const response = await fetch('http://localhost:3001/api/ai/article/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: 'test article',
        tone: 'professional',
        wordCount: 500,
        enableInternalLinking: false,
        enableExternalLinking: false,
        language: 'english'
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('Could not parse response as JSON');
    }
    
  } catch (error) {
    console.error('Error testing article generation:', error);
  }
}

testArticleGeneration();
