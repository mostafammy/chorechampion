/**
 * Enhanced fetchWithAuth - Enterprise-grade API client with automatic token refresh
 *
 * Features:
 * - Automatic token refresh on 401 errors using enterprise refresh system
 * - Configurable retry strategies
 * - Type-safe error handling with detailed error codes
 * - Request correlation tracking
 * - Testable redirect handling
 * - Comprehensive logging
 * - Integration with TokenRefreshService architecture
 */

import { TokenRefreshResult } from "./jwt/refreshTokenService";

export interface FetchWithAuthOptions extends RequestInit {
  /**
   * Whether to attempt token refresh on 401 errors
   * @default true
   */
  enableRefresh?: boolean;

  /**
   * Maximum number of retry attempts
   * @default 1
   */
  maxRetries?: number;

  /**
   * Custom refresh endpoint
   * @default '/api/auth/refresh'
   */
  refreshEndpoint?: string;

  /**
   * Custom redirect handler (useful for testing or different environments)
   */
  onSessionExpired?: (errorCode?: string) => void;

  /**
   * Custom correlation ID for request tracking
   */
  correlationId?: string;

  /**
   * Whether to throw on session expiry or return the 401 response
   * @default true (throw)
   */
  throwOnSessionExpiry?: boolean;

  /**
   * Custom error handler for refresh failures
   */
  onRefreshError?: (error: RefreshErrorDetails) => void;
}

export interface RefreshResponse {
  success: boolean;
  message?: string;
  errorCode?:
    | "MISSING_TOKEN"
    | "INVALID_TOKEN"
    | "EXPIRED_TOKEN"
    | "UNKNOWN_ERROR";
}

export interface RefreshErrorDetails {
  errorCode?: string;
  message?: string;
  correlationId: string;
  retryCount: number;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: string,
    public readonly correlationId?: string,
    public readonly retryCount?: number
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor(correlationId?: string, errorCode?: string, retryCount?: number) {
    super(
      "Session has expired, please login again",
      errorCode || "SESSION_EXPIRED",
      correlationId,
      retryCount
    );
    this.name = "SessionExpiredError";
  }
}

export class RefreshTokenError extends AuthenticationError {
  constructor(
    message: string,
    errorCode: string,
    correlationId?: string,
    retryCount?: number
  ) {
    super(message, errorCode, correlationId, retryCount);
    this.name = "RefreshTokenError";
  }
}

/**
 * Enhanced fetch wrapper with automatic authentication handling
 * Now integrates with the enterprise refresh token system
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const {
    enableRefresh = true,
    maxRetries = 1,
    refreshEndpoint = "/api/auth/refresh",
    onSessionExpired = defaultSessionExpiredHandler,
    onRefreshError,
    correlationId = generateCorrelationId(),
    throwOnSessionExpiry = true,
    ...fetchOptions
  } = options;

  let retryCount = 0;
  let lastResponse: Response;

  while (retryCount <= maxRetries) {
    try {
      // Add correlation ID to headers for tracking
      const headers = new Headers(fetchOptions.headers);
      headers.set("X-Correlation-ID", correlationId);

      const response = await fetch(input, {
        ...fetchOptions,
        credentials: "include", // Essential for cookie-based auth
        headers,
      });

      // Success or non-auth error - return immediately
      if (response.status !== 401) {
        logRequest(
          "success",
          input,
          response.status,
          correlationId,
          retryCount
        );
        return response;
      }

      // 401 error handling
      lastResponse = response;

      // If refresh is disabled or we've exhausted retries, handle session expiry
      if (!enableRefresh || retryCount >= maxRetries) {
        logRequest("auth_failed", input, 401, correlationId, retryCount);
        await handleSessionExpiry(
          onSessionExpired,
          throwOnSessionExpiry,
          correlationId,
          retryCount,
          "MAX_RETRIES_EXCEEDED"
        );
        return response; // Return 401 if not throwing
      }

      // Attempt token refresh using the new enterprise system
      logRequest("refresh_attempt", input, 401, correlationId, retryCount);
      const refreshResult = await attemptTokenRefreshWithNewSystem(
        refreshEndpoint,
        correlationId,
        retryCount
      );

      if (!refreshResult.success) {
        logRequest("refresh_failed", input, 401, correlationId, retryCount);

        // Call custom error handler if provided
        if (onRefreshError) {
          onRefreshError({
            errorCode: refreshResult.errorCode,
            message: refreshResult.error,
            correlationId,
            retryCount,
          });
        }

        await handleSessionExpiry(
          onSessionExpired,
          throwOnSessionExpiry,
          correlationId,
          retryCount,
          refreshResult.errorCode
        );
        return response; // Return 401 if not throwing
      }

      logRequest("refresh_success", input, 401, correlationId, retryCount);
      retryCount++;
    } catch (error) {
      logRequest("error", input, 0, correlationId, retryCount, error);
      throw error;
    }
  }

  // Should never reach here, but TypeScript safety
  return lastResponse!;
}

/**
 * Attempts to refresh the access token using the new enterprise refresh system
 * Integrates with RefreshApiAdapter for proper error handling and response parsing
 */
