import { Request, Response } from 'express';
import { articleRoutes } from '../articles';
import { db } from '../../../db';
import { articles } from '@db/schema';
import { eq } from 'drizzle-orm';

// Mock the database
jest.mock('../../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
  pingDb: jest.fn(),
}));

describe('Article Routes', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus,
    };
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('PATCH /:id', () => {
    const mockArticle = {
      id: 20,
      title: 'Test Article',
      content: '<h1>Test</h1><p>Content</p>',
      userId: 1,
      wordCount: 100,
      readingTime: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockReq = {
        params: { id: '20' },
        user: { id: 1 },
        body: {
          content: '<h1>Updated Test</h1><p>New content here</p>',
        },
      };
    });

    it('should update article content successfully', async () => {
      // Mock article exists and belongs to user
      (db.select as jest.Mock).mockResolvedValueOnce([mockArticle]);
      
      // Mock update success
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              ...mockArticle,
              content: mockReq.body.content,
              wordCount: 4,
              readingTime: 1,
              updatedAt: expect.any(Date),
            }]),
          }),
        }),
      });

      await articleRoutes.handle(mockReq as Request, mockRes as Response);

      expect(db.select).toHaveBeenCalledWith();
      expect(db.select().from).toHaveBeenCalledWith(articles);
      expect(db.select().from().where).toHaveBeenCalledWith(
        eq(articles.id, 20),
        eq(articles.userId, 1)
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          content: mockReq.body.content,
          wordCount: 4,
          readingTime: 1,
        }),
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await articleRoutes.handle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should return 404 if article is not found', async () => {
      (db.select as jest.Mock).mockResolvedValueOnce([]);

      await articleRoutes.handle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Article not found',
        message: "The article you're trying to update cannot be found or you don't have permission to edit it."
      });
    });

    it('should return 400 if content is missing', async () => {
      mockReq.body = {};

      await articleRoutes.handle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Content is required',
      });
    });

    it('should return 400 if article ID is invalid', async () => {
      mockReq.params = { id: 'invalid' };

      await articleRoutes.handle(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid article ID',
      });
    });

    it('should calculate word count and reading time correctly', async () => {
      (db.select as jest.Mock).mockResolvedValueOnce([mockArticle]);
      
      mockReq.body.content = '<p>This is a test article with exactly ten words here.</p>';
      
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              ...mockArticle,
              content: mockReq.body.content,
              wordCount: 10,
              readingTime: 1,
              updatedAt: expect.any(Date),
            }]),
          }),
        }),
      });

      await articleRoutes.handle(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          wordCount: 10,
          readingTime: 1,
        }),
      });
    });
  });
}); 