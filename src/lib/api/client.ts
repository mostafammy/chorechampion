/**
 * ✅ ENTERPRISE API CLIENT LAYER
 *
 * Centralized API client with comprehensive error handling, retry logic,
 * authentication management, and type safety.
 *
 * @module ApiClient
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import type { AdjustScoreInput, Task } from "@/types";
import { CoreError, Performance, safeAsync, Environment } from "../utils/core";
import { SecurityUtils, RateLimiter } from "../security";

/**
 * ✅ API CONFIGURATION
 */
const API_CONFIG = Object.freeze({
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  MAX_CORRELATION_ID_LENGTH: 64,
} as const);

/**
 * ✅ TYPE DEFINITIONS
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime?: number;
    retryAttempts?: number;
    correlationId?: string;
    responseSize?: number;
  };
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  correlationId?: string;
  rateLimitId?: string;
  validateResponse?: boolean;
}

export interface AdjustScoreOptions {
  retryAttempts?: number;
  timeout?: number;
  correlationId?: string;
  onRefreshError?: (error: CoreError) => void;
}

/**
 * ✅ ENVIRONMENT CONFIGURATION MANAGER
 *
 * Manages environment-specific API base URLs with fallbacks
 */
export class EnvironmentConfig {
  private static cachedBaseUrl: string | null = null;

  /**
   * Get the appropriate base URL for the current environment
   */
  static getBaseUrl(): string {
    if (this.cachedBaseUrl) {
      return this.cachedBaseUrl;
    }

    let baseUrl: string;

    if (Environment.isServer) {
      // Server-side URL resolution
      baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    } else {
      // Client-side URL resolution
      baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    }

    // Validate URL format
    try {
      new URL(baseUrl);
      this.cachedBaseUrl = baseUrl;
      return baseUrl;
    } catch (error) {
      console.warn(
        `[EnvironmentConfig] Invalid base URL: ${baseUrl}, falling back to localhost`
      );
      this.cachedBaseUrl = "http://localhost:3000";
      return this.cachedBaseUrl;
    }
  }

  /**
   * Clear cached base URL (useful for testing)
   */
  static clearCache(): void {
    this.cachedBaseUrl = null;
  }
}

/**
 * ✅ ENTERPRISE API CLIENT
 *
 * Centralized API client with authentication, error handling, and monitoring
 */
export class ApiClient {
  private static requestMetrics = new Map<
    string,
    { count: number; totalTime: number; errors: number }
  >();