async function attemptTokenRefreshWithNewSystem(
  refreshEndpoint: string,
  correlationId: string,
  retryCount: number
): Promise<TokenRefreshResult> {
  try {
    const headers = new Headers();
    headers.set("X-Correlation-ID", correlationId);

    const refreshResponse = await fetch(refreshEndpoint, {
      method: "POST",
      credentials: "include",
      headers,
    });

    if (refreshResponse.ok) {
      // Parse the structured response from our RefreshApiAdapter
      try {
        const refreshData: RefreshResponse = await refreshResponse.json();
        return {
          success: true,
          accessToken: "token_set_via_cookie", // Token is set via cookie by server
        };
      } catch {
        // Fallback for non-JSON responses
        return {
          success: true,
          accessToken: "token_set_via_cookie",
        };
      }
    }

    // Handle structured error responses from RefreshApiAdapter
    try {
      const errorData: RefreshResponse = await refreshResponse.json();
      console.warn(
        `[fetchWithAuth] Refresh failed: ${errorData.message} (${errorData.errorCode})`,
        {
          correlationId,
          errorCode: errorData.errorCode,
          retryCount,
        }
      );

      return {
        success: false,
        error: errorData.message || "Token refresh failed",
        errorCode: errorData.errorCode || "UNKNOWN_ERROR",
      };
    } catch {
      // Fallback for non-JSON error responses
      console.warn(
        `[fetchWithAuth] Refresh failed with status ${refreshResponse.status}`,
        {
          correlationId,
          retryCount,
        }
      );

      return {
        success: false,
        error: `HTTP ${refreshResponse.status}: ${refreshResponse.statusText}`,
        errorCode:
          refreshResponse.status === 401 ? "INVALID_TOKEN" : "UNKNOWN_ERROR",
      };
    }
  } catch (error) {
    console.error("[fetchWithAuth] Refresh request failed:", error, {
      correlationId,
      retryCount,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      errorCode: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Handles session expiry scenarios with enhanced error reporting
 */
async function handleSessionExpiry(
  onSessionExpired: (errorCode?: string) => void,
  throwOnSessionExpiry: boolean,
  correlationId: string,
  retryCount?: number,
  errorCode?: string
): Promise<void> {
  console.error(
    "[fetchWithAuth] Session expired. User needs to re-authenticate.",
    {
      correlationId,
      retryCount,
      errorCode,
    }
  );

  // Call custom handler with error context
  onSessionExpired(errorCode);

  // Throw if configured to do so
  if (throwOnSessionExpiry) {
    throw new SessionExpiredError(correlationId, errorCode, retryCount);
  }
}

/**
 * Default session expired handler
 */
function defaultSessionExpiredHandler(): void {
  // Only redirect in browser environment
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/**
 * Generates a unique correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Structured logging for requests
 */
function logRequest(
  event:
    | "success"
    | "auth_failed"
    | "refresh_attempt"
    | "refresh_success"
    | "refresh_failed"
    | "error",
  input: RequestInfo | URL,
  status: number,
  correlationId: string,
  retryCount: number,
  error?: any
): void {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;

  const logData = {
    event,
    url,
    status,
    correlationId,
    retryCount,
    timestamp: new Date().toISOString(),
    ...(error && { error: error.message }),
  };

  switch (event) {
    case "success":
      console.log(`[fetchWithAuth] Request successful`, logData);
      break;
    case "auth_failed":
      console.warn(`[fetchWithAuth] Authentication failed`, logData);
      break;
    case "refresh_attempt":
      console.info(`[fetchWithAuth] Attempting token refresh`, logData);
      break;
    case "refresh_success":
      console.info(`[fetchWithAuth] Token refresh successful`, logData);
      break;
    case "refresh_failed":
      console.error(`[fetchWithAuth] Token refresh failed`, logData);
      break;
    case "error":
      console.error(`[fetchWithAuth] Request error`, logData);
      break;
  }
}

// Legacy function for backward compatibility
export async function fetchWithAuthLegacy(
  input: RequestInfo,
  init?: RequestInit,
  retry = true
): Promise<Response> {
  return fetchWithAuth(input, {
    ...init,
    enableRefresh: retry,
    maxRetries: retry ? 1 : 0,
  });
}

/**
 * Advanced function that allows direct integration with TokenRefreshService
 * Useful for scenarios where you need more control over the refresh process
 */
export async function fetchWithAuthAdvanced(
  input: RequestInfo | URL,
  options: FetchWithAuthOptions & {
    /**
     * Custom token refresh function
     * Allows integration with different refresh strategies
     */
    customRefreshFunction?: () => Promise<TokenRefreshResult>;
  } = {}
): Promise<Response> {
  const { customRefreshFunction, ...standardOptions } = options;

  if (customRefreshFunction) {
    // Use custom refresh logic if provided
    return fetchWithAuth(input, {
      ...standardOptions,
      // Override the refresh behavior
      onRefreshError: async (error) => {
        console.warn(
          "[fetchWithAuth] Standard refresh failed, attempting custom refresh",
          error
        );
        try {
          const customResult = await customRefreshFunction();
          if (!customResult.success) {
            throw new RefreshTokenError(
              customResult.error || "Custom refresh failed",
              customResult.errorCode || "CUSTOM_REFRESH_FAILED",
              options.correlationId
            );
          }
        } catch (customError) {
          console.error(
            "[fetchWithAuth] Custom refresh also failed",
            customError
          );
          throw customError;
        }
      },
    });
  }

  return fetchWithAuth(input, standardOptions);
}

/**
 * Helper function to create a configured fetchWithAuth for specific environments
 * Integrates with the enterprise refresh system configuration
 */
export function createAuthenticatedFetcher(config: {
  environment: "development" | "staging" | "production";
  refreshEndpoint?: string;
  maxRetries?: number;
  enableLogging?: boolean;
}) {
  const {
    environment,
    refreshEndpoint = "/api/auth/refresh",
    maxRetries,
    enableLogging = true,
  } = config;

  const environmentDefaults = {
    development: { maxRetries: 1, throwOnSessionExpiry: false },
    staging: { maxRetries: 2, throwOnSessionExpiry: true },
    production: { maxRetries: 3, throwOnSessionExpiry: true },
  };

  const envConfig = environmentDefaults[environment];

  return {
    fetch: async (
      input: RequestInfo | URL,
      options: FetchWithAuthOptions = {}
    ) => {
      return fetchWithAuth(input, {
        refreshEndpoint,
        maxRetries: maxRetries ?? envConfig.maxRetries,
        throwOnSessionExpiry: envConfig.throwOnSessionExpiry,
        ...options,
        onRefreshError: enableLogging
          ? (error) => {
              console.warn(`[${environment}] Refresh failed:`, error);
              options.onRefreshError?.(error);
            }
          : options.onRefreshError,
      });
    },

    // Convenience methods for common HTTP operations
    get: (url: string, options?: FetchWithAuthOptions) =>
      fetchWithAuth(url, {
        ...options,
        method: "GET",
        refreshEndpoint,
        maxRetries: maxRetries ?? envConfig.maxRetries,
      }),

    post: (url: string, data?: any, options?: FetchWithAuthOptions) =>
      fetchWithAuth(url, {
        ...options,
        method: "POST",
        headers: { "Content-Type": "application/json", ...options?.headers },
        body: data ? JSON.stringify(data) : options?.body,
        refreshEndpoint,
        maxRetries: maxRetries ?? envConfig.maxRetries,
      }),

    put: (url: string, data?: any, options?: FetchWithAuthOptions) =>
      fetchWithAuth(url, {
        ...options,
        method: "PUT",
        headers: { "Content-Type": "application/json", ...options?.headers },
        body: data ? JSON.stringify(data) : options?.body,
        refreshEndpoint,
        maxRetries: maxRetries ?? envConfig.maxRetries,
      }),

    delete: (url: string, options?: FetchWithAuthOptions) =>
      fetchWithAuth(url, {
        ...options,
        method: "DELETE",
        refreshEndpoint,
        maxRetries: maxRetries ?? envConfig.maxRetries,
      }),
  };
}
