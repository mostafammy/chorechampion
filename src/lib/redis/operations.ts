/**
 * ✅ ENTERPRISE REDIS OPERATIONS LAYER
 *
 * High-level Redis operations with connection management, error handling,
 * retry logic, and performance monitoring.
 *
 * @module RedisOperations
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import type { Redis } from "@upstash/redis";
import { CoreError, Performance, safeAsync } from "../utils/core";
import {
  RedisKeyManager,
  type ParsedCompletionKey,
  type DateRangeQuery,
} from "./key-manager";

/**
 * ✅ OPERATION CONFIGURATION
 */
const REDIS_CONFIG = Object.freeze({
  DEFAULT_PATTERN: "task:completion:*",
  DEFAULT_COUNT: 100,
  MAX_SCAN_ITERATIONS: 1000,
  MAX_BATCH_SIZE: 1000,
  OPERATION_TIMEOUT: 15000, // 15 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  PIPELINE_BATCH_SIZE: 50,
} as const);

/**
 * ✅ OPERATION RESULT TYPES
 */
export interface RedisOperationResult<T> {
  success: boolean;
  data?: T;
  error?: CoreError;
  metadata?: {
    executionTime?: number;
    operationsCount?: number;
    retryAttempts?: number;
    fromCache?: boolean;
  };
}

export interface ScanOptions {
  pattern?: string;
  count?: number;
  maxIterations?: number;
  timeout?: number;
}

export interface BatchOperationOptions {
  batchSize?: number;
  parallel?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * ✅ ENTERPRISE REDIS OPERATIONS CLASS
 *
 * Centralized Redis operations with comprehensive error handling,
 * connection management, and performance optimization.
 */
export class RedisOperations {
  private static connectionPool = new Map<string, Redis>();
  private static operationMetrics = new Map<
    string,
    { count: number; totalTime: number }
  >();

