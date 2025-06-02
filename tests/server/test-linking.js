// Simple integration test for linking functionality
import axios from 'axios';
import { DOMParser } from '@xmldom/xmldom';

// Mock internal link service
class InternalLinkService {
  constructor() {
    this.userLinks = new Map();
  }

  async parseSitemap(sitemapXml) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(sitemapXml, 'text/xml');

      // Extract URLs from sitemap
      const urls = [];
      const urlElements = xmlDoc.getElementsByTagName('url');

      for (let i = 0; i < urlElements.length; i++) {
        const locElement = urlElements[i].getElementsByTagName('loc')[0];
        if (locElement && locElement.textContent) {
          urls.push(locElement.textContent);
        }
      }

      return urls;
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      return [];
    }
  }

  async analyzePageContent(url) {
    try {
      const response = await axios.get(url);
      const html = response.data;

      // Extract title
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '';

      // Extract h1 if available
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const h1 = h1Match ? h1Match[1].replace(/<[^>]*>/g, '') : '';

      // Combine title and h1 to determine topic
      const topic = h1 || title.split(' - ')[0] || title;

      return { url, topic };
    } catch (error) {
      console.error(`Error analyzing page content for ${url}:`, error);
      return { url, topic: url.split('/').pop() || url };
    }
  }

  async storeUserLinks(userId, sitemapUrl) {
    try {
      // Fetch sitemap
      console.log(`Fetching sitemap from ${sitemapUrl}...`);
      const response = await axios.get(sitemapUrl);
      const sitemapXml = response.data;

      // Parse sitemap to get URLs
      console.log('Parsing sitemap...');
      const urls = await this.parseSitemap(sitemapXml);
      console.log(`Found ${urls.length} URLs in sitemap`);

      // Analyze each URL to get topics (limit to 5 for testing)
      const urlsToProcess = urls.slice(0, 5);
      console.log(`Processing ${urlsToProcess.length} URLs...`);

      const linkPromises = urlsToProcess.map(url => this.analyzePageContent(url));
      const linkResults = await Promise.all(linkPromises);

      // Convert to InternalLink format with default relevance
      const links = linkResults.map(result => ({
        url: result.url,
        topic: result.topic,
        relevance: 0
      }));

      // Store links for this user
      this.userLinks.set(userId, links);
      console.log(`Stored ${links.length} links for user ${userId}`);

      return links;
    } catch (error) {
      console.error('Error storing user links:', error);
      return [];
    }
  }

  async findRelevantLinks(userId, keyword, maxLinks = 3) {
    const userLinks = this.userLinks.get(userId) || [];

    if (userLinks.length === 0) {
      console.log(`No links found for user ${userId}`);
      return [];
    }

    // Calculate relevance scores based on keyword match
    const scoredLinks = userLinks.map(link => {
      const topicWords = link.topic.toLowerCase().split(' ');
      const keywordWords = keyword.toLowerCase().split(' ');

      // Calculate word overlap
      let matchScore = 0;
      for (const word of keywordWords) {
        if (topicWords.includes(word)) {
          matchScore += 1;
        }
      }

      return {
        ...link,
        relevance: matchScore / keywordWords.length
      };
    });

    // Sort by relevance and return top matches
    const relevantLinks = scoredLinks
      .filter(link => link.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxLinks);

    console.log(`Found ${relevantLinks.length} relevant links for keyword "${keyword}"`);
    return relevantLinks;
  }
}

// Mock search usage service
class SearchUsageService {
  constructor() {
    this.userSearchUsage = new Map();
    this.DEFAULT_SEARCH_LIMITS = {
      free: 10,
      basic: 50,
      premium: 200
    };
  }

  async getUserSearchUsage(userId) {
    if (!this.userSearchUsage.has(userId)) {
      const newUsage = {
        userId,
        searchesUsed: 0,
        searchLimit: this.DEFAULT_SEARCH_LIMITS.free,
        lastResetDate: new Date()
      };
      this.userSearchUsage.set(userId, newUsage);
      return newUsage;
    }

    return this.userSearchUsage.get(userId);
  }

  async hasSearchQuotaRemaining(userId) {
    const usage = await this.getUserSearchUsage(userId);

    const now = new Date();
    const lastReset = usage.lastResetDate;

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      usage.searchesUsed = 0;
      usage.lastResetDate = now;
      this.userSearchUsage.set(userId, usage);
      return true;
    }

    return usage.searchesUsed < usage.searchLimit;
  }

  async incrementSearchUsage(userId) {
    const usage = await this.getUserSearchUsage(userId);
    usage.searchesUsed += 1;
    this.userSearchUsage.set(userId, usage);
    console.log(`User ${userId} search usage incremented to ${usage.searchesUsed}/${usage.searchLimit}`);
    return usage;
  }
}

