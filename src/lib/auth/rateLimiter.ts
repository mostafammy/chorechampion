/**
 * Legacy Rate Limiter - Enhanced with New System Integration
 * This file maintains backwards compatibility while providing access to the new enhanced system
 */

import { Redis } from "@upstash/redis";
import { IS_DEV } from "@/lib/utils";
import { DevUtils } from "@/lib/dev/environmentUtils";
import {
  RateLimitManager,
  RateLimitType,
} from "@/lib/security/rateLimitManager";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limitType?: string;
  bypassReason?: string; // Development bypass explanation
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  burstLimit?: number;
  burstWindowMs?: number;
}

/**
 * Legacy rate limiting function - enhanced with new system
 * @deprecated Use RateLimitManager.checkRateLimit() for new implementations
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 20, // Increased for development
  windowMs: number = 5 * 60 * 1000 // 5 minutes (shorter window)
): Promise<RateLimitResult> {
  DevUtils.log.debug("Legacy checkRateLimit called", {
    identifier,
    maxAttempts,
    windowMs,
    recommendation: "Consider migrating to RateLimitManager.checkRateLimit()",
  });

  // Use the new enhanced system under the hood
  const result = await RateLimitManager.checkRateLimit(
    identifier,
    "legacy-endpoint",
    "api",
    {
      maxAttempts,
      windowMs,
      identifier,
      endpoint: "legacy-endpoint",
      type: "api",
    }
  );

  // Convert to legacy format
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    limitType: result.limitType,
    bypassReason: result.bypassReason,
  };
}

/**
 * Enhanced rate limiting for different endpoint types
 * @deprecated Use RateLimitManager.checkRateLimit() directly
 */
export async function checkEndpointRateLimit(
  identifier: string,
  endpoint: string,
  endpointType: "auth" | "api" | "admin" = "api"
): Promise<RateLimitResult> {
  DevUtils.log.debug("Legacy checkEndpointRateLimit called", {
    identifier,
    endpoint,
    endpointType,
    recommendation: "Consider migrating to RateLimitManager.checkRateLimit()",
  });

  // Map legacy types to new types
  const typeMapping: Record<string, RateLimitType> = {
    auth: "auth",
    api: "api",
    admin: "admin",
  };

  const rateLimitType = typeMapping[endpointType] || "api";

  // Use the new enhanced system
  const result = await RateLimitManager.checkRateLimit(
    identifier,
    endpoint,
    rateLimitType
  );

  // Convert to legacy format
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    limitType: result.limitType,
    bypassReason: result.bypassReason,
  };
}

/**
 * Legacy function - keeping for backwards compatibility
 * @deprecated Use RateLimitManager.checkRateLimit() for new implementations
 */
export async function recordFailedAttempt(identifier: string): Promise<void> {
  DevUtils.log.debug("Legacy recordFailedAttempt called", {
    identifier,
    recommendation:
      "Consider using RateLimitManager.checkRateLimit() with specific configuration",
  });

  await checkRateLimit(identifier);
}

// =============================================================================
// ENHANCED EXPORTS - New functions that provide access to the enhanced system
// =============================================================================

/**
 * Enhanced rate limiting with full feature support
 * Use this for new implementations
 */
export const enhancedRateLimit = {
  /**
   * Check rate limit with full configuration options
   */
  check: RateLimitManager.checkRateLimit.bind(RateLimitManager),

  /**
   * Get rate limit status for debugging
   */
  getStatus: RateLimitManager.getRateLimitStatus.bind(RateLimitManager),

  /**
   * Get available rate limit types
   */
  getTypes: RateLimitManager.getAvailableTypes.bind(RateLimitManager),

  /**
   * Get configuration for a specific type
   */
  getConfig: RateLimitManager.getConfig.bind(RateLimitManager),
};

/**
 * Migration helper - shows how to migrate from legacy to enhanced
 */
