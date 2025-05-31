import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { QueueManagerService } from '../queue-manager.service';
import { ArticleQueueModel } from '../../models/article-queue.model';
import { ArticleService } from '../article.service';

// Mock ArticleService
jest.mock('../article.service');

describe('QueueManagerService', () => {
  let mongoServer: MongoMemoryServer;
  let queueManager: QueueManagerService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    queueManager = QueueManagerService.getInstance();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await ArticleQueueModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('createBatch', () => {
    it('should create a new batch successfully', async () => {
      const items = [
        {
          keyword: 'test keyword 1',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
        },
        {
          keyword: 'test keyword 2',
          settings: {
            wordCount: 800,
            tone: 'casual',
          },
        },
      ];

      const batch = await queueManager.createBatch('user123', items, 'Test Batch');

      expect(batch.userId).toBe('user123');
      expect(batch.items.length).toBe(2);
      expect(batch.status).toBe('pending');
      expect(batch.batchName).toBe('Test Batch');
      expect(batch.totalItems).toBe(2);
    });
  });

  describe('getQueue', () => {
    it('should retrieve a queue by ID', async () => {
      const items = [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
        },
      ];

      const batch = await queueManager.createBatch('user123', items);
      const retrieved = await queueManager.getQueue(batch._id);

      expect(retrieved._id.toString()).toBe(batch._id.toString());
      expect(retrieved.items.length).toBe(1);
    });

    it('should return null for non-existent queue', async () => {
      const retrieved = await queueManager.getQueue(new mongoose.Types.ObjectId().toString());
      expect(retrieved).toBeNull();
    });
  });

  describe('getUserQueues', () => {
    it('should retrieve all queues for a user', async () => {
      const items = [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
        },
      ];

      await queueManager.createBatch('user123', items, 'Batch 1');
      await queueManager.createBatch('user123', items, 'Batch 2');
      await queueManager.createBatch('user456', items, 'Other User Batch');

      const userQueues = await queueManager.getUserQueues('user123');
      expect(userQueues.length).toBe(2);
      expect(userQueues.every(q => q.userId === 'user123')).toBe(true);
    });
  });

  describe('Queue Processing', () => {
    it('should process queue items and update status', async () => {
      // Mock ArticleService.generateArticle to return successfully
      (ArticleService.prototype.generateArticle as jest.Mock).mockResolvedValue({
        _id: 'article123',
        content: 'Generated content',
      });

      const items = [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
        },
      ];

      // Create a new batch and wait for processing
      const batch = await queueManager.createBatch('user123', items);
      
      // Wait for processing to complete (this might need adjustment based on your implementation)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retrieve the updated queue
      const processedQueue = await queueManager.getQueue(batch._id);
      
      expect(processedQueue.status).toBe('completed');
      expect(processedQueue.items[0].status).toBe('completed');
      expect(processedQueue.items[0].articleId).toBe('article123');
    });

    it('should handle errors during processing', async () => {
      // Mock ArticleService.generateArticle to throw an error
      (ArticleService.prototype.generateArticle as jest.Mock).mockRejectedValue(
        new Error('Generation failed')
      );

      const items = [
        {
          keyword: 'test keyword',
          settings: {
            wordCount: 500,
            tone: 'professional',
          },
        },
      ];

      // Create a new batch and wait for processing
      const batch = await queueManager.createBatch('user123', items);
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retrieve the updated queue
      const processedQueue = await queueManager.getQueue(batch._id);
      
      expect(processedQueue.status).toBe('failed');
      expect(processedQueue.items[0].status).toBe('failed');
      expect(processedQueue.items[0].error).toBe('Generation failed');
    });
  });

  describe('Event Handling', () => {
    it('should emit progress events', (done) => {
      // Mock ArticleService.generateArticle to resolve after a delay
      (ArticleService.prototype.generateArticle as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ _id: 'article123' }), 100))
      );

      queueManager.onProgress(({ progress }) => {
        expect(progress).toBe(100);
        done();
      });

      queueManager.createBatch('user123', [{
        keyword: 'test keyword',
        settings: {
          wordCount: 500,
          tone: 'professional',
        },
      }]);
    });

    it('should emit completion events', (done) => {
      // Mock ArticleService.generateArticle to resolve immediately
      (ArticleService.prototype.generateArticle as jest.Mock).mockResolvedValue({
        _id: 'article123',
      });

      queueManager.onCompleted(({ status }) => {
        expect(status).toBe('completed');
        done();
      });

      queueManager.createBatch('user123', [{
        keyword: 'test keyword',
        settings: {
          wordCount: 500,
          tone: 'professional',
        },
      }]);
    });
  });
});
