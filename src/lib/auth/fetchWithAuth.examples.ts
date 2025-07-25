/**
 * Usage Examples for Enhanced fetchWithAuth with Enterprise Refresh System Integration
 *
 * This file demonstrates how to use the new enterprise-grade fetchWithAuth
 * that integrates with TokenRefreshService and RefreshApiAdapter.
 */

import {
  fetchWithAuth,
  fetchWithAuthAdvanced,
  createAuthenticatedFetcher,
  AuthenticationError,
  SessionExpiredError,
  RefreshTokenError,
} from "./fetchWithAuth";
import { TokenRefreshService } from "./jwt/refreshTokenService";

// ========================================================================================
// Example 1: Basic Usage (Enhanced with New Error Handling)
// ========================================================================================

/**
 * Simple API call with enhanced error handling from the new refresh system
 */
export async function basicExampleWithEnhancedErrors() {
  try {
    const response = await fetchWithAuth("/api/tasks", {
      onRefreshError: (error) => {
        // Handle specific refresh errors from RefreshApiAdapter
        console.log(`Refresh failed: ${error.message} (${error.errorCode})`);

        switch (error.errorCode) {
          case "MISSING_TOKEN":
            // User needs to login
            break;
          case "INVALID_TOKEN":
            // Token is corrupted or tampered
            break;
          case "EXPIRED_TOKEN":
            // Refresh token has expired
            break;
          default:
            // Unknown error
            break;
        }
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      console.log(
        `Session expired: ${error.errorCode} (retry: ${error.retryCount})`
      );
      // Handle session expiry with context
    } else if (error instanceof RefreshTokenError) {
      console.log(`Refresh token error: ${error.errorCode}`);
      // Handle refresh-specific errors
    }
    throw error;
  }
}

// ========================================================================================
// Example 2: Advanced Integration with TokenRefreshService
// ========================================================================================

/**
 * Direct integration with TokenRefreshService for custom refresh logic
 */
export async function advancedRefreshExample() {
  try {
    const response = await fetchWithAuthAdvanced("/api/sensitive-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "sensitive" }),

      // Custom refresh function using TokenRefreshService directly
      customRefreshFunction: async () => {
        // Get refresh token from cookie manually or from storage
        const refreshToken = getCookieValueHelper("refresh_token");

        if (!refreshToken) {
          return {
            success: false,
            error: "No refresh token available",
            errorCode: "MISSING_TOKEN",
          };
        }

        // Use TokenRefreshService directly for custom logic
        const result = await TokenRefreshService.refreshAccessToken({
          refreshToken,
        });

        if (result.success) {
          // Custom logic: maybe save token to different storage
          console.log("Custom refresh successful");
          return result;
        } else {
          console.log(`Custom refresh failed: ${result.errorCode}`);
          return result;
        }
      },

      // Enhanced session expiry handler with error context
      onSessionExpired: (errorCode) => {
        console.log(`Session expired with code: ${errorCode}`);
        // Custom logic based on error code
        switch (errorCode) {
          case "EXPIRED_TOKEN":
            showMessageHelper("Your session has expired. Please login again.");
            break;
          case "INVALID_TOKEN":
            showMessageHelper("Invalid session detected. Please login again.");
            break;
          default:
            showMessageHelper("Authentication failed. Please login again.");
            break;
        }
      },
    });

    return await response.json();
  } catch (error) {
    if (error instanceof RefreshTokenError) {
      console.log(`Custom refresh failed: ${error.errorCode}`);
      // Handle custom refresh failures
    }
    throw error;
  }
}

// ========================================================================================
// Example 3: Environment-Specific Configuration with New System
// ========================================================================================

/**
 * Environment-specific configuration using the new factory function
 */
export function setupApiClientForEnvironment() {
  // Create environment-specific API client
  const apiClient = createAuthenticatedFetcher({
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",
    refreshEndpoint: "/api/auth/refresh", // Uses our RefreshApiAdapter
    maxRetries: process.env.NODE_ENV === "production" ? 3 : 1,
    enableLogging: process.env.NODE_ENV !== "production",
  });

  return {
    // Convenience methods with built-in authentication
    async getTasks() {
      const response = await apiClient.get("/api/tasks");
      return response.json();
    },

    async createTask(taskData: any) {
      const response = await apiClient.post("/api/tasks", taskData);
      return response.json();
    },

    async updateTask(taskId: string, taskData: any) {
      const response = await apiClient.put(`/api/tasks/${taskId}`, taskData);
      return response.json();
    },

    async deleteTask(taskId: string) {
      const response = await apiClient.delete(`/api/tasks/${taskId}`);
      return response.ok;
    },

    // Custom fetch with full control
    customFetch: apiClient.fetch,
  };
}

// ========================================================================================
// Example 3: Different Environments
// ========================================================================================

/**
 * Environment-specific configuration
 */
export function createApiClient(
  environment: "development" | "staging" | "production"
) {
  const config = {
    development: {
      refreshEndpoint: "/api/auth/refresh",
      maxRetries: 1,
      throwOnSessionExpiry: false, // Show friendly errors in dev
    },
    staging: {
      refreshEndpoint: "/api/auth/refresh",
      maxRetries: 2,
      throwOnSessionExpiry: true,
    },
    production: {
      refreshEndpoint: "/api/auth/refresh",
      maxRetries: 3, // More retries in production
      throwOnSessionExpiry: true,
    },
  };

  return {
    async apiCall(url: string, options: RequestInit = {}) {
      return fetchWithAuth(url, {
        ...options,
        ...config[environment],
      });
    },
  };
}

// ========================================================================================
// Example 4: Error Handling Patterns
// ========================================================================================

/**
 * Comprehensive error handling
 */
export async function robustApiCall(url: string) {
  try {
    const response = await fetchWithAuth(url, {
      correlationId: `api-call-${Date.now()}`,
    });

    // Handle different response statuses
    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error("Bad request - check your data");
        case 403:
          throw new Error("Forbidden - insufficient permissions");
        case 404:
          throw new Error("Resource not found");
        case 500:
          throw new Error("Server error - please try again later");
        default:
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return await response.json();
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      // Session expired - redirect to login
      console.log("Session expired, redirecting to login");
      return null;
    }

    if (error instanceof AuthenticationError) {
      // Other auth errors
      console.log("Authentication error:", error.message);
      return null;
    }

    // Network or other errors
    console.error("API call failed:", error);
    throw error;
  }
}

