import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import gscRoutes from '../gsc';
import { gscService } from '../../services/gsc.service';
import ApiResponse from '../../lib/api-response';

// Mock the GSC service
jest.mock('../../services/gsc.service', () => ({
  gscService: {
    generateAuthUrl: jest.fn().mockReturnValue('https://mock-auth-url.com'),
    getTokensFromCode: jest.fn().mockResolvedValue({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600000,
      id_token: 'mock-id-token'
    }),
    getUserInfo: jest.fn().mockResolvedValue({
      email: 'test@example.com',
      picture: 'https://example.com/profile.jpg'
    }),
    saveUserTokens: jest.fn().mockResolvedValue(undefined),
    getSitesForUser: jest.fn().mockResolvedValue([
      {
        id: 1,
        userId: '123',
        siteUrl: 'https://example.com',
        permissionLevel: 'OWNER',
        isDefault: true
      }
    ]),
    setDefaultSite: jest.fn().mockResolvedValue(undefined),
    getSearchPerformance: jest.fn().mockResolvedValue({
      rows: [
        {
          keys: ['keyword1'],
          clicks: 100,
          impressions: 1000,
          ctr: 0.1,
          position: 5.2
        }
      ]
    }),
    getTopKeywords: jest.fn().mockResolvedValue([
      {
        keys: ['keyword1'],
        clicks: 100,
        impressions: 1000,
        ctr: 0.1,
        position: 5.2
      }
    ]),
    getTopPages: jest.fn().mockResolvedValue([
      {
        keys: ['/page1'],
        clicks: 100,
        impressions: 1000,
        ctr: 0.1,
        position: 5.2
      }
    ]),
    isUserConnected: jest.fn().mockResolvedValue(true),
    disconnectUser: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock the API response
jest.mock('../../lib/api-response', () => ({
  default: {
    success: jest.fn().mockImplementation((res, data, message) => {
      return res.json({ success: true, data, message });
    }),
    unauthorized: jest.fn().mockImplementation((res, message, errorCode) => {
      return res.status(401).json({ success: false, message, error: errorCode });
    }),
    badRequest: jest.fn().mockImplementation((res, message, errorCode) => {
      return res.status(400).json({ success: false, message, error: errorCode });
    }),
    serverError: jest.fn().mockImplementation((res, message, errorCode) => {
      return res.status(500).json({ success: false, message, error: errorCode });
    })
  }
}));

// Mock the auth middleware
jest.mock('../../middleware/authMiddleware', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: '123' };
    next();
  }
}));

describe('GSC Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/gsc', gscRoutes);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/gsc/auth', () => {
    it('should return an auth URL', async () => {
      const response = await request(app).get('/api/gsc/auth');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBe('https://mock-auth-url.com');
      expect(gscService.generateAuthUrl).toHaveBeenCalledWith('123');
    });
  });

  describe('GET /api/gsc/callback', () => {
    it('should handle OAuth callback and redirect', async () => {
      const response = await request(app)
        .get('/api/gsc/callback')
        .query({
          code: 'mock-auth-code',
          state: Buffer.from(JSON.stringify({ userId: '123' })).toString('base64')
        });

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toBe('/dashboard/search-console?success=true');
      expect(gscService.getTokensFromCode).toHaveBeenCalledWith('mock-auth-code');
      expect(gscService.getUserInfo).toHaveBeenCalledWith('mock-id-token');
      expect(gscService.saveUserTokens).toHaveBeenCalled();
      expect(gscService.getSitesForUser).toHaveBeenCalledWith('123');
    });

    it('should handle missing parameters', async () => {
      const response = await request(app).get('/api/gsc/callback');

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toBe('/dashboard/search-console?error=missing_params');
    });
  });

  describe('GET /api/gsc/status', () => {
    it('should return connection status', async () => {
      const response = await request(app).get('/api/gsc/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isConnected).toBe(true);
      expect(gscService.isUserConnected).toHaveBeenCalledWith('123');
    });
  });

  describe('POST /api/gsc/disconnect', () => {
    it('should disconnect user from GSC', async () => {
      const response = await request(app).post('/api/gsc/disconnect');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(gscService.disconnectUser).toHaveBeenCalledWith('123');
    });
  });

  describe('GET /api/gsc/sites', () => {
    it('should return user sites', async () => {
      const response = await request(app).get('/api/gsc/sites');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sites).toHaveLength(1);
      expect(response.body.data.sites[0].siteUrl).toBe('https://example.com');
      expect(gscService.getSitesForUser).toHaveBeenCalledWith('123');
    });

    it('should handle user not connected', async () => {
      (.*as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app).get('/api/gsc/sites');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('GSC_NOT_CONNECTED');
    });
  });

  describe('POST /api/gsc/sites/default', () => {
    it('should set default site', async () => {
      const response = await request(app)
        .post('/api/gsc/sites/default')
        .send({ siteId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(gscService.setDefaultSite).toHaveBeenCalledWith('123', 1);
    });

    it('should handle missing siteId', async () => {
      const response = await request(app)
        .post('/api/gsc/sites/default')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_SITE_ID');
    });
  });

  describe('GET /api/gsc/performance', () => {
    it('should return performance data', async () => {
      const response = await request(app).get('/api/gsc/performance');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rows).toHaveLength(1);
      expect(response.body.data.rows[0].keys[0]).toBe('keyword1');
      expect(gscService.getSearchPerformance).toHaveBeenCalledWith(
        '123',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/gsc/performance')
        .query({
          siteId: '1',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          dimensions: 'query,page',
          rowLimit: '100'
        });

      expect(response.status).toBe(200);
      expect(gscService.getSearchPerformance).toHaveBeenCalledWith(
        '123',
        1,
        '2023-01-01',
        '2023-01-31',
        ['query', 'page'],
        100
      );
    });

    it('should handle user not connected', async () => {
      (.*as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app).get('/api/gsc/performance');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('GSC_NOT_CONNECTED');
    });
  });

  describe('GET /api/gsc/keywords', () => {
    it('should return top keywords', async () => {
      const response = await request(app).get('/api/gsc/keywords');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.keywords).toHaveLength(1);
      expect(response.body.data.keywords[0].keys[0]).toBe('keyword1');
      expect(gscService.getTopKeywords).toHaveBeenCalledWith(
        '123',
        undefined,
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe('GET /api/gsc/pages', () => {
    it('should return top pages', async () => {
      const response = await request(app).get('/api/gsc/pages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pages).toHaveLength(1);
      expect(response.body.data.pages[0].keys[0]).toBe('/page1');
      expect(gscService.getTopPages).toHaveBeenCalledWith(
        '123',
        undefined,
        undefined,
        undefined,
        undefined
      );
    });
  });
});