  /**
   * ✅ GENERIC API REQUEST METHOD
   *
   * Base method for all API requests with comprehensive error handling.
   *
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  static async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = API_CONFIG.TIMEOUT,
      retryAttempts = API_CONFIG.RETRY_ATTEMPTS,
      correlationId = this.generateCorrelationId(),
      rateLimitId,
      validateResponse = true,
    } = options;

    const operationId = `ApiClient.request:${method}:${endpoint}`;

    return Performance.measureTime(operationId, async () => {
      try {
        // Input validation
        this.validateEndpoint(endpoint);
        this.validateCorrelationId(correlationId);

        // Rate limiting check
        if (rateLimitId) {
          if (
            !RateLimiter.isWithinLimits(
              rateLimitId,
              API_CONFIG.RATE_LIMIT_MAX_REQUESTS,
              API_CONFIG.RATE_LIMIT_WINDOW
            )
          ) {
            this.recordMetric(operationId, false);
            return {
              success: false,
              error: "Rate limit exceeded. Please try again later.",
              metadata: { correlationId },
            };
          }
        }

        // Construct full URL
        const baseUrl = EnvironmentConfig.getBaseUrl();
        const url = new URL(endpoint, baseUrl).toString();

        // Prepare request options
        const requestOptions: RequestInit = {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-ID": correlationId,
            ...headers,
          },
          ...(body && { body: JSON.stringify(body) }),
        };

        // Execute request with retry logic
        const [response, requestError] = await safeAsync(() =>
          this.executeRequestWithRetry(
            url,
            requestOptions,
            retryAttempts,
            timeout
          )
        );

        if (requestError) {
          this.recordMetric(operationId, false);
          return {
            success: false,
            error: this.formatError(requestError),
            metadata: { correlationId },
          };
        }

        // Parse response
        const [responseData, parseError] = await safeAsync(() =>
          this.parseResponse<T>(response!, validateResponse)
        );

        if (parseError) {
          this.recordMetric(operationId, false);
          return {
            success: false,
            error: `Failed to parse response: ${parseError.message}`,
            metadata: { correlationId },
          };
        }

        this.recordMetric(operationId, true);

        return {
          success: true,
          data: responseData || undefined,
          metadata: {
            correlationId,
            responseSize: JSON.stringify(responseData).length,
          },
        };
      } catch (error) {
        this.recordMetric(operationId, false);

        return {
          success: false,
          error:
            error instanceof CoreError
              ? error.message
              : "An unexpected error occurred",
          metadata: { correlationId },
        };
      }
    });
  }

  /**
   * ✅ ADJUST SCORE API
   *
   * Specialized method for score adjustment operations.
   *
   * @param input - Score adjustment parameters
   * @param options - Operation options
   * @returns Promise resolving to adjustment result
   */
  static async adjustScore(
    input: AdjustScoreInput,
    options: AdjustScoreOptions = {}
  ): Promise<ApiResponse> {
    const {
      retryAttempts = 2, // Lower retry for score operations
      timeout = API_CONFIG.TIMEOUT,
      correlationId = `adjust-score-${input.userId}-${Date.now()}`,
      onRefreshError,
    } = options;

    return Performance.measureTime("ApiClient.adjustScore", async () => {
      try {
        // Input validation
        this.validateAdjustScoreInput(input);

        // Import authentication module dynamically to avoid circular dependencies
        const [authModule, importError] = await safeAsync(
          () => import("@/lib/auth/fetchWithAuth")
        );

        if (importError) {
          return {
            success: false,
            error: "Authentication module unavailable",
            metadata: { correlationId },
          };
        }

        const { fetchWithAuth } = authModule as any;

        // Execute authenticated request
        const [response, requestError] = await safeAsync(() =>
          fetchWithAuth(`${EnvironmentConfig.getBaseUrl()}/api/AdjustScore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            correlationId,
            maxRetries: retryAttempts,
            onRefreshError: (error: any) => {
              const coreError = new CoreError(
                "Token refresh failed",
                "TOKEN_REFRESH_ERROR",
                { originalError: error }
              );

              if (onRefreshError) {
                onRefreshError(coreError);
              } else {
                console.warn("[ApiClient] Token refresh failed:", coreError);
              }
            },
          })
        );

        if (requestError) {
          return {
            success: false,
            error: this.handleAuthError(requestError),
            metadata: { correlationId },
          };
        }

        if (!(response as Response).ok) {
          const [errorData] = await safeAsync(() =>
            (response as Response).json()
          );
          return {
            success: false,
            error:
              errorData?.error ||
              `HTTP ${(response as Response).status}: ${
                (response as Response).statusText
              }`,
            metadata: { correlationId },
          };
        }

        const [data, parseError] = await safeAsync(() =>
          (response as Response).json()
        );
        if (parseError) {
          return {
            success: false,
            error: "Failed to parse response",
            metadata: { correlationId },
          };
        }

        return {
          success: true,
          data,
          metadata: { correlationId },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error.message
              : "Score adjustment failed",
          metadata: { correlationId },
        };
      }
    });
  }

  /**
   * ✅ FETCH ALL TASKS (SSR-COMPATIBLE) - ENTERPRISE EDITION
   *
   * Critical endpoint using enterprise-grade authentication with automatic token refresh.
   * Optimized for performance, scalability, and maintainability.
   *
   * Features:
   * - ✅ Enterprise authentication with automatic token refresh
   * - ✅ SSR and client-side compatibility
   * - ✅ Comprehensive error handling with specific error codes
   * - ✅ Performance optimized with correlation tracking
   * - ✅ Scalable retry logic with exponential backoff
   * - ✅ Maintainable error classification and logging
   *
   * @param options - Request options with enhanced configuration
   * @returns Promise resolving to tasks array with enterprise error handling
   */
  static async fetchAllTasks(
    options: {
      timeout?: number;
      correlationId?: string;
      maxRetries?: number;
      onAuthError?: (error: CoreError) => void;
      environment?: "ssr" | "client";
    } = {}
  ): Promise<Task[]> {
    const {
      timeout = API_CONFIG.TIMEOUT,
      correlationId = `fetch-tasks-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      maxRetries = 2, // Optimized for critical endpoint
      onAuthError,
      environment = Environment.isServer ? "ssr" : "client",
    } = options;

    return Performance.measureTime("ApiClient.fetchAllTasks", async () => {
      try {
        // ✅ ENTERPRISE: Dynamic import for circular dependency prevention
        const [authModule, importError] = await safeAsync(
          () => import("@/lib/auth/fetchWithAuth")
        );

        if (importError) {
          console.error(
            "[ApiClient] Authentication module unavailable:",
            importError,
            { correlationId, environment }
          );
          return [];
        }

        const { fetchWithAuth } = authModule as any;

        // ✅ SCALABILITY: Construct optimized request URL
        const baseUrl = EnvironmentConfig.getBaseUrl();
        const endpoint = `${baseUrl}/api/GetAllTasks`;

        // ✅ PERFORMANCE: Execute authenticated request with enterprise configuration
        const [response, requestError] = await safeAsync(() =>
          fetchWithAuth(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Request-Source": environment,
              "X-Correlation-ID": correlationId,
            },
            correlationId,
            maxRetries,
            enableRefresh: true, // ✅ Critical endpoint requires token refresh
            throwOnSessionExpiry: environment === "client", // ✅ Environment-specific behavior
            onRefreshError: (error: any) => {
              const coreError = new CoreError(
                "Authentication refresh failed during task fetch",
                "FETCH_TASKS_AUTH_ERROR",
                {
                  originalError: error,
                  correlationId,
                  environment,
                  endpoint: "/api/GetAllTasks",
                }
              );

              console.warn("[ApiClient] Task fetch auth error:", coreError);

              if (onAuthError) {
                onAuthError(coreError);
              }
            },
          })
        );

        // ✅ MAINTAINABILITY: Handle request-level errors
        if (requestError) {
          console.error(
            "[ApiClient] Task fetch request failed:",
            requestError,
            { correlationId, environment }
          );

          // ✅ SCALABILITY: Classify error types for better handling
          if (requestError.message?.includes("SessionExpiredError")) {
            // Session expired - return empty for graceful degradation
            console.warn(
              "[ApiClient] Session expired during task fetch - returning empty tasks",
              { correlationId, environment }
            );
            return [];
          }

          if (requestError.message?.includes("NetworkError")) {
            // Network error - return empty for offline tolerance
            console.warn(
              "[ApiClient] Network error during task fetch - returning empty tasks",
              { correlationId, environment }
            );
            return [];
          }

          // Other errors - return empty for resilience
          return [];
        }

        // ✅ PERFORMANCE: Validate response status
        if (!(response as Response).ok) {
          const status = (response as Response).status;

          // ✅ ENTERPRISE: Handle specific HTTP status codes
          if (status === 401) {
            console.warn(
              "[ApiClient] Unauthorized task fetch - session may be expired",
              { correlationId, environment, status }
            );
            return [];
          }

          if (status === 429) {
            console.warn(
              "[ApiClient] Rate limited task fetch - server enforcing limits",
              { correlationId, environment, status }
            );
            return [];
          }

          if (status >= 500) {
            console.error("[ApiClient] Server error during task fetch", {
              correlationId,
              environment,
              status,
            });
            return [];
          }

          console.warn("[ApiClient] Non-OK response during task fetch", {
            correlationId,
            environment,
            status,
          });
          return [];
        }

        // ✅ MAINTAINABILITY: Parse response with comprehensive error handling
        const [responseData, parseError] = await safeAsync(() =>
          (response as Response).json()
        );

        if (parseError) {
          console.error(
            "[ApiClient] Failed to parse task fetch response:",
            parseError,
            { correlationId, environment }
          );
          return [];
        }

        // ✅ SCALABILITY: Handle enterprise endpoint response structure
        let tasks: Task[];

        if (responseData && typeof responseData === "object") {
          // ✅ Handle enterprise endpoint response format
          if (Array.isArray(responseData.tasks)) {
            tasks = responseData.tasks;
          } else if (Array.isArray(responseData)) {
            tasks = responseData;
          } else {
            console.warn("[ApiClient] Unexpected task response structure:", {
              type: typeof responseData,
              correlationId,
              environment,
            });
            return [];
          }
        } else {
          console.warn("[ApiClient] Invalid task response data:", {
            type: typeof responseData,
            correlationId,
            environment,
          });
          return [];
        }

        // ✅ PERFORMANCE: Validate task data structure
        const validTasks = tasks.filter((task, index) => {
          if (!task || typeof task !== "object") {
            console.warn(`[ApiClient] Invalid task at index ${index}:`, {
              task,
              correlationId,
              environment,
            });
            return false;
          }

          // Basic task validation
          const isValid =
            task.id && task.name && typeof task.score === "number";
          if (!isValid) {
            console.warn(
              `[ApiClient] Incomplete task data at index ${index}:`,
              {
                taskId: task.id,
                hasName: !!task.name,
                hasScore: typeof task.score,
                correlationId,
              }
            );
          }

          return isValid;
        });

        // ✅ ENTERPRISE: Log successful operation with metrics
        console.log("[ApiClient] Task fetch completed successfully:", {
          totalTasks: validTasks.length,
          filteredTasks: tasks.length - validTasks.length,
          correlationId,
          environment,
        });

        return validTasks;
      } catch (error) {
        // ✅ MAINTAINABILITY: Comprehensive error logging with context
        console.error(
          "[ApiClient] Unexpected error during task fetch:",
          error,
          {
            correlationId,
            environment,
            errorType:
              error instanceof Error ? error.constructor.name : typeof error,
            stack:
              Environment.isDevelopment && error instanceof Error
                ? error.stack
                : undefined,
          }
        );

        // ✅ SCALABILITY: Return empty array for graceful degradation
        return [];
      }
    });
  }

  /**
   * ✅ PRIVATE HELPER METHODS
   */
  private static async executeRequestWithRetry(
    url: string,
    options: RequestInit,
    maxAttempts: number,
    timeout: number
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), timeout)
        );

