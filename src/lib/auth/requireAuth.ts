import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt/jwt";
import { cookies } from "next/headers";

/**
 * Enhanced requireAuth function that handles access token verification
 * with fallback to refresh token check for client-side refresh handling
 */
export async function requireAuth(request: NextRequest) {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("access_token")?.value;

  if (!token) {
    // Check if refresh token exists - if so, allow request for client-side refresh
    const refreshToken = cookiesStore.get("refresh_token")?.value;

    if (refreshToken) {
      return {
        ok: true,
        status: 200,
        user: null, // User will be set after refresh
        error: null,
        needsRefresh: true, // Flag to indicate token refresh is needed
      };
    }

    return {
      ok: false,
      status: 401,
      user: null,
      error: "Unauthorized - No access token found",
      needsRefresh: false,
    };
  }

  try {
    const user = await verifyAccessToken(token);
    return {
      ok: true,
      status: 200,
      user,
      error: null,
      needsRefresh: false,
    };
  } catch (error) {
    console.error("[requireAuth] Access token verification failed:", error);

    // Check if refresh token exists when access token is invalid
    const refreshToken = cookiesStore.get("refresh_token")?.value;

    if (refreshToken) {
      return {
        ok: true,
        status: 200,
        user: null, // User will be set after refresh
        error: null,
        needsRefresh: true, // Flag to indicate token refresh is needed
      };
    }

    return {
      ok: false,
      status: 401,
      user: null,
      error: "Unauthorized - Invalid access token",
      needsRefresh: false,
    };
  }
}
