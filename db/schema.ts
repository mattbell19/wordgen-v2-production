import { pgTable, text, serial, integer, timestamp, boolean, index, uniqueIndex, json, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import type { ArticleSettings } from "@/lib/types";

// Add settings table for platform configuration
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default('Wordgen'),
  maxArticlesPerUser: integer("max_articles_per_user").notNull().default(10),
  allowNewRegistrations: boolean("allow_new_registrations").default(true),
  requireEmailVerification: boolean("require_email_verification").default(true),
  maintenanceMode: boolean("maintenance_mode").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table with proper constraints
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  subscriptionTier: text("subscription_tier").default("free").notNull(),
  articleCreditsRemaining: integer("article_credits_remaining").default(0).notNull(),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  status: text("status").default("active").notNull(),
  lastLoginDate: timestamp("last_login_date"),
  totalArticlesGenerated: integer("total_articles_generated").default(0).notNull(),
  activeTeamId: integer("active_team_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
    subscriptionTierIdx: index('users_subscription_tier_idx').on(table.subscriptionTier),
    activeTeamIdx: index('users_active_team_idx').on(table.activeTeamId),
  };
});

export const userUsage = pgTable("user_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  totalArticlesGenerated: integer("total_articles_generated").default(0).notNull(),
  freeArticlesUsed: integer("free_articles_used").default(0).notNull(),
  freeKeywordReportsUsed: integer("free_keyword_reports_used").default(0).notNull(),
  totalKeywordsAnalyzed: integer("total_keywords_analyzed").default(0).notNull(),
  totalWordCount: integer("total_word_count").default(0).notNull(),
  articlesUsed: integer("articles_used").default(0).notNull(),
  creditsUsed: integer("credits_used").default(0).notNull(),
  paygCredits: integer("payg_credits").default(0).notNull(),
  lastArticleDate: timestamp("last_article_date"),
  lastKeywordDate: timestamp("last_keyword_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  primaryKeyword: text("primary_keyword"),
  status: text("status").default("pending").notNull(),
  wordCount: integer("word_count").notNull(),
  readingTime: integer("reading_time").notNull(),
  creditsUsed: integer("credits_used").default(1).notNull(),
  settings: json("settings").$type<ArticleSettings>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('articles_user_id_idx').on(table.userId),
    projectIdIdx: index('articles_project_id_idx').on(table.projectId),
    statusIdx: index('articles_status_idx').on(table.status),
    primaryKeywordIdx: index('articles_primary_keyword_idx').on(table.primaryKeyword),
    createdAtIdx: index('articles_created_at_idx').on(table.createdAt),
  };
});

