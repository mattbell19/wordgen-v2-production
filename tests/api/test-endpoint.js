import axios from 'axios';

const testArticleGeneration = async () => {
  try {
    console.log('Sending request to generate article...');
    const response = await axios.post('http://localhost:3004/api/ai/article/generate', {
      keyword: 'paye tax rebate',
      tone: 'professional',
      wordCount: 1500,
      enableInternalLinking: false,
      language: 'english'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
};

testArticleGeneration(); 