import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ArticleQueueModel, ArticleQueue } from '../article-queue.model';

describe('ArticleQueue Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await ArticleQueueModel.deleteMany({});
  });

  it('should create a new queue successfully', async () => {
    const queueData = {
      userId: 'user123',
      items: [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
          status: 'pending',
        },
      ],
      totalItems: 1,
    };

    const queue = await ArticleQueueModel.create(queueData);

    expect(queue.userId).toBe(queueData.userId);
    expect(queue.items.length).toBe(1);
    expect(queue.status).toBe('pending');
    expect(queue.progress).toBe(0);
    expect(queue.completedItems).toBe(0);
    expect(queue.failedItems).toBe(0);
  });

  it('should require userId', async () => {
    const queueData = {
      items: [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
          status: 'pending',
        },
      ],
      totalItems: 1,
    };

    await expect(ArticleQueueModel.create(queueData)).rejects.toThrow();
  });

  it('should validate item settings', async () => {
    const queueData = {
      userId: 'user123',
      items: [
        {
          keyword: 'test keyword',
          settings: {
            // Missing required wordCount
            tone: 'professional',
          },
          status: 'pending',
        },
      ],
      totalItems: 1,
    };

    await expect(ArticleQueueModel.create(queueData)).rejects.toThrow();
  });

  it('should update queue status and progress', async () => {
    const queue = await ArticleQueueModel.create({
      userId: 'user123',
      items: [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
          status: 'pending',
        },
      ],
      totalItems: 1,
    });

    await ArticleQueueModel.updateOne(
      { _id: queue._id },
      { 
        $set: { 
          status: 'processing',
          progress: 50,
          'items.0.status': 'processing'
        }
      }
    );

    const updatedQueue = await ArticleQueueModel.findById(queue._id);
    expect(updatedQueue.status).toBe('processing');
    expect(updatedQueue.progress).toBe(50);
    expect(updatedQueue.items[0].status).toBe('processing');
  });

  it('should handle completion timestamps', async () => {
    const queue = await ArticleQueueModel.create({
      userId: 'user123',
      items: [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
          status: 'pending',
        },
      ],
      totalItems: 1,
    });

    const completedAt = new Date();
    await ArticleQueueModel.updateOne(
      { _id: queue._id },
      { 
        $set: { 
          status: 'completed',
          progress: 100,
          completedAt,
          'items.0.status': 'completed'
        }
      }
    );

    const updatedQueue = await ArticleQueueModel.findById(queue._id);
    expect(updatedQueue.status).toBe('completed');
    expect(updatedQueue.progress).toBe(100);
    expect(updatedQueue.completedAt).toEqual(completedAt);
    expect(updatedQueue.items[0].status).toBe('completed');
  });
});
