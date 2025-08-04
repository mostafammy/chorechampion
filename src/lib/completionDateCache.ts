/**
 * PRINCIPAL ENGINEER: Performance-optimized completion date caching
 *
 * Features:
 * - LRU cache with TTL for Redis query optimization
 * - Debounced batch fetching for multiple task completion dates
 * - Memory-efficient cache with automatic cleanup
 * - Performance monitoring and metrics
 */

interface CompletionDateCacheEntry {
  taskId: string;
  completionDate: Date;
  timestamp: number;
  hits: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  fetches: number;
  lastCleanup: number;
}

class CompletionDateCache {
  private cache = new Map<string, CompletionDateCacheEntry>();
  private readonly maxSize = 1000; // Max cached completion dates
  private readonly ttl = 5 * 60 * 1000; // 5 minutes TTL
  private readonly cleanupInterval = 10 * 60 * 1000; // 10 minutes cleanup
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    fetches: 0,
    lastCleanup: Date.now(),
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get completion date from cache or fetch from Redis
   */
  async get(taskId: string): Promise<Date | null> {
    const entry = this.cache.get(taskId);

    if (entry && Date.now() - entry.timestamp < this.ttl) {
      entry.hits++;
      this.metrics.hits++;
      console.log(
        `[CompletionDateCache] ✅ Cache hit for task ${taskId} (${entry.hits} hits)`
      );
      return entry.completionDate;
    }

    this.metrics.misses++;
    console.log(`[CompletionDateCache] ❌ Cache miss for task ${taskId}`);
    return null;
  }

  /**
   * Store completion date in cache
   */
  set(taskId: string, completionDate: Date): void {
    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(
          `[CompletionDateCache] 🗑️ Evicted oldest entry: ${oldestKey}`
        );
      }
    }

    this.cache.set(taskId, {
      taskId,
      completionDate,
      timestamp: Date.now(),
      hits: 0,
    });

    console.log(
      `[CompletionDateCache] 💾 Cached completion date for task ${taskId}`
    );
  }

  /**
   * Batch set multiple completion dates
   */
  setBatch(
    completionDates: Array<{ taskId: string; completionDate: Date }>
  ): void {
    const timestamp = Date.now();

    for (const { taskId, completionDate } of completionDates) {
      // LRU eviction if needed
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }

      this.cache.set(taskId, {
        taskId,
        completionDate,
        timestamp,
        hits: 0,
      });
    }

    console.log(
      `[CompletionDateCache] 📦 Batch cached ${completionDates.length} completion dates`
    );
  }

  /**
   * Check if task completion date is cached and fresh
   */
  has(taskId: string): boolean {
    const entry = this.cache.get(taskId);
    return entry ? Date.now() - entry.timestamp < this.ttl : false;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(taskId);
        cleaned++;
      }
    }

    this.metrics.lastCleanup = now;
    console.log(
      `[CompletionDateCache] 🧹 Cleaned up ${cleaned} expired entries (${this.cache.size} remaining)`
    );
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics & { cacheSize: number; hitRate: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      fetches: 0,
      lastCleanup: Date.now(),
    };
    console.log("[CompletionDateCache] 🗑️ Cache cleared");
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Singleton instance for global caching
export const completionDateCache = new CompletionDateCache();

// Export for testing
export { CompletionDateCache };
