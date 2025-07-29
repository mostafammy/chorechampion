import { IS_DEV } from "@/lib/utils";

/**
 * Enhanced Development Utilities for ChoreChampion
 * Provides rich developer experience while maintaining strict production security
 */

interface DevConfig {
  enableVerboseLogging: boolean;
  enableSecurityBypass: boolean;
  enableMockData: boolean;
  enablePerformanceMetrics: boolean;
  enableDebugEndpoints: boolean;
  maxLogLevel: "error" | "warn" | "info" | "debug" | "trace";
}

interface ProdConfig {
  enforceRateLimit: boolean;
  enforceStrictHeaders: boolean;
  enableSecurityLogging: boolean;
  enableAuditTrail: boolean;
  enableFailClosed: boolean; // Fail closed on security errors
  minLogLevel: "error" | "warn" | "info";
}

class EnvironmentManager {
  private static devConfig: DevConfig = {
    enableVerboseLogging: true,
    enableSecurityBypass: true, // For easier testing
    enableMockData: true,
    enablePerformanceMetrics: true,
    enableDebugEndpoints: true,
    maxLogLevel: "trace",
  };

  private static prodConfig: ProdConfig = {
    enforceRateLimit: true,
    enforceStrictHeaders: true,
    enableSecurityLogging: true,
    enableAuditTrail: true,
    enableFailClosed: true,
    minLogLevel: "warn",
  };

  /**
   * Development-friendly logging with production silence
   */
  static log = {
    error: (message: string, ...args: any[]) => {
      console.error(`🚨 [ERROR] ${message}`, ...args);
    },

    warn: (message: string, ...args: any[]) => {
      if (IS_DEV || this.prodConfig.minLogLevel === "warn") {
        console.warn(`⚠️  [WARN] ${message}`, ...args);
      }
    },

    info: (message: string, ...args: any[]) => {
      if (IS_DEV) {
        console.info(`ℹ️  [INFO] ${message}`, ...args);
      }
    },

    debug: (message: string, ...args: any[]) => {
      if (IS_DEV && this.devConfig.enableVerboseLogging) {
        console.debug(`🐛 [DEBUG] ${message}`, ...args);
      }
    },

    trace: (message: string, ...args: any[]) => {
      if (IS_DEV && this.devConfig.maxLogLevel === "trace") {
        console.trace(`🔍 [TRACE] ${message}`, ...args);
      }
    },

    security: (event: string, metadata: any) => {
      if (IS_DEV) {
        console.warn(`🔒 [SECURITY] ${event}:`, metadata);
      } else if (this.prodConfig.enableSecurityLogging) {
        // In production: send to security monitoring (DataDog, Splunk, etc.)
        console.warn(`[SECURITY] ${event}`, JSON.stringify(metadata));
      }
    },

    audit: (action: string, user: any, metadata: any) => {
      if (IS_DEV) {
        console.log(`📝 [AUDIT] ${action} by ${user?.email}:`, metadata);
      } else if (this.prodConfig.enableAuditTrail) {
        // In production: send to audit log service
        console.log(
          `[AUDIT] ${action}`,
          JSON.stringify({ user: user?.id, ...metadata })
        );
      }
    },
  };

  /**
   * Performance monitoring with dev metrics
   */
  static performance = {
    start: (operation: string): { end: () => void } => {
      const startTime = Date.now();

      if (IS_DEV && this.devConfig.enablePerformanceMetrics) {
        console.time(`⚡ [PERF] ${operation}`);
      }

      return {
        end: () => {
          const duration = Date.now() - startTime;

          if (IS_DEV && this.devConfig.enablePerformanceMetrics) {
            console.timeEnd(`⚡ [PERF] ${operation}`);
            if (duration > 1000) {
              console.warn(
                `🐌 [PERF] Slow operation: ${operation} took ${duration}ms`
              );
            }
          }

          // In production: send to APM tools
          if (!IS_DEV && duration > 5000) {
            console.warn(`[PERF] Slow operation: ${operation} - ${duration}ms`);
          }
        },
      };
    },
  };

  /**
   * Development data mocking
   */
  static mockData = {
    enabled: IS_DEV && this.devConfig.enableMockData,

    user: () =>
      this.mockData.enabled
        ? {
            id: "dev-user-123",
            email: "dev@example.com",
            role: "admin",
            permissions: ["all"],
          }
        : null,

    task: () =>
      this.mockData.enabled
        ? {
            id: "dev-task-123",
            name: "Development Task",
            score: 100,
            period: "daily" as const,
            assigneeId: "dev-user-123",
          }
        : null,
  };

