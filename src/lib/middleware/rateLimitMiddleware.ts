/**
 * Enhanced Endpoint Rate Limiting Middleware
 * Automatically applies intelligent rate limiting to all API endpoints
 */

import { NextRequest } from "next/server";
import {
  RateLimitManager,
  RateLimitType,
  RateLimitResult,
} from "@/lib/security/rateLimitManager";
import { DevUtils } from "@/lib/dev/environmentUtils";

/**
 * Rate limit middleware that automatically detects endpoint type and applies appropriate limits
 */
export async function applyRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<RateLimitResult> {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const userIdentifier = identifier || getIdentifierFromRequest(request);

  // Determine endpoint type based on URL pattern and method
  const endpointType = determineEndpointType(pathname, method);

  DevUtils.log.debug("Rate limit middleware applied", {
    pathname,
    method,
    endpointType,
    identifier: userIdentifier,
  });

  // Apply rate limiting
  return await RateLimitManager.checkRateLimit(
    userIdentifier,
    pathname,
    endpointType
  );
}

/**
 * Determine the appropriate rate limit type based on endpoint characteristics
 */
function determineEndpointType(
  pathname: string,
  method: string
): RateLimitType {
  // Authentication endpoints
  if (
    pathname.includes("/auth/") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password")
  ) {
    return "auth";
  }

  // Admin endpoints
  if (
    pathname.includes("/admin/") ||
    pathname.includes("/management/") ||
    pathname.includes("/system/")
  ) {
    return "admin";
  }

  // Upload endpoints
  if (
    (method === "POST" || method === "PUT") &&
    (pathname.includes("/upload") ||
      pathname.includes("/file") ||
      pathname.includes("/media"))
  ) {
    return "upload";
  }

  // Export endpoints
  if (
    pathname.includes("/export") ||
    pathname.includes("/download") ||
    pathname.includes("/backup")
  ) {
    return "export";
  }

  // Search endpoints
  if (
    pathname.includes("/search") ||
    pathname.includes("/query") ||
    pathname.includes("/find")
  ) {
    return "search";
  }

  // Webhook endpoints
  if (pathname.includes("/webhook") || pathname.includes("/callback")) {
    return "webhook";
  }

  // Critical system operations
  if (
    pathname.includes("/critical") ||
    pathname.includes("/system-config") ||
    pathname.includes("/emergency") ||
    (method === "DELETE" && pathname.includes("/user"))
  ) {
    return "critical";
  }

  // Public endpoints (no auth required)
  if (
    pathname.includes("/public/") ||
    pathname.includes("/health") ||
    pathname.includes("/status") ||
    pathname.startsWith("/api/public")
  ) {
    return "public";
  }

  // Default to API for everything else
  return "api";
}

/**
 * Extract identifier from request for rate limiting
 */