// Mock external link service
class ExternalLinkService {
  constructor() {
    this.searchCache = new Map();
    this.CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    this.AUTHORITY_DOMAINS = [
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

    this.EXCLUDED_DOMAINS = [
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'pinterest.com',
      'youtube.com',
      'tiktok.com'
    ];
  }

  async findLinkingOpportunities(keyword, forceRefresh = false) {
    const cacheKey = keyword.toLowerCase().trim();

    if (!forceRefresh) {
      const cachedResult = this.searchCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < this.CACHE_TTL) {
        console.log(`Using cached search results for: ${keyword}`);
        return cachedResult.results;
      }
    }

    try {
      // Mock web search results
      console.log(`Performing web search for: ${keyword}`);
      const searchResults = [
        {
          title: 'Wikipedia: ' + keyword,
          link: 'https://wikipedia.org/wiki/' + keyword.replace(/\s+/g, '_'),
          snippet: 'Comprehensive information about ' + keyword + ' from Wikipedia, the free encyclopedia.'
        },
        {
          title: keyword + ' - Latest Research',
          link: 'https://nature.com/articles/' + keyword.replace(/\s+/g, '-'),
          snippet: 'Recent scientific findings related to ' + keyword + ' published in Nature.'
        },
        {
          title: 'Understanding ' + keyword,
          link: 'https://example.com/blog/' + keyword.replace(/\s+/g, '-'),
          snippet: 'A detailed guide to understanding ' + keyword + ' and its implications.'
        },
        {
          title: keyword + ' on Facebook',
          link: 'https://facebook.com/pages/' + keyword.replace(/\s+/g, '-'),
          snippet: 'Join the community discussion about ' + keyword + ' on Facebook.'
        }
      ];

      // Transform and validate search results
      const links = searchResults.map(result => ({
        url: result.link,
        title: result.title,
        relevance: 0,
        authority: 0,
        snippet: result.snippet
      }));

      // Validate links
      const validatedLinks = links.filter(link => {
        try {
          const url = new URL(link.url);
          const domain = url.hostname.toLowerCase();

          if (this.EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded))) {
            return false;
          }

          return url.protocol === 'https:';
        } catch {
          return false;
        }
      });

      // Rank links
      const rankedLinks = validatedLinks.map(link => {
        const url = new URL(link.url);
        const domain = url.hostname.toLowerCase();

        let authorityScore = 0;
        if (this.AUTHORITY_DOMAINS.some(auth => domain.includes(auth))) {
          authorityScore = 1;
        }

        // Simple relevance scoring
        let relevanceScore = 0;
        if (link.title && link.title.length > 30) {
          relevanceScore += 0.3;
        }
        if (link.snippet && link.snippet.length > 100) {
          relevanceScore += 0.4;
        }
        if (link.url.includes('/article/') || link.url.includes('/wiki/')) {
          relevanceScore += 0.3;
        }

        return {
          ...link,
          relevance: relevanceScore,
          authority: authorityScore
        };
      })
      .sort((a, b) => {
        const scoreA = (a.authority * 2) + a.relevance;
        const scoreB = (b.authority * 2) + b.relevance;
        return scoreB - scoreA;
      })
      .slice(0, 3);

      // Cache the results
      this.searchCache.set(cacheKey, {
        timestamp: Date.now(),
        results: rankedLinks
      });

      console.log(`Found ${rankedLinks.length} external links for keyword "${keyword}"`);
      return rankedLinks;
    } catch (error) {
      console.error('Error finding linking opportunities:', error);
      return [];
    }
  }
}

// Run the integration test
async function runTest() {
  console.log('Starting linking integration test...');

  // Create service instances
  const internalLinkService = new InternalLinkService();
  const searchUsageService = new SearchUsageService();
  const externalLinkService = new ExternalLinkService();

  // Test user ID
  const userId = 123;

  // Test internal linking
  console.log('\n--- Testing Internal Linking ---');
  console.log('1. Adding sitemap for user...');
  const sitemapUrl = 'https://www.sitemaps.org/sitemap.xml'; // Example sitemap
  const internalLinks = await internalLinkService.storeUserLinks(userId, sitemapUrl);

  console.log('2. Finding relevant internal links...');
  const relevantLinks = await internalLinkService.findRelevantLinks(userId, 'sitemap protocol');
  console.log('Relevant internal links:', JSON.stringify(relevantLinks, null, 2));

  // Test external linking
  console.log('\n--- Testing External Linking ---');
  console.log('1. Checking search quota...');
  const hasQuota = await searchUsageService.hasSearchQuotaRemaining(userId);
  console.log(`User has search quota remaining: ${hasQuota}`);

  if (hasQuota) {
    console.log('2. Finding external linking opportunities...');
    const externalLinks = await externalLinkService.findLinkingOpportunities('artificial intelligence');
    console.log('External links:', JSON.stringify(externalLinks, null, 2));

    console.log('3. Incrementing search usage...');
    await searchUsageService.incrementSearchUsage(userId);

    console.log('4. Testing cache...');
    console.log('Performing second search with same keyword (should use cache)...');
    await externalLinkService.findLinkingOpportunities('artificial intelligence');

    console.log('Performing search with force refresh (should bypass cache)...');
    await externalLinkService.findLinkingOpportunities('artificial intelligence', true);
  }

  console.log('\nTest completed successfully!');
}

// Run the test
runTest().catch(error => {
  console.error('Test failed:', error);
});