// ========================================================================================
// Example 5: Testing Patterns
// ========================================================================================

/**
 * Testing with custom session handler
 */
export async function testableApiCall() {
  let sessionExpiredCalled = false;

  const response = await fetchWithAuth("/api/test", {
    onSessionExpired: () => {
      sessionExpiredCalled = true;
      // Don't redirect in tests
    },
    throwOnSessionExpiry: false,
  });

  return { response, sessionExpiredCalled };
}

/**
 * Mock fetchWithAuth for testing (use in test files with proper jest imports)
 */
export function createMockFetchWithAuth() {
  return async (url: string, options?: any) => {
    // Mock different scenarios
    if (url.includes("401-endpoint")) {
      throw new SessionExpiredError(options?.correlationId);
    }

    if (url.includes("error-endpoint")) {
      throw new Error("Network error");
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response;
  };
}

// ========================================================================================
// Example 6: React Integration
// ========================================================================================

/**
 * React hook for API calls with loading states
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (url: string, options?: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(url, {
        ...options,
        onSessionExpired: () => {
          // In React, you might want to update global state
          // instead of redirecting immediately
          setError("Session expired. Please login again.");
        },
        throwOnSessionExpiry: false,
      });

      if (response.status === 401) {
        setError("Please login to continue");
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { apiCall, loading, error };
}

// ========================================================================================
// Example 7: Parallel Requests
// ========================================================================================

/**
 * Making multiple authenticated requests in parallel
 */
export async function parallelApiCalls() {
  const correlationId = `batch-${Date.now()}`;

  try {
    const [tasks, users, settings] = await Promise.all([
      fetchWithAuth("/api/tasks", { correlationId: `${correlationId}-tasks` }),
      fetchWithAuth("/api/users", { correlationId: `${correlationId}-users` }),
      fetchWithAuth("/api/settings", {
        correlationId: `${correlationId}-settings`,
      }),
    ]);

    return {
      tasks: await tasks.json(),
      users: await users.json(),
      settings: await settings.json(),
    };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      console.log("Session expired during batch operation");
      // Handle session expiry for all requests
    }
    throw error;
  }
}

// ========================================================================================
// Example 8: File Upload with Progress
// ========================================================================================

/**
 * File upload with authentication
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener("load", async () => {
      if (xhr.status === 401) {
        // Handle token refresh for file uploads
        try {
          const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (refreshResponse.ok) {
            // Retry upload with new token
            resolve(uploadFile(file, onProgress));
          } else {
            reject(new SessionExpiredError());
          }
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(xhr.response);
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));

    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true; // Include cookies
    xhr.send(formData);
  });
}

// ========================================================================================
// Utility Functions (implementations for the examples)
// ========================================================================================

function getCookieValueHelper(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

function showMessageHelper(message: string): void {
  // In a real app, this would show a toast, modal, or notification
  console.log("User Message:", message);

  // Example implementations:
  // toast.error(message);
  // showNotification(message, 'error');
  // setGlobalErrorMessage(message);
}

function showLoginModal() {
  console.log("Show login modal");
  // Implementation would show login modal/redirect
}

function trackSessionExpiry(action: string) {
  console.log(`Session expired during: ${action}`);
  // Implementation would send analytics event
}

// React imports (for example only)
function useState<T>(initial: T): [T, (value: T) => void] {
  return [initial, () => {}];
}

function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T {
  return fn;
}
