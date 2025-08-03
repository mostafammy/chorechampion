/**
 * Enterprise API Client for ChoreChampion
 * Combines the simplicity of Ky with the robustness of fetchWithAuth
 */

import { fetchWithAuth, FetchWithAuthOptions } from "@/lib/auth/fetchWithAuth";
import { IS_DEV } from "@/lib/utils";

export interface ApiClientOptions extends FetchWithAuthOptions {
  baseUrl?: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultOptions: FetchWithAuthOptions;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || "/api";
    this.defaultOptions = {
      enableRefresh: true,
      maxRetries: IS_DEV ? 1 : 3,
      throwOnSessionExpiry: true,
      ...options,
    };
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit & FetchWithAuthOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, "")}`;

    // Custom session expired handler that doesn't redirect on auth endpoints
    const customSessionExpiredHandler = (errorCode?: string) => {
      // Don't redirect if we're on authentication endpoints
      if (endpoint.includes("auth/login") || endpoint.includes("auth/signup")) {
        if (IS_DEV) {
          console.log(
            `[ApiClient] Suppressing redirect for auth endpoint: ${endpoint}`
          );
        }
        return; // Do nothing - let the error bubble up naturally
      }

      // For other endpoints, use default behavior
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    };

    const mergedOptions: FetchWithAuthOptions = {
      ...this.defaultOptions,
      ...options,
      onSessionExpired: customSessionExpiredHandler,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetchWithAuth(url, mergedOptions);

      if (!response.ok) {
        // Always throw on non-2xx responses
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      // Handle different content types for successful responses only
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }

      return response.text() as unknown as T;
    } catch (error) {
      if (IS_DEV) {
        console.error(`[ApiClient] Request failed: ${url}`, error);
      }
      throw error;
    }
  }

  // Convenient HTTP methods
  async get<T = any>(
    endpoint: string,
    options?: FetchWithAuthOptions
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchWithAuthOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchWithAuthOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchWithAuthOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(
    endpoint: string,
    options?: FetchWithAuthOptions
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Ky-style interface for backward compatibility
  async json<T = any>(
    endpoint: string,
    options?: RequestInit & FetchWithAuthOptions
  ): Promise<T> {
    return this.request<T>(endpoint, options);
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

// Default instance
export const api = new ApiClient();

// Environment-specific instances
export const createApiClient = (
  environment: "development" | "staging" | "production"
) => {
  const configs = {
    development: { maxRetries: 1, throwOnSessionExpiry: false },
    staging: { maxRetries: 2, throwOnSessionExpiry: true },
    production: { maxRetries: 3, throwOnSessionExpiry: true },
  };

  return new ApiClient(configs[environment]);
};

export default api;
