import { cookies } from "next/headers";
import { IS_DEV } from "@/lib/utils";

/**
 * 🍪 Centralized Cookie Management Service
 * Enterprise-grade cookie handling with consistent security settings
 * Single source of truth for all authentication cookie operations
 */

// ✅ Cookie configuration - Single source of truth
export const COOKIE_CONFIG = {
  ACCESS_TOKEN: {
    name: "access_token",
    maxAge: 60 * 60, // 1 hour
    description: "Short-lived access token for API requests",
  },
  REFRESH_TOKEN: {
    name: "refresh_token",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    description: "Long-lived refresh token for session renewal",
  },
} as const;

// ✅ Base security settings applied to all auth cookies
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !IS_DEV, // HTTPS in production, HTTP in development
  sameSite: "strict" as const,
  path: "/",
} as const;

/**
 * 🔐 Set authentication cookies with consistent security settings
 * Used by: Login, Signup, Refresh endpoints
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  try {
    const cookieStore = await cookies();

    // Set access token with short expiry
    cookieStore.set(COOKIE_CONFIG.ACCESS_TOKEN.name, accessToken, {
      ...BASE_COOKIE_OPTIONS,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN.maxAge,
    });

    // Set refresh token with extended expiry
    cookieStore.set(COOKIE_CONFIG.REFRESH_TOKEN.name, refreshToken, {
      ...BASE_COOKIE_OPTIONS,
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN.maxAge,
    });

    if (IS_DEV) {
      console.log("[CookieService] Authentication cookies set successfully", {
        accessTokenExpiry: `${COOKIE_CONFIG.ACCESS_TOKEN.maxAge}s`,
        refreshTokenExpiry: `${COOKIE_CONFIG.REFRESH_TOKEN.maxAge}s`,
        secure: !IS_DEV,
        environment: IS_DEV ? "development" : "production",
      });
    }
  } catch (error) {
    console.error(
      "[CookieService] Failed to set authentication cookies:",
      error
    );
    throw new Error("Failed to set authentication cookies");
  }
}

/**
 * 🗑️ Clear authentication cookies during logout
 * Used by: Logout endpoint
 */
export async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies();

    // Delete access token
    cookieStore.delete(COOKIE_CONFIG.ACCESS_TOKEN.name);

    // Delete refresh token
    cookieStore.delete(COOKIE_CONFIG.REFRESH_TOKEN.name);

    if (IS_DEV) {
      console.log(
        "[CookieService] Authentication cookies cleared successfully"
      );
    }
  } catch (error) {
    console.error(
      "[CookieService] Failed to clear authentication cookies:",
      error
    );
    throw new Error("Failed to clear authentication cookies");
  }
}

/**
 * 🔍 Get authentication cookies
 * Used by: Middleware, Protected routes
 */
export async function getAuthCookies(): Promise<{
  accessToken: string | undefined;
  refreshToken: string | undefined;
}> {
  try {
    const cookieStore = await cookies();

    const accessToken = cookieStore.get(COOKIE_CONFIG.ACCESS_TOKEN.name)?.value;
    const refreshToken = cookieStore.get(
      COOKIE_CONFIG.REFRESH_TOKEN.name
    )?.value;

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error(
      "[CookieService] Failed to get authentication cookies:",
      error
    );
    return {
      accessToken: undefined,
      refreshToken: undefined,
    };
  }
}

/**
 * 🔄 Update only access token (used during token refresh)
 * Used by: Refresh endpoint
 */
export async function updateAccessToken(newAccessToken: string): Promise<void> {
  try {
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_CONFIG.ACCESS_TOKEN.name, newAccessToken, {
      ...BASE_COOKIE_OPTIONS,
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN.maxAge,
    });

    if (IS_DEV) {
      console.log("[CookieService] Access token updated successfully");
    }
  } catch (error) {
    console.error("[CookieService] Failed to update access token:", error);
    throw new Error("Failed to update access token");
  }
}

/**
 * ✅ Validate cookie configuration consistency
 * Used for: Testing and debugging
 */
export function validateCookieConfig(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check token expiry relationships
  if (COOKIE_CONFIG.ACCESS_TOKEN.maxAge >= COOKIE_CONFIG.REFRESH_TOKEN.maxAge) {
    issues.push("Access token expiry should be shorter than refresh token");
  }

  // Check minimum security requirements
  if (!BASE_COOKIE_OPTIONS.httpOnly) {
    issues.push("HttpOnly should be enabled for security");
  }

  if (!BASE_COOKIE_OPTIONS.sameSite) {
    issues.push("SameSite should be set for CSRF protection");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * 📊 Get cookie configuration info for debugging
 */
export function getCookieConfigInfo() {
  return {
    config: COOKIE_CONFIG,
    baseOptions: BASE_COOKIE_OPTIONS,
    environment: IS_DEV ? "development" : "production",
    validation: validateCookieConfig(),
  };
}

/**
 * 🎯 Cookie Service Types for TypeScript
 */
export type AuthCookies = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
};

export type CookieOptions = typeof BASE_COOKIE_OPTIONS & {
  maxAge: number;
};