  /**
   * Rate limiting with dev bypass
   */
  static rateLimit = {
    shouldBypass: (reason: string): boolean => {
      if (IS_DEV && this.devConfig.enableSecurityBypass) {
        this.log.debug(`Rate limit bypassed in development: ${reason}`);
        return true;
      }
      return false;
    },

    getDevLimits: () =>
      IS_DEV
        ? {
            auth: { maxAttempts: 1000, windowMs: 60000 },
            api: { maxAttempts: 10000, windowMs: 60000 },
            admin: { maxAttempts: 1000, windowMs: 60000 },
          }
        : null,

    getProdLimits: () =>
      !IS_DEV
        ? {
            auth: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
            api: { maxAttempts: 100, windowMs: 60 * 1000 },
            admin: { maxAttempts: 10, windowMs: 60 * 1000 },
          }
        : null,
  };

  /**
   * Security configuration
   */
  static security = {
    shouldEnforceHeaders: (): boolean => {
      return !IS_DEV || this.prodConfig.enforceStrictHeaders;
    },

    shouldFailClosed: (operation: string): boolean => {
      if (IS_DEV) {
        this.log.debug(`Fail-open enabled for development: ${operation}`);
        return false;
      }
      return this.prodConfig.enableFailClosed;
    },

    getCSPPolicy: (): string => {
      if (IS_DEV) {
        // Relaxed CSP for development
        return `
          default-src 'self' 'unsafe-inline' 'unsafe-eval';
          connect-src 'self' ws: wss: http: https:;
          img-src 'self' data: blob: http: https:;
        `
          .replace(/\s+/g, " ")
          .trim();
      }

      // Strict CSP for production
      return `
        default-src 'self';
        script-src 'self' 'wasm-unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self' https://api.upstash.io;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
      `
        .replace(/\s+/g, " ")
        .trim();
    },
  };

  /**
   * Validation helpers
   */
  static validation = {
    skipInDev: (validationName: string): boolean => {
      if (IS_DEV && this.devConfig.enableSecurityBypass) {
        this.log.debug(`Validation bypassed in development: ${validationName}`);
        return true;
      }
      return false;
    },

    getMaxStringLength: (): number => (IS_DEV ? 10000 : 1000),
    getMaxFileSize: (): number =>
      IS_DEV ? 100 * 1024 * 1024 : 5 * 1024 * 1024, // 100MB dev, 5MB prod
    getMaxRequestSize: (): number =>
      IS_DEV ? 50 * 1024 * 1024 : 1 * 1024 * 1024, // 50MB dev, 1MB prod
  };

  /**
   * Error handling configuration
   */
  static errors = {
    getDetailLevel: (): "minimal" | "detailed" | "verbose" => {
      if (IS_DEV) return "verbose";
      return "minimal";
    },

    shouldExposeStack: (): boolean => IS_DEV,

    formatError: (error: Error, context?: string): any => {
      const baseError = {
        message: error.message,
        timestamp: new Date().toISOString(),
        context,
      };

      if (IS_DEV) {
        return {
          ...baseError,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
        };
      }

      return baseError;
    },
  };

  /**
   * Environment-specific configurations
   */
  static getEnvironmentConfig = () => ({
    isDevelopment: IS_DEV,
    isProduction: !IS_DEV,
    nodeEnv: process.env.NODE_ENV,

    // Development features
    ...(!IS_DEV
      ? {}
      : {
          enableDebugEndpoints: this.devConfig.enableDebugEndpoints,
          enableMockData: this.devConfig.enableMockData,
          enableVerboseLogging: this.devConfig.enableVerboseLogging,
          hotReload: true,
          sourceMapEnabled: true,
        }),

    // Production features
    ...(IS_DEV
      ? {}
      : {
          enforceHTTPS: true,
          enableSecurityHeaders: true,
          enableRateLimit: this.prodConfig.enforceRateLimit,
          enableAuditTrail: this.prodConfig.enableAuditTrail,
          compressionEnabled: true,
          minifyOutput: true,
        }),
  });
}

export { EnvironmentManager as DevUtils };
