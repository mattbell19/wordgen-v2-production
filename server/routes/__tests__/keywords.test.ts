import request from 'supertest';
import express from 'express';
import keywordRoutes from '../keywords';
import { researchKeywords } from '../../services/keyword.service';
import { db } from '../../db';

// Mock the keyword service
jest.mock('../../services/keyword.service', () => ({
  researchKeywords: jest.fn(),
}));

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../middlewares/authMiddleware', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
}));

// Mock team context utils
jest.mock('../../utils/team-context', () => ({
  getUserIdsForContext: jest.fn().mockResolvedValue([1]),
  getActiveContext: jest.fn().mockResolvedValue({ type: 'personal', id: 1 }),
}));

// Mock axios for RapidAPI tests
jest.mock('axios');

const app = express();
app.use(express.json());
app.use('/api/keywords', keywordRoutes);

describe('Keywords Routes', () => {
  const mockResearchKeywords = researchKeywords as jest.MockedFunction<typeof researchKeywords>;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/keywords/research', () => {
    it('should research keywords successfully', async () => {
      const mockKeywords = [
        {
          keyword: 'test keyword',
          searchVolume: 1000,
          difficulty: 50,
          competition: 65,
          relatedKeywords: [],
          monthlyVolume: []
        }
      ];

      mockResearchKeywords.mockResolvedValue(mockKeywords);

      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_question: 'test keyword',
          search_country: 'en-US'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockKeywords
      });
      expect(mockResearchKeywords).toHaveBeenCalledWith({
        search_question: 'test keyword',
        search_country: 'en-US'
      });
    });

    it('should return 400 when search_question is missing', async () => {
      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_country: 'en-US'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Search question is required'
      });
    });

    it('should return 400 when search_question is empty', async () => {
      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_question: '',
          search_country: 'en-US'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Search question is required'
      });
    });

    it('should return 400 when search_question is only whitespace', async () => {
      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_question: '   ',
          search_country: 'en-US'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Search question is required'
      });
    });

    it('should handle service errors', async () => {
      mockResearchKeywords.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_question: 'test keyword',
          search_country: 'en-US'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Service error'
      });
    });

    it('should use default country when not provided', async () => {
      const mockKeywords = [{ keyword: 'test', searchVolume: 100, difficulty: 30, competition: 40, relatedKeywords: [], monthlyVolume: [] }];
      mockResearchKeywords.mockResolvedValue(mockKeywords);

      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_question: 'test keyword'
        });

      expect(response.status).toBe(200);
      expect(mockResearchKeywords).toHaveBeenCalledWith({
        search_question: 'test keyword',
        search_country: 'en-US'
      });
    });

    it('should trim search_question', async () => {
      const mockKeywords = [{ keyword: 'test', searchVolume: 100, difficulty: 30, competition: 40, relatedKeywords: [], monthlyVolume: [] }];
      mockResearchKeywords.mockResolvedValue(mockKeywords);

      const response = await request(app)
        .post('/api/keywords/research')
        .send({
          search_question: '  test keyword  ',
          search_country: 'en-US'
        });

      expect(response.status).toBe(200);
      expect(mockResearchKeywords).toHaveBeenCalledWith({
        search_question: 'test keyword',
        search_country: 'en-US'
      });
    });
  });

  describe('GET /api/keywords/lists', () => {
    it('should get keyword lists successfully', async () => {
      const mockLists = [
        {
          id: 1,
          name: 'Test List',
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          savedKeywords: null
        }
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockLists)
          })
        })
      });

      const response = await request(app)
        .get('/api/keywords/lists');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should handle database errors', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const response = await request(app)
        .get('/api/keywords/lists');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('POST /api/keywords/lists', () => {
    it('should create keyword list successfully', async () => {
      const mockList = {
        id: 1,
        name: 'New List',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockList])
        })
      });

      const response = await request(app)
        .post('/api/keywords/lists')
        .send({
          name: 'New List'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: mockList
      });
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/keywords/lists')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'List name is required'
      });
    });

    it('should handle database errors', async () => {
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const response = await request(app)
        .post('/api/keywords/lists')
        .send({
          name: 'New List'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('DELETE /api/keywords/lists/:id', () => {
    it('should delete keyword list successfully', async () => {
      mockDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .delete('/api/keywords/lists/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'List deleted successfully'
      });
    });

    it('should return 400 for invalid list ID', async () => {
      const response = await request(app)
        .delete('/api/keywords/lists/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid list ID'
      });
    });

    it('should handle database errors', async () => {
      mockDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .delete('/api/keywords/lists/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Database error'
      });
    });
  });
});
