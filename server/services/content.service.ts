import { db } from '../db';
import { articles } from '../db/schema';
import type { InferModel } from 'drizzle-orm';

type Article = InferModel<typeof articles>;

export async function createContent(data: {
  title: string;
  content: string;
  userId: number;
  teamId?: number;
  projectId?: number;
  wordCount: number;
  readingTime: number;
  settings: any;
  primaryKeyword?: string;
}): Promise<Article> {
  const [article] = await db.insert(articles)
    .values({
      title: data.title,
      content: data.content,
      userId: data.userId,
      teamId: data.teamId,
      projectId: data.projectId,
      wordCount: data.wordCount,
      readingTime: data.readingTime,
      creditsUsed: 1,
      settings: data.settings,
      primaryKeyword: data.primaryKeyword,
    })
    .returning();
  return article;
} 