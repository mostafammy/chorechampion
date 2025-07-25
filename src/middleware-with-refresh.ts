/**
 * Enhanced middleware with server-side token refresh capability
 *
 * This version attempts to refresh tokens at the middleware level
 * before allowing page access, providing seamless authentication.
 */

import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt/jwt";
import { IS_DEV } from "@/lib/utils";
import { cookies } from "next/headers";
import { RefreshApiAdapter } from "@/lib/auth/jwt/refreshApiAdapter";

// Create the internationalization middleware
const intlMiddleware = createMiddleware({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/signup"];

// Define API routes that don't require authentication
const publicApiRoutes = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/debug/refresh", // Add debug endpoint
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (IS_DEV) {
    console.log(`\n[Middleware] Processing request: ${req.method} ${pathname}`);
  }

  const cookieStore = await cookies();

  // Skip middleware for static files, Next.js internals, and specific API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/_") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    if (IS_DEV) {
      console.log(
        `[Middleware] Skipping for static/internal file: ${pathname}`
      );
    }
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith("/api")) {
    if (IS_DEV) console.log(`[Middleware] Handling API route: ${pathname}`);

    // Check if it's a public API route
    const isPublicApiRoute = publicApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isPublicApiRoute) {
      if (IS_DEV)
        console.log(
          `[Middleware] Public API route, allowing access: ${pathname}`
        );
      return NextResponse.next();
    }

    if (IS_DEV)
      console.log(
        `[Middleware] Protected API route, verifying token: ${pathname}`
      );

    // For protected API routes, verify authentication
    const result = await verifyOrRefreshToken(req);

    if (!result.success) {
      if (IS_DEV)
        console.log(
          `[Middleware] Authentication failed for API route: ${pathname}`
        );
      return NextResponse.json(
        { error: "Unauthorized - Authentication failed" },
        { status: 401 }
      );
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", result.user!.id);
    requestHeaders.set("x-user-email", result.user!.email);
    requestHeaders.set("x-user-role", result.user!.role);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // If token was refreshed, set the new cookie
    if (result.newAccessToken) {
      response.cookies.set("access_token", result.newAccessToken, {
        maxAge: 60 * 15, // 15 minutes
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  }

  // For non-API routes, extract locale-agnostic pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";
  if (IS_DEV)
    console.log(
      `[Middleware] Handling page route. Path: ${pathname}, Path without locale: ${pathnameWithoutLocale}`
    );

  // Check if the route is public (doesn't require authentication)
  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathnameWithoutLocale === route ||
      pathnameWithoutLocale.startsWith(route + "/")
  );

  // If it's a public route, just apply internationalization
  if (isPublicRoute) {
    if (IS_DEV)
      console.log(`[Middleware] Public page route, applying i18n: ${pathname}`);
    return intlMiddleware(req);
  }

  if (IS_DEV)
    console.log(
      `[Middleware] Protected page route, checking/refreshing token: ${pathname}`
    );

  // For protected routes, verify or refresh authentication
  const result = await verifyOrRefreshToken(req);

  if (!result.success) {
    if (IS_DEV) {
      console.log(
        `[Middleware] Authentication failed, redirecting to login: ${pathname}`
      );
    }
    const locale = pathname.match(/^\/(en|ar)/)?.[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  // Apply internationalization and add user headers
  const response = intlMiddleware(req);

  if (response) {
    response.headers.set("x-user-id", result.user!.id);
    response.headers.set("x-user-email", result.user!.email);
    response.headers.set("x-user-role", result.user!.role);

    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // If token was refreshed, set the new cookie
    if (result.newAccessToken) {
      if (IS_DEV) {
        console.log(`[Middleware] Setting new access token cookie`);
      }
      response.cookies.set("access_token", result.newAccessToken, {
        maxAge: 60 * 15, // 15 minutes
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  return response;
}

/**
 * Verifies access token or attempts refresh if needed
 */
async function verifyOrRefreshToken(req: NextRequest): Promise<{
  success: boolean;
  user?: any;
  newAccessToken?: string;
}> {
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // Try to verify existing access token first
  if (accessToken) {
    try {
      const user = await verifyAccessToken(accessToken);
      if (IS_DEV) {
        console.log(`[Middleware] Access token valid for user: ${user.email}`);
      }
      return { success: true, user };
    } catch (error) {
      if (IS_DEV) {
        console.log(`[Middleware] Access token invalid, attempting refresh`);
      }
      // Token invalid, try refresh
    }
  }

  // No access token or invalid - try refresh
  if (!refreshToken) {
    if (IS_DEV) {
      console.log(`[Middleware] No refresh token available`);
    }
    return { success: false };
  }

  try {
    // Use RefreshApiAdapter to refresh token
    const refreshResult = await RefreshApiAdapter.handleApiRefresh(req, {
      accessTokenCookie: {
        name: "access_token",
        maxAge: 60 * 15,
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    });

    if (refreshResult.status === 200) {
      const data = await refreshResult.json();
      if (data.success) {
        // Extract the new access token from the response cookies
        const setCookieHeader = refreshResult.headers.get("set-cookie");
        const accessTokenMatch = setCookieHeader?.match(/access_token=([^;]+)/);
        const newAccessToken = accessTokenMatch?.[1];

        if (newAccessToken) {
          // Verify the new token to get user info
          const user = await verifyAccessToken(newAccessToken);
          if (IS_DEV) {
            console.log(
              `[Middleware] Token refreshed successfully for user: ${user.email}`
            );
          }
          return { success: true, user, newAccessToken };
        }
      }
    }

    if (IS_DEV) {
      console.log(`[Middleware] Token refresh failed`);
    }
    return { success: false };
  } catch (error) {
    if (IS_DEV) {
      console.error(`[Middleware] Error during token refresh:`, error);
    }
    return { success: false };
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
