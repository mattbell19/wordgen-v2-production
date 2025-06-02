import OpenAI from 'openai';

// Test OpenAI API connection
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Write a short 100-word article about AI SaaS.'
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      timeout: 10000 // 10 second timeout
    });

    const content = response.choices[0]?.message?.content;
    console.log('OpenAI API test successful!');
    console.log('Generated content:', content);
    
  } catch (error) {
    console.error('OpenAI API test failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
  }
}

testOpenAI();
