// Simple test for linking functionality without external dependencies
console.log('Starting simple linking test...');

// Mock internal link service
class InternalLinkService {
  constructor() {
    this.userLinks = new Map();
    
    // Pre-populate with some test links
    this.userLinks.set(123, [
      { url: 'https://example.com/seo', topic: 'SEO Optimization Guide', relevance: 0 },
      { url: 'https://example.com/marketing', topic: 'Digital Marketing Tips', relevance: 0 },
      { url: 'https://example.com/content', topic: 'Content Creation Strategies', relevance: 0 }
    ]);
  }

  async findRelevantLinks(userId, keyword, maxLinks = 3) {
    console.log(`Finding relevant links for user ${userId} with keyword "${keyword}"...`);
    
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
    
    // Pre-populate with test data
    this.userSearchUsage.set(123, {
      userId: 123,
      searchesUsed: 5,
      searchLimit: 10,
      lastResetDate: new Date()
    });
  }
  
  async getUserSearchUsage(userId) {
    console.log(`Getting search usage for user ${userId}...`);
    
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
    console.log(`Checking search quota for user ${userId}...`);
    
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
    console.log(`Incrementing search usage for user ${userId}...`);
    
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
    
    // Pre-populate cache with test data
    this.searchCache.set('seo', {
      timestamp: Date.now(),
      results: [
        {
          url: 'https://example.com/seo-guide',
          title: 'Complete SEO Guide',
          relevance: 0.8,
          authority: 1,
          snippet: 'A comprehensive guide to SEO best practices.'
        }
      ]
    });
  }
  
  async findLinkingOpportunities(keyword, forceRefresh = false) {
    console.log(`Finding linking opportunities for keyword "${keyword}" (forceRefresh: ${forceRefresh})...`);
    
    const cacheKey = keyword.toLowerCase().trim();
    
    if (!forceRefresh) {
      const cachedResult = this.searchCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp) < this.CACHE_TTL) {
        console.log(`Using cached search results for: ${keyword}`);
        return cachedResult.results;
      }
    }
    
    // Mock search results for different keywords
    let results = [];
    
    if (keyword.toLowerCase().includes('seo')) {
      results = [
        {
          url: 'https://example.com/seo-guide',
          title: 'Complete SEO Guide',
          relevance: 0.8,
          authority: 1,
          snippet: 'A comprehensive guide to SEO best practices.'
        },
        {
          url: 'https://example.com/seo-tools',
          title: 'Best SEO Tools',
          relevance: 0.7,
          authority: 0.5,
          snippet: 'A review of the top SEO tools available.'
        }
      ];
    } else if (keyword.toLowerCase().includes('marketing')) {
      results = [
        {
          url: 'https://example.com/digital-marketing',
          title: 'Digital Marketing Strategies',
          relevance: 0.9,
          authority: 0.8,
          snippet: 'Effective digital marketing strategies for businesses.'
        }
      ];
    } else {
      results = [
        {
          url: 'https://example.com/general-guide',
          title: 'General Guide',
          relevance: 0.5,
          authority: 0.5,
          snippet: 'A general guide to online content.'
        }
      ];
    }
    
    // Cache the results
    this.searchCache.set(cacheKey, {
      timestamp: Date.now(),
      results
    });
    
    console.log(`Found ${results.length} external links for keyword "${keyword}"`);
    return results;
  }
}

// Run the integration test
async function runTest() {
  try {
    console.log('Starting linking integration test...');
    
    // Create service instances
    const internalLinkService = new InternalLinkService();
    const searchUsageService = new SearchUsageService();
    const externalLinkService = new ExternalLinkService();
    
    // Test user ID
    const userId = 123;
    
    // Test internal linking
    console.log('\n--- Testing Internal Linking ---');
    console.log('Finding relevant internal links...');
    
    // Test with a matching keyword
    const seoLinks = await internalLinkService.findRelevantLinks(userId, 'SEO optimization');
    console.log('SEO-related internal links:', JSON.stringify(seoLinks, null, 2));
    
    // Test with a different keyword
    const marketingLinks = await internalLinkService.findRelevantLinks(userId, 'marketing strategies');
    console.log('Marketing-related internal links:', JSON.stringify(marketingLinks, null, 2));
    
    // Test with a non-matching keyword
    const nonMatchingLinks = await internalLinkService.findRelevantLinks(userId, 'unrelated topic');
    console.log('Non-matching internal links:', JSON.stringify(nonMatchingLinks, null, 2));
    
    // Test external linking
    console.log('\n--- Testing External Linking ---');
    console.log('1. Checking search quota...');
    const hasQuota = await searchUsageService.hasSearchQuotaRemaining(userId);
    console.log(`User has search quota remaining: ${hasQuota}`);
    
    if (hasQuota) {
      console.log('2. Finding external linking opportunities...');
      
      // Test with a cached keyword
      console.log('\nTesting with cached keyword "seo"...');
      const seoExternalLinks = await externalLinkService.findLinkingOpportunities('seo');
      console.log('SEO external links:', JSON.stringify(seoExternalLinks, null, 2));
      
      // Test with a new keyword
      console.log('\nTesting with new keyword "marketing"...');
      const marketingExternalLinks = await externalLinkService.findLinkingOpportunities('marketing');
      console.log('Marketing external links:', JSON.stringify(marketingExternalLinks, null, 2));
      
      console.log('3. Incrementing search usage...');
      await searchUsageService.incrementSearchUsage(userId);
      
      console.log('4. Testing cache...');
      console.log('\nPerforming second search with same keyword (should use cache)...');
      await externalLinkService.findLinkingOpportunities('marketing');
      
      console.log('\nPerforming search with force refresh (should bypass cache)...');
      await externalLinkService.findLinkingOpportunities('marketing', true);
      
      // Test quota limit
      console.log('\n5. Testing quota limit...');
      // Set searches used to limit
      const usage = await searchUsageService.getUserSearchUsage(userId);
      usage.searchesUsed = usage.searchLimit;
      console.log(`Setting search usage to limit: ${usage.searchesUsed}/${usage.searchLimit}`);
      
      // Check quota again
      const hasRemainingQuota = await searchUsageService.hasSearchQuotaRemaining(userId);
      console.log(`User has remaining quota: ${hasRemainingQuota}`);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();
