interface SearchUsage {
  userId: number;
  searchesUsed: number;
  searchLimit: number;
  lastResetDate: Date;
}

export class SearchUsageService {
  private userSearchUsage: Map<number, SearchUsage> = new Map();
  
  // Default search limits by user tier
  private readonly DEFAULT_SEARCH_LIMITS = {
    free: 10,
    basic: 50,
    premium: 200
  };
  
  // Get a user's search usage
  async getUserSearchUsage(userId: number): Promise<SearchUsage> {
    // If user doesn't have a record yet, create one
    if (!this.userSearchUsage.has(userId)) {
      const newUsage: SearchUsage = {
        userId,
        searchesUsed: 0,
        searchLimit: this.DEFAULT_SEARCH_LIMITS.free, // Default to free tier
        lastResetDate: new Date()
      };
      this.userSearchUsage.set(userId, newUsage);
      return newUsage;
    }
    
    return this.userSearchUsage.get(userId)!;
  }
  
  // Check if a user has search quota remaining
  async hasSearchQuotaRemaining(userId: number): Promise<boolean> {
    const usage = await this.getUserSearchUsage(userId);
    
    // Check if we need to reset the counter (monthly)
    const now = new Date();
    const lastReset = usage.lastResetDate;
    
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      // Reset counter for new month
      usage.searchesUsed = 0;
      usage.lastResetDate = now;
      this.userSearchUsage.set(userId, usage);
      return true;
    }
    
    return usage.searchesUsed < usage.searchLimit;
  }
  
  // Increment a user's search usage
  async incrementSearchUsage(userId: number): Promise<SearchUsage> {
    const usage = await this.getUserSearchUsage(userId);
    usage.searchesUsed += 1;
    this.userSearchUsage.set(userId, usage);
    return usage;
  }
  
  // Update a user's search limit (e.g., when they change subscription tier)
  async updateSearchLimit(userId: number, newLimit: number): Promise<SearchUsage> {
    const usage = await this.getUserSearchUsage(userId);
    usage.searchLimit = newLimit;
    this.userSearchUsage.set(userId, usage);
    return usage;
  }
}

// Create singleton instance
export const searchUsageService = new SearchUsageService();
