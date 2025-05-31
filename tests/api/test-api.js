// Simple script to test the API endpoints
import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login...');
    const loginResponse = await fetch('http://localhost:4002/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        email: 'matt1@airteam.co',
        password: 'password'
      }),
      credentials: 'include',
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (loginResponse.ok) {
      // Extract cookies from the response
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Cookies:', cookies);

      // Test the user endpoint
      console.log('\nTesting /api/user endpoint...');
      const userResponse = await fetch('http://localhost:4002/api/user', {
        headers: {
          'Cookie': cookies,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
      });

      const userData = await userResponse.json();
      console.log('User response:', JSON.stringify(userData, null, 2));
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testLogin(); 