export const articleUsage = pgTable("article_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "cascade" }).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const keywordLists = pgTable("keyword_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savedKeywords = pgTable("saved_keywords", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").references(() => keywordLists.id, { onDelete: "cascade" }).notNull(),
  keyword: text("keyword").notNull(),
  searchVolume: integer("search_volume").notNull(),
  difficulty: integer("difficulty"),
  competition: integer("competition"),
  relatedKeywords: json("related_keywords").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const seoAuditTasks = pgTable("seo_audit_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  domain: text("domain").notNull(),
  path: text("path"),
  status: text("status").notNull().default("pending"),
  dataForSeoTaskId: text("dataforseo_task_id"),
  schedule: text("schedule"), // weekly, monthly, or null for one-time
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const seoAuditResults = pgTable("seo_audit_results", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => seoAuditTasks.id, { onDelete: "cascade" }).notNull(),
  totalPages: integer("total_pages"),
  healthScore: integer("health_score"),
  criticalIssues: integer("critical_issues"),
  warnings: integer("warnings"),
  passed: integer("passed"),
  onPageData: jsonb("on_page_data"), // Stores the complete API response
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const seoAuditIssues = pgTable("seo_audit_issues", {
  id: serial("id").primaryKey(),
  resultId: integer("result_id").references(() => seoAuditResults.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(), // critical, warning, info
  category: text("category").notNull(), // on-page, technical, content, mobile, performance, security
  description: text("description").notNull(),
  howToFix: text("how_to_fix"),
  priority: integer("priority"),
  status: text("status").default("open").notNull(), // open, fixed, ignored
  createdAt: timestamp("created_at").defaultNow().notNull(),
  fixedAt: timestamp("fixed_at"),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  description: text("description"),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add foreign key relation for activeTeamId after both tables are defined
export const usersRelations = relations(users, ({ one }) => ({
  activeTeam: one(teams, {
    fields: [users.activeTeamId],
    references: [teams.id],
  }),
}));

export const teamRoles = pgTable("team_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email"), // For pending invitations to non-users
  roleId: integer("role_id").references(() => teamRoles.id).notNull(),
  status: text("status").default("pending").notNull(), // pending, active, inactive
  invitedBy: integer("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(),
  totalKeywords: integer("total_keywords").default(0).notNull(),
  completedKeywords: integer("completed_keywords").default(0).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // password_reset, team_invitation, article_completion
  status: text("status").notNull(), // sent, failed
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  error: text("error"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiConversations = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  context: jsonb('context').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiMessages = pgTable('ai_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => aiConversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiAgentPreferences = pgTable('ai_agent_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  preferredTone: text('preferred_tone').default('professional').notNull(),
  defaultContext: jsonb('default_context').default({}).notNull(),
  notifications: boolean('notifications').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiSeoSuggestions = pgTable('ai_seo_suggestions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  suggestion: text('suggestion').notNull(),
  status: text('status').default('pending').notNull(),
  impact: text('impact').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  implementedAt: timestamp('implemented_at'),
});

export const scrapingTasks = pgTable("scraping_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  domain: text("domain").notNull(),
  status: text("status").default("pending").notNull(),
  lastRunAt: timestamp("last_run_at"),
  sitemapXml: text("sitemap_xml"), // Store raw XML content
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scrapedUrls = pgTable("scraped_urls", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => scrapingTasks.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  title: text("title"),
  keywords: jsonb("keywords").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceInCents: integer("price_in_cents").notNull(),
  interval: text("interval").notNull(), // monthly, yearly, or per_article
  articleLimit: integer("article_limit"),
  keywordReportLimit: integer("keyword_report_limit"),
  features: jsonb("features").$type<string[]>(),
  stripeProductId: text("stripe_product_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").notNull(), // active, canceled, past_due
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  articlesUsed: integer("articles_used").default(0).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  amountInCents: integer("amount_in_cents").notNull(),
  status: text("status").notNull(), // succeeded, failed, pending
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Please enter a valid email address").min(1),
  password: z.string().min(6, "Password must be at least 6 characters").min(1),
  name: z.string().optional(),
  isAdmin: z.boolean().optional(),
  activeTeamId: z.number().optional(),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const insertArticleSchema = createInsertSchema(articles);
export const selectArticleSchema = createSelectSchema(articles);
export type InsertArticle = typeof articles.$inferInsert;
export type SelectArticle = typeof articles.$inferSelect;

export const insertKeywordListSchema = createInsertSchema(keywordLists);
export const selectKeywordListSchema = createSelectSchema(keywordLists);
export type InsertKeywordList = typeof keywordLists.$inferInsert;
export type SelectKeywordList = typeof keywordLists.$inferSelect;

export const insertSavedKeywordSchema = createInsertSchema(savedKeywords);
export const selectSavedKeywordSchema = createSelectSchema(savedKeywords);
export type InsertSavedKeyword = typeof savedKeywords.$inferInsert;
export type SelectSavedKeyword = typeof savedKeywords.$inferSelect;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type SelectPasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const insertUserUsageSchema = createInsertSchema(userUsage, {
  freeArticlesUsed: z.number().min(0).default(0),
  freeKeywordReportsUsed: z.number().min(0).default(0),
});

export const selectUserUsageSchema = createSelectSchema(userUsage);
export type InsertUserUsage = typeof userUsage.$inferInsert;
export type SelectUserUsage = typeof userUsage.$inferSelect;

export const insertSeoAuditTaskSchema = createInsertSchema(seoAuditTasks, {
  domain: z.string().url("Please enter a valid URL"),
  path: z.string().optional(),
  schedule: z.enum(["none", "weekly", "monthly"]).optional(),
  userId: z.number().optional(), // Make userId optional in validation since we'll set it from the session
  dataForSeoTaskId: z.string().optional(),
  status: z.string().optional(),
  lastRunAt: z.date().optional(),
  nextRunAt: z.date().optional(),
});

export const selectSeoAuditTaskSchema = createSelectSchema(seoAuditTasks);
export type InsertSeoAuditTask = typeof seoAuditTasks.$inferInsert;
export type SelectSeoAuditTask = typeof seoAuditTasks.$inferSelect;

export const insertSeoAuditResultSchema = createInsertSchema(seoAuditResults);
export const selectSeoAuditResultSchema = createSelectSchema(seoAuditResults);
export type InsertSeoAuditResult = typeof seoAuditResults.$inferInsert;
export type SelectSeoAuditResult = typeof seoAuditResults.$inferSelect;

export const insertSeoAuditIssueSchema = createInsertSchema(seoAuditIssues);
export const selectSeoAuditIssueSchema = createSelectSchema(seoAuditIssues);
export type InsertSeoAuditIssue = typeof seoAuditIssues.$inferInsert;
export type SelectSeoAuditIssue = typeof seoAuditIssues.$inferSelect;

export const insertTeamSchema = createInsertSchema(teams, {
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

export const updateTeamSchema = insertTeamSchema.partial().extend({
  id: z.number(),
});

export const insertTeamRoleSchema = createInsertSchema(teamRoles, {
  name: z.string().min(1, "Role name is required"),
  permissions: z.object({
    canInviteMembers: z.boolean(),
    canRemoveMembers: z.boolean(),
    canEditTeamSettings: z.boolean(),
    canCreateContent: z.boolean(),
    canEditContent: z.boolean(),
    canDeleteContent: z.boolean(),
    canApproveContent: z.boolean(),
    canManageKeywords: z.boolean(),
    canViewAnalytics: z.boolean(),
  }),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers, {
  teamId: z.number(),
  userId: z.number().optional(),
  email: z.string().email().optional(),
  roleId: z.number(),
  status: z.enum(["pending", "active", "inactive"]).optional(),
});

export const selectTeamSchema = createSelectSchema(teams);
export const selectTeamRoleSchema = createSelectSchema(teamRoles);
export const selectTeamMemberSchema = createSelectSchema(teamMembers);

export type InsertTeam = typeof teams.$inferInsert;
export type SelectTeam = typeof teams.$inferSelect;
export type InsertTeamRole = typeof teamRoles.$inferInsert;
export type SelectTeamRole = typeof teamRoles.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;
export type SelectTeamMember = typeof teamMembers.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);
export type InsertProject = typeof projects.$inferInsert;
export type SelectProject = typeof projects.$inferSelect;

export const insertEmailLogSchema = createInsertSchema(emailLogs);
export const selectEmailLogSchema = createSelectSchema(emailLogs);
export type InsertEmailLog = typeof emailLogs.$inferInsert;
export type SelectEmailLog = typeof emailLogs.$inferSelect;

export const insertAiConversationSchema = createInsertSchema(aiConversations);
export const selectAiConversationSchema = createSelectSchema(aiConversations);
export type InsertAiConversation = typeof aiConversations.$inferInsert;
export type SelectAiConversation = typeof aiConversations.$inferSelect;

export const insertAiMessageSchema = createInsertSchema(aiMessages);
export const selectAiMessageSchema = createSelectSchema(aiMessages);
export type InsertAiMessage = typeof aiMessages.$inferInsert;
export type SelectAiMessage = typeof aiMessages.$inferSelect;

export const insertAiAgentPreferenceSchema = createInsertSchema(aiAgentPreferences);
export const selectAiAgentPreferenceSchema = createSelectSchema(aiAgentPreferences);
export type InsertAiAgentPreference = typeof aiAgentPreferences.$inferInsert;
export type SelectAiAgentPreference = typeof aiAgentPreferences.$inferSelect;

export const insertAiSeoSuggestionSchema = createInsertSchema(aiSeoSuggestions);
export const selectAiSeoSuggestionSchema = createSelectSchema(aiSeoSuggestions);
export type InsertAiSeoSuggestion = typeof aiSeoSuggestions.$inferInsert;
export type SelectAiSeoSuggestion = typeof aiSeoSuggestions.$inferSelect;

export const insertScrapingTaskSchema = createInsertSchema(scrapingTasks, {
  domain: z.string().url("Please enter a valid URL"),
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  metadata: z.record(z.any()).optional(),
});

export const selectScrapingTaskSchema = createSelectSchema(scrapingTasks);
export type InsertScrapingTask = typeof scrapingTasks.$inferInsert;
export type SelectScrapingTask = typeof scrapingTasks.$inferSelect;

export const insertScrapedUrlSchema = createInsertSchema(scrapedUrls, {
  url: z.string().url("Please enter a valid URL"),
  title: z.string().optional(),
  keywords: z.record(z.number()).optional(),
});

export const selectScrapedUrlSchema = createSelectSchema(scrapedUrls);
export type InsertScrapedUrl = typeof scrapedUrls.$inferInsert;
export type SelectScrapedUrl = typeof scrapedUrls.$inferSelect;

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlans);
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SelectSubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SelectSubscription = typeof subscriptions.$inferSelect;

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory);
export const selectPaymentHistorySchema = createSelectSchema(paymentHistory);
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;
export type SelectPaymentHistory = typeof paymentHistory.$inferSelect;

export const insertArticleUsageSchema = createInsertSchema(articleUsage);
export const selectArticleUsageSchema = createSelectSchema(articleUsage);
export type InsertArticleUsage = typeof articleUsage.$inferInsert;
export type SelectArticleUsage = typeof articleUsage.$inferSelect;

// LLM SEO Addon Tables
export const brandMonitoring = pgTable("brand_monitoring", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
  brandName: text("brand_name").notNull(),
  description: text("description"),
  trackingQueries: jsonb("tracking_queries").$type<string[]>().default([]).notNull(),
  competitors: jsonb("competitors").$type<string[]>().default([]).notNull(),
  monitoringFrequency: text("monitoring_frequency").default("daily").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('brand_monitoring_user_id_idx').on(table.userId),
    teamIdIdx: index('brand_monitoring_team_id_idx').on(table.teamId),
    brandNameIdx: index('brand_monitoring_brand_name_idx').on(table.brandName),
    isActiveIdx: index('brand_monitoring_is_active_idx').on(table.isActive),
  };
});

export const llmMentions = pgTable("llm_mentions", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brandMonitoring.id, { onDelete: "cascade" }).notNull(),
  llmPlatform: text("llm_platform").notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  mentionType: text("mention_type").notNull(),
  brandMentioned: text("brand_mentioned"),
  rankingPosition: integer("ranking_position"),
  sentiment: text("sentiment"),
  confidenceScore: integer("confidence_score"),
  contextSnippet: text("context_snippet"),
  responseMetadata: jsonb("response_metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    brandIdIdx: index('llm_mentions_brand_id_idx').on(table.brandId),
    platformIdx: index('llm_mentions_platform_idx').on(table.llmPlatform),
    createdAtIdx: index('llm_mentions_created_at_idx').on(table.createdAt),
    mentionTypeIdx: index('llm_mentions_mention_type_idx').on(table.mentionType),
    sentimentIdx: index('llm_mentions_sentiment_idx').on(table.sentiment),
  };
});

export const optimizationRecommendations = pgTable("optimization_recommendations", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brandMonitoring.id, { onDelete: "cascade" }).notNull(),
  recommendationType: text("recommendation_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium").notNull(),
  status: text("status").default("pending").notNull(),
  impactEstimate: text("impact_estimate"),
  effortEstimate: text("effort_estimate"),
  data: jsonb("data").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    brandIdIdx: index('optimization_recommendations_brand_id_idx').on(table.brandId),
    statusIdx: index('optimization_recommendations_status_idx').on(table.status),
    priorityIdx: index('optimization_recommendations_priority_idx').on(table.priority),
    typeIdx: index('optimization_recommendations_type_idx').on(table.recommendationType),
  };
});

export const monitoringJobs = pgTable("monitoring_jobs", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brandMonitoring.id, { onDelete: "cascade" }).notNull(),
  jobType: text("job_type").notNull(),
  status: text("status").default("pending").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  results: jsonb("results").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    brandIdIdx: index('monitoring_jobs_brand_id_idx').on(table.brandId),
    statusIdx: index('monitoring_jobs_status_idx').on(table.status),
    jobTypeIdx: index('monitoring_jobs_job_type_idx').on(table.jobType),
    scheduledAtIdx: index('monitoring_jobs_scheduled_at_idx').on(table.scheduledAt),
  };
});

