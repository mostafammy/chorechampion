import { NextRequest, NextResponse } from "next/server";
import { TokenRefreshService, parseCookies } from "./refreshTokenService";

export interface RefreshApiOptions {
  /**
   * Cookie configuration for the access token
   */
  accessTokenCookie?: {
    name?: string;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
  };

  /**
   * Whether to clear refresh token on failure
   */
  clearTokensOnFailure?: boolean;

  /**
   * Custom redirect URLs
   */
  redirectUrls?: {
    onSuccess?: string;
    onFailure?: string;
  };
}

/**
 * HTTP adapter for token refresh operations in Next.js
 * Handles HTTP-specific concerns like cookies, responses, etc.
 */
export class RefreshApiAdapter {
  private static defaultOptions: Required<RefreshApiOptions> = {
    accessTokenCookie: {
      name: "access_token",
      maxAge: 60 * 15, // 15 minutes
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
    clearTokensOnFailure: true,
    redirectUrls: {
      onSuccess: "/",
      onFailure: "/login",
    },
  };

  /**
   * Handles token refresh for API routes (JSON response)
   */
  static async handleApiRefresh(
    request: NextRequest,
    options: RefreshApiOptions = {}
  ): Promise<NextResponse> {
    // ✅ FIX: Properly merge nested accessTokenCookie configuration
    const config = {
      ...this.defaultOptions,
      ...options,
      accessTokenCookie: {
        ...this.defaultOptions.accessTokenCookie,
        ...options.accessTokenCookie,
      },
      redirectUrls: {
        ...this.defaultOptions.redirectUrls,
        ...options.redirectUrls,
      },
    };

    try {
      // Extract refresh token from cookies
      const cookies = parseCookies(request);
      const refreshToken = cookies["refresh_token"];

      if (!refreshToken) {
        const response = NextResponse.json(
          {
            success: false,
            message: "Refresh token not found",
            errorCode: "MISSING_TOKEN",
          },
          { status: 401 }
        );

        if (config.clearTokensOnFailure) {
          this.clearAuthCookies(response);
        }

        return response;
      }

      // Use the business logic service
      const result = await TokenRefreshService.refreshAccessToken({
        refreshToken,
      });

      if (result.success && result.accessToken) {
        const response = NextResponse.json({
          success: true,
          message: "Token refreshed successfully",
        });

        // Log cookie setting details for debugging
        console.log("[RefreshApiAdapter] Setting access token cookie:", {
          name: config.accessTokenCookie.name,
          cookieOptions: config.accessTokenCookie,
          accessTokenLength: result.accessToken.length,
          environment: process.env.NODE_ENV,
          isSecure: config.accessTokenCookie.secure,
        });

        // Set new access token cookie
        response.cookies.set(
          config.accessTokenCookie.name!,
          result.accessToken,
          config.accessTokenCookie
        );

        console.log("[RefreshApiAdapter] Access token cookie set successfully");
        return response;
      } else {
        const response = NextResponse.json(
          {
            success: false,
            message: result.error || "Token refresh failed",
            errorCode: result.errorCode,
          },
          { status: 401 }
        );

        if (config.clearTokensOnFailure) {
          this.clearAuthCookies(response);
        }

        return response;
      }
    } catch (error) {
      console.error("[RefreshApiAdapter] Unexpected error:", error);

      const response = NextResponse.json(
        {
          success: false,
          message: "Internal server error",
          errorCode: "UNKNOWN_ERROR",
        },
        { status: 500 }
      );

      if (config.clearTokensOnFailure) {
        this.clearAuthCookies(response);
      }

      return response;
    }
  }

  /**
   * Handles token refresh for middleware (redirect response)
   */
  static async handleMiddlewareRefresh(
    request: NextRequest,
    options: RefreshApiOptions = {}
  ): Promise<NextResponse> {
    // ✅ FIX: Properly merge nested configuration objects
    const config = {
      ...this.defaultOptions,
      ...options,
      accessTokenCookie: {
        ...this.defaultOptions.accessTokenCookie,
        ...options.accessTokenCookie,
      },
      redirectUrls: {
        ...this.defaultOptions.redirectUrls,
        ...options.redirectUrls,
      },
    };

    try {
      // Extract refresh token from cookies
      const cookies = parseCookies(request);
      const refreshToken = cookies["refresh_token"];

      if (!refreshToken) {
        return NextResponse.redirect(
          new URL(config.redirectUrls.onFailure!, request.url)
        );
      }

      // Use the business logic service
      const result = await TokenRefreshService.refreshAccessToken({
        refreshToken,
      });

      if (result.success && result.accessToken) {
        const response = NextResponse.redirect(
          new URL(config.redirectUrls.onSuccess!, request.url)
        );

        // Set new access token cookie
        response.cookies.set(
          config.accessTokenCookie.name!,
          result.accessToken,
          config.accessTokenCookie
        );

        return response;
      } else {
        const response = NextResponse.redirect(
          new URL(config.redirectUrls.onFailure!, request.url)
        );

        if (config.clearTokensOnFailure) {
          this.clearAuthCookies(response);
        }

        return response;
      }
    } catch (error) {
      console.error("[RefreshApiAdapter] Middleware refresh failed:", error);

      const response = NextResponse.redirect(
        new URL(config.redirectUrls.onFailure!, request.url)
      );

      if (config.clearTokensOnFailure) {
        this.clearAuthCookies(response);
      }

      return response;
    }
  }

  /**
   * Validates refresh token without side effects
   */
  static async validateRefreshToken(request: NextRequest): Promise<boolean> {
    const cookies = parseCookies(request);
    const refreshToken = cookies["refresh_token"];

    if (!refreshToken) return false;

    return TokenRefreshService.validateRefreshToken(refreshToken);
  }

  /**
   * Helper method to clear authentication cookies
   */
  private static clearAuthCookies(response: NextResponse): void {
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
  }
}
