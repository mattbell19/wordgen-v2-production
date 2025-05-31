import { SearchUsageService } from '../search-usage.service';

describe('SearchUsageService', () => {
  let service: SearchUsageService;
  const userId = 123;

  beforeEach(() => {
    service = new SearchUsageService();
    jest.clearAllMocks();
  });

  describe('getUserSearchUsage', () => {
    it('should create a new usage record for a new user', async () => {
      const usage = await service.getUserSearchUsage(userId);
      
      expect(usage).toBeDefined();
      expect(usage.userId).toBe(userId);
      expect(usage.searchesUsed).toBe(0);
      expect(usage.searchLimit).toBeGreaterThan(0);
      expect(usage.lastResetDate).toBeInstanceOf(Date);
    });

    it('should return existing usage record for an existing user', async () => {
      // First call creates the record
      await service.getUserSearchUsage(userId);
      
      // Increment usage
      await service.incrementSearchUsage(userId);
      
      // Second call should return the updated record
      const usage = await service.getUserSearchUsage(userId);
      expect(usage.searchesUsed).toBe(1);
    });
  });

  describe('hasSearchQuotaRemaining', () => {
    it('should return true when user has not used any searches', async () => {
      const hasQuota = await service.hasSearchQuotaRemaining(userId);
      expect(hasQuota).toBe(true);
    });

    it('should return true when user has used some searches but not reached limit', async () => {
      // Get initial usage
      const initialUsage = await service.getUserSearchUsage(userId);
      
      // Use some searches but less than the limit
      for (let i = 0; i < initialUsage.searchLimit - 1; i++) {
        await service.incrementSearchUsage(userId);
      }
      
      const hasQuota = await service.hasSearchQuotaRemaining(userId);
      expect(hasQuota).toBe(true);
    });

    it('should return false when user has reached search limit', async () => {
      // Get initial usage
      const initialUsage = await service.getUserSearchUsage(userId);
      
      // Use all available searches
      for (let i = 0; i < initialUsage.searchLimit; i++) {
        await service.incrementSearchUsage(userId);
      }
      
      const hasQuota = await service.hasSearchQuotaRemaining(userId);
      expect(hasQuota).toBe(false);
    });

    it('should reset counter when month changes', async () => {
      // Get initial usage
      const initialUsage = await service.getUserSearchUsage(userId);
      
      // Use all available searches
      for (let i = 0; i < initialUsage.searchLimit; i++) {
        await service.incrementSearchUsage(userId);
      }
      
      // Verify quota is depleted
      expect(await service.hasSearchQuotaRemaining(userId)).toBe(false);
      
      // Mock date to next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super();
          return nextMonth;
        }
        static now() {
          return nextMonth.getTime();
        }
      } as any;
      
      // Check quota again - should be reset
      expect(await service.hasSearchQuotaRemaining(userId)).toBe(true);
      
      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('incrementSearchUsage', () => {
    it('should increment search usage count', async () => {
      // Initial count should be 0
      let usage = await service.getUserSearchUsage(userId);
      expect(usage.searchesUsed).toBe(0);
      
      // Increment once
      await service.incrementSearchUsage(userId);
      usage = await service.getUserSearchUsage(userId);
      expect(usage.searchesUsed).toBe(1);
      
      // Increment again
      await service.incrementSearchUsage(userId);
      usage = await service.getUserSearchUsage(userId);
      expect(usage.searchesUsed).toBe(2);
    });
  });

  describe('updateSearchLimit', () => {
    it('should update the search limit for a user', async () => {
      // Initial limit from default tier
      let usage = await service.getUserSearchUsage(userId);
      const initialLimit = usage.searchLimit;
      
      // Update to a new limit
      const newLimit = initialLimit * 2;
      await service.updateSearchLimit(userId, newLimit);
      
      // Check updated limit
      usage = await service.getUserSearchUsage(userId);
      expect(usage.searchLimit).toBe(newLimit);
    });
  });
});
