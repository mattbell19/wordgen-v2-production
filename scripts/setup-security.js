#!/usr/bin/env node

/**
 * Security Setup Script
 * Generates secure environment variables and validates security configuration
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔒 WordGen v2 Security Setup');
console.log('============================\n');

// Generate secure session secret
function generateSessionSecret() {
  return crypto.randomBytes(64).toString('base64');
}

// Generate secure API key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copying .env.example to .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from template');
  } else {
    console.log('❌ .env.example file not found');
    process.exit(1);
  }
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Generate new session secret if needed
if (envContent.includes('SESSION_SECRET=your_strong_session_secret_here_minimum_32_characters')) {
  const newSessionSecret = generateSessionSecret();
  envContent = envContent.replace(
    'SESSION_SECRET=your_strong_session_secret_here_minimum_32_characters',
    `SESSION_SECRET=${newSessionSecret}`
  );
  console.log('🔑 Generated new SESSION_SECRET');
}

// Check for placeholder API keys
const placeholders = [
  'your_openai_api_key_here',
  'your_anthropic_api_key_here',
  'your_stripe_secret_key',
  'your_resend_api_key'
];

let hasPlaceholders = false;
placeholders.forEach(placeholder => {
  if (envContent.includes(placeholder)) {
    hasPlaceholders = true;
  }
});

// Write updated .env file
fs.writeFileSync(envPath, envContent);

console.log('\n🔍 Security Configuration Check');
console.log('================================');

// Validate environment variables
const requiredVars = [
  'DATABASE_URL',
  'SESSION_SECRET'
];

const missingVars = [];
const lines = envContent.split('\n');
const envVars = {};

lines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    envVars[key] = value;
  }
});

requiredVars.forEach(varName => {
  if (!envVars[varName] || envVars[varName].trim() === '') {
    missingVars.push(varName);
  }
});

// Check session secret strength
if (envVars.SESSION_SECRET && envVars.SESSION_SECRET.length < 32) {
  console.log('❌ SESSION_SECRET is too short (minimum 32 characters)');
} else if (envVars.SESSION_SECRET) {
  console.log('✅ SESSION_SECRET is properly configured');
}

// Check database URL
if (envVars.DATABASE_URL) {
  if (envVars.DATABASE_URL.includes('localhost') || envVars.DATABASE_URL.includes('127.0.0.1')) {
    console.log('⚠️  DATABASE_URL points to localhost (development mode)');
  } else {
    console.log('✅ DATABASE_URL is configured');
  }
} else {
  console.log('❌ DATABASE_URL is missing');
}

// Security recommendations
console.log('\n🛡️  Security Recommendations');
console.log('=============================');

if (hasPlaceholders) {
  console.log('⚠️  Replace placeholder API keys with real values:');
  placeholders.forEach(placeholder => {
    if (envContent.includes(placeholder)) {
      console.log(`   - ${placeholder}`);
    }
  });
}

console.log('\n📋 Security Checklist:');
console.log('   □ Set strong SESSION_SECRET (✅ Done)');
console.log('   □ Configure real API keys');
console.log('   □ Set up SSL/TLS in production');
console.log('   □ Configure proper CORS origins');
console.log('   □ Set up monitoring and alerting');
console.log('   □ Regular security audits');
console.log('   □ Keep dependencies updated');

console.log('\n🔧 Additional Security Setup:');
console.log('   1. Run: npm audit fix');
console.log('   2. Set up Redis for session storage in production');
console.log('   3. Configure email service for security alerts');
console.log('   4. Set up log monitoring (e.g., Sentry, LogRocket)');
console.log('   5. Configure backup and disaster recovery');

// Generate security report
const securityReport = {
  timestamp: new Date().toISOString(),
  sessionSecretConfigured: !!envVars.SESSION_SECRET && envVars.SESSION_SECRET.length >= 32,
  databaseConfigured: !!envVars.DATABASE_URL,
  hasPlaceholders,
  missingRequiredVars: missingVars,
  recommendations: [
    'Replace placeholder API keys',
    'Set up SSL/TLS in production',
    'Configure monitoring and alerting',
    'Regular security audits',
    'Keep dependencies updated'
  ]
};

fs.writeFileSync(
  path.join(process.cwd(), 'security-report.json'),
  JSON.stringify(securityReport, null, 2)
);

console.log('\n📊 Security report saved to security-report.json');

if (missingVars.length > 0) {
  console.log('\n❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  process.exit(1);
}

console.log('\n✅ Security setup completed successfully!');
console.log('\n🚀 Next steps:');
console.log('   1. Review and update API keys in .env');
console.log('   2. Run: npm run dev (to test in development)');
console.log('   3. Run: npm test (to run security tests)');
console.log('   4. Deploy with proper production environment variables');

// Generate a simple password for testing if needed
if (process.argv.includes('--generate-test-password')) {
  const testPassword = crypto.randomBytes(16).toString('hex');
  console.log(`\n🔑 Generated test password: ${testPassword}`);
  console.log('   (Use this for testing user accounts)');
}
