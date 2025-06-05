import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig({ path: resolve(__dirname, '../.env') });
}

// Debug environment variables
console.log('[CONFIG] Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
  envPath: process.env.NODE_ENV === 'production' ? 'Using Heroku env vars' : resolve(__dirname, '../.env')
});

// Environment validation
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Critical environment variables that must always be present
const criticalEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET'
];

// Production-only required environment variables
const productionEnvVars = [
  'RESEND_API_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY'
];

// Validate critical environment variables
for (const envVar of criticalEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing critical environment variable: ${envVar}`);
  }
}

// Validate production environment variables
if (isProduction) {
  for (const envVar of productionEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: Missing production environment variable: ${envVar}`);
    }
  }
}

// Validate session secret strength
if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters long');
}

const configuration = {
  databaseUrl: process.env.DATABASE_URL,
  resendApiKey: process.env.RESEND_API_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  rapidApiKey: process.env.RAPIDAPI_KEY,
  port: parseInt(process.env.PORT || '3001', 10),
  clientPort: parseInt(process.env.VITE_PORT || '4002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4002',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

export default configuration;