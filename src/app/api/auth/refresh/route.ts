import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { NextRequest, NextResponse } from "next/server";
import { RefreshApiAdapter } from "@/lib/auth/jwt/refreshApiAdapter";
import { IS_DEV } from "@/lib/utils";

/**
 * POST /api/auth/refresh
 * Enhanced secure token refresh endpoint with comprehensive protection
 * Refreshes an access token using a valid refresh token from cookies
 */
export const POST = createSecureEndpoint(
  {
    requireAuth: false, // ✅ Special case: refresh doesn't need valid access token
    rateLimit: {
      type: "auth", // ✅ Auth-specific rate limiting (30 req/hour in prod)
      customConfig: false, // ✅ Use default auth limits
    },
    // ✅ No validation needed - tokens come from cookies, not request body
    auditLog: true, // ✅ Comprehensive audit logging for security events
    logRequests: true, // ✅ Request/response logging
    corsEnabled: true, // ✅ CORS enabled for auth endpoint
  },
  async (req: NextRequest) => {
    try {
      // ✅ Enhanced logging for refresh attempts
      if (IS_DEV) {
        console.log("[Refresh] Token refresh request:", {
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
          ip:
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown",
          method: "POST",
        });
      }

      // ✅ Delegate to RefreshApiAdapter with enhanced configuration
      const response = await RefreshApiAdapter.handleApiRefresh(req, {
        accessTokenCookie: {
          name: "access_token", // ✅ Explicitly set the cookie name
          maxAge: 60 * 15, // 15 minutes
          secure: process.env.NODE_ENV === "production",
          httpOnly: true, // ✅ SECURITY: Always use HttpOnly for access tokens
          sameSite: "strict", // ✅ SECURITY: Use strict for better CSRF protection
          path: "/", // ✅ Explicitly set the path
        },
        clearTokensOnFailure: true, // ✅ Security: Clear tokens on refresh failure
      });

      // ✅ Enhanced success logging
      if (IS_DEV && response.ok) {
        console.log("[Refresh] Token refresh successful");
      }

      return response;
    } catch (error: any) {
      // ✅ Enhanced error handling
      if (IS_DEV) {
        console.error("[Refresh] Token refresh failed:", {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Return comprehensive error response
      return NextResponse.json(
        {
          success: false,
          message: "Token refresh failed",
          error: error.message || "Unknown error occurred",
          errorCode: "TOKEN_REFRESH_FAILED",
        },
        { status: 401 }
      );
    }
  }
);

/**
 * GET /api/auth/refresh
 * Enhanced secure middleware refresh endpoint with redirect functionality
 * Alternative endpoint for middleware or redirect-based refresh
 */
export const GET = createSecureEndpoint(
  {
    requireAuth: false, // ✅ Special case: refresh doesn't need valid access token
    rateLimit: {
      type: "auth", // ✅ Auth-specific rate limiting
      customConfig: false,
    },
    auditLog: true, // ✅ Audit logging for security monitoring
    logRequests: true,
    corsEnabled: true,
  },
  async (req: NextRequest) => {
    try {
      // ✅ Enhanced logging for middleware refresh attempts
      if (IS_DEV) {
        console.log("[Refresh GET] Middleware refresh request:", {
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
          ip:
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown",
          method: "GET",
        });
      }

      // ✅ Delegate to RefreshApiAdapter with enhanced configuration
      const response = await RefreshApiAdapter.handleMiddlewareRefresh(req, {
        accessTokenCookie: {
          name: "access_token",
          maxAge: 60 * 15, // 15 minutes
          secure: process.env.NODE_ENV === "production",
          httpOnly: true, // ✅ SECURITY: Always use HttpOnly for access tokens
          sameSite: "strict", // ✅ SECURITY: Use strict for better CSRF protection
          path: "/",
        },
        redirectUrls: {
          onSuccess: "/", // ✅ Redirect to home on success
          onFailure: "/login", // ✅ Redirect to login on failure
        },
        clearTokensOnFailure: true, // ✅ Security: Clear tokens on refresh failure
      });

      // ✅ Enhanced success logging
      if (IS_DEV && response.ok) {
        console.log("[Refresh GET] Middleware refresh successful");
      }

      return response;
    } catch (error: any) {
      // ✅ Enhanced error handling with redirect
      if (IS_DEV) {
        console.error("[Refresh GET] Middleware refresh failed:", {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Redirect to login on error
      return NextResponse.redirect(
        new URL("/login?message=refresh-failed", req.url),
        { status: 302 }
      );
    }
  }
);

// ✅ OPTIONS handler for CORS (handled automatically by SecureEndpoint)
export const OPTIONS = createSecureEndpoint(
  {
    requireAuth: false, // ✅ CORS preflight doesn't need auth
    corsEnabled: true, // ✅ Handle CORS preflight
    logRequests: false, // ✅ Don't log OPTIONS requests
  },
  async () => {
    return new NextResponse(null, { status: 204 });
  }
);