export const migrationHelper = {
  /**
   * Convert legacy checkRateLimit call to enhanced version
   */
  convertLegacyCall: (
    identifier: string,
    maxAttempts: number,
    windowMs: number
  ) => {
    return {
      oldCall: `checkRateLimit("${identifier}", ${maxAttempts}, ${windowMs})`,
      newCall: `RateLimitManager.checkRateLimit("${identifier}", "endpoint-name", "api", { maxAttempts: ${maxAttempts}, windowMs: ${windowMs} })`,
      benefits: [
        "Burst protection included",
        "Better error handling",
        "Enhanced logging",
        "Environment-aware configuration",
        "Standardized response headers",
      ],
    };
  },

  /**
   * Show available endpoint types and their configurations
   */
  showEndpointTypes: () => {
    return RateLimitManager.getAvailableTypes();
  },

  /**
   * Generate migration example for specific endpoint
   */
  generateMigrationExample: (endpoint: string, type: RateLimitType = "api") => {
    const config = RateLimitManager.getConfig(type);

    return {
      endpoint,
      type,
      config,
      exampleCode: `
// OLD WAY (legacy):
const result = await checkEndpointRateLimit(identifier, "${endpoint}", "${type}");

// NEW WAY (enhanced):
const result = await RateLimitManager.checkRateLimit(
  identifier, 
  "${endpoint}", 
  "${type}"
);

// With custom configuration:
const result = await RateLimitManager.checkRateLimit(
  identifier, 
  "${endpoint}", 
  "${type}",
  {
    maxAttempts: ${config.maxAttempts},
    windowMs: ${config.windowMs},
    burstLimit: ${config.burstLimit || "undefined"},
    burstWindowMs: ${config.burstWindowMs || "undefined"}
  }
);
      `.trim(),
    };
  },
};

// =============================================================================
// DEVELOPMENT UTILITIES
// =============================================================================

if (IS_DEV) {
  /**
   * Development-only utilities for testing and debugging
   */
  (globalThis as any).rateLimitDebug = {
    legacy: {
      checkRateLimit,
      checkEndpointRateLimit,
      recordFailedAttempt,
    },
    enhanced: enhancedRateLimit,
    migration: migrationHelper,

    /**
     * Test rate limiting with different configurations
     */
    test: async (identifier: string = "test-user") => {
      console.log("🧪 Testing Rate Limiting System");
      console.log("================================");

      // Test different endpoint types
      const types: RateLimitType[] = [
        "auth",
        "api",
        "admin",
        "upload",
        "search",
      ];

      for (const type of types) {
        console.log(`\n📊 Testing ${type.toUpperCase()} endpoint:`);

        const result = await RateLimitManager.checkRateLimit(
          identifier,
          `/test/${type}`,
          type
        );

        console.log(`  ✅ Allowed: ${result.allowed}`);
        console.log(`  📋 Remaining: ${result.remaining}`);
        console.log(`  ⏰ Reset: ${new Date(result.resetTime).toISOString()}`);
        console.log(`  🏷️ Headers:`, result.headers);

        if (result.bypassReason) {
          console.log(`  🔧 Bypass: ${result.bypassReason}`);
        }
      }

      console.log("\n💡 Migration Examples:");
      console.log(
        migrationHelper.generateMigrationExample("/api/tasks/add", "api")
          .exampleCode
      );

      return "Rate limiting test completed - check console for results";
    },

    /**
     * Show current configuration
     */
    showConfig: () => {
      console.log("⚙️ Current Rate Limiting Configuration");
      console.log("=====================================");

      const types = RateLimitManager.getAvailableTypes();

      Object.entries(types).forEach(([type, description]) => {
        const config = RateLimitManager.getConfig(type as RateLimitType);
        console.log(`\n${type.toUpperCase()}: ${description}`);
        console.log(
          `  📈 Limits: ${config.maxAttempts} requests per ${Math.floor(
            config.windowMs / 1000
          )}s`
        );
        if (config.burstLimit) {
          console.log(
            `  💥 Burst: ${config.burstLimit} requests per ${Math.floor(
              (config.burstWindowMs || 0) / 1000
            )}s`
          );
        }
      });

      return "Configuration displayed - check console for details";
    },
  };

  console.log("🚀 Rate Limiting Debug Tools Available:");
  console.log("  - rateLimitDebug.test() - Test all endpoint types");
  console.log("  - rateLimitDebug.showConfig() - Show current configuration");
  console.log("  - rateLimitDebug.migration - Migration helpers");
  console.log("  - rateLimitDebug.enhanced - Enhanced rate limiting functions");
}