export const competitorMentions = pgTable("competitor_mentions", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brandMonitoring.id, { onDelete: "cascade" }).notNull(),
  competitorName: text("competitor_name").notNull(),
  llmPlatform: text("llm_platform").notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  rankingPosition: integer("ranking_position"),
  sentiment: text("sentiment"),
  confidenceScore: integer("confidence_score"),
  contextSnippet: text("context_snippet"),
  responseMetadata: jsonb("response_metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    brandIdIdx: index('competitor_mentions_brand_id_idx').on(table.brandId),
    competitorIdx: index('competitor_mentions_competitor_idx').on(table.competitorName),
    platformIdx: index('competitor_mentions_platform_idx').on(table.llmPlatform),
    createdAtIdx: index('competitor_mentions_created_at_idx').on(table.createdAt),
  };
});

export const llmAnalyticsDaily = pgTable("llm_analytics_daily", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brandMonitoring.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  totalMentions: integer("total_mentions").default(0).notNull(),
  positiveMentions: integer("positive_mentions").default(0).notNull(),
  neutralMentions: integer("neutral_mentions").default(0).notNull(),
  negativeMentions: integer("negative_mentions").default(0).notNull(),
  avgRankingPosition: integer("avg_ranking_position"),
  competitorMentions: integer("competitor_mentions").default(0).notNull(),
  llmPlatformBreakdown: jsonb("llm_platform_breakdown").default({}).notNull(),
  queryPerformance: jsonb("query_performance").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    brandDateIdx: uniqueIndex('llm_analytics_daily_brand_date_idx').on(table.brandId, table.date),
    dateIdx: index('llm_analytics_daily_date_idx').on(table.date),
  };
});

