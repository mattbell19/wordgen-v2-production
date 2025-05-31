import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenvConfig({ path: resolve(__dirname, '../.env') });

// Debug environment variables
console.log('[CONFIG] Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
  envPath: resolve(__dirname, '../.env')
});

// Make certain environment variables optional in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Make certain environment variables optional in development mode
const requiredEnvVars = isDevelopment ? [] : [
  'DATABASE_URL',
  'RESEND_API_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
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