import { ExternalLinkService, ExternalLink } from '../external-link.service';
import { web_search } from '../../lib/web-search';

// Mock the web_search function
jest.mock('../../lib/web-search');
const mockWebSearch = web_search as jest.MockedFunction<typeof web_search>;

describe('ExternalLinkService', () => {
  let service: ExternalLinkService;

  beforeEach(() => {
    service = new ExternalLinkService();
    jest.clearAllMocks();
  });

  describe('findLinkingOpportunities', () => {
    it('should return empty array on search error', async () => {
      mockWebSearch.mockRejectedValue(new Error('Search failed'));
      const results = await service.findLinkingOpportunities('test keyword');
      expect(results).toEqual([]);
    });

    it('should use cached results when available', async () => {
      // First call to populate cache
      const mockSearchResults = [
        {
          title: 'Test Article',
          link: 'https://example.com/article',
          snippet: 'A test article about the topic.'
        }
      ];
      mockWebSearch.mockResolvedValueOnce(mockSearchResults);

      await service.findLinkingOpportunities('cached keyword');

      // Second call should use cache
      mockWebSearch.mockClear(); // Clear the mock to verify it's not called again
      const cachedResults = await service.findLinkingOpportunities('cached keyword');

      expect(mockWebSearch).not.toHaveBeenCalled();
      expect(cachedResults.length).toBeGreaterThan(0);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      // First call to populate cache
      const mockSearchResults1 = [
        {
          title: 'First Article',
          link: 'https://example.com/first',
          snippet: 'The first article.'
        }
      ];
      mockWebSearch.mockResolvedValueOnce(mockSearchResults1);

      await service.findLinkingOpportunities('refresh keyword');

      // Second call with forceRefresh should not use cache
      const mockSearchResults2 = [
        {
          title: 'Updated Article',
          link: 'https://example.com/updated',
          snippet: 'An updated article.'
        }
      ];
      mockWebSearch.mockResolvedValueOnce(mockSearchResults2);

      const refreshedResults = await service.findLinkingOpportunities('refresh keyword', true);

      expect(mockWebSearch).toHaveBeenCalledTimes(2);
      expect(refreshedResults[0].title).toBe('Updated Article');
    });

    it('should return ranked and validated links', async () => {
      const mockSearchResults = [
        {
          title: 'Valid Research Article',
          link: 'https://nature.com/article/123',
          snippet: 'A comprehensive research study about the topic with detailed analysis.'
        },
        {
          title: 'Social Media Post',
          link: 'https://facebook.com/post/123',
          snippet: 'A short social media post'
        },
        {
          title: 'Academic Study',
          link: 'https://edu/research/456',
          snippet: 'An academic study with extensive research and findings.'
        }
      ];

      mockWebSearch.mockResolvedValue(mockSearchResults);
      const results = await service.findLinkingOpportunities('test keyword');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.url.includes('facebook.com'))).toBeFalsy();
      expect(results.some(r => r.url.includes('nature.com'))).toBeTruthy();
    });
  });

  describe('validateLinks', () => {
    it('should filter out social media links', async () => {
      const links: ExternalLink[] = [
        {
          url: 'https://facebook.com/post/123',
          title: 'Social Post',
          relevance: 0,
          authority: 0,
          snippet: 'A social media post'
        },
        {
          url: 'https://example.com/article/123',
          title: 'Valid Article',
          relevance: 0,
          authority: 0,
          snippet: 'A valid article'
        }
      ];

      const validated = await service.validateLinks(links);
      expect(validated.length).toBe(1);
      expect(validated[0].url).toBe('https://example.com/article/123');
    });

    it('should only accept https urls', async () => {
      const links: ExternalLink[] = [
        {
          url: 'http://example.com/article/123',
          title: 'HTTP Article',
          relevance: 0,
          authority: 0,
          snippet: 'An article with HTTP'
        },
        {
          url: 'https://example.com/article/456',
          title: 'HTTPS Article',
          relevance: 0,
          authority: 0,
          snippet: 'An article with HTTPS'
        }
      ];

      const validated = await service.validateLinks(links);
      expect(validated.length).toBe(1);
      expect(validated[0].url).toBe('https://example.com/article/456');
    });
  });

  describe('rankLinks', () => {
    it('should prioritize authoritative domains', async () => {
      const links: ExternalLink[] = [
        {
          url: 'https://example.com/article/123',
          title: 'Regular Article',
          relevance: 0,
          authority: 0,
          snippet: 'A regular article'
        },
        {
          url: 'https://nature.com/article/456',
          title: 'Scientific Article',
          relevance: 0,
          authority: 0,
          snippet: 'A scientific article'
        }
      ];

      const ranked = await service.rankLinks(links);
      expect(ranked[0].url).toBe('https://nature.com/article/456');
      expect(ranked[0].authority).toBe(1);
    });

    it('should calculate relevance based on content', async () => {
      const links: ExternalLink[] = [
        {
          url: 'https://example.com/article/123',
          title: 'Very Long and Detailed Article Title That Should Score Higher',
          relevance: 0,
          authority: 0,
          snippet: 'A very detailed and long article snippet that should receive a higher relevance score due to its length and comprehensive content.'
        },
        {
          url: 'https://example.com/page/456',
          title: 'Short Title',
          relevance: 0,
          authority: 0,
          snippet: 'Short snippet'
        }
      ];

      const ranked = await service.rankLinks(links);
      expect(ranked[0].url).toBe('https://example.com/article/123');
      expect(ranked[0].relevance).toBeGreaterThan(ranked[1].relevance);
    });
  });
});