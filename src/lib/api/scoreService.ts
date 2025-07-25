/**
 * Score Service - Handles all score-related API operations with enterprise authentication
 *
 * This service provides:
 * - Automatic token refresh on authentication failures
 * - Proper error handling with user-friendly messages
 * - Request correlation for debugging
 * - Retry logic for transient failures
 * - Type-safe interfaces
 */

import {
  fetchWithAuth,
  AuthenticationError,
  SessionExpiredError,
} from "@/lib/auth/fetchWithAuth";
import { AdjustScoreInput } from "@/types";

export interface ScoreAdjustmentResult {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  correlationId?: string;
}

export interface ScoreServiceOptions {
  /**
   * Maximum number of retry attempts for score operations
   * @default 2
   */
  maxRetries?: number;

  /**
   * Whether to show user-friendly error messages
   * @default true
   */
  userFriendlyErrors?: boolean;

  /**
   * Custom correlation ID for request tracking
   */
  correlationId?: string;

  /**
   * Timeout in milliseconds for the request
   * @default 10000 (10 seconds)
   */
  timeout?: number;
}

/**
 * Enterprise-grade score service with automatic authentication handling
 */
export class ScoreService {
  private static readonly DEFAULT_OPTIONS: Required<ScoreServiceOptions> = {
    maxRetries: 2,
    userFriendlyErrors: true,
    correlationId: "",
    timeout: 10000,
  };

  /**
   * Adjusts a user's score with automatic authentication handling
   */
  static async adjustScore(
    input: AdjustScoreInput,
    options: ScoreServiceOptions = {}
  ): Promise<ScoreAdjustmentResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const correlationId =
      config.correlationId ||
      this.generateCorrelationId("adjust-score", input.userId);

    try {
      const response = await fetchWithAuth("/api/AdjustScore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        correlationId,
        maxRetries: config.maxRetries,
        signal: this.createTimeoutSignal(config.timeout),
        onRefreshError: (error) => {
          console.warn(
            "[ScoreService] Token refresh failed during score adjustment:",
            {
              userId: input.userId,
              correlationId,
              error,
            }
          );
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = config.userFriendlyErrors
          ? this.getUserFriendlyErrorMessage(response.status, errorData.error)
          : errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`;

        return {
          success: false,
          error: errorMessage,
          errorCode: errorData.errorCode || `HTTP_${response.status}`,
          correlationId,
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        correlationId,
      };
    } catch (error: any) {
      console.error("[ScoreService] Score adjustment failed:", {
        userId: input.userId,
        correlationId,
        error: error.message,
        stack: error.stack,
      });

      return this.handleError(error, correlationId, config.userFriendlyErrors);
    }
  }

  /**
   * Batch adjust scores for multiple users (useful for task completion scenarios)
   */
  static async batchAdjustScores(
    adjustments: AdjustScoreInput[],
    options: ScoreServiceOptions = {}
  ): Promise<ScoreAdjustmentResult[]> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    // Execute adjustments in parallel with controlled concurrency
    const CONCURRENCY_LIMIT = 5;
    const results: ScoreAdjustmentResult[] = [];

    for (let i = 0; i < adjustments.length; i += CONCURRENCY_LIMIT) {
      const batch = adjustments.slice(i, i + CONCURRENCY_LIMIT);
      const batchPromises = batch.map((adjustment, index) =>
        this.adjustScore(adjustment, {
          ...config,
          correlationId:
            config.correlationId ||
            this.generateCorrelationId("batch-adjust", `${i + index}`),
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      const processedResults = batchResults.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : ({
              success: false,
              error: "Batch processing failed",
              errorCode: "BATCH_ERROR",
            } as ScoreAdjustmentResult)
      );

      results.push(...processedResults);
    }

    return results;
  }

  /**
   * Validates score adjustment before executing (useful for UI validation)
   */
  static validateScoreAdjustment(input: AdjustScoreInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.userId || typeof input.userId !== "string") {
      errors.push("User ID is required and must be a string");
    }

    if (typeof input.delta !== "number" || isNaN(input.delta)) {
      errors.push("Delta must be a valid number");
    }

    if (Math.abs(input.delta) > 1000) {
      errors.push("Score adjustment cannot exceed ±1000 points");
    }

    if (!input.source || typeof input.source !== "string") {
      errors.push("Source is required and must be a string");
    }

    const validSources = ["manual", "task", "bonus", "penalty", "system"];
    if (input.source && !validSources.includes(input.source)) {
      errors.push(`Source must be one of: ${validSources.join(", ")}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handles different types of errors with appropriate user messaging
   */
  private static handleError(
    error: any,
    correlationId: string,
    userFriendlyErrors: boolean
  ): ScoreAdjustmentResult {
    if (error instanceof SessionExpiredError) {
      return {
        success: false,
        error: userFriendlyErrors
          ? "Your session has expired. Please refresh the page and try again."
          : error.message,
        errorCode: "SESSION_EXPIRED",
        correlationId,
      };
    }

    if (error instanceof AuthenticationError) {
      return {
        success: false,
        error: userFriendlyErrors
          ? "Authentication failed. Please refresh the page and try again."
          : error.message,
        errorCode: "AUTHENTICATION_ERROR",
        correlationId,
      };
    }

    if (error.name === "AbortError") {
      return {
        success: false,
        error: userFriendlyErrors
          ? "The request timed out. Please try again."
          : "Request timeout",
        errorCode: "TIMEOUT",
        correlationId,
      };
    }

    // Network or other errors
    return {
      success: false,
      error: userFriendlyErrors
        ? "Failed to adjust score. Please check your connection and try again."
        : error?.message || "Unknown error occurred",
      errorCode: "NETWORK_ERROR",
      correlationId,
    };
  }

  /**
   * Converts HTTP status codes to user-friendly messages
   */
  private static getUserFriendlyErrorMessage(
    status: number,
    originalError?: string
  ): string {
    switch (status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "You are not authorized. Please refresh the page and try again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error occurred. Please try again later.";
      case 503:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return (
          originalError || `An error occurred (${status}). Please try again.`
        );
    }
  }

  /**
   * Generates a correlation ID for request tracking
   */
  private static generateCorrelationId(
    operation: string,
    identifier: string
  ): string {
    return `${operation}-${identifier}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Creates an AbortSignal with the specified timeout
   */
  private static createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }
}

/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use ScoreService.adjustScore instead
 */
export async function fetchAdjustScoreApi(input: AdjustScoreInput): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const result = await ScoreService.adjustScore(input);
  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

/**
 * Factory function to create a configured score service for specific environments
 */
export function createScoreService(
  environment: "development" | "staging" | "production"
) {
  const environmentDefaults = {
    development: { maxRetries: 1, timeout: 15000, userFriendlyErrors: false },
    staging: { maxRetries: 2, timeout: 10000, userFriendlyErrors: true },
    production: { maxRetries: 3, timeout: 8000, userFriendlyErrors: true },
  };

  const config = environmentDefaults[environment];

  return {
    adjustScore: (
      input: AdjustScoreInput,
      options?: Omit<ScoreServiceOptions, keyof typeof config>
    ) => ScoreService.adjustScore(input, { ...config, ...options }),

    batchAdjustScores: (
      adjustments: AdjustScoreInput[],
      options?: Omit<ScoreServiceOptions, keyof typeof config>
    ) => ScoreService.batchAdjustScores(adjustments, { ...config, ...options }),

    validateScoreAdjustment: ScoreService.validateScoreAdjustment,
  };
}
