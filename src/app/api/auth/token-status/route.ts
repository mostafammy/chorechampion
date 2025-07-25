import { NextRequest, NextResponse } from "next/server";
import { parseCookies } from "@/lib/auth/jwt/refreshTokenService";
import jwt from "jsonwebtoken";

/**
 * Token Status Endpoint
 * =====================
 *
 * Provides frontend with token status information without exposing tokens directly.
 * This is essential for the frontend authentication guard system.
 */

interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * GET /api/auth/token-status
 *
 * Returns token status for frontend authentication management
 * Does not expose actual token values (security)
 */
export async function GET(request: NextRequest) {
  try {
    const cookies = parseCookies(request);
    const accessToken = cookies["access_token"];
    const refreshToken = cookies["refresh_token"];

    // No tokens at all
    if (!accessToken && !refreshToken) {
      return NextResponse.json({
        status: "logout_required",
        message: "No authentication tokens found",
        hasTokens: false,
      });
    }

    // No access token but has refresh token
    if (!accessToken && refreshToken) {
      // Check if refresh token is valid (basic check)
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as TokenPayload;

        return NextResponse.json({
          status: "needs_refresh",
          message: "Access token missing, refresh token available",
          hasTokens: true,
          refreshTokenValid: true,
        });
      } catch (error) {
        return NextResponse.json({
          status: "logout_required",
          message: "Invalid refresh token",
          hasTokens: false,
        });
      }
    }

    // Has access token - check if it's valid and not expired
    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          process.env.JWT_SECRET!
        ) as TokenPayload;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - currentTime;

        // Token is valid and not expired
        if (timeUntilExpiry > 0) {
          // Check if token expires soon (within 2 minutes)
          const expiresSoon = timeUntilExpiry <= 120; // 2 minutes

          return NextResponse.json({
            status: expiresSoon ? "needs_refresh" : "valid",
            message: expiresSoon
              ? "Access token expires soon"
              : "Access token valid",
            hasTokens: true,
            accessTokenValid: true,
            expiresIn: timeUntilExpiry,
            expiresSoon,
          });
        } else {
          // Access token expired, check refresh token
          if (refreshToken) {
            try {
              jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

              return NextResponse.json({
                status: "needs_refresh",
                message: "Access token expired, refresh token available",
                hasTokens: true,
                accessTokenValid: false,
                refreshTokenValid: true,
              });
            } catch (error) {
              return NextResponse.json({
                status: "logout_required",
                message: "Both tokens invalid",
                hasTokens: false,
              });
            }
          } else {
            return NextResponse.json({
              status: "logout_required",
              message: "Access token expired, no refresh token",
              hasTokens: false,
            });
          }
        }
      } catch (error) {
        // Access token invalid, check refresh token
        if (refreshToken) {
          try {
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

            return NextResponse.json({
              status: "needs_refresh",
              message: "Access token invalid, refresh token available",
              hasTokens: true,
              accessTokenValid: false,
              refreshTokenValid: true,
            });
          } catch (refreshError) {
            return NextResponse.json({
              status: "logout_required",
              message: "Both tokens invalid",
              hasTokens: false,
            });
          }
        } else {
          return NextResponse.json({
            status: "logout_required",
            message: "Access token invalid, no refresh token",
            hasTokens: false,
          });
        }
      }
    }

    // Fallback case
    return NextResponse.json({
      status: "logout_required",
      message: "Unknown token state",
      hasTokens: false,
    });
  } catch (error) {
    console.error("[TokenStatus] Unexpected error:", error);

    return NextResponse.json(
      {
        status: "logout_required",
        message: "Token status check failed",
        hasTokens: false,
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
