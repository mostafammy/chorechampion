import { NextRequest } from "next/server";
import { RefreshApiAdapter } from "@/lib/auth/jwt/refreshApiAdapter";

/**
 * POST /api/auth/refresh
 * Refreshes an access token using a valid refresh token
 *
 * Expected: refresh_token cookie
 * Returns: JSON response with success status and new access_token cookie
 */
export async function POST(request: NextRequest) {
  return RefreshApiAdapter.handleApiRefresh(request, {
    accessTokenCookie: {
      name: "access_token", // ✅ FIX: Explicitly set the cookie name
      maxAge: 60 * 15, // 15 minutes
      secure: process.env.NODE_ENV === "production",
      httpOnly: process.env.NODE_ENV === "production", // Allow visibility in development
      sameSite: "lax",
      path: "/", // ✅ FIX: Explicitly set the path
    },
    clearTokensOnFailure: true,
  });
}

/**
 * GET /api/auth/refresh
 * Alternative endpoint for middleware or redirect-based refresh
 *
 * Expected: refresh_token cookie
 * Returns: Redirect response with new access_token cookie
 */
export async function GET(request: NextRequest) {
  return RefreshApiAdapter.handleMiddlewareRefresh(request, {
    redirectUrls: {
      onSuccess: "/",
      onFailure: "/login",
    },
    clearTokensOnFailure: true,
  });
}
