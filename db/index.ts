import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import config from '../server/config';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// Always require SSL in production, optional in development
const isProduction = config.nodeEnv === 'production';
const dbUrl = isProduction && !config.databaseUrl.includes('sslmode=require')
  ? `${config.databaseUrl}${config.databaseUrl.includes('?') ? '&' : '?'}sslmode=require`
  : config.databaseUrl;

// Create SQL client with enhanced security and monitoring
const client = postgres(dbUrl, {
  ssl: isProduction ? 'require' : false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Disable prepared statements for better security
  onnotice: (notice) => {
    console.log('[DB] Notice:', notice);
  },
  onnotify: (channel, payload) => {
    console.log('[DB] Notify:', { channel, payload });
  },
  debug: (connection, query, parameters) => {
    if (process.env.LOG_QUERIES === 'true') {
      console.log('[DB] Query:', {
        query: query.slice(0, 200) + (query.length > 200 ? '...' : ''),
        parameters: parameters?.slice(0, 5) // Limit parameter logging
      });
    }
  },
  transform: {
    undefined: null // Transform undefined to null for better SQL compatibility
  }
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