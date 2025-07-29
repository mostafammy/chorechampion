/**
 * Advanced Rate Limiting Manager for ChoreChampion
 * Provides comprehensive rate limiting for all endpoint types with intelligent configuration
 */

import { Redis } from "@upstash/redis";
import { IS_DEV } from "@/lib/utils";
import { DevUtils } from "@/lib/dev/environmentUtils";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limitType?: string;
  bypassReason?: string;
  headers: Record<string, string>; // Headers to include in response
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  burstLimit?: number;
  burstWindowMs?: number;
  identifier: string;
  endpoint: string;
  type: RateLimitType;
}

export type RateLimitType =
  | "auth" // Authentication endpoints
  | "api" // General API endpoints
  | "admin" // Admin operations
  | "upload" // File upload endpoints
  | "public" // Public endpoints
  | "webhook" // Webhook endpoints
  | "search" // Search/query endpoints
  | "export" // Data export endpoints
  | "critical"; // Critical system operations

/**
 * Comprehensive Rate Limiting Configurations
 * Different strategies for different endpoint types
 */
export class RateLimitManager {
  private static readonly CONFIGS: Record<
    RateLimitType,
    {
      dev: {
        maxAttempts: number;
        windowMs: number;
        burstLimit?: number;
        burstWindowMs?: number;
      };
      prod: {
        maxAttempts: number;
        windowMs: number;
        burstLimit?: number;
        burstWindowMs?: number;
      };
      description: string;
    }
  > = {
    auth: {
      dev: {
        maxAttempts: 1000,
        windowMs: 15 * 60 * 1000,
        burstLimit: 100,
        burstWindowMs: 60 * 1000,
      },
      prod: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        burstLimit: 2,
        burstWindowMs: 60 * 1000,
      },
      description:
        "Authentication endpoints - very strict to prevent brute force",
    },
    api: {
      dev: {
        maxAttempts: 10000,
        windowMs: 60 * 1000,
        burstLimit: 1000,
        burstWindowMs: 10 * 1000,
      },
      prod: {
        maxAttempts: 100,
        windowMs: 60 * 1000,
        burstLimit: 20,
        burstWindowMs: 10 * 1000,
      },
      description: "General API endpoints - balanced for normal usage",
    },
    admin: {
      dev: {
        maxAttempts: 500,
        windowMs: 60 * 1000,
        burstLimit: 50,
        burstWindowMs: 10 * 1000,
      },
      prod: {
        maxAttempts: 10,
        windowMs: 60 * 1000,
        burstLimit: 3,
        burstWindowMs: 10 * 1000,
      },
      description: "Admin operations - strict to protect sensitive functions",
    },
    upload: {
      dev: {
        maxAttempts: 100,
        windowMs: 60 * 1000,
        burstLimit: 10,
        burstWindowMs: 60 * 1000,
      },
      prod: {
        maxAttempts: 5,
        windowMs: 60 * 1000,
        burstLimit: 2,
        burstWindowMs: 60 * 1000,
      },
      description: "File uploads - very strict due to resource consumption",
    },
    public: {
      dev: {
        maxAttempts: 5000,
        windowMs: 60 * 1000,
        burstLimit: 500,
        burstWindowMs: 10 * 1000,
      },
      prod: {
        maxAttempts: 200,
        windowMs: 60 * 1000,
        burstLimit: 50,
        burstWindowMs: 10 * 1000,
      },
      description: "Public endpoints - moderate limits for accessibility",
    },
    webhook: {
      dev: {
        maxAttempts: 1000,
        windowMs: 60 * 1000,
        burstLimit: 100,
        burstWindowMs: 10 * 1000,
      },
      prod: {
        maxAttempts: 50,
        windowMs: 60 * 1000,
        burstLimit: 10,
        burstWindowMs: 10 * 1000,
      },
      description: "Webhook endpoints - moderate to handle external systems",
    },
    search: {
      dev: {
        maxAttempts: 2000,
        windowMs: 60 * 1000,
        burstLimit: 200,
        burstWindowMs: 10 * 1000,
      },
      prod: {
        maxAttempts: 30,
        windowMs: 60 * 1000,
        burstLimit: 10,
        burstWindowMs: 10 * 1000,
      },
      description: "Search endpoints - strict due to database load",
    },
    export: {
      dev: {
        maxAttempts: 50,
        windowMs: 60 * 1000,
        burstLimit: 5,
        burstWindowMs: 60 * 1000,
      },
      prod: {
        maxAttempts: 2,
        windowMs: 60 * 1000,
        burstLimit: 1,
        burstWindowMs: 60 * 1000,
      },
      description: "Data export - very strict due to heavy resource usage",
    },
    critical: {
      dev: {
        maxAttempts: 100,
        windowMs: 60 * 1000,
        burstLimit: 10,
        burstWindowMs: 10 * 1000,
      },
      prod: {
        maxAttempts: 3,
        windowMs: 60 * 1000,
        burstLimit: 1,
        burstWindowMs: 10 * 1000,
      },
      description:
        "Critical operations - extremely strict for system protection",
    },
  };

  /**
   * Get rate limit configuration for a specific endpoint type
   */
  static getConfig(type: RateLimitType): {
    maxAttempts: number;
    windowMs: number;
    burstLimit?: number;
    burstWindowMs?: number;
  } {
    const config = this.CONFIGS[type];
    const environmentConfig = IS_DEV ? config.dev : config.prod;

    return environmentConfig;
  }

  /**
   * Enhanced rate limiting with comprehensive configuration
   */
  static async checkRateLimit(
    identifier: string,
    endpoint: string,
    type: RateLimitType = "api",
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const perfTimer = DevUtils.performance.start(
      `RateLimit-${type}-${endpoint}`
    );

    // Enhanced development bypass with detailed logging
    if (DevUtils.rateLimit.shouldBypass(`${type}-rate-limit`)) {
      perfTimer.end();

      const config = this.getConfig(type);
      const devResult: RateLimitResult = {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: Date.now() + config.windowMs,
        bypassReason: `Development environment - ${type} rate limiting disabled for testing`,
        headers: this.generateHeaders(
          config.maxAttempts,
          config.maxAttempts - 1,
          Date.now() + config.windowMs
        ),
      };

      DevUtils.log.debug(`${type.toUpperCase()} rate limit bypassed`, {
        identifier,
        endpoint,
        type,
        config,
        reason: devResult.bypassReason,
      });

      return devResult;
    }

    // Get environment-specific configuration
    const baseConfig = this.getConfig(type);
    const finalConfig: RateLimitConfig = {
      maxAttempts: baseConfig.maxAttempts,
      windowMs: baseConfig.windowMs,
      burstLimit: baseConfig.burstLimit,
      burstWindowMs: baseConfig.burstWindowMs,
      ...customConfig,
      identifier,
      endpoint,
      type,
    };

    DevUtils.log.trace(`${type.toUpperCase()} rate limit check starting`, {
      identifier,
      endpoint,
      type,
      config: finalConfig,
      environment: IS_DEV ? "development" : "production",
    });

    // Check both normal and burst limits in parallel
    const [normalResult, burstResult] = await Promise.all([
      this.checkNormalLimit(finalConfig),
      this.checkBurstLimit(finalConfig),
    ]);

    // Determine final result
    const finalResult = this.determineFinalResult(
      normalResult,
      burstResult,
      finalConfig
    );

    DevUtils.log.trace(`${type.toUpperCase()} rate limit check completed`, {
      identifier,
      endpoint,
      type,
      normalResult,
      burstResult,
      finalResult,
    });

    // Security logging for production
    if (!finalResult.allowed) {
      DevUtils.log.security(`${type.toUpperCase()}_RATE_LIMIT_EXCEEDED`, {
        identifier,
        endpoint,
        type,
        limitType: finalResult.limitType,
        remaining: finalResult.remaining,
        resetTime: finalResult.resetTime,
      });
    }

    perfTimer.end();
    return finalResult;
  }

  /**
   * Check normal rate limit window
   */
  private static async checkNormalLimit(
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${config.type}:normal:${config.identifier}:${config.endpoint}`;
    const window = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${window}`;

    try {
      const current = await redis.incr(windowKey);

      if (current === 1) {
        await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
      }

      const allowed = current <= config.maxAttempts;
      const remaining = Math.max(0, config.maxAttempts - current);
      const resetTime = (window + 1) * config.windowMs;

      DevUtils.log.debug(
        `${config.type.toUpperCase()} normal rate limit check`,
        {
          identifier: config.identifier,
          endpoint: config.endpoint,
          current,
          maxAttempts: config.maxAttempts,
          allowed,
          remaining,
          windowKey,
        }
      );

      return {
        allowed,
        remaining,
        resetTime,
        headers: this.generateHeaders(config.maxAttempts, remaining, resetTime),
      };
    } catch (error) {
      return this.handleRateLimitError(error, config, "normal");
    }
  }

  /**
   * Check burst rate limit window
   */
  private static async checkBurstLimit(
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    if (!config.burstLimit || !config.burstWindowMs) {
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000,
        headers: {},
      };
    }

    const key = `rate_limit:${config.type}:burst:${config.identifier}:${config.endpoint}`;
    const window = Math.floor(Date.now() / config.burstWindowMs);
    const windowKey = `${key}:${window}`;

    try {
      const current = await redis.incr(windowKey);

      if (current === 1) {
        await redis.expire(windowKey, Math.ceil(config.burstWindowMs / 1000));
      }

      const allowed = current <= config.burstLimit;
      const remaining = Math.max(0, config.burstLimit - current);
      const resetTime = (window + 1) * config.burstWindowMs;

      DevUtils.log.debug(
        `${config.type.toUpperCase()} burst rate limit check`,
        {
          identifier: config.identifier,
          endpoint: config.endpoint,
          current,
          burstLimit: config.burstLimit,
          allowed,
          remaining,
          windowKey,
        }
      );

      return {
        allowed,
        remaining,
        resetTime,
        headers: this.generateHeaders(
          config.burstLimit,
          remaining,
          resetTime,
          "burst"
        ),
      };
    } catch (error) {
      return this.handleRateLimitError(error, config, "burst");
    }
  }

  /**
   * Handle rate limit errors with fail-open/fail-closed logic
   */
  private static handleRateLimitError(
    error: unknown,
    config: RateLimitConfig,
    limitType: "normal" | "burst"
  ): RateLimitResult {
    DevUtils.log.error(
      `${config.type.toUpperCase()} ${limitType} rate limiter error`,
      error
    );

    const shouldFailClosed = DevUtils.security.shouldFailClosed(
      `${config.type}-rate-limit`
    );

    if (shouldFailClosed) {
      DevUtils.log.security(
        `${config.type.toUpperCase()}_RATE_LIMIT_ERROR_FAIL_CLOSED`,
        {
          identifier: config.identifier,
          endpoint: config.endpoint,
          limitType,
          error,
        }
      );

      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + config.windowMs,
        headers: this.generateHeaders(0, 0, Date.now() + config.windowMs),
      };
    }

    const maxAttempts =
      limitType === "burst" ? config.burstLimit || 10 : config.maxAttempts;
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: Date.now() + config.windowMs,
      bypassReason: `Redis error - failing open for ${limitType} limit`,
      headers: this.generateHeaders(
        maxAttempts,
        maxAttempts - 1,
        Date.now() + config.windowMs
      ),
    };
  }

  /**
   * Determine final result from normal and burst checks
   */
  private static determineFinalResult(
    normalResult: RateLimitResult,
    burstResult: RateLimitResult,
    config: RateLimitConfig
  ): RateLimitResult {
    // Return the most restrictive result
    if (!normalResult.allowed) {
      return { ...normalResult, limitType: "normal" };
    }

    if (!burstResult.allowed) {
      return { ...burstResult, limitType: "burst" };
    }

    // Both allowed - return normal result with combined headers
    return {
      ...normalResult,
      headers: {
        ...normalResult.headers,
        ...burstResult.headers,
      },
    };
  }

  /**
   * Generate standard rate limit headers
   */
  private static generateHeaders(
    limit: number,
    remaining: number,
    resetTime: number,
    type: string = "normal"
  ): Record<string, string> {
    const prefix = type === "burst" ? "X-RateLimit-Burst" : "X-RateLimit";

    return {
      [`${prefix}-Limit`]: limit.toString(),
      [`${prefix}-Remaining`]: remaining.toString(),
      [`${prefix}-Reset`]: Math.ceil(resetTime / 1000).toString(),
      [`${prefix}-Reset-After`]: Math.ceil(
        (resetTime - Date.now()) / 1000
      ).toString(),
    };
  }

  /**
   * Get all available rate limit types and their descriptions
   */
  static getAvailableTypes(): Record<RateLimitType, string> {
    const types = {} as Record<RateLimitType, string>;

    Object.entries(this.CONFIGS).forEach(([type, config]) => {
      types[type as RateLimitType] = config.description;
    });

    return types;
  }

  /**
   * Get comprehensive rate limit status for debugging
   */
  static async getRateLimitStatus(
    identifier: string,
    endpoint: string,
    type: RateLimitType = "api"
  ): Promise<{
    normal: {
      current: number;
      limit: number;
      remaining: number;
      resetTime: number;
    };
    burst: {
      current: number;
      limit: number;
      remaining: number;
      resetTime: number;
    };
    config: any;
  }> {
    const config = this.getConfig(type);
    const now = Date.now();

    const normalWindow = Math.floor(now / config.windowMs);
    const normalKey = `rate_limit:${type}:normal:${identifier}:${endpoint}:${normalWindow}`;

    const burstWindow = Math.floor(now / (config.burstWindowMs || 60000));
    const burstKey = `rate_limit:${type}:burst:${identifier}:${endpoint}:${burstWindow}`;

    try {
      const [normalCurrent, burstCurrent] = await Promise.all([
        redis.get(normalKey).then((val) => parseInt(val as string) || 0),
        redis.get(burstKey).then((val) => parseInt(val as string) || 0),
      ]);

      return {
        normal: {
          current: normalCurrent,
          limit: config.maxAttempts,
          remaining: Math.max(0, config.maxAttempts - normalCurrent),
          resetTime: (normalWindow + 1) * config.windowMs,
        },
        burst: {
          current: burstCurrent,
          limit: config.burstLimit || 0,
          remaining: Math.max(0, (config.burstLimit || 0) - burstCurrent),
          resetTime: (burstWindow + 1) * (config.burstWindowMs || 60000),
        },
        config,
      };
    } catch (error) {
      DevUtils.log.error("Failed to get rate limit status", error);
      throw error;
    }
  }
}
