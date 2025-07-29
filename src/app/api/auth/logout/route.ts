import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { clearAuthCookies, getAuthCookies } from "@/lib/auth/cookieService"; // ✅ BEST PRACTICE: Centralized cookie management
import { getRedis } from "@/lib/redis";
import { IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

// Enhanced secure logout endpoint with comprehensive protection
export const POST = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Must be authenticated to logout
    rateLimit: {
      type: "auth", // ✅ Auth-specific rate limiting (30 req/hour in prod)
      customConfig: false, // ✅ Use default auth limits
    },
    // ✅ No input validation needed for logout (no request body expected)
    auditLog: true, // ✅ Comprehensive audit logging for security events
    logRequests: true, // ✅ Request/response logging
    corsEnabled: true, // ✅ CORS enabled for auth endpoint
  },
  async (req: NextRequest, { user }) => {
    try {
      // ✅ Enhanced logging for logout attempts
      if (IS_DEV) {
        console.log("[Logout] User logout request:", {
          userId: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
          ip:
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown",
        });
      }

      // ✅ Get tokens before deletion for blacklisting using centralized service
      const { accessToken, refreshToken } = await getAuthCookies();

      // ✅ Security Best Practice: Blacklist tokens to prevent reuse
      if (accessToken || refreshToken) {
        const redis = getRedis();
        const now = Date.now();
        const tokenExpiry = 60 * 60 * 24 * 7; // 7 days (max refresh token lifetime)

        try {
          // ✅ Add tokens to blacklist with expiration
          const multi = redis.multi();

          if (accessToken) {
            multi.setex(
              `blacklist:access:${accessToken}`,
              tokenExpiry,
              now.toString()
            );
          }

          if (refreshToken) {
            multi.setex(
              `blacklist:refresh:${refreshToken}`,
              tokenExpiry,
              now.toString()
            );
          }

          // ✅ Track user logout for security monitoring
          multi.setex(
            `logout:${user.id}:${now}`,
            60 * 60 * 24, // 24 hours
            JSON.stringify({
              userId: user.id,
              email: user.email,
              loggedOutAt: now,
              ip:
                req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown",
              userAgent: req.headers.get("user-agent") || "unknown",
            })
          );

          await multi.exec();

          if (IS_DEV) {
            console.log(`[Logout] Tokens blacklisted for user: ${user.email}`);
          }
        } catch (redisError: any) {
          // ✅ Continue with logout even if Redis fails (graceful degradation)
          if (IS_DEV) {
            console.warn(
              "[Logout] Redis blacklisting failed, continuing with logout:",
              redisError.message
            );
          }
        }
      }

      // ✅ Clear authentication cookies using existing system logic
      const response = NextResponse.json(
        {
          success: true,
          message: "Logged out successfully",
          timestamp: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email,
          },
        },
        {
          status: 200,
          headers: {
            // ✅ Security headers to clear any cached auth state
            "Clear-Site-Data": '"cookies", "storage"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );

      // ✅ Clear authentication cookies using centralized service
      await clearAuthCookies();

      // ✅ Enhanced success logging
      if (IS_DEV) {
        console.log(
          `[Logout] User logged out successfully: ${user.email} (${user.id})`
        );
      }

      return response;
    } catch (error: any) {
      // ✅ Enhanced error handling (SecureEndpoint provides context)
      if (IS_DEV) {
        console.error("[Logout] Logout operation failed:", {
          userId: user?.id,
          email: user?.email,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Even if logout fails, clear cookies for security using existing system
      const errorResponse = NextResponse.json(
        {
          success: false,
          message: "Logout completed with warnings",
          error: "Some cleanup operations failed, but you have been logged out",
          errorCode: "LOGOUT_PARTIAL_FAILURE",
        },
        { status: 200 } // ✅ Still return 200 since user is logged out
      );

      // ✅ Even if logout fails, clear cookies for security using centralized service
      await clearAuthCookies();
      return errorResponse;
    }
  }
);

// ✅ GET handler for browser testing (development only)
export const GET = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Must be authenticated to logout
    rateLimit: {
      type: "auth", // ✅ Auth-specific rate limiting
      customConfig: false,
    },
    auditLog: true, // ✅ Audit logging for security
    logRequests: true,
    corsEnabled: true,
  },
  async (req: NextRequest, { user }) => {
    // ✅ Only allow GET logout in development for testing
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          message: "GET method not allowed in production. Use POST instead.",
          error: "METHOD_NOT_ALLOWED",
        },
        { status: 405 }
      );
    }

    // ✅ In development, allow GET for browser testing
    console.log("[Logout GET] Browser logout request for:", user.email);

    try {
      // ✅ Get tokens before deletion for blacklisting using centralized service
      const { accessToken, refreshToken } = await getAuthCookies();

      // ✅ Token blacklisting (same as POST)
      if (accessToken || refreshToken) {
        const redis = getRedis();
        const now = Date.now();
        const tokenExpiry = 60 * 60 * 24 * 7;

        try {
          const multi = redis.multi();

          if (accessToken) {
            multi.setex(
              `blacklist:access:${accessToken}`,
              tokenExpiry,
              now.toString()
            );
          }
          if (refreshToken) {
            multi.setex(
              `blacklist:refresh:${refreshToken}`,
              tokenExpiry,
              now.toString()
            );
          }

          multi.setex(
            `logout:${user.id}:${now}`,
            60 * 60 * 24,
            JSON.stringify({
              userId: user.id,
              email: user.email,
              loggedOutAt: now,
              method: "GET", // ✅ Track that this was a GET request
              ip: req.headers.get("x-forwarded-for") || "unknown",
              userAgent: req.headers.get("user-agent") || "unknown",
            })
          );

          await multi.exec();
          console.log(
            `[Logout GET] Tokens blacklisted for user: ${user.email}`
          );
        } catch (redisError: any) {
          console.warn("[Logout GET] Redis error:", redisError.message);
        }
      }

      // ✅ Create response with redirect to login page
      const response = NextResponse.redirect(
        new URL("/login?message=logged-out", req.url),
        { status: 302 }
      );

      // ✅ Clear cookies using centralized service
      await clearAuthCookies();

      console.log(`[Logout GET] User logged out successfully: ${user.email}`);
      return response;
    } catch (error: any) {
      console.error("[Logout GET] Error:", error.message);

      // ✅ Even on error, clear cookies and redirect
      const errorResponse = NextResponse.redirect(
        new URL("/login?message=logout-error", req.url),
        { status: 302 }
      );

      // ✅ Even on error, clear cookies using centralized service
      await clearAuthCookies();
      return errorResponse;
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