// LLM SEO Schema types and validation
export const insertBrandMonitoringSchema = createInsertSchema(brandMonitoring, {
  brandName: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
  trackingQueries: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  monitoringFrequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  isActive: z.boolean().default(true),
  settings: z.record(z.any()).default({}),
});

export const selectBrandMonitoringSchema = createSelectSchema(brandMonitoring);
export type InsertBrandMonitoring = typeof brandMonitoring.$inferInsert;
export type SelectBrandMonitoring = typeof brandMonitoring.$inferSelect;

export const insertLlmMentionSchema = createInsertSchema(llmMentions, {
  llmPlatform: z.enum(["openai", "anthropic", "google", "other"]),
  mentionType: z.enum(["direct", "indirect", "competitor"]),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  responseMetadata: z.record(z.any()).default({}),
});

export const selectLlmMentionSchema = createSelectSchema(llmMentions);
export type InsertLlmMention = typeof llmMentions.$inferInsert;
export type SelectLlmMention = typeof llmMentions.$inferSelect;

export const insertOptimizationRecommendationSchema = createInsertSchema(optimizationRecommendations, {
  recommendationType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "dismissed"]).default("pending"),
  impactEstimate: z.enum(["high", "medium", "low"]).optional(),
  effortEstimate: z.enum(["high", "medium", "low"]).optional(),
  data: z.record(z.any()).default({}),
});

