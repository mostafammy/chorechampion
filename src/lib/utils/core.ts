/**
 * ✅ ENTERPRISE CORE UTILITIES
 *
 * Minimal, focused utilities following Single Responsibility Principle.
 * Zero dependencies on business logic, maintaining maximum reusability.
 *
 * @module CoreUtils
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * ✅ SINGLE RESPONSIBILITY: CSS Class Merging
 *
 * Combines clsx and tailwind-merge for optimal class handling.
 * Provides intelligent Tailwind CSS class deduplication and merging.
 *
 * @param inputs - Variable number of class value inputs
 * @returns Merged and deduplicated class string
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', 'px-4', { 'bg-red-500': isError })
 * // Result: 'py-1 px-4 bg-red-500'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * ✅ ENVIRONMENT CONFIGURATION
 *
 * Type-safe environment detection with proper fallbacks.
 * Centralized configuration for environment-specific behavior.
 */
export const Environment = {
  /** Development mode detection */
  isDevelopment: process.env.NODE_ENV === "development",

  /** Production mode detection */
  isProduction: process.env.NODE_ENV === "production",

  /** Test mode detection */
  isTest: process.env.NODE_ENV === "test",

  /** Server-side rendering detection */
  isServer: typeof window === "undefined",

  /** Client-side detection */
  isClient: typeof window !== "undefined",
} as const;

/**
 * ✅ TYPE-SAFE ENVIRONMENT ACCESS
 *
 * Legacy compatibility export
 * @deprecated Use Environment.isDevelopment instead
 */
export const IS_DEV = Environment.isDevelopment;

/**
 * ✅ PERFORMANCE: MEMOIZED ENVIRONMENT CHECKS
 *
 * Pre-computed environment flags for performance-critical paths
 */
export const EnvFlags = Object.freeze({
  DEV: Environment.isDevelopment,
  PROD: Environment.isProduction,
  SSR: Environment.isServer,
  CSR: Environment.isClient,
} as const);

/**
 * ✅ TYPE GUARDS FOR RUNTIME SAFETY
 *
 * Utility functions for type-safe runtime checks
 */
export const TypeGuards = {
  /**
   * Check if value is a non-empty string
   */
  isNonEmptyString: (value: unknown): value is string => {
    return typeof value === "string" && value.trim().length > 0;
  },

  /**
   * Check if value is a valid Date object
   */
  isValidDate: (value: unknown): value is Date => {
    return value instanceof Date && !isNaN(value.getTime());
  },

  /**
   * Check if value is a non-null object
   */
  isObject: (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  },

  /**
   * Check if value is a valid number (not NaN, not Infinity)
   */
  isValidNumber: (value: unknown): value is number => {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
  },
} as const;

/**
 * ✅ PERFORMANCE UTILITIES
 *
 * Utilities for performance optimization and monitoring
 */
export const Performance = {
  /**
   * Debounce function execution
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function execution
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(
    label: string,
    fn: () => Promise<T> | T
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();

      if (Environment.isDevelopment) {
        console.log(
          `⏱️ [${label}] Execution time: ${(end - start).toFixed(2)}ms`
        );
      }

      return result;
    } catch (error) {
      const end = performance.now();

      if (Environment.isDevelopment) {
        console.error(
          `❌ [${label}] Failed after ${(end - start).toFixed(2)}ms:`,
          error
        );
      }

      throw error;
    }
  },
} as const;

/**
 * ✅ ERROR HANDLING UTILITIES
 *
 * Standardized error handling and logging
 */
export class CoreError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CoreError";
  }

  /**
   * Convert error to serializable object for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * ✅ SAFE ASYNC WRAPPER
 *
 * Wraps async operations with proper error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<[T | null, CoreError | null]> {
  try {
    const result = await operation();
    return [result, null];
  } catch (error) {
    const coreError =
      error instanceof CoreError
        ? error
        : new CoreError(
            error instanceof Error ? error.message : "Unknown error",
            "SAFE_ASYNC_ERROR",
            { originalError: error }
          );

    return [fallback ?? null, coreError];
  }
}

/**
 * ✅ VALIDATION HELPERS
 *
 * Common validation patterns
 */
export const Validators = {
  /**
   * Validate required string field
   */
  requireString: (value: unknown, fieldName: string): string => {
    if (!TypeGuards.isNonEmptyString(value)) {
      throw new CoreError(
        `${fieldName} is required and must be a non-empty string`,
        "VALIDATION_ERROR",
        { fieldName, receivedValue: value }
      );
    }
    return value;
  },

  /**
   * Validate required number field
   */
  requireNumber: (value: unknown, fieldName: string): number => {
    if (!TypeGuards.isValidNumber(value)) {
      throw new CoreError(
        `${fieldName} is required and must be a valid number`,
        "VALIDATION_ERROR",
        { fieldName, receivedValue: value }
      );
    }
    return value;
  },

  /**
   * Validate required date field
   */
  requireDate: (value: unknown, fieldName: string): Date => {
    if (!TypeGuards.isValidDate(value)) {
      throw new CoreError(
        `${fieldName} is required and must be a valid Date`,
        "VALIDATION_ERROR",
        { fieldName, receivedValue: value }
      );
    }
    return value;
  },
} as const;

/**
 * ✅ EXPORT TYPE DEFINITIONS
 *
 * Re-export commonly used types for convenience
 */
export type { ClassValue } from "clsx";
export type CoreEnvironment = typeof Environment;
export type CoreTypeGuards = typeof TypeGuards;
export type CoreValidators = typeof Validators;
