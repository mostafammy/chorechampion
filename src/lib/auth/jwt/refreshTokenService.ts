import { verifyRefreshToken, generateAccessToken } from "./jwt";
import { JwtPayload } from "@/types";

// Pure business logic for token refresh - framework agnostic
export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  errorCode?:
    | "MISSING_TOKEN"
    | "INVALID_TOKEN"
    | "EXPIRED_TOKEN"
    | "UNKNOWN_ERROR";
}

export interface TokenRefreshInput {
  refreshToken: string;
}

/**
 * Core business logic for refreshing tokens
 * Framework-agnostic and easily testable
 */
export class TokenRefreshService {
  /**
   * Validates a refresh token and generates a new access token
   * @param input - The refresh token input
   * @returns Promise<TokenRefreshResult> - The result of the refresh operation
   */
  static async refreshAccessToken(
    input: TokenRefreshInput
  ): Promise<TokenRefreshResult> {
    try {
      const { refreshToken } = input;

      if (!refreshToken) {
        return {
          success: false,
          error: "Refresh token is required",
          errorCode: "MISSING_TOKEN",
        };
      }

      // Verify the refresh token
      const decoded = await verifyRefreshToken(refreshToken);
      const { id, role, email } = decoded as JwtPayload;

      // Generate new access token
      const newAccessToken = await generateAccessToken({ id, role, email });

      return {
        success: true,
        accessToken: newAccessToken,
      };
    } catch (error) {
      console.error("[TokenRefreshService] Token refresh failed:", error);

      // Determine error type for better error handling
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      let errorCode: TokenRefreshResult["errorCode"] = "UNKNOWN_ERROR";

      if (errorMessage.includes("expired")) {
        errorCode = "EXPIRED_TOKEN";
      } else if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("verification failed")
      ) {
        errorCode = "INVALID_TOKEN";
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }

  /**
   * Validates refresh token without generating a new access token
   * Useful for checking token validity without side effects
   */
  static async validateRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      await verifyRefreshToken(refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

// Utility function for parsing cookies (kept for backward compatibility)
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(rest.join("=") || "");
    }
  });

  return cookies;
}
