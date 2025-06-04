import { EventEmitter } from 'events';
import pLimit from 'p-limit';
import { eq, and, sql } from 'drizzle-orm';
import { db, type ArticleQueue } from '../db';
import { articleQueues, articleQueueItems } from '../db/queue-schema';
import { articles, projects } from '../../db/schema';
import { ArticleService } from './article.service';
import type { ArticleSettings } from '@/lib/types';
import type { ArticleServiceResponse } from './article.service';

interface QueueItem {
  keyword: string;
  settings: ArticleSettings;
}

export class QueueManagerService {
  private static instance: QueueManagerService;
  private eventEmitter: EventEmitter;
  private isProcessing: boolean = false;
  private concurrencyLimit = pLimit(3); // Process 3 articles at a time
  private articleService: ArticleService;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.articleService = new ArticleService();
    this.startQueueProcessor();
  }

  public static getInstance(): QueueManagerService {
    if (!QueueManagerService.instance) {
      QueueManagerService.instance = new QueueManagerService();
    }
    return QueueManagerService.instance;
  }

  // Create a new batch of articles
  public async createBatch(userId: number, items: QueueItem[], batchName?: string) {
    // Create the queue
    const [queue] = await db.insert(articleQueues).values({
      userId,
      batchName,
      totalItems: items.length,
    }).returning();

    // Create queue items
    await db.insert(articleQueueItems).values(
      items.map(item => ({
        queueId: queue.id,
        keyword: item.keyword,
        settings: item.settings,
      }))
    );

    this.eventEmitter.emit('newBatch', queue);
    return queue;
  }

  // Get a queue by ID
  public async getQueue(queueId: number) {
    const queue = await db.query.articleQueues.findFirst({
      where: eq(articleQueues.id, queueId),
      with: {
        items: true,
      },
    });
    return queue;
  }

  // Get all queues for a user
  public async getUserQueues(userId: number) {
    const queues = await db.query.articleQueues.findMany({
      where: eq(articleQueues.userId, userId),
      orderBy: (queues, { desc }) => [desc(queues.createdAt)],
      with: {
        items: true,
      },
    });
    return queues;
  }

  // Process a single item in the queue
  private async processQueueItem(queueId: number, item: typeof articleQueueItems.$inferSelect, index: number): Promise<void> {
    try {
      // Update item status to processing
      await db
        .update(articleQueueItems)
        .set({ status: 'processing' })
        .where(eq(articleQueueItems.id, item.id));

      // Get user ID and project ID from settings
      const userId = item.settings.userId;
      const projectId = item.settings.projectId;

      if (!userId) {
        throw new Error('Missing user ID in settings');
      }

      // Generate the article
      const result = await this.articleService.createArticle({
        keyword: item.keyword,
        wordCount: item.settings.wordCount,
        tone: item.settings.tone,
        callToAction: item.settings.callToAction,
        userId: userId as number
      });

      if (!result.ok || !result.article?.id) {
        throw new Error(result.error || 'Failed to generate article');
      }

      const articleId = result.article.id;

      // Save the article to the database
      const articleData: any = {
        userId: userId as number,
        title: `${item.keyword} Article`,
        content: result.article.content,
        wordCount: result.article.wordCount,
        readingTime: Math.ceil(result.article.wordCount / 200),
        creditsUsed: 1,
        // Note: queueId not in schema, using primaryKeyword to track source
        settings: {
          keyword: item.keyword,
          tone: item.settings.tone,
          wordCount: item.settings.wordCount
        },
      };

      // Only add projectId if it exists
      if (projectId) {
        articleData.projectId = projectId as number;
      }

      const [savedArticle] = await db.insert(articles)
        .values(articleData)
        .returning();

      // Update item with success and track credit usage
      await db.transaction(async (tx) => {
        // Update queue item
        await tx
          .update(articleQueueItems)
          .set({
            status: 'completed',
            articleId: savedArticle.id,
          })
          .where(eq(articleQueueItems.id, item.id));

        // Update queue progress
        await tx
          .update(articleQueues)
          .set({
            completedItems: sql`${articleQueues.completedItems} + 1`,
          })
          .where(eq(articleQueues.id, queueId));

        // Update project progress (only if projectId exists)
        if (projectId) {
          await tx
            .update(projects)
            .set({
              completedKeywords: sql`${projects.completedKeywords} + 1`,
              updatedAt: new Date()
            })
            .where(eq(projects.id, projectId as number));
        }

        // Track credit usage
        await tx.execute(sql`
          UPDATE user_usage SET
            total_articles_generated = total_articles_generated + 1,
            credits_used = credits_used + 1,
            last_article_date = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
        `);
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Update item with error
      await db.transaction(async (tx) => {
        await tx
          .update(articleQueueItems)
          .set({
            status: 'failed',
            error: errorMessage,
          })
          .where(eq(articleQueueItems.id, item.id));

        await tx
          .update(articleQueues)
          .set({
            failedItems: sql`${articleQueues.failedItems} + 1`,
          })
          .where(eq(articleQueues.id, queueId));
      });
    }

    // Get total items in queue
    const queue = await this.getQueue(queueId);
    if (!queue) return;

    // Update progress
    const progress = Math.round(((index + 1) / queue.totalItems) * 100);
    await db
      .update(articleQueues)
      .set({ progress })
      .where(eq(articleQueues.id, queueId));

    // Emit progress event
    this.eventEmitter.emit('progress', {
      queueId,
      progress,
      itemIndex: index,
    });
  }

  // Process an entire queue
  private async processQueue(queueId: number): Promise<void> {
    try {
      // Update queue status to processing
      await db
        .update(articleQueues)
        .set({ status: 'processing' })
        .where(eq(articleQueues.id, queueId));

      // Get all items in the queue
      const queue = await this.getQueue(queueId);
      if (!queue) return;

      // Process all items concurrently with rate limiting
      if (!queue.items) return;

      const queueItems = queue.items as Array<typeof articleQueueItems.$inferSelect>;
      await Promise.all(
        queueItems.map((item, index) =>
          this.concurrencyLimit(() => this.processQueueItem(queueId, item, index))
        )
      );

      // Get updated queue status
      const updatedQueue = await this.getQueue(queueId);
      if (!updatedQueue?.items) return;

      const updatedItems = updatedQueue.items as Array<typeof articleQueueItems.$inferSelect>;
      const allCompleted = updatedItems.every(item => item.status === 'completed');
      const anyFailed = updatedItems.some(item => item.status === 'failed');

      // Get project ID from the first queue item
      const projectId = updatedItems[0]?.settings?.projectId;

      // Update final queue status
      await db.transaction(async (tx) => {
        // Update queue status
        await tx
          .update(articleQueues)
          .set({
            status: allCompleted ? 'completed' : anyFailed ? 'partial' : 'completed',
            completedAt: new Date(),
          })
          .where(eq(articleQueues.id, queueId));

        // Update project status if we have a project ID
        if (projectId) {
          await tx
            .update(projects)
            .set({
              status: allCompleted ? 'completed' : anyFailed ? 'partial' : 'completed',
              updatedAt: new Date()
            })
            .where(eq(projects.id, projectId as number));
        }
      });

      // Emit completion event
      this.eventEmitter.emit('completed', {
        queueId,
        status: allCompleted ? 'completed' : 'failed',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update queue with error
      await db
        .update(articleQueues)
        .set({
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
        })
        .where(eq(articleQueues.id, queueId));

      // Emit error event
      this.eventEmitter.emit('error', {
        queueId,
        error: error.message,
      });
    }
  }

  // Start the queue processor
  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (true) {
        // Find the next pending queue
        const [nextQueue] = await db
          .select()
          .from(articleQueues)
          .where(eq(articleQueues.status, 'pending'))
          .orderBy(articleQueues.createdAt)
          .limit(1);

        if (!nextQueue) {
          // No pending queues, wait for 5 seconds before checking again
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        // Process the queue
        await this.processQueue(nextQueue.id);
      }
    } catch (error) {
      console.error('Queue processor error:', error);
      this.isProcessing = false;
      // Restart the processor after a delay
      setTimeout(() => this.startQueueProcessor(), 5000);
    }
  }

  // Subscribe to queue events
  public onProgress(callback: (data: { queueId: number; progress: number; itemIndex: number }) => void) {
    this.eventEmitter.on('progress', callback);
  }

  public onCompleted(callback: (data: { queueId: number; status: string }) => void) {
    this.eventEmitter.on('completed', callback);
  }

  public onError(callback: (data: { queueId: number; error: string }) => void) {
    this.eventEmitter.on('error', callback);
  }

  // Alias methods for compatibility with existing code
  public async createQueue(options: { userId: number; totalItems: number; type?: string; batchName?: string }) {
    // Create the queue without items initially
    const [queue] = await db.insert(articleQueues).values({
      userId: options.userId,
      batchName: options.batchName,
      totalItems: 0, // Start with 0, will be updated when items are added
    }).returning();

    return queue;
  }

  public async addItems(queueId: number, items: QueueItem[]) {
    // Add items to existing queue
    await db.insert(articleQueueItems).values(
      items.map(item => ({
        queueId: queueId,
        keyword: item.keyword,
        settings: item.settings,
      }))
    );

    // Update total items count
    await db
      .update(articleQueues)
      .set({ totalItems: sql`${articleQueues.totalItems} + ${items.length}` })
      .where(eq(articleQueues.id, queueId));
  }
}

// Export singleton instance
export const queueManager = QueueManagerService.getInstance();
