/**
 * Enhanced API Route Wrapper with Automatic Rate Limiting
 * Provides comprehensive protection for all API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/middleware/rateLimitMiddleware";
import { RateLimitType } from "@/lib/security/rateLimitManager";
import { DevUtils } from "@/lib/dev/environmentUtils";
import { requireAuth } from "@/lib/auth/requireAuth";

export type ApiHandler = (
  request: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse> | NextResponse;

export interface ApiRouteConfig {
  requireAuth?: boolean;
  rateLimitType?: RateLimitType;
  allowedMethods?: string[];
  validateInput?: boolean;
  logRequests?: boolean;
  corsEnabled?: boolean;
}

export interface ApiRouteOptions extends ApiRouteConfig {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  OPTIONS?: ApiHandler;
  HEAD?: ApiHandler;
}

/**
 * Enhanced API route wrapper with automatic rate limiting and security
 */
export function createApiRoute(
  handlers: ApiRouteOptions,
  config: ApiRouteConfig = {}
): {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  OPTIONS?: ApiHandler;
  HEAD?: ApiHandler;
} {
  const {
    requireAuth: authRequired = false,
    rateLimitType,
    allowedMethods,
    validateInput = true,
    logRequests = true,
    corsEnabled = true,
  } = config;

  const wrappedHandlers: Record<string, ApiHandler> = {};

  // Wrap each HTTP method handler
  Object.entries(handlers).forEach(([method, handler]) => {
    if (typeof handler === "function") {
      wrappedHandlers[method] = createWrappedHandler(handler, {
        method,
        authRequired,
        rateLimitType,
        allowedMethods,
        validateInput,
        logRequests,
        corsEnabled,
      });
    }
  });

  return wrappedHandlers as any;
}

/**
 * Create a wrapped handler with all security and rate limiting features
 */
function createWrappedHandler(
  handler: ApiHandler,
  options: {
    method: string;
    authRequired: boolean;
    rateLimitType?: RateLimitType;
    allowedMethods?: string[];
    validateInput: boolean;
    logRequests: boolean;
    corsEnabled: boolean;
  }
): ApiHandler {
  return async (
    request: NextRequest,
    context?: { params?: any }
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const pathname = request.nextUrl.pathname;

    try {
      // Request logging
      if (options.logRequests) {
        DevUtils.log.info("API Request", {
          requestId,
          method: request.method,
          pathname,
          userAgent: request.headers.get("user-agent"),
          referer: request.headers.get("referer"),
          timestamp: new Date().toISOString(),
        });
      }

      // Method validation
      if (
        options.allowedMethods &&
        !options.allowedMethods.includes(request.method)
      ) {
        return createErrorResponse(
          `Method ${request.method} not allowed`,
          405,
          { Allow: options.allowedMethods.join(", ") },
          requestId
        );
      }

      // CORS handling
      if (options.corsEnabled && request.method === "OPTIONS") {
        return createCorsResponse();
      }

      // Rate limiting
      const rateLimitResult = await rateLimitMiddleware(
        request,
        options.rateLimitType
      );

      if (!rateLimitResult.success) {
        DevUtils.log.security("RATE_LIMIT_BLOCKED", {
          requestId,
          pathname,
          method: request.method,
          identifier: extractIdentifier(request),
        });

        return NextResponse.json(rateLimitResult.response.body, {
          status: rateLimitResult.response.status,
          headers: rateLimitResult.response.headers,
        });
      }

      // Authentication
      let authResult = null;
      if (options.authRequired) {
        try {
          authResult = await requireAuth(request);
          if (!authResult.ok) {
            return NextResponse.json(
              {
                error: "Authentication required",
                message: authResult.error || "Authentication failed",
              },
              {
                status: 401,
                headers: {
                  "X-Request-ID": requestId,
                  ...rateLimitResult.headers,
                },
              }
            );
          }
        } catch (error) {
          DevUtils.log.error("Authentication error", { error, requestId });
          return createErrorResponse(
            "Authentication failed",
            401,
            {},
            requestId
          );
        }
      }

      // Input validation (if enabled)
      if (
        options.validateInput &&
        (request.method === "POST" ||
          request.method === "PUT" ||
          request.method === "PATCH")
      ) {
        try {
          const contentType = request.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const body = await request.clone().json();

            // Basic input validation
            if (typeof body !== "object" || body === null) {
              return createErrorResponse(
                "Invalid JSON body",
                400,
                {},
                requestId
              );
            }

            // Size validation (prevent large payloads)
            const bodyString = JSON.stringify(body);
            if (bodyString.length > 1024 * 1024) {
              // 1MB limit
              return createErrorResponse(
                "Payload too large",
                413,
                {},
                requestId
              );
            }
          }
        } catch (error) {
          return createErrorResponse(
            "Invalid request body",
            400,
            {},
            requestId
          );
        }
      }

      // Add auth data to request if available
      if (authResult?.user) {
        (request as any).user = authResult.user;
      }

      // Call the actual handler
      const response = await handler(request, context);

      // Add security headers and rate limit headers
      const enhancedResponse = addSecurityHeaders(response, {
        requestId,
        corsEnabled: options.corsEnabled,
        rateLimitHeaders: rateLimitResult.headers,
      });

      // Success logging
      if (options.logRequests) {
        const duration = Date.now() - startTime;
        DevUtils.log.info("API Response", {
          requestId,
          pathname,
          method: request.method,
          status: enhancedResponse.status,
          duration: `${duration}ms`,
          userId: authResult?.user?.id || "anonymous",
        });
      }

      return enhancedResponse;
    } catch (error) {
      // Error logging
      const duration = Date.now() - startTime;
      DevUtils.log.error("API Error", {
        requestId,
        pathname,
        method: request.method,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
      });

      // Handle rate limit errors specifically
      if (error instanceof Error && (error as any).rateLimitResult) {
        const rateLimitResult = (error as any).rateLimitResult;
        return new NextResponse(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: error.message,
            requestId,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-Request-ID": requestId,
              "Retry-After": Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000
              ).toString(),
              ...rateLimitResult.headers,
            },
          }
        );
      }

      // Generic error response
      return createErrorResponse("Internal server error", 500, {}, requestId);
    }
  };
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  message: string,
  status: number,
  headers: Record<string, string> = {},
  requestId: string
): NextResponse {
  return NextResponse.json(
    {
      error: getErrorType(status),
      message,
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...headers,
      },
    }
  );
}

