import { web_search } from '../lib/web-search';

export interface ExternalLink {
  url: string;
  title: string;
  relevance: number;
  authority: number;
  snippet: string;
}

export class ExternalLinkService {
  private searchCache: Map<string, {timestamp: number, results: ExternalLink[]}> = new Map();
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  private static readonly AUTHORITY_DOMAINS = [
    'wikipedia.org',
    'gov.uk',
    'edu',
    'ac.uk',
    'nature.com',
    'sciencedirect.com',
    'scholar.google.com',
    'who.int',
    'un.org',
    'europa.eu'
  ];

  private static readonly EXCLUDED_DOMAINS = [
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'pinterest.com',
    'youtube.com',
    'tiktok.com'
  ];

  async findLinkingOpportunities(keyword: string, forceRefresh: boolean = false): Promise<ExternalLink[]> {
    // Normalize keyword for cache key
    const cacheKey = keyword.toLowerCase().trim();

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResult = this.searchCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < this.CACHE_TTL) {
        console.log('Using cached search results for:', keyword);
        return cachedResult.results;
      }
    }

    try {
      // Perform web search for relevant content
      const searchResults = await web_search(keyword);

      // Transform and validate search results
      const links = await this.transformSearchResults(searchResults);

      // Validate and rank the links
      const validatedLinks = await this.validateLinks(links);
      const rankedLinks = await this.rankLinks(validatedLinks);

      // Cache the results
      this.searchCache.set(cacheKey, {
        timestamp: Date.now(),
        results: rankedLinks
      });

      return rankedLinks;
    } catch (error) {
      console.error('Error finding linking opportunities:', error);
      return [];
    }
  }

  private async transformSearchResults(searchResults: any[]): Promise<ExternalLink[]> {
    return searchResults.map(result => ({
      url: result.link,
      title: result.title,
      relevance: 0, // Will be calculated in rankLinks
      authority: 0, // Will be calculated in rankLinks
      snippet: result.snippet
    }));
  }

  async validateLinks(links: ExternalLink[]): Promise<ExternalLink[]> {
    return links.filter(link => {
      try {
        const url = new URL(link.url);
        const domain = url.hostname.toLowerCase();

        // Exclude social media and certain domains
        if (ExternalLinkService.EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded))) {
          return false;
        }

        // Basic URL validation
        return url.protocol === 'https:';
      } catch {
        return false;
      }
    });
  }

  async rankLinks(links: ExternalLink[]): Promise<ExternalLink[]> {
    return links.map(link => {
      const url = new URL(link.url);
      const domain = url.hostname.toLowerCase();

      // Calculate authority score
      let authorityScore = 0;
      if (ExternalLinkService.AUTHORITY_DOMAINS.some(auth => domain.includes(auth))) {
        authorityScore = 1;
      }

      // Calculate relevance score based on title and snippet match
      const relevanceScore = this.calculateRelevanceScore(link);

      return {
        ...link,
        relevance: relevanceScore,
        authority: authorityScore
      };
    })
    .sort((a, b) => {
      // Sort by combined score (authority * 2 + relevance)
      const scoreA = (a.authority * 2) + a.relevance;
      const scoreB = (b.authority * 2) + b.relevance;
      return scoreB - scoreA;
    })
    .slice(0, 5); // Return top 5 results
  }

  private calculateRelevanceScore(link: ExternalLink): number {
    // Simple relevance scoring based on content length and structure
    let score = 0;

    // Title has substance (not too short)
    if (link.title && link.title.length > 30) {
      score += 0.3;
    }

    // Snippet has substance
    if (link.snippet && link.snippet.length > 100) {
      score += 0.4;
    }

    // URL structure suggests article/content
    if (link.url.includes('/article/') ||
        link.url.includes('/research/') ||
        link.url.includes('/study/')) {
      score += 0.3;
    }

    return score;
  }
}