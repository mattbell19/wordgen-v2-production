import fetch from 'node-fetch';

async function testAuthentication() {
  try {
    console.log('Testing authentication endpoints...');
    
    // Test login
    console.log('\n--- Testing Login ---');
    const loginResponse = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        email: 'matt1@airteam.co',
        password: 'password123'  // Use the password set in reset-password.ts
      }),
      credentials: 'include',
    });

    const cookies = loginResponse.headers.raw()['set-cookie'];
    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginResponse.ok) {
      console.error('Login failed');
      return;
    }

    console.log('Login response format check:');
    console.log('- Has success property:', loginData.hasOwnProperty('success'));
    console.log('- Has data property:', loginData.hasOwnProperty('data'));
    console.log('- Has message property:', loginData.hasOwnProperty('message'));
    
    // Test user endpoint
    console.log('\n--- Testing User Endpoint ---');
    const userResponse = await fetch('http://localhost:3001/api/user', {
      headers: {
        'Cookie': cookies?.join('; ') || '',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
    });

    const userData = await userResponse.json();
    console.log('User response status:', userResponse.status);
    console.log('User response:', JSON.stringify(userData, null, 2));
    
    console.log('User response format check:');
    console.log('- Has success property:', userData.hasOwnProperty('success'));
    console.log('- Has data property:', userData.hasOwnProperty('data'));
    console.log('- Has message property:', userData.hasOwnProperty('message'));
    
    // Test client authentication hook data model expectations
    if (userData.success && userData.data) {
      console.log('\n--- Testing Client Data Model Compatibility ---');
      console.log('Data structure is compatible with client expectations:', 
        typeof userData.data === 'object' && 
        userData.data !== null && 
        'id' in userData.data && 
        'email' in userData.data
      );
    }
  } catch (error) {
    console.error('Error testing authentication:', error);
  }
}

testAuthentication(); 