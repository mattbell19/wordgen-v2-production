import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { eq, desc, SQL } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "../../db/schema";
import * as queueSchema from "./queue-schema";
import { articleQueues, articleQueueItems } from "./queue-schema";

const isProduction = process.env.NODE_ENV === 'production';

// Create pool with error handling
let pool: any = null;
let db: any = null;

function createDatabaseConnection() {
  if (pool) return { pool, db };

  try {
    // Check if we have a valid database URL
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
      console.warn('[DB] No valid database URL provided. Database operations will fail gracefully.');
      return { pool: null, db: null };
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? {
        rejectUnauthorized: false // Required for SSL certificate in some hosting environments
      } : undefined,
      connectionTimeoutMillis: 5000, // 5 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      max: 20 // Maximum number of clients in the pool
    });

    // Add error handler for the pool
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // Don't exit in development
      if (isProduction) {
        process.exit(-1);
      }
    });

    // Create the database instance with schema
    db = drizzle(pool, { schema: { ...schema, ...queueSchema } });

    console.log('[DB] Database connection initialized');
    return { pool, db };
  } catch (error) {
    console.error('[DB] Failed to create database connection:', error);
    return { pool: null, db: null };
  }
}

// Initialize database connection
const { pool: dbPool, db: database } = createDatabaseConnection();
export { database as db };

// Define queue types
export type ArticleQueue = typeof articleQueues.$inferSelect & {
  items: Array<typeof articleQueueItems.$inferSelect>;
};

// Define task type
export type SeoAuditTask = typeof schema.seoAuditTasks.$inferSelect & {
  results?: Array<typeof schema.seoAuditResults.$inferSelect>;
};

// Create query builder with proper types
const queryBuilderConfig = database ? {
  ...database,
  query: {
    ...database.query,
    articleQueues: {
      findMany: async (args?: { 
        where?: SQL<unknown>;
        orderBy?: SQL<unknown>[];
        with?: { 
          items?: boolean;
        }
      }): Promise<ArticleQueue[]> => {
        const { where, orderBy, with: withRelations } = args || {};
        if (!database) throw new Error('Database not available');
        const query = database.select().from(articleQueues);

        if (where) query.where(where);
        if (orderBy) query.orderBy(...orderBy);

        const queues = await query;

        const result: ArticleQueue[] = await Promise.all(
          queues.map(async (queue) => {
            const items = withRelations?.items
              ? await database
                  .select()
                  .from(articleQueueItems)
                  .where(eq(articleQueueItems.queueId, queue.id))
              : [];
            return { ...queue, items };
          })
        );

        return result;
      },
      findFirst: async (args?: { 
        where?: SQL<unknown>;
        orderBy?: SQL<unknown>[];
        with?: { 
          items?: boolean;
        }
      }): Promise<ArticleQueue | null> => {
        const result = await queryBuilderConfig.query.articleQueues.findMany({
          ...args,
          where: args?.where,
        });
        return result[0] || null;
      },
    },
    seoAuditTasks: {
      findMany: async (args?: { 
        where?: SQL<unknown>;
        orderBy?: SQL<unknown>[];
        with?: { 
          results?: { 
            limit?: number;
            orderBy?: SQL<unknown>[];
          } 
        }
      }): Promise<SeoAuditTask[]> => {
        const { where, orderBy, with: withRelations } = args || {};
        if (!database) throw new Error('Database not available');
        const query = database.select().from(schema.seoAuditTasks);
        
        if (where) {
          query.where(where);
        }
        
        if (orderBy?.length) {
          query.orderBy(...orderBy);
        }
        
        const tasks = await query;
        
        if (withRelations?.results) {
          for (const task of tasks) {
            const results = await database.select()
              .from(schema.seoAuditResults)
              .where(eq(schema.seoAuditResults.taskId, task.id))
              .orderBy(...(withRelations.results.orderBy || [desc(schema.seoAuditResults.createdAt)]))
              .limit(withRelations.results.limit || 1);

            (task as SeoAuditTask).results = results;
          }
        }
        
        return tasks as SeoAuditTask[];
      },
      findFirst: async (args?: { 
        where?: SQL<unknown>;
        orderBy?: SQL<unknown>[];
        with?: { 
          results?: { 
            limit?: number;
            orderBy?: SQL<unknown>[];
          } 
        }
      }): Promise<SeoAuditTask | null> => {
        if (!database) throw new Error('Database not available');
        const query = database.select().from(schema.seoAuditTasks);
        
        if (args?.where) {
          query.where(args.where);
        }
        
        if (args?.orderBy?.length) {
          query.orderBy(...args.orderBy);
        }
        
        query.limit(1);
        
        const [task] = await query;
        
        if (task && args?.with?.results) {
          const results = await database.select()
            .from(schema.seoAuditResults)
            .where(eq(schema.seoAuditResults.taskId, task.id))
            .orderBy(...(args.with.results.orderBy || [desc(schema.seoAuditResults.createdAt)]))
            .limit(args.with.results.limit || 1);

          (task as SeoAuditTask).results = results;
        }
        
        return task as SeoAuditTask | null;
      },
    },
  },
} : null;

export const queryBuilder = queryBuilderConfig;
export type DB = typeof database;

// Health check function
export async function checkDatabaseConnection() {
  try {
    if (!dbPool) {
      return { status: 'disconnected', error: 'No database pool available', timestamp: new Date().toISOString() };
    }
    const client = await dbPool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'connected', timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { status: 'disconnected', error: error.message, timestamp: new Date().toISOString() };
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  try {
    if (dbPool) {
      await dbPool.end();
      console.log('Database connection pool closed gracefully');
    }
  } catch (error) {
    console.error('Error closing database connection pool:', error);
  }
}

// Export all schemas for easy access
export { schema, queueSchema, articleQueues, articleQueueItems };
