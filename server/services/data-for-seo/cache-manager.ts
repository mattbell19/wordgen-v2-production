/**
 * Cache Manager for SEO Audit System
 * 
 * This module provides caching functionality for the DataForSEO API responses
 * to improve performance and reduce API calls for frequently accessed data.
 * 
 * Features:
 * - In-memory LRU cache with configurable max size
 * - TTL (Time-To-Live) for cached items
 * - Cache invalidation strategies
 * - Cache stats for monitoring
 */

import { logError } from './error-handler';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  sets: number;
  evictions: number;
}

interface CacheItem<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheConfig {
  defaultTtl: number;        // Default TTL in milliseconds
  maxSize: number;           // Maximum number of items in cache
  statsInterval: number;     // Interval to log stats in milliseconds
  cleanupInterval: number;   // Interval to clean expired items in milliseconds
}

export class CacheManager<T> {
  private cache: Map<string, CacheItem<T>>;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null;
  private statsTimer: NodeJS.Timeout | null;
  
  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map();
    this.config = {
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      statsInterval: 60 * 60 * 1000,   // 1 hour
      cleanupInterval: 5 * 60 * 1000,  // 5 minutes
      ...config
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      sets: 0,
      evictions: 0
    };
    
    this.cleanupTimer = null;
    this.statsTimer = null;
    
    this.startCleanupTimer();
    this.startStatsTimer();
  }
  
  /**
   * Get an item from cache
   * 
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get(key: string): T | null {
    const cacheKey = this.normalizeKey(key);
    const item = this.cache.get(cacheKey);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    const now = Date.now();
    
    // Check if item is expired
    if (item.expiresAt < now) {
      this.cache.delete(cacheKey);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      return null;
    }
    
    // Update last accessed time
    item.lastAccessed = now;
    this.stats.hits++;
    
    return item.value;
  }
  
  /**
   * Set an item in cache
   * 
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Optional TTL in milliseconds
   */
  set(key: string, value: T, ttl?: number): void {
    const cacheKey = this.normalizeKey(key);
    const now = Date.now();
    
    // Ensure we don't exceed max size by evicting least recently used items
    if (this.cache.size >= this.config.maxSize && !this.cache.has(cacheKey)) {
      this.evictLRU();
    }
    
    const expiresAt = now + (ttl || this.config.defaultTtl);
    
    this.cache.set(cacheKey, {
      value,
      expiresAt,
      lastAccessed: now
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
  }
  
  /**
   * Check if key exists in cache and is not expired
   * 
   * @param key Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    const cacheKey = this.normalizeKey(key);
    const item = this.cache.get(cacheKey);
    
    if (!item) return false;
    
    // Check if item is expired
    if (item.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      this.stats.size = this.cache.size;
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete an item from cache
   * 
   * @param key Cache key
   * @returns True if item was deleted
   */
  delete(key: string): boolean {
    const cacheKey = this.normalizeKey(key);
    const result = this.cache.delete(cacheKey);
    this.stats.size = this.cache.size;
    return result;
  }
  
  /**
   * Clear all items from cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }
  
  /**
   * Get current cache stats
   * 
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Reset cache stats
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      sets: 0,
      evictions: 0
    };
  }
  
  /**
   * Start the cleanup timer to remove expired items
   */
  startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
    
    // Prevent timer from keeping Node.js alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
  
  /**
   * Start the stats timer to log stats periodically
   */
  startStatsTimer(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    
    this.statsTimer = setInterval(() => {
      const { hits, misses, size, sets, evictions } = this.stats;
      const hitRatio = hits + misses > 0 ? hits / (hits + misses) * 100 : 0;
      
      console.log(`[CacheManager] Stats: size=${size}, hits=${hits}, misses=${misses}, sets=${sets}, evictions=${evictions}, hit ratio=${hitRatio.toFixed(2)}%`);
    }, this.config.statsInterval);
    
    // Prevent timer from keeping Node.js alive
    if (this.statsTimer.unref) {
      this.statsTimer.unref();
    }
  }
  
  /**
   * Stop all timers
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }
  
  /**
   * Clean up expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;
    
    // Convert entries to array before iterating to avoid ES5 compatibility issues
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (item.expiresAt < now) {
        this.cache.delete(key);
        removed++;
      }
    });
    
    if (removed > 0) {
      this.stats.size = this.cache.size;
      console.log(`[CacheManager] Cleaned up ${removed} expired items. Cache size: ${this.cache.size}`);
    }
  }
  
  /**
   * Evict the least recently used item from cache
   */
  private evictLRU(): void {
    let oldest: { key: string; time: number } | null = null;
    
    // Convert entries to array before iterating to avoid ES5 compatibility issues
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (!oldest || item.lastAccessed < oldest.time) {
        oldest = { key, time: item.lastAccessed };
      }
    });
    
    if (oldest) {
      this.cache.delete(oldest.key);
      this.stats.evictions++;
    }
  }
  
  /**
   * Normalize a key for storage
   * 
   * @param key Raw key
   * @returns Normalized key
   */
  private normalizeKey(key: string): string {
    return key.trim().toLowerCase();
  }
}

// Export a singleton instance for DataForSEO API responses
export const dataForSEOCache = new CacheManager<any>({
  defaultTtl: 12 * 60 * 60 * 1000,  // 12 hours
  maxSize: 500,                     // Max 500 items
  cleanupInterval: 10 * 60 * 1000   // 10 minutes
}); 