import { InternalLinkService, InternalLink } from '../internal-link.service';
import axios from 'axios';
import { DOMParser } from '@xmldom/xmldom';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock DOMParser
jest.mock('@xmldom/xmldom', () => {
  return {
    DOMParser: jest.fn().mockImplementation(() => ({
      parseFromString: jest.fn()
    }))
  };
});

describe('InternalLinkService', () => {
  let service: InternalLinkService;
  const userId = 123;

  beforeEach(() => {
    service = new InternalLinkService();
    jest.clearAllMocks();
  });

  describe('parseSitemap', () => {
    it('should extract URLs from sitemap XML', async () => {
      // Mock XML parsing
      const mockXmlDoc = {
        getElementsByTagName: jest.fn().mockImplementation((tagName) => {
          if (tagName === 'url') {
            return [
              {
                getElementsByTagName: jest.fn().mockImplementation((innerTag) => {
                  if (innerTag === 'loc') {
                    return [{ textContent: 'https://example.com/page1' }];
                  }
                  return [];
                })
              },
              {
                getElementsByTagName: jest.fn().mockImplementation((innerTag) => {
                  if (innerTag === 'loc') {
                    return [{ textContent: 'https://example.com/page2' }];
                  }
                  return [];
                })
              }
            ];
          }
          return [];
        })
      };

      // Mock DOMParser implementation
      const mockParser = {
        parseFromString: jest.fn().mockReturnValue(mockXmlDoc)
      };
      (DOMParser as jest.Mock).mockImplementation(() => mockParser);

      const urls = await service.parseSitemap('<urlset><url><loc>https://example.com/page1</loc></url><url><loc>https://example.com/page2</loc></url></urlset>');
      
      expect(urls).toEqual(['https://example.com/page1', 'https://example.com/page2']);
      expect(mockParser.parseFromString).toHaveBeenCalledWith(expect.any(String), 'text/xml');
    });

    it('should handle parsing errors gracefully', async () => {
      // Mock parser to throw an error
      const mockParser = {
        parseFromString: jest.fn().mockImplementation(() => {
          throw new Error('XML parsing error');
        })
      };
      (DOMParser as jest.Mock).mockImplementation(() => mockParser);

      const urls = await service.parseSitemap('invalid xml');
      
      expect(urls).toEqual([]);
      expect(mockParser.parseFromString).toHaveBeenCalled();
    });
  });

  describe('analyzePageContent', () => {
    it('should extract topic from page title and h1', async () => {
      // Mock axios response
      mockAxios.get.mockResolvedValue({
        data: `
          <html>
            <head>
              <title>Test Page - Example Website</title>
              <meta name="description" content="This is a test page description">
            </head>
            <body>
              <h1>Test Page Heading</h1>
              <p>Content here</p>
            </body>
          </html>
        `
      });

      const result = await service.analyzePageContent('https://example.com/test');
      
      expect(result).toEqual({
        url: 'https://example.com/test',
        topic: 'Test Page Heading'
      });
      expect(mockAxios.get).toHaveBeenCalledWith('https://example.com/test');
    });

    it('should fall back to title when h1 is not available', async () => {
      // Mock axios response with no h1
      mockAxios.get.mockResolvedValue({
        data: `
          <html>
            <head>
              <title>Test Page - Example Website</title>
            </head>
            <body>
              <p>Content here</p>
            </body>
          </html>
        `
      });

      const result = await service.analyzePageContent('https://example.com/test');
      
      expect(result).toEqual({
        url: 'https://example.com/test',
        topic: 'Test Page'
      });
    });

    it('should handle request errors gracefully', async () => {
      // Mock axios to throw an error
      mockAxios.get.mockRejectedValue(new Error('Request failed'));

      const result = await service.analyzePageContent('https://example.com/error');
      
      expect(result).toEqual({
        url: 'https://example.com/error',
        topic: 'error'
      });
    });
  });

  describe('storeUserLinks', () => {
    it('should process sitemap and store links for a user', async () => {
      // Mock sitemap fetch
      mockAxios.get.mockResolvedValueOnce({
        data: '<urlset><url><loc>https://example.com/page1</loc></url><url><loc>https://example.com/page2</loc></url></urlset>'
      });

      // Mock parseSitemap
      jest.spyOn(service, 'parseSitemap').mockResolvedValue([
        'https://example.com/page1',
        'https://example.com/page2'
      ]);

      // Mock analyzePageContent
      jest.spyOn(service, 'analyzePageContent')
        .mockResolvedValueOnce({ url: 'https://example.com/page1', topic: 'Page 1' })
        .mockResolvedValueOnce({ url: 'https://example.com/page2', topic: 'Page 2' });

      const links = await service.storeUserLinks(userId, 'https://example.com/sitemap.xml');
      
      expect(links).toHaveLength(2);
      expect(links[0]).toEqual({
        url: 'https://example.com/page1',
        topic: 'Page 1',
        relevance: 0
      });
      expect(links[1]).toEqual({
        url: 'https://example.com/page2',
        topic: 'Page 2',
        relevance: 0
      });
      
      // Verify the links are stored for the user
      const relevantLinks = await service.findRelevantLinks(userId, '', 10);
      expect(relevantLinks).toHaveLength(2);
    });

    it('should handle sitemap processing errors gracefully', async () => {
      // Mock sitemap fetch to fail
      mockAxios.get.mockRejectedValue(new Error('Sitemap fetch failed'));

      const links = await service.storeUserLinks(userId, 'https://example.com/sitemap.xml');
      
      expect(links).toEqual([]);
    });
  });

  describe('findRelevantLinks', () => {
    beforeEach(async () => {
      // Set up some test links
      const testLinks: InternalLink[] = [
        { url: 'https://example.com/seo', topic: 'SEO Optimization Guide', relevance: 0 },
        { url: 'https://example.com/marketing', topic: 'Digital Marketing Tips', relevance: 0 },
        { url: 'https://example.com/content', topic: 'Content Creation Strategies', relevance: 0 }
      ];
      
      // Manually set the links for the user
      (service as any).userLinks.set(userId, testLinks);
    });

    it('should find links relevant to the keyword', async () => {
      const links = await service.findRelevantLinks(userId, 'SEO optimization', 3);
      
      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('https://example.com/seo');
      expect(links[0].relevance).toBeGreaterThan(0);
    });

    it('should return multiple links sorted by relevance', async () => {
      const links = await service.findRelevantLinks(userId, 'content marketing', 3);
      
      expect(links).toHaveLength(2);
      // First link should be more relevant than second
      expect(links[0].relevance).toBeGreaterThan(links[1].relevance);
    });

    it('should limit the number of returned links', async () => {
      // Add more test links
      const currentLinks = (service as any).userLinks.get(userId) || [];
      const newLinks = [
        ...currentLinks,
        { url: 'https://example.com/seo-advanced', topic: 'Advanced SEO Techniques', relevance: 0 },
        { url: 'https://example.com/seo-basics', topic: 'SEO Basics for Beginners', relevance: 0 }
      ];
      (service as any).userLinks.set(userId, newLinks);
      
      const links = await service.findRelevantLinks(userId, 'SEO', 2);
      
      expect(links).toHaveLength(2);
    });

    it('should return empty array when no links match', async () => {
      const links = await service.findRelevantLinks(userId, 'unrelated topic', 3);
      
      expect(links).toEqual([]);
    });

    it('should return empty array when user has no links', async () => {
      const nonExistentUserId = 999;
      const links = await service.findRelevantLinks(nonExistentUserId, 'SEO', 3);
      
      expect(links).toEqual([]);
    });
  });
});
