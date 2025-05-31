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

const pool = new Pool({
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
  process.exit(-1);
});

// Create the database instance with schema
export const db = drizzle(pool, { schema: { ...schema, ...queueSchema } });

// Define queue types
export type ArticleQueue = typeof articleQueues.$inferSelect & {
  items: Array<typeof articleQueueItems.$inferSelect>;
};

// Define task type
export type SeoAuditTask = typeof schema.seoAuditTasks.$inferSelect & {
  results?: Array<typeof schema.seoAuditResults.$inferSelect>;
};

// Create query builder with proper types
const queryBuilderConfig = {
  ...db,
  query: {
    ...db.query,
    articleQueues: {
      findMany: async (args?: { 
        where?: SQL<unknown>;
        orderBy?: SQL<unknown>[];
        with?: { 
          items?: boolean;
        }
      }): Promise<ArticleQueue[]> => {
        const { where, orderBy, with: withRelations } = args || {};
        const query = db.select().from(articleQueues);

        if (where) query.where(where);
        if (orderBy) query.orderBy(...orderBy);

        const queues = await query;

        const result: ArticleQueue[] = await Promise.all(
          queues.map(async (queue) => {
            const items = withRelations?.items
              ? await db
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
        const query = db.select().from(schema.seoAuditTasks);
        
        if (where) {
          query.where(where);
        }
        
        if (orderBy?.length) {
          query.orderBy(...orderBy);
        }
        
        const tasks = await query;
        
        if (withRelations?.results) {
          for (const task of tasks) {
            const results = await db.select()
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
        const query = db.select().from(schema.seoAuditTasks);
        
        if (args?.where) {
          query.where(args.where);
        }
        
        if (args?.orderBy?.length) {
          query.orderBy(...args.orderBy);
        }
        
        query.limit(1);
        
        const [task] = await query;
        
        if (task && args?.with?.results) {
          const results = await db.select()
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
};

export const queryBuilder = queryBuilderConfig;
export type DB = typeof db;

// Health check function
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
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
    await pool.end();
    console.log('Database connection pool closed gracefully');
  } catch (error) {
    console.error('Error closing database connection pool:', error);
  }
}

// Export all schemas for easy access
export { schema, queueSchema, articleQueues, articleQueueItems };
