import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { gscService } from '../gsc.service';
import { db } from '@db';
import { gscConnections, gscSites, gscKeywordTracking, gscPerformanceCache } from '@db/schema/gsc';
import { googleApiConfig } from '../../config/google-api';

// Mock the Google APIs
jest.mock('googleapis', () => {
  const mockAuth = {
    OAuth2: jest.fn().mockImplementation(() => ({
      generateAuthUrl: jest.fn().mockReturnValue('https://mock-auth-url.com'),
      getToken: jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expiry_date: Date.now() + 3600000,
          id_token: 'mock-id-token'
        }
      }),
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: jest.fn().mockReturnValue({
          email: 'test@example.com',
          picture: 'https://example.com/profile.jpg'
        })
      }),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({
        credentials: {
          access_token: 'mock-refreshed-token',
          expiry_date: Date.now() + 3600000
        }
      })
    }))
  };

  const mockWebmasters = {
    sites: {
      list: jest.fn().mockResolvedValue({
        data: {
          siteEntry: [
            { siteUrl: 'https://example.com', permissionLevel: 'OWNER' },
            { siteUrl: 'https://test.com', permissionLevel: 'OWNER' }
          ]
        }
      })
    },
    searchanalytics: {
      query: jest.fn().mockResolvedValue({
        data: {
          rows: [
            {
              keys: ['keyword1'],
              clicks: 100,
              impressions: 1000,
              ctr: 0.1,
              position: 5.2
            },
            {
              keys: ['keyword2'],
              clicks: 50,
              impressions: 500,
              ctr: 0.1,
              position: 8.5
            }
          ]
        }
      })
    }
  };

  return {
    google: {
      auth: mockAuth,
      webmasters: jest.fn().mockReturnValue(mockWebmasters)
    }
  };
});

// Mock the database
jest.mock('@db', () => {
  return {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([
        {
          id: 1,
          userId: 1,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 3600000),
          email: 'test@example.com',
          profilePicture: 'https://example.com/profile.jpg',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
    }
  };
});

describe('GSC Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid auth URL with state parameter', () => {
      const userId = '123';
      const authUrl = gscService.generateAuthUrl(userId);

      expect(authUrl).toBe('https://mock-auth-url.com');
    });
  });

  describe('getTokensFromCode', () => {
    it('should exchange code for tokens', async () => {
      const code = 'mock-auth-code';
      const tokens = await gscService.getTokensFromCode(code);

      expect(tokens).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: expect.any(Number),
        id_token: 'mock-id-token'
      });
    });
  });

  describe('getUserInfo', () => {
    it('should get user info from ID token', async () => {
      const idToken = 'mock-id-token';
      const userInfo = await gscService.getUserInfo(idToken);

      expect(userInfo).toEqual({
        email: 'test@example.com',
        picture: 'https://example.com/profile.jpg'
      });
    });
  });

  describe('saveUserTokens', () => {
    it('should update tokens if user connection exists', async () => {
      // Mock existing connection
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: '123',
            accessToken: 'old-token',
            refreshToken: 'old-refresh-token',
            expiresAt: new Date(),
            email: 'test@example.com',
            profilePicture: 'https://example.com/profile.jpg'
          }
        ])
      }));

      await gscService.saveUserTokens(
        '123',
        'new-token',
        'new-refresh-token',
        Date.now() + 3600000,
        'test@example.com',
        'https://example.com/new-profile.jpg'
      );

      expect(db.update).toHaveBeenCalledWith(gscConnections);
      expect(db.set).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      }));
    });

    it('should create new connection if user connection does not exist', async () => {
      // Mock no existing connection
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      }));

      await gscService.saveUserTokens(
        '123',
        'new-token',
        'new-refresh-token',
        Date.now() + 3600000,
        'test@example.com',
        'https://example.com/profile.jpg'
      );

      expect(db.insert).toHaveBeenCalledWith(gscConnections);
      expect(db.values).toHaveBeenCalledWith(expect.objectContaining({
        userId: '123',
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token'
      }));
    });
  });

  describe('getSitesForUser', () => {
    it('should fetch and save sites for a user', async () => {
      // Mock existing connection
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: '123',
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000)
          }
        ])
      }));

      // Mock no existing sites
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      }));

      // Mock sites after saving
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: '123',
            siteUrl: 'https://example.com',
            permissionLevel: 'OWNER',
            isDefault: true
          },
          {
            id: 2,
            userId: '123',
            siteUrl: 'https://test.com',
            permissionLevel: 'OWNER',
            isDefault: false
          }
        ])
      }));

      const sites = await gscService.getSitesForUser('123');

      expect(sites).toHaveLength(2);
      expect(sites[0].siteUrl).toBe('https://example.com');
      expect(sites[0].isDefault).toBe(true);
    });
  });

  describe('getSearchPerformance', () => {
    it('should fetch search performance data', async () => {
      // Mock default site
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: '123',
            siteUrl: 'https://example.com',
            isDefault: true
          }
        ])
      }));

      // Mock no cache
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      }));

      // Mock connection
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: '123',
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000)
          }
        ])
      }));

      const performanceData = await gscService.getSearchPerformance('123');

      expect(performanceData.rows).toHaveLength(2);
      expect(performanceData.rows[0].keys[0]).toBe('keyword1');
      expect(performanceData.rows[0].clicks).toBe(100);
    });
  });

  describe('isUserConnected', () => {
    it('should return true if user has a connection', async () => {
      // Mock existing connection
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: '123'
          }
        ])
      }));

      const isConnected = await gscService.isUserConnected('123');

      expect(isConnected).toBe(true);
    });

    it('should return false if user has no connection', async () => {
      // Mock no existing connection
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      }));

      const isConnected = await gscService.isUserConnected('123');

      expect(isConnected).toBe(false);
    });
  });
});
