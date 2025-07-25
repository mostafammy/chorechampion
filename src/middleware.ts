import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt/jwt";
import { IS_DEV } from "@/lib/utils";
import { cookies } from "next/headers";

// Create the internationalization middleware
const intlMiddleware = createMiddleware({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

// Define public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/signup",
  "/test-auth",
  "/phase2-test",
  "/test",
  "/simple-login",
];

// Define API routes that don't require authentication
const publicApiRoutes = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
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
    const token = req.cookies.get("access_token")?.value;

    if (!token) {
      if (IS_DEV) {
        console.log(
          `[Middleware] No access token for protected API route: ${pathname}`
        );
        console.log(
          `[Middleware] Checking if refresh token exists for API route...`
        );
      }

      // Check if refresh token exists - if so, let the request through for client-side refresh
      const refreshToken = req.cookies.get("refresh_token")?.value;

      if (refreshToken) {
        if (IS_DEV) {
          console.log(
            `[Middleware] Refresh token exists for API route, allowing request for client-side refresh: ${pathname}`
          );
        }
        // Let the API request pass through - fetchWithAuth will handle the refresh
        return NextResponse.next();
      }

      // No refresh token either - block the API request
      if (IS_DEV) {
        console.log(
          `[Middleware] No refresh token found for API route, blocking: ${pathname}`
        );
      }
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    try {
      const user = await verifyAccessToken(token);
      if (IS_DEV)
        console.log(`[Middleware] API token verified for user: ${user.email}`);
      // Add user info to request headers for API routes
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-user-email", user.email);
      requestHeaders.set("x-user-role", user.role);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      if (IS_DEV)
        console.error(
          `[Middleware] Invalid access token for API route: ${pathname}`,
          error
        );

      // Check if we have a refresh token when access token is invalid
      const refreshToken = req.cookies.get("refresh_token")?.value;

      if (refreshToken) {
        if (IS_DEV) {
          console.log(
            `[Middleware] Access token invalid but refresh token exists for API route, allowing request for client-side refresh: ${pathname}`
          );
        }
        // Let the API request pass through - fetchWithAuth will handle the refresh
        return NextResponse.next();
      }

      // No refresh token - block the request
      if (IS_DEV) {
        console.log(
          `[Middleware] No refresh token found for API route with invalid access token, blocking: ${pathname}`
        );
      }
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }
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

  // TEMPORARY: Allow all page routes for debugging
  if (IS_DEV) {
    console.log(
      `[Middleware] DEBUGGING: Allowing all page routes without authentication`
    );
    return intlMiddleware(req);
  }

  // If it's a public route, just apply internationalization
  if (isPublicRoute) {
    if (IS_DEV)
      console.log(`[Middleware] Public page route, applying i18n: ${pathname}`);
    return intlMiddleware(req);
  }

  if (IS_DEV)
    console.log(
      `[Middleware] Protected page route, checking token: ${pathname}`
    );
  // For protected routes, check authentication first
  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    if (IS_DEV) {
      console.log(
        `[Middleware] No access token found for protected route: ${pathname}`
      );
      console.log(`[Middleware] Checking if refresh token exists...`);
    }

    // Check if refresh token exists - if so, let the client handle refresh
    const refreshToken = req.cookies.get("refresh_token")?.value;

    if (refreshToken) {
      if (IS_DEV) {
        console.log(
          `[Middleware] Refresh token exists, allowing page load for client-side refresh`
        );
      }
      // Let the page load and handle refresh on the client side
      return intlMiddleware(req);
    }

    // No refresh token either - redirect to login
    if (IS_DEV) {
      console.log(`[Middleware] No refresh token found, redirecting to login`);
    }
    const locale = pathname.match(/^\/(en|ar)/)?.[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  try {
    if (IS_DEV) {
      console.log(`[Middleware] Verifying token for route: ${pathname}`);
      console.log(`[Middleware] Token exists: ${!!token}`);
      console.log(`[Middleware] Token length: ${token?.length || 0}`);
    }

    const user = await verifyAccessToken(token);

    if (IS_DEV) {
      console.log(
        `[Middleware] Token verified successfully for user: ${user.email}`
      );
    }

    // Add user info to request headers for protected pages
    const response = intlMiddleware(req);

    if (response) {
      response.headers.set("x-user-id", user.id);
      response.headers.set("x-user-email", user.email);
      response.headers.set("x-user-role", user.role);

      // Add security headers
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
      );
      response.headers.set("X-XSS-Protection", "1; mode=block");
    }

    return response;
  } catch (error) {
    if (IS_DEV) {
      console.error(
        `[Middleware] Token verification failed for route: ${pathname}`,
        error
      );
    }

    // Check if refresh token exists before redirecting
    const refreshToken = req.cookies.get("refresh_token")?.value;

    if (refreshToken) {
      if (IS_DEV) {
        console.log(
          `[Middleware] Access token invalid but refresh token exists, allowing page load for client-side refresh`
        );
      }
      // Let the page load and handle refresh on the client side
      return intlMiddleware(req);
    }

    // No refresh token - redirect to login
    if (IS_DEV) {
      console.log(
        `[Middleware] No refresh token available, redirecting to login`
      );
    }
    const locale = pathname.match(/^\/(en|ar)/)?.[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