/**
 * Create CORS preflight response
 */
function createCorsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(
  response: NextResponse,
  options: {
    requestId: string;
    corsEnabled: boolean;
    rateLimitHeaders: Record<string, string>;
  }
): NextResponse {
  const headers = new Headers(response.headers);

  // Request ID
  headers.set("X-Request-ID", options.requestId);

  // Security headers
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // CORS headers
  if (options.corsEnabled) {
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
  }

  // Rate limit headers
  Object.entries(options.rateLimitHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract identifier for logging
 */
function extractIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown"
  );
}

/**
 * Get error type from status code
 */
function getErrorType(status: number): string {
  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    case 409:
      return "Conflict";
    case 413:
      return "Payload Too Large";
    case 422:
      return "Unprocessable Entity";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    case 503:
      return "Service Unavailable";
    default:
      return "Error";
  }
}

/**
 * Quick API route creation helpers for common patterns
 */
export const apiRoutes = {
  /**
   * Create a public API route (no auth required)
   */
  public: (
    handlers: Omit<ApiRouteOptions, "requireAuth">,
    config?: Omit<ApiRouteConfig, "requireAuth">
  ) => createApiRoute(handlers, { ...config, requireAuth: false }),

  /**
   * Create a protected API route (auth required)
   */
  protected: (
    handlers: Omit<ApiRouteOptions, "requireAuth">,
    config?: Omit<ApiRouteConfig, "requireAuth">
  ) => createApiRoute(handlers, { ...config, requireAuth: true }),

  /**
   * Create an admin API route (auth + admin role required)
   */
  admin: (
    handlers: Omit<ApiRouteOptions, "requireAuth" | "rateLimitType">,
    config?: Omit<ApiRouteConfig, "requireAuth" | "rateLimitType">
  ) =>
    createApiRoute(handlers, {
      ...config,
      requireAuth: true,
      rateLimitType: "admin",
    }),

  /**
   * Create an upload API route
   */
  upload: (
    handlers: Omit<ApiRouteOptions, "rateLimitType">,
    config?: Omit<ApiRouteConfig, "rateLimitType">
  ) => createApiRoute(handlers, { ...config, rateLimitType: "upload" }),

  /**
   * Create a webhook API route
   */
  webhook: (
    handlers: Omit<ApiRouteOptions, "requireAuth" | "rateLimitType">,
    config?: Omit<ApiRouteConfig, "requireAuth" | "rateLimitType">
  ) =>
    createApiRoute(handlers, {
      ...config,
      requireAuth: false,
      rateLimitType: "webhook",
    }),
};
