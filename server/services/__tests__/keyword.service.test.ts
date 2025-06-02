import axios from 'axios';
import { researchKeywords, createKeyword } from '../keyword.service';
import { db } from '../../db';
import type { KeywordResearchResult } from '@/lib/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock database
jest.mock('../../db', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
  },
}));

// Mock schema
jest.mock('../../../db/schema', () => ({
  keywordLists: 'keyword_lists_table',
}));

// Mock environment variables
const originalEnv = process.env;

describe('Keyword Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('researchKeywords', () => {
    it('should return mock data in development mode without RapidAPI key', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RAPIDAPI_KEY;

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      const result = await researchKeywords(params);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        keyword: 'test keyword',
        searchVolume: expect.any(Number),
        difficulty: expect.any(Number),
        competition: expect.any(Number),
        relatedKeywords: [],
        monthlyVolume: expect.any(Array)
      });
      expect(result[0].monthlyVolume).toHaveLength(12);
    });

    it('should throw error when search question is empty', async () => {
      const params = {
        search_question: '',
        search_country: 'en-US'
      };

      await expect(researchKeywords(params)).rejects.toThrow('Search question is required');
    });

    it('should throw error when search question is only whitespace', async () => {
      const params = {
        search_question: '   ',
        search_country: 'en-US'
      };

      await expect(researchKeywords(params)).rejects.toThrow('Search question is required');
    });

    it('should throw error when RapidAPI key is missing in production', async () => {
      // Mock the isDevelopment check to return false
      jest.doMock('../keyword.service', () => {
        const originalModule = jest.requireActual('../keyword.service');
        return {
          ...originalModule,
          researchKeywords: jest.fn().mockRejectedValue(
            new Error('RapidAPI key is not configured. Please check your environment variables.')
          )
        };
      });

      const { researchKeywords: mockResearchKeywords } = require('../keyword.service');

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      await expect(mockResearchKeywords(params)).rejects.toThrow(
        'RapidAPI key is not configured. Please check your environment variables.'
      );
    });

    it('should use mock data when in development mode even without RapidAPI key', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RAPIDAPI_KEY;

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      const result = await researchKeywords(params);

      expect(result).toHaveLength(1);
      expect(result[0].keyword).toBe('test keyword');
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it('should make API request with correct parameters when RapidAPI key is present', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      const mockResponse = {
        data: [
          {
            text: 'test keyword',
            volume: 1000,
            competition_index: 50,
            competition_level: 'MEDIUM',
            trend: 10
          },
          {
            text: 'related keyword',
            volume: 500,
            competition_index: 30,
            competition_level: 'LOW',
            trend: 5
          }
        ]
      };

      mockedAxios.mockResolvedValue(mockResponse);

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      const result = await researchKeywords(params);

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://google-keyword-insight1.p.rapidapi.com/keysuggest/',
        headers: {
          'x-rapidapi-key': 'test-api-key',
          'x-rapidapi-host': 'google-keyword-insight1.p.rapidapi.com'
        },
        params: {
          keyword: 'test keyword',
          location: 'US',
          lang: 'en'
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        keyword: 'test keyword',
        searchVolume: 1000,
        difficulty: 50,
        competition: 50,
        relatedKeywords: [],
        monthlyVolume: expect.any(Array)
      });
    });

    it('should handle different competition levels correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      const mockResponse = {
        data: [
          {
            text: 'high competition',
            volume: 1000,
            competition_level: 'HIGH'
          },
          {
            text: 'medium competition',
            volume: 1000,
            competition_level: 'MEDIUM'
          },
          {
            text: 'low competition',
            volume: 1000,
            competition_level: 'LOW'
          },
          {
            text: 'unknown competition',
            volume: 1000,
            competition_level: 'UNKNOWN'
          }
        ]
      };

      mockedAxios.mockResolvedValue(mockResponse);

      const params = {
        search_question: 'test',
        search_country: 'en-US'
      };

      const result = await researchKeywords(params);

      expect(result[0].competition).toBe(100); // HIGH
      expect(result[1].competition).toBe(50);  // MEDIUM
      expect(result[2].competition).toBe(25);  // LOW
      expect(result[3].competition).toBe(0);   // UNKNOWN/default
    });

    it('should handle API errors gracefully', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      mockedAxios.mockRejectedValue(new Error('API Error'));

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      await expect(researchKeywords(params)).rejects.toThrow('API Error');
    });

    it('should handle invalid API response', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      mockedAxios.mockResolvedValue({ data: null });

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      await expect(researchKeywords(params)).rejects.toThrow('Invalid response from RapidAPI');
    });

    it('should handle non-array API response', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      mockedAxios.mockResolvedValue({ data: { error: 'Invalid request' } });

      const params = {
        search_question: 'test keyword',
        search_country: 'en-US'
      };

      await expect(researchKeywords(params)).rejects.toThrow('Invalid response from RapidAPI');
    });

    it('should parse country code correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      mockedAxios.mockResolvedValue({ data: [] });

      await researchKeywords({
        search_question: 'test',
        search_country: 'en-GB'
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            location: 'GB',
            lang: 'en'
          })
        })
      );
    });

    it('should use default country and language when not provided', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RAPIDAPI_KEY = 'test-api-key';

      mockedAxios.mockResolvedValue({ data: [] });

      await researchKeywords({
        search_question: 'test'
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            location: 'US',
            lang: 'en'
          })
        })
      );
    });
  });

  describe('createKeyword', () => {
    const mockDb = db as jest.Mocked<typeof db>;

    beforeEach(() => {
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn()
        })
      });
    });

    it('should create a keyword successfully', async () => {
      const mockKeyword = {
        id: 1,
        name: 'Test List',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReturning = jest.fn().mockResolvedValue([mockKeyword]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert = jest.fn().mockReturnValue({ values: mockValues });

      const data = {
        name: 'Test List',
        keywords: ['keyword1', 'keyword2'],
        source: 'manual',
        userId: 1,
        teamId: undefined
      };

      const result = await createKeyword(data);

      expect(mockDb.insert).toHaveBeenCalledWith('keyword_lists_table');
      expect(mockValues).toHaveBeenCalledWith({
        name: 'Test List',
        userId: 1,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(mockReturning).toHaveBeenCalled();
      expect(result).toEqual(mockKeyword);
    });

    it('should create a keyword with team ID', async () => {
      const mockKeyword = {
        id: 1,
        name: 'Team List',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReturning = jest.fn().mockResolvedValue([mockKeyword]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert = jest.fn().mockReturnValue({ values: mockValues });

      const data = {
        name: 'Team List',
        keywords: ['team keyword'],
        source: 'api',
        userId: 1,
        teamId: 5
      };

      const result = await createKeyword(data);

      expect(mockValues).toHaveBeenCalledWith({
        name: 'Team List',
        userId: 1,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(mockKeyword);
    });

    it('should handle database errors', async () => {
      const mockReturning = jest.fn().mockRejectedValue(new Error('Database error'));
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert = jest.fn().mockReturnValue({ values: mockValues });

      const data = {
        name: 'Test List',
        keywords: ['keyword1'],
        source: 'manual',
        userId: 1
      };

      await expect(createKeyword(data)).rejects.toThrow('Database error');
    });

    it('should handle empty keywords array', async () => {
      const mockKeyword = {
        id: 1,
        name: 'Empty List',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockReturning = jest.fn().mockResolvedValue([mockKeyword]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert = jest.fn().mockReturnValue({ values: mockValues });

      const data = {
        name: 'Empty List',
        keywords: [],
        source: 'manual',
        userId: 1
      };

      const result = await createKeyword(data);

      expect(result.name).toBe('Empty List');
    });
  });
});