function getIdentifierFromRequest(request: NextRequest): string {
  // Try to get user ID from JWT token first
  const authorization = request.headers.get("authorization");
  if (authorization) {
    try {
      // Basic JWT parsing to get user ID (in production, use proper JWT verification)
      const token = authorization.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.userId) {
        return `user:${payload.userId}`;
      }
    } catch (error) {
      // JWT parsing failed, fall through to IP-based limiting
      DevUtils.log.debug("Failed to parse JWT for rate limiting", error);
    }
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    cfConnectingIp ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Enhanced rate limiting decorator for API routes
 */
export function withRateLimit(endpointType?: RateLimitType) {
  return function <T extends any[], R>(
    target: (...args: T) => Promise<R>,
    context: ClassMethodDecoratorContext
  ) {
    return async function (this: any, ...args: T): Promise<R> {
      // Extract request from arguments (assuming first arg is NextRequest)
      const request = args.find(
        (arg) => arg && typeof arg === "object" && "nextUrl" in arg
      ) as NextRequest;

      if (!request) {
        DevUtils.log.warn(
          "Rate limit decorator applied to function without NextRequest parameter"
        );
        return target.apply(this, args);
      }

      const pathname = request.nextUrl.pathname;
      const actualEndpointType =
        endpointType || determineEndpointType(pathname, request.method);
      const identifier = getIdentifierFromRequest(request);

      const result = await RateLimitManager.checkRateLimit(
        identifier,
        pathname,
        actualEndpointType
      );

      if (!result.allowed) {
        const error = new Error("Rate limit exceeded");
        (error as any).rateLimitResult = result;
        (error as any).status = 429;
        throw error;
      }

      // Add rate limit headers to response (handled by calling code)
      (request as any).rateLimitHeaders = result.headers;

      return target.apply(this, args);
    };
  };
}

/**
 * Rate limit configuration override for specific endpoints
 */
export interface EndpointRateLimitConfig {
  [endpoint: string]: {
    type: RateLimitType;
    maxAttempts?: number;
    windowMs?: number;
    burstLimit?: number;
    burstWindowMs?: number;
  };
}

/**
 * Custom rate limit configurations for specific endpoints
 */
export const ENDPOINT_RATE_LIMIT_OVERRIDES: EndpointRateLimitConfig = {
  "/api/tasks/add": {
    type: "api",
    maxAttempts: 50, // Allow more task creation
    windowMs: 60 * 1000,
  },
  "/api/auth/login": {
    type: "auth",
    maxAttempts: 3, // Very strict for login
    windowMs: 15 * 60 * 1000,
  },
  "/api/auth/refresh": {
    type: "api",
    maxAttempts: 10, // More lenient for token refresh
    windowMs: 60 * 1000,
  },
  "/api/admin/users": {
    type: "admin",
    maxAttempts: 5,
    windowMs: 60 * 1000,
  },
  "/api/export/data": {
    type: "export",
    maxAttempts: 1, // Very strict for data export
    windowMs: 5 * 60 * 1000,
  },
  "/api/search/tasks": {
    type: "search",
    maxAttempts: 20,
    windowMs: 60 * 1000,
  },
};

/**
 * Apply custom rate limiting based on endpoint-specific configurations
 */
export async function applyCustomRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<RateLimitResult> {
  const pathname = request.nextUrl.pathname;
  const override = ENDPOINT_RATE_LIMIT_OVERRIDES[pathname];

  if (override) {
    const userIdentifier = identifier || getIdentifierFromRequest(request);

    DevUtils.log.debug("Applying custom rate limit configuration", {
      pathname,
      override,
      identifier: userIdentifier,
    });

    return await RateLimitManager.checkRateLimit(
      userIdentifier,
      pathname,
      override.type,
      {
        maxAttempts: override.maxAttempts,
        windowMs: override.windowMs,
        burstLimit: override.burstLimit,
        burstWindowMs: override.burstWindowMs,
        identifier: userIdentifier,
        endpoint: pathname,
        type: override.type,
      }
    );
  }

  // Fall back to automatic detection
  return await applyRateLimit(request, identifier);
}

/**
 * Rate limit response helper
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const body = {
    error: "Rate limit exceeded",
    message: `Too many requests. Try again in ${Math.ceil(
      (result.resetTime - Date.now()) / 1000
    )} seconds.`,
    limitType: result.limitType,
    resetTime: result.resetTime,
    remaining: result.remaining,
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": Math.ceil(
        (result.resetTime - Date.now()) / 1000
      ).toString(),
      ...result.headers,
    },
  });
}

/**
 * Middleware function for Next.js API routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  customType?: RateLimitType
): Promise<
  | { success: true; headers: Record<string, string> }
  | { success: false; response: Response }
> {
  try {
    const result = customType
      ? await RateLimitManager.checkRateLimit(
          getIdentifierFromRequest(request),
          request.nextUrl.pathname,
          customType
        )
      : await applyCustomRateLimit(request);

    if (!result.allowed) {
      return {
        success: false,
        response: createRateLimitResponse(result),
      };
    }

    return {
      success: true,
      headers: result.headers,
    };
  } catch (error) {
    DevUtils.log.error("Rate limit middleware error", error);

    // Fail open in development, fail closed in production
    if (DevUtils.security.shouldFailClosed("rate-limit-middleware")) {
      return {
        success: false,
        response: new Response("Rate limiting unavailable", { status: 503 }),
      };
    }

    return {
      success: true,
      headers: {},
    };
  }
}
