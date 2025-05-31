import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { users, articles } from "../../db/schema";
import type { ArticleSettings } from "@/lib/types";

export const articleQueues = pgTable("article_queues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  batchName: text("batch_name"),
  status: text("status").default("pending").notNull(),
  progress: integer("progress").default(0).notNull(),
  totalItems: integer("total_items").notNull(),
  completedItems: integer("completed_items").default(0).notNull(),
  failedItems: integer("failed_items").default(0).notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const articleQueueItems = pgTable("article_queue_items", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").references(() => articleQueues.id).notNull(),
  keyword: text("keyword").notNull(),
  settings: jsonb("settings").$type<ArticleSettings>().notNull(),
  status: text("status").default("pending").notNull(),
  error: text("error"),
  articleId: integer("article_id").references(() => articles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