        const response = await Promise.race([
          fetch(url, options),
          timeoutPromise,
        ]);

        // Return successful response
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (
          error instanceof Response &&
          error.status >= 400 &&
          error.status < 500
        ) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              API_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1)
            )
          );
        }
      }
    }

    throw lastError!;
  }

  private static async parseResponse<T>(
    response: Response,
    validate: boolean
  ): Promise<T> {
    if (!response.ok) {
      throw new CoreError(
        `HTTP ${response.status}: ${response.statusText}`,
        "HTTP_ERROR",
        { status: response.status, statusText: response.statusText }
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      if (validate) {
        throw new CoreError("Response is not JSON", "INVALID_CONTENT_TYPE", {
          contentType,
        });
      }
      return response.text() as T;
    }

    const data = await response.json();

    if (validate && data === null) {
      throw new CoreError("Response data is null", "NULL_RESPONSE", { data });
    }

    return data;
  }

  private static validateEndpoint(endpoint: string): void {
    if (!endpoint || typeof endpoint !== "string") {
      throw new CoreError(
        "Endpoint must be a non-empty string",
        "INVALID_ENDPOINT",
        { endpoint }
      );
    }

    if (!endpoint.startsWith("/")) {
      throw new CoreError(
        "Endpoint must start with /",
        "INVALID_ENDPOINT_FORMAT",
        { endpoint }
      );
    }
  }

  private static validateCorrelationId(correlationId: string): void {
    if (correlationId.length > API_CONFIG.MAX_CORRELATION_ID_LENGTH) {
      throw new CoreError(
        `Correlation ID exceeds maximum length of ${API_CONFIG.MAX_CORRELATION_ID_LENGTH}`,
        "CORRELATION_ID_TOO_LONG",
        { correlationId, maxLength: API_CONFIG.MAX_CORRELATION_ID_LENGTH }
      );
    }
  }

  private static validateAdjustScoreInput(input: AdjustScoreInput): void {
    if (!input.userId) {
      throw new CoreError("User ID is required", "MISSING_USER_ID");
    }

    if (typeof input.delta !== "number" || isNaN(input.delta)) {
      throw new CoreError("Delta must be a valid number", "INVALID_DELTA", {
        delta: input.delta,
      });
    }

    if (input.delta === 0) {
      throw new CoreError("Delta cannot be zero", "ZERO_DELTA");
    }

    if (Math.abs(input.delta) > 10000) {
      throw new CoreError(
        "Delta exceeds maximum allowed value",
        "DELTA_TOO_LARGE",
        { delta: input.delta, maxAllowed: 10000 }
      );
    }
  }

  private static generateCorrelationId(): string {
    return `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static formatError(error: CoreError): string {
    if (error.code === "FETCH_ERROR") {
      return "Network error. Please check your connection and try again.";
    }

    if (error.code === "TIMEOUT_ERROR") {
      return "Request timed out. Please try again.";
    }

    return error.message || "An unexpected error occurred";
  }

  private static handleAuthError(error: CoreError): string {
    if (error.message?.includes("SessionExpiredError")) {
      return "Your session has expired. Please refresh the page and try again.";
    }

    if (error.message?.includes("AuthenticationError")) {
      return "Authentication failed. Please refresh the page and try again.";
    }

    return this.formatError(error);
  }

  private static recordMetric(operationId: string, success: boolean): void {
    const metric = this.requestMetrics.get(operationId) || {
      count: 0,
      totalTime: 0,
      errors: 0,
    };
    metric.count++;
    if (!success) {
      metric.errors++;
    }
    this.requestMetrics.set(operationId, metric);
  }

  /**
   * ✅ MONITORING AND METRICS
   */
  static getMetrics(): Record<string, { count: number; errorRate: number }> {
    const metrics: Record<string, { count: number; errorRate: number }> = {};

    for (const [operationId, metric] of this.requestMetrics.entries()) {
      metrics[operationId] = {
        count: metric.count,
        errorRate: metric.errors / metric.count,
      };
    }

    return metrics;
  }

  static clearMetrics(): void {
    this.requestMetrics.clear();
  }
}

/**
 * ✅ LEGACY COMPATIBILITY FUNCTIONS
 *
 * Maintains backward compatibility with existing code
 */
export async function fetchAdjustScoreApi(
  input: AdjustScoreInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  return ApiClient.adjustScore(input);
}

export async function SSRfetchAllTasksFromApi(): Promise<Task[]> {
  return ApiClient.fetchAllTasks();
}

/**
 * ✅ ENVIRONMENT EXPORTS
 */
export const baseUrl = EnvironmentConfig.getBaseUrl();