  /**
   * ✅ SCAN COMPLETION TASKS
   *
   * Scans Redis for completion task keys with optimized batching and error handling.
   *
   * @param redis - Redis client instance
   * @param options - Scan options
   * @returns Promise resolving to array of keys
   *
   * @example
   * ```typescript
   * const result = await RedisOperations.scanCompletionTasks(redis, {
   *   pattern: 'task:completion:daily:*',
   *   count: 200
   * });
   *
   * if (result.success) {
   *   console.log(`Found ${result.data.length} keys`);
   * }
   * ```
   */
  static async scanCompletionTasks(
    redis: Redis,
    options: ScanOptions = {}
  ): Promise<RedisOperationResult<string[]>> {
    const {
      pattern = REDIS_CONFIG.DEFAULT_PATTERN,
      count = REDIS_CONFIG.DEFAULT_COUNT,
      maxIterations = REDIS_CONFIG.MAX_SCAN_ITERATIONS,
      timeout = REDIS_CONFIG.OPERATION_TIMEOUT,
    } = options;

    const operationId = `scanCompletionTasks:${pattern}`;

    return Performance.measureTime(operationId, async () => {
      try {
        // Input validation
        if (!redis) {
          throw new CoreError(
            "Redis client is required",
            "MISSING_REDIS_CLIENT"
          );
        }

        // Validate pattern
        if (typeof pattern !== "string" || pattern.trim().length === 0) {
          throw new CoreError(
            "Pattern must be a non-empty string",
            "INVALID_PATTERN",
            { pattern }
          );
        }

        const keys: string[] = [];
        let cursor = 0;
        let iterations = 0;

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Operation timeout")), timeout)
        );

        // Scan with timeout and retry logic
        const [scanResult, scanError] = await safeAsync(async () => {
          do {
            if (iterations >= maxIterations) {
              throw new CoreError(
                `Maximum scan iterations (${maxIterations}) exceeded`,
                "MAX_ITERATIONS_EXCEEDED",
                { iterations, maxIterations }
              );
            }

            const scanOperation = this.withRetry(
              () => redis.scan(cursor, { match: pattern, count }),
              REDIS_CONFIG.RETRY_ATTEMPTS
            );

            const [nextCursor, foundKeys] = await Promise.race([
              scanOperation,
              timeoutPromise,
            ]);

            cursor = Number(nextCursor);
            keys.push(...foundKeys);
            iterations++;

            // Prevent memory issues with large result sets
            if (keys.length > REDIS_CONFIG.MAX_BATCH_SIZE) {
              console.warn(
                `[RedisOperations] Large result set detected: ${keys.length} keys. Consider using more specific patterns.`
              );
            }
          } while (cursor !== 0);

          return keys;
        });

        if (scanError) {
          this.recordMetric(operationId, false);
          return {
            success: false,
            error: new CoreError(
              "Failed to scan Redis keys",
              "REDIS_SCAN_ERROR",
              { pattern, originalError: scanError }
            ),
          };
        }

        this.recordMetric(operationId, true);

        return {
          success: true,
          data: scanResult || [],
          metadata: {
            operationsCount: iterations,
          },
        };
      } catch (error) {
        this.recordMetric(operationId, false);

        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError(
                  "Unexpected error during Redis scan",
                  "UNEXPECTED_SCAN_ERROR",
                  { originalError: error }
                ),
        };
      }
    });
  }

  /**
   * ✅ GET COMPLETION KEYS BY DATE RANGE
   *
   * Retrieves and filters completion keys within a specified date range.
   *
   * @param redis - Redis client instance
   * @param query - Date range query parameters
   * @param options - Operation options
   * @returns Promise resolving to filtered keys
   */
  static async getCompletionKeysByDateRange(
    redis: Redis,
    query: DateRangeQuery,
    options: ScanOptions & { parseOptions?: { strict?: boolean } } = {}
  ): Promise<RedisOperationResult<ParsedCompletionKey[]>> {
    const { parseOptions, ...scanOptions } = options;

    return Performance.measureTime(
      "RedisOperations.getCompletionKeysByDateRange",
      async () => {
        try {
          // Generate optimized scan pattern
          const pattern = RedisKeyManager.generateScanPattern(query.period);

          // Scan for keys
          const scanResult = await this.scanCompletionTasks(redis, {
            ...scanOptions,
            pattern,
          });

          if (!scanResult.success) {
            return {
              success: false,
              error: scanResult.error,
            };
          }

          // Filter keys by date range
          const filteredKeys = RedisKeyManager.getKeysInDateRange(
            scanResult.data || [],
            query,
            parseOptions
          );

          return {
            success: true,
            data: filteredKeys,
            metadata: {
              ...scanResult.metadata,
              operationsCount: scanResult.data?.length || 0,
            },
          };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof CoreError
                ? error
                : new CoreError(
                    "Failed to get keys by date range",
                    "DATE_RANGE_QUERY_ERROR",
                    { query, originalError: error }
                  ),
          };
        }
      }
    );
  }

  /**
   * ✅ BATCH GET OPERATIONS
   *
   * Efficiently retrieves multiple Redis values with batching and parallelization.
   *
   * @param redis - Redis client instance
   * @param keys - Array of Redis keys to retrieve
   * @param options - Batch operation options
   * @returns Promise resolving to key-value pairs
   */
  static async batchGet<T = any>(
    redis: Redis,
    keys: string[],
    options: BatchOperationOptions = {}
  ): Promise<RedisOperationResult<Record<string, T | null>>> {
    const {
      batchSize = REDIS_CONFIG.PIPELINE_BATCH_SIZE,
      parallel = true,
      timeout = REDIS_CONFIG.OPERATION_TIMEOUT,
      retryAttempts = REDIS_CONFIG.RETRY_ATTEMPTS,
    } = options;

    return Performance.measureTime("RedisOperations.batchGet", async () => {
      try {
        if (!Array.isArray(keys) || keys.length === 0) {
          return {
            success: true,
            data: {},
          };
        }

        const result: Record<string, T | null> = {};
        const chunks = this.chunkArray(keys, batchSize);

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Batch operation timeout")),
            timeout
          )
        );

        if (parallel) {
          // Parallel processing
          const chunkPromises = chunks.map((chunk) =>
            this.withRetry(
              () => this.processBatchChunk(redis, chunk),
              retryAttempts
            )
          );

          const chunkResults = await Promise.race([
            Promise.all(chunkPromises),
            timeoutPromise,
          ]);

          // Merge results
          chunkResults.forEach((chunkResult, index) => {
            chunks[index].forEach((key, keyIndex) => {
              result[key] = chunkResult[keyIndex] as T | null;
            });
          });
        } else {
          // Sequential processing
          for (const chunk of chunks) {
            const chunkResult = await Promise.race([
              this.withRetry(
                () => this.processBatchChunk(redis, chunk),
                retryAttempts
              ),
              timeoutPromise,
            ]);

            chunk.forEach((key, index) => {
              result[key] = chunkResult[index] as T | null;
            });
          }
        }

        return {
          success: true,
          data: result,
          metadata: {
            operationsCount: keys.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError("Batch get operation failed", "BATCH_GET_ERROR", {
                  keysCount: keys.length,
                  originalError: error,
                }),
        };
      }
    });
  }

  /**
   * ✅ BATCH SET OPERATIONS
   *
   * Efficiently sets multiple Redis key-value pairs with batching.
   *
   * @param redis - Redis client instance
   * @param data - Object containing key-value pairs to set
   * @param options - Batch operation options
   * @returns Promise resolving to operation result
   */
  static async batchSet(
    redis: Redis,
    data: Record<string, any>,
    options: BatchOperationOptions & { ttl?: number } = {}
  ): Promise<RedisOperationResult<number>> {
    const {
      batchSize = REDIS_CONFIG.PIPELINE_BATCH_SIZE,
      timeout = REDIS_CONFIG.OPERATION_TIMEOUT,
      retryAttempts = REDIS_CONFIG.RETRY_ATTEMPTS,
      ttl,
    } = options;

    return Performance.measureTime("RedisOperations.batchSet", async () => {
      try {
        const entries = Object.entries(data);
        if (entries.length === 0) {
          return {
            success: true,
            data: 0,
          };
        }

        const chunks = this.chunkArray(entries, batchSize);
        let totalOperations = 0;

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Batch set timeout")), timeout)
        );

        for (const chunk of chunks) {
          const pipeline = redis.pipeline();

          chunk.forEach(([key, value]) => {
            if (ttl) {
              pipeline.setex(key, ttl, JSON.stringify(value));
            } else {
              pipeline.set(key, JSON.stringify(value));
            }
          });

          await Promise.race([
            this.withRetry(() => pipeline.exec(), retryAttempts),
            timeoutPromise,
          ]);

          totalOperations += chunk.length;
        }

        return {
          success: true,
          data: totalOperations,
          metadata: {
            operationsCount: totalOperations,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError("Batch set operation failed", "BATCH_SET_ERROR", {
                  entriesCount: Object.keys(data).length,
                  originalError: error,
                }),
        };
      }
    });
  }

  /**
   * ✅ CONNECTION HEALTH CHECK
   *
   * Verifies Redis connection health and performance.
   *
   * @param redis - Redis client instance
   * @returns Promise resolving to health check result
   */
  static async healthCheck(redis: Redis): Promise<
    RedisOperationResult<{
      connected: boolean;
      latency: number;
      version?: string;
    }>
  > {
    return Performance.measureTime("RedisOperations.healthCheck", async () => {
      try {
        const startTime = performance.now();

        const [pingResult, pingError] = await safeAsync(() =>
          Promise.race([
            redis.ping(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Health check timeout")), 5000)
            ),
          ])
        );

        const latency = performance.now() - startTime;

        if (pingError) {
          return {
            success: false,
            error: new CoreError(
              "Redis health check failed",
              "HEALTH_CHECK_FAILED",
              { originalError: pingError }
            ),
          };
        }

        return {
          success: true,
          data: {
            connected: pingResult === "PONG",
            latency,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: new CoreError(
            "Health check operation failed",
            "HEALTH_CHECK_ERROR",
            { originalError: error }
          ),
        };
      }
    });
  }

  /**
   * ✅ PRIVATE HELPER METHODS
   */
  private static async processBatchChunk<T>(
    redis: Redis,
    keys: string[]
  ): Promise<(T | null)[]> {
    const pipeline = redis.pipeline();
    keys.forEach((key) => pipeline.get(key));
    const results = await pipeline.exec();

    return results.map((result) => {
      if (result === null || result === undefined) {
        return null;
      }

      try {
        return typeof result === "string" ? JSON.parse(result) : result;
      } catch {
        return result as T;
      }
    });
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, REDIS_CONFIG.RETRY_DELAY * attempt)
          );
        }
      }
    }

    throw lastError!;
  }

  private static recordMetric(operationId: string, success: boolean): void {
    const metric = this.operationMetrics.get(operationId) || {
      count: 0,
      totalTime: 0,
    };
    metric.count++;
    this.operationMetrics.set(operationId, metric);
  }

  /**
   * ✅ METRICS AND MONITORING
   */
  static getOperationMetrics(): Record<
    string,
    { count: number; averageTime: number }
  > {
    const metrics: Record<string, { count: number; averageTime: number }> = {};

    for (const [operationId, metric] of this.operationMetrics.entries()) {
      metrics[operationId] = {
        count: metric.count,
        averageTime: metric.totalTime / metric.count,
      };
    }

    return metrics;
  }

  static clearMetrics(): void {
    this.operationMetrics.clear();
  }
}

/**
 * ✅ LEGACY COMPATIBILITY FUNCTION
 *
 * Maintains backward compatibility with existing code
 */
export async function scanCompletionTasks(
  redis: Redis,
  pattern: string = REDIS_CONFIG.DEFAULT_PATTERN
): Promise<string[]> {
  const result = await RedisOperations.scanCompletionTasks(redis, { pattern });

  if (!result.success) {
    console.error("[RedisOperations] Scan failed:", result.error);
    return [];
  }

  return result.data || [];
}
