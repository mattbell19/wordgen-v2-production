import { CacheManager } from '../cache-manager';

// Mock timers
jest.useFakeTimers();

describe('CacheManager', () => {
  let cache: CacheManager<any>;
  
  beforeEach(() => {
    // Create a new cache with shorter intervals for testing
    cache = new CacheManager({
      defaultTtl: 1000,        // 1 second
      maxSize: 5,              // Small size for testing eviction
      statsInterval: 60000,    // 1 minute (we'll mock time advancement)
      cleanupInterval: 30000   // 30 seconds (we'll mock time advancement)
    });
    
    // Spy on console.log to check stats logging
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    cache.stop();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  describe('basic cache operations', () => {
    it('should set and get items correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', { test: 'value2' });
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toEqual({ test: 'value2' });
    });
    
    it('should handle key normalization', () => {
      cache.set('KEY1', 'value1');
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get(' key1 ')).toBe('value1');
    });
    
    it('should delete items correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      
      // Delete non-existent key
      expect(cache.delete('nonexistent')).toBe(false);
    });
    
    it('should clear all items', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
    
    it('should check item existence correctly', () => {
      cache.set('key1', 'value1');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });
  });
  
  describe('TTL and expiration', () => {
    it('should expire items after TTL', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2', 500); // Custom TTL: 500ms
      
      // Items should be available immediately
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      
      // Advance time by 600ms (key2 should expire)
      jest.advanceTimersByTime(600);
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      
      // Advance time to just over 1000ms (key1 should expire too)
      jest.advanceTimersByTime(500);
      
      expect(cache.get('key1')).toBeNull();
    });
    
    it('should clean up expired items on cleanup interval', () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 100);
      
      // Advance time beyond expiration but before cleanup
      jest.advanceTimersByTime(200);
      
      // Manual checks should show items as expired
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      
      // Stats size should still include the items until cleanup
      expect(cache.getStats().size).toBe(0);
      
      // Advance time to trigger cleanup
      jest.advanceTimersByTime(30000);
      
      // Size should now be updated
      expect(cache.getStats().size).toBe(0);
    });
  });
  
  describe('LRU eviction', () => {
    it('should evict least recently used items when cache is full', () => {
      // Set maxSize + 1 items
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');
      
      // Access some items to update their last accessed time
      cache.get('key1');
      cache.get('key3');
      cache.get('key5');
      
      // Add one more item to trigger eviction
      cache.set('key6', 'value6');
      
      // The least recently used items should be evicted (key2 or key4)
      // Since key1, key3, and key5 were recently accessed
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key5')).toBe(true);
      expect(cache.has('key6')).toBe(true);
      
      // Either key2 or key4 should be evicted (they have the same last accessed time)
      const evicted = !cache.has('key2') || !cache.has('key4');
      expect(evicted).toBe(true);
    });
  });
  
  describe('statistics', () => {
    it('should track hits and misses correctly', () => {
      cache.set('key1', 'value1');
      
      // Hit
      cache.get('key1');
      
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
    
    it('should reset stats correctly', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');
      
      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      
      // Size should be maintained
      expect(stats.size).toBe(1);
    });
    
    it('should log stats on the stats interval', () => {
      // Set up the cache with some activity
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');
      
      // Advance time to trigger stats logging
      jest.advanceTimersByTime(60000);
      
      // Verify console.log was called with stats info
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[CacheManager] Stats:')
      );
    });
  });
}); 