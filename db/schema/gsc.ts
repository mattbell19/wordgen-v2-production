import { pgTable, serial, varchar, timestamp, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { articles } from './content';

/**
 * Google Search Console connections table
 * Stores OAuth tokens and connection information
 */
export const gscConnections = pgTable('gsc_connections', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: varchar('access_token', { length: 2048 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 2048 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  email: varchar('email', { length: 255 }),
  profilePicture: varchar('profile_picture', { length: 1024 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('gsc_connections_user_id_idx').on(table.userId),
  };
});

/**
 * Google Search Console sites table
 * Stores sites registered in the user's GSC account
 */
export const gscSites = pgTable('gsc_sites', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  siteUrl: varchar('site_url', { length: 1024 }).notNull(),
  permissionLevel: varchar('permission_level', { length: 50 }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('gsc_sites_user_id_idx').on(table.userId),
    uniqueSiteUrl: uniqueIndex('gsc_sites_user_id_site_url_idx').on(table.userId, table.siteUrl)
  };
});

/**
 * Google Search Console keyword tracking table
 * Tracks keywords for specific articles and sites
 */
export const gscKeywordTracking = pgTable('gsc_keyword_tracking', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').notNull().references(() => gscSites.id, { onDelete: 'cascade' }),
  keyword: varchar('keyword', { length: 255 }).notNull(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'set null' }),
  isTracking: boolean('is_tracking').default(true).notNull(),
  initialPosition: integer('initial_position'),
  initialImpressions: integer('initial_impressions'),
  initialClicks: integer('initial_clicks'),
  initialCtr: varchar('initial_ctr', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('gsc_keyword_tracking_user_id_idx').on(table.userId),
    siteIdIdx: index('gsc_keyword_tracking_site_id_idx').on(table.siteId),
    articleIdIdx: index('gsc_keyword_tracking_article_id_idx').on(table.articleId),
    keywordIdx: index('gsc_keyword_tracking_keyword_idx').on(table.keyword)
  };
});

/**
 * Google Search Console performance cache table
 * Caches performance data to reduce API calls
 */
export const gscPerformanceCache = pgTable('gsc_performance_cache', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => gscSites.id, { onDelete: 'cascade' }),
  queryType: varchar('query_type', { length: 50 }).notNull(),
  queryParams: varchar('query_params', { length: 2048 }).notNull(),
  responseData: varchar('response_data', { length: 1048576 }).notNull(), // JSON data stored as text
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    siteIdIdx: index('gsc_performance_cache_site_id_idx').on(table.siteId),
    queryTypeIdx: index('gsc_performance_cache_query_type_idx').on(table.queryType),
    expiresAtIdx: index('gsc_performance_cache_expires_at_idx').on(table.expiresAt)
  };
});