export const selectOptimizationRecommendationSchema = createSelectSchema(optimizationRecommendations);
export type InsertOptimizationRecommendation = typeof optimizationRecommendations.$inferInsert;
export type SelectOptimizationRecommendation = typeof optimizationRecommendations.$inferSelect;

export const insertMonitoringJobSchema = createInsertSchema(monitoringJobs, {
  jobType: z.enum(["mention_scan", "competitor_analysis", "optimization_check"]),
  status: z.enum(["pending", "running", "completed", "failed"]).default("pending"),
  results: z.record(z.any()).default({}),
});

export const selectMonitoringJobSchema = createSelectSchema(monitoringJobs);
export type InsertMonitoringJob = typeof monitoringJobs.$inferInsert;
export type SelectMonitoringJob = typeof monitoringJobs.$inferSelect;

export const insertCompetitorMentionSchema = createInsertSchema(competitorMentions, {
  llmPlatform: z.enum(["openai", "anthropic", "google", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  responseMetadata: z.record(z.any()).default({}),
});

export const selectCompetitorMentionSchema = createSelectSchema(competitorMentions);
export type InsertCompetitorMention = typeof competitorMentions.$inferInsert;
export type SelectCompetitorMention = typeof competitorMentions.$inferSelect;

export const insertLlmAnalyticsDailySchema = createInsertSchema(llmAnalyticsDaily, {
  totalMentions: z.number().min(0).default(0),
  positiveMentions: z.number().min(0).default(0),
  neutralMentions: z.number().min(0).default(0),
  negativeMentions: z.number().min(0).default(0),
  competitorMentions: z.number().min(0).default(0),
  llmPlatformBreakdown: z.record(z.any()).default({}),
  queryPerformance: z.record(z.any()).default({}),
});

export const selectLlmAnalyticsDailySchema = createSelectSchema(llmAnalyticsDaily);
export type InsertLlmAnalyticsDaily = typeof llmAnalyticsDaily.$inferInsert;
export type SelectLlmAnalyticsDaily = typeof llmAnalyticsDaily.$inferSelect;

/**
 * Google Search Console connections table
 * Stores OAuth tokens and connection information
 */
export const gscConnections = pgTable('gsc_connections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  email: text('email'),
  profilePicture: text('profile_picture'),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  siteUrl: text('site_url').notNull(),
  permissionLevel: text('permission_level'),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').notNull().references(() => gscSites.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'set null' }),
  isTracking: boolean('is_tracking').default(true).notNull(),
  initialPosition: integer('initial_position'),
  initialImpressions: integer('initial_impressions'),
  initialClicks: integer('initial_clicks'),
  initialCtr: text('initial_ctr'),
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
  queryType: text('query_type').notNull(),
  queryParams: text('query_params').notNull(),
  responseData: text('response_data').notNull(), // JSON data stored as text
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    siteIdIdx: index('gsc_performance_cache_site_id_idx').on(table.siteId),
    queryTypeIdx: index('gsc_performance_cache_query_type_idx').on(table.queryType),
    expiresAtIdx: index('gsc_performance_cache_expires_at_idx').on(table.expiresAt)
  };
});