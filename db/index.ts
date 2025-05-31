import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import config from '../server/config';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// Only require SSL in production
const isProduction = config.nodeEnv === 'production';
const dbUrl = isProduction && !config.databaseUrl.includes('sslmode=require') 
  ? `${config.databaseUrl}${config.databaseUrl.includes('?') ? '&' : '?'}sslmode=require`
  : config.databaseUrl;

// Create SQL client
const client = postgres(dbUrl, { 
  ssl: isProduction ? 'require' : false,
  max: 10
});

// Create database instance with schema
export const db = drizzle(client, { schema });

export async function pingDb() {
  try {
    console.log('[DB] Testing connection...');
    const result = await client`SELECT 1`;
    console.log('[DB] Connection test successful:', result);
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error);
    return false;
  }
}