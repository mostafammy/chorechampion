import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  RateLimitManager,
  RateLimitType,
} from "@/lib/security/rateLimitManager";
import { InputSecurityValidator } from "@/lib/security/inputValidator";
import { SecurityMiddleware } from "@/lib/security/securityMiddleware";
import { DevUtils } from "@/lib/dev/environmentUtils";
import { z } from "zod";
import { IS_DEV } from "@/lib/utils";

interface SecureEndpointConfig {
  requireAuth?: boolean;
  rateLimit?: {
    type: RateLimitType;
    maxAttempts?: number;
    windowMs?: number;
    burstLimit?: number;
    burstWindowMs?: number;
    customConfig?: boolean; // Use custom limits instead of defaults
  };
  validation?: {
    schema: z.ZodSchema;
    sanitizeHtml?: boolean;
    maxStringLength?: number;
  };
  permissions?: string[];
  auditLog?: boolean;
  corsEnabled?: boolean;
  logRequests?: boolean;
}

type SecureHandler<T = any> = (
  req: NextRequest,
  context: {
    user?: any;
    validatedData?: T;
    params?: any;
  }
) => Promise<NextResponse | Response>;

export function createSecureEndpoint<T = any>(
  config: SecureEndpointConfig,
  handler: SecureHandler<T>
) {
  return async (
    req: NextRequest,
    context?: { params?: any }
  ): Promise<NextResponse | Response> => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      // 1. Enhanced Security Headers & Request Validation
      const securityCheck = await SecurityMiddleware.validateRequest(req, {
        rateLimit: config.rateLimit
          ? {
              maxRequests: config.rateLimit.maxAttempts || 100,
              windowMs: config.rateLimit.windowMs || 60000,
            }
          : undefined,
      });

      if (securityCheck) {
        return securityCheck; // Security check failed
      }

      // 2. Authentication Check (Enhanced)
      let user: any = null;
      if (config.requireAuth) {
        const authResult = await requireAuth(req);

        if (!authResult.ok) {
          await logSecurityEvent(req, "AUTH_FAILURE", {
            error: authResult.error,
            endpoint: req.nextUrl.pathname,
            requestId,
          });

          return NextResponse.json(
            {
              error: "Unauthorized - Authentication required",
              errorCode: "AUTHENTICATION_REQUIRED",
              requestId,
            },
            {
              status: 401,
              headers: {
                "X-Request-ID": requestId,
              },
            }
          );
        }

        if (authResult.needsRefresh) {
          return NextResponse.json(
            {
              error: "Token refresh required",
              errorCode: "TOKEN_REFRESH_REQUIRED",
              needsRefresh: true,
              requestId,
            },
            {
              status: 401,
              headers: {
                "X-Request-ID": requestId,
              },
            }
          );
        }

        user = authResult.user;
      }

      // 3. Enhanced Rate Limiting with New System
      let rateLimitHeaders: Record<string, string> = {};
      if (config.rateLimit) {
        const identifier = user?.userId || user?.id || getClientIP(req);

        // Use the enhanced rate limiting system
        const rateLimitResult = await RateLimitManager.checkRateLimit(
          identifier,
          req.nextUrl.pathname,
          config.rateLimit.type,
          config.rateLimit.customConfig
            ? {
                maxAttempts: config.rateLimit.maxAttempts,
                windowMs: config.rateLimit.windowMs,
                burstLimit: config.rateLimit.burstLimit,
                burstWindowMs: config.rateLimit.burstWindowMs,
                identifier,
                endpoint: req.nextUrl.pathname,
                type: config.rateLimit.type,
              }
            : undefined
        );

        // Store headers for response
        rateLimitHeaders = rateLimitResult.headers;

        if (!rateLimitResult.allowed) {
          await logSecurityEvent(req, "RATE_LIMIT_EXCEEDED", {
            identifier,
            endpoint: req.nextUrl.pathname,
            limitType: rateLimitResult.limitType,
            requestId,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          });

          return NextResponse.json(
            {
              error: "Too many requests",
              message: `Rate limit exceeded. Try again in ${Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000
              )} seconds.`,
              limitType: rateLimitResult.limitType,
              retryAfter: Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000
              ),
              requestId,
            },
            {
              status: 429,
              headers: {
                "Retry-After": Math.ceil(
                  (rateLimitResult.resetTime - Date.now()) / 1000
                ).toString(),
                "X-Request-ID": requestId,
                ...rateLimitHeaders,
              },
            }
          );
        }
      }

      // 4. Input Validation & Sanitization
      let validatedData: T | undefined;
      if (config.validation && ["POST", "PUT", "PATCH"].includes(req.method)) {
        try {
          const body = await req.json();
          const validationResult = InputSecurityValidator.validateAndSanitize(
            config.validation.schema,
            body,
            {
              sanitizeHtml: config.validation.sanitizeHtml,
              maxStringLength: config.validation.maxStringLength,
            }
          );

          if (!validationResult.success) {
            await logSecurityEvent(req, "VALIDATION_FAILURE", {
              error: validationResult.error,
              endpoint: req.nextUrl.pathname,
            });

            return NextResponse.json(
              { error: validationResult.error },
              { status: 400 }
            );
          }

          validatedData = validationResult.data;
        } catch (error) {
          return NextResponse.json(
            { error: "Invalid JSON payload" },
            { status: 400 }
          );
        }
      }

      // 5. Permission Check
      if (config.permissions && user) {
        const hasPermission = checkPermissions(user, config.permissions);
        if (!hasPermission) {
          await logSecurityEvent(req, "PERMISSION_DENIED", {
            userId: user.id,
            requiredPermissions: config.permissions,
            userPermissions: user.permissions || [],
          });

          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }

      // 6. Execute Handler
      const response = await handler(req, {
        user,
        validatedData,
        params: context?.params,
      });

      // 7. Enhanced Response with Security Headers and Rate Limit Info
      if (config.auditLog) {
        await logAuditEvent(req, user, {
          action: req.method,
          resource: req.nextUrl.pathname,
          outcome: "success",
          responseTime: Date.now() - startTime,
          requestId,
        });
      }

      // 8. Add Enhanced Security Headers and Rate Limit Headers
      let finalResponse: NextResponse;
      if (response instanceof NextResponse) {
        finalResponse = response;
      } else {
        finalResponse = new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      // Add comprehensive headers
      SecurityMiddleware.setSecurityHeaders(finalResponse);

      // Add rate limit headers
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        finalResponse.headers.set(key, value);
      });

      // Add request tracking
      finalResponse.headers.set("X-Request-ID", requestId);
      finalResponse.headers.set(
        "X-Response-Time",
        `${Date.now() - startTime}ms`
      );

      // Add CORS headers if enabled
      if (config.corsEnabled) {
        finalResponse.headers.set("Access-Control-Allow-Origin", "*");
        finalResponse.headers.set(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        );
        finalResponse.headers.set(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Requested-With"
        );
      }

      // Enhanced request logging
      if (config.logRequests) {
        DevUtils.log.info("Secure endpoint request completed", {
          requestId,
          endpoint: req.nextUrl.pathname,
          method: req.method,
          status: finalResponse.status,
          userId: user?.userId || user?.id || "anonymous",
          duration: Date.now() - startTime,
          rateLimited: Object.keys(rateLimitHeaders).length > 0,
        });
      }

      return finalResponse;
    } catch (error) {
      // Enhanced error handling with security logging
      await logSecurityEvent(req, "INTERNAL_ERROR", {
        error: error instanceof Error ? error.message : "Unknown error",
        endpoint: req.nextUrl.pathname,
        stack: IS_DEV
          ? error instanceof Error
            ? error.stack
            : undefined
          : undefined,
        requestId,
      });

      if (IS_DEV) {
        console.error("Secure endpoint error:", error);
      }

      return NextResponse.json(
        {
          error: "Internal Server Error",
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: {
            "X-Request-ID": requestId,
          },
        }
      );
    }
  };
}

// Enhanced Helper functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper functions
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  return (
    forwarded?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown"
  );
}

function checkPermissions(user: any, requiredPermissions: string[]): boolean {
  const userPermissions = user.permissions || [];
  const userRole = user.role || "user";

  // Admin role has all permissions
  if (userRole === "admin") return true;

  // Check if user has all required permissions
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );
}

async function logSecurityEvent(
  req: NextRequest,
  event: string,
  metadata: Record<string, any>
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: getClientIP(req),
    userAgent: req.headers.get("user-agent") || "",
    endpoint: req.nextUrl.pathname,
    method: req.method,
    metadata,
  };

  // Enhanced security logging with DevUtils
  DevUtils.log.security(event, logEntry);

  if (IS_DEV) {
    console.warn("🚨 Security Event:", logEntry);
  }

  // In production: send to security monitoring service
  // await sendToSecurityLog(logEntry);
}

async function logAuditEvent(
  req: NextRequest,
  user: any,
  metadata: Record<string, any>
): Promise<void> {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    userId: user?.userId || user?.id,
    userEmail: user?.email,
    ip: getClientIP(req),
    ...metadata,
  };

  // Enhanced audit logging with DevUtils
  DevUtils.log.info("AUDIT_EVENT", auditEntry);

  if (IS_DEV) {
    console.log("📝 Audit Log:", auditEntry);
  }

  // In production: send to audit log service
  // await sendToAuditLog(auditEntry);
}

// Enhanced convenience wrappers with new rate limiting system
export const secureAPIRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: true,
      rateLimit: { type: "api" },
      auditLog: true,
      logRequests: true,
    },
    handler
  );

export const secureAuthRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: false,
      rateLimit: {
        type: "auth",
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        customConfig: true,
      },
      auditLog: true,
      logRequests: true,
    },
    handler
  );

export const secureAdminRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: true,
      rateLimit: { type: "admin" },
      permissions: ["admin"],
      auditLog: true,
      logRequests: true,
    },
    handler
  );

export const secureUploadRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: true,
      rateLimit: { type: "upload" },
      auditLog: true,
      logRequests: true,
    },
    handler
  );

export const securePublicRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: false,
      rateLimit: { type: "public" },
      corsEnabled: true,
      logRequests: false, // Reduce noise for public endpoints
    },
    handler
  );

export const secureSearchRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: true,
      rateLimit: { type: "search" },
      auditLog: false, // Search queries can be noisy
      logRequests: true,
    },
    handler
  );

export const secureWebhookRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: false, // Webhooks often use different auth
      rateLimit: { type: "webhook" },
      auditLog: true,
      logRequests: true,
      corsEnabled: false, // Webhooks usually don't need CORS
    },
    handler
  );

export const secureCriticalRoute = (handler: SecureHandler) =>
  createSecureEndpoint(
    {
      requireAuth: true,
      rateLimit: { type: "critical" },
      permissions: ["admin"], // Critical operations require admin
      auditLog: true,
      logRequests: true,
    },
    handler
  );
