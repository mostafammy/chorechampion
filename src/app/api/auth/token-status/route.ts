import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { getAuthCookies } from "@/lib/auth/cookieService";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/auth/jwt/jwt";
import { NextRequest, NextResponse } from "next/server";
import { IS_DEV } from "@/lib/utils";

/**
 * 🔍 Token Status Endpoint - Enterprise Edition
 * =============================================
 *
 * Provides secure token status information for frontend authentication management.
 * Uses centralized CookieService and SecureEndpoint for enterprise-grade security.
 *
 * Features:
 * - ✅ SecureEndpoint integration with rate limiting
 * - ✅ Centralized cookie management via CookieService
 * - ✅ Modern JWT verification with jose library
 * - ✅ Comprehensive token validation logic
 * - ✅ Performance optimized with early returns
 * - ✅ Scalable error handling and logging
 */

interface TokenStatusResponse {
  status: "valid" | "needs_refresh" | "logout_required";
  message: string;
  hasTokens: boolean;
  accessTokenValid?: boolean;
  refreshTokenValid?: boolean;
  expiresIn?: number;
  expiresSoon?: boolean;
  errorCode?: string;
}

/**
 * GET /api/auth/token-status
 *
 * ✅ Enterprise token status endpoint with comprehensive security
 * Returns token status for frontend authentication management without exposing tokens
 */
export const GET = createSecureEndpoint(
  {
    requireAuth: false, // ✅ No auth required - this endpoint checks auth status
    rateLimit: {
      type: "public", // ✅ Public rate limiting for token status checks
      customConfig: false,
    },
    auditLog: false, // ✅ No audit logging needed for status checks
    logRequests: IS_DEV, // ✅ Log requests only in development
    corsEnabled: true, // ✅ CORS enabled for frontend access
  },
  async (req: NextRequest): Promise<NextResponse<TokenStatusResponse>> => {
    try {
      // ✅ Use centralized cookie service instead of manual parsing
      const { accessToken, refreshToken } = await getAuthCookies();

      // ✅ PERFORMANCE: Early return for no tokens scenario
      if (!accessToken && !refreshToken) {
        return NextResponse.json({
          status: "logout_required",
          message: "No authentication tokens found",
          hasTokens: false,
          errorCode: "NO_TOKENS",
        });
      }

      // ✅ SCENARIO 1: No access token but has refresh token
      if (!accessToken && refreshToken) {
        try {
          // ✅ Use centralized JWT verification
          await verifyRefreshToken(refreshToken);

          return NextResponse.json({
            status: "needs_refresh",
            message: "Access token missing, refresh token available",
            hasTokens: true,
            accessTokenValid: false,
            refreshTokenValid: true,
          });
        } catch (error) {
          if (IS_DEV) {
            console.log("[TokenStatus] Invalid refresh token:", error);
          }

          return NextResponse.json({
            status: "logout_required",
            message: "Invalid refresh token",
            hasTokens: false,
            errorCode: "INVALID_REFRESH_TOKEN",
          });
        }
      }

      // ✅ SCENARIO 2: Has access token - comprehensive validation
      if (accessToken) {
        try {
          // ✅ Verify access token using centralized service
          const decoded = await verifyAccessToken(accessToken);
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = decoded.exp! - currentTime;

          // ✅ PERFORMANCE: Token is valid and not expired
          if (timeUntilExpiry > 0) {
            // ✅ Check if token expires soon (within 2 minutes)
            const expiresSoon = timeUntilExpiry <= 120;

            return NextResponse.json({
              status: expiresSoon ? "needs_refresh" : "valid",
              message: expiresSoon
                ? "Access token expires soon - refresh recommended"
                : "Access token valid",
              hasTokens: true,
              accessTokenValid: true,
              expiresIn: timeUntilExpiry,
              expiresSoon,
            });
          } else {
            // ✅ Access token expired - check refresh token
            if (refreshToken) {
              try {
                await verifyRefreshToken(refreshToken);

                return NextResponse.json({
                  status: "needs_refresh",
                  message: "Access token expired, refresh token available",
                  hasTokens: true,
                  accessTokenValid: false,
                  refreshTokenValid: true,
                });
              } catch (refreshError) {
                if (IS_DEV) {
                  console.log(
                    "[TokenStatus] Both tokens invalid:",
                    refreshError
                  );
                }

                return NextResponse.json({
                  status: "logout_required",
                  message: "Both tokens invalid or expired",
                  hasTokens: false,
                  errorCode: "BOTH_TOKENS_INVALID",
                });
              }
            } else {
              return NextResponse.json({
                status: "logout_required",
                message: "Access token expired, no refresh token available",
                hasTokens: false,
                errorCode: "ACCESS_EXPIRED_NO_REFRESH",
              });
            }
          }
        } catch (accessError) {
          // ✅ Access token invalid - check if refresh token can save the session
          if (refreshToken) {
            try {
              await verifyRefreshToken(refreshToken);

              return NextResponse.json({
                status: "needs_refresh",
                message: "Access token invalid, refresh token available",
                hasTokens: true,
                accessTokenValid: false,
                refreshTokenValid: true,
              });
            } catch (refreshError) {
              if (IS_DEV) {
                console.log("[TokenStatus] Both tokens failed validation:", {
                  accessError,
                  refreshError,
                });
              }

              return NextResponse.json({
                status: "logout_required",
                message: "Both tokens invalid",
                hasTokens: false,
                errorCode: "BOTH_TOKENS_INVALID",
              });
            }
          } else {
            return NextResponse.json({
              status: "logout_required",
              message: "Access token invalid, no refresh token available",
              hasTokens: false,
              errorCode: "ACCESS_INVALID_NO_REFRESH",
            });
          }
        }
      }

      // ✅ FALLBACK: Should never reach here with current logic
      return NextResponse.json({
        status: "logout_required",
        message: "Unknown token state - please re-authenticate",
        hasTokens: false,
        errorCode: "UNKNOWN_TOKEN_STATE",
      });
    } catch (error: any) {
      // ✅ SCALABILITY: Comprehensive error handling with context
      if (IS_DEV) {
        console.error("[TokenStatus] Unexpected error:", {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          status: "logout_required",
          message: "Token status check failed",
          hasTokens: false,
          errorCode: "STATUS_CHECK_FAILED",
          error: IS_DEV ? error.message : undefined,
        },
        { status: 500 }
      );
    }
  }
);
