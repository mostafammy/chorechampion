/**
 * Usage Examples for the Refactored Token Refresh System
 *
 * This file demonstrates how to use the new independent services
 * in various scenarios for maximum flexibility and maintainability.
 */

import { TokenRefreshService } from "./refreshTokenService";
import { RefreshApiAdapter } from "./refreshApiAdapter";
import { NextRequest } from "next/server";

// ========================================================================================
// Example 1: Using the Core Business Logic Service Independently
// ========================================================================================

/**
 * Example: Using TokenRefreshService in a background job or CLI script
 */
export async function exampleBackgroundTokenRefresh() {
  const refreshToken = "some_refresh_token_from_database";

  const result = await TokenRefreshService.refreshAccessToken({ refreshToken });

  if (result.success) {
    console.log("New access token:", result.accessToken);
    // Save to database, cache, etc.
  } else {
    console.error("Refresh failed:", result.error, result.errorCode);
    // Handle different error types
    switch (result.errorCode) {
      case "EXPIRED_TOKEN":
        // Token expired, user needs to re-authenticate
        break;
      case "INVALID_TOKEN":
        // Malformed or tampered token
        break;
      case "MISSING_TOKEN":
        // No token provided
        break;
      default:
        // Unknown error
        break;
    }
  }
}

/**
 * Example: Validating refresh token without side effects
 */
export async function exampleTokenValidation() {
  const refreshToken = "some_refresh_token";
  const isValid = await TokenRefreshService.validateRefreshToken(refreshToken);

  if (isValid) {
    console.log("Token is valid, can proceed with refresh");
  } else {
    console.log("Token is invalid, user needs to login");
  }
}

// ========================================================================================
// Example 2: Using the HTTP Adapter with Custom Configuration
// ========================================================================================

/**
 * Example: Custom API endpoint with different cookie settings
 */
export async function customRefreshEndpoint(request: NextRequest) {
  return RefreshApiAdapter.handleApiRefresh(request, {
    accessTokenCookie: {
      name: "custom_access_token",
      maxAge: 60 * 30, // 30 minutes instead of 15
      secure: true,
      httpOnly: true,
      sameSite: "strict", // More strict for sensitive apps
      path: "/api", // Only send cookie to API routes
    },
    clearTokensOnFailure: false, // Don't clear tokens, let client handle
  });
}

/**
 * Example: Middleware usage with custom redirect URLs
 */
export async function customMiddlewareRefresh(request: NextRequest) {
  return RefreshApiAdapter.handleMiddlewareRefresh(request, {
    redirectUrls: {
      onSuccess: "/dashboard",
      onFailure: "/auth/login",
    },
    accessTokenCookie: {
      maxAge: 60 * 60, // 1 hour for long-running sessions
    },
  });
}

// ========================================================================================
// Example 3: Integration with External Systems
// ========================================================================================

/**
 * Example: Integration with Redis for token blacklisting
 */
export async function exampleRedisIntegration() {
  const refreshToken = "some_refresh_token";

  // Check if token is blacklisted (you'd implement this)
  const isBlacklisted = await checkTokenBlacklist(refreshToken);
  if (isBlacklisted) {
    return { success: false, error: "Token is blacklisted" };
  }

  // Use the service
  const result = await TokenRefreshService.refreshAccessToken({ refreshToken });

  if (result.success) {
    // Log successful refresh for analytics
    await logTokenRefresh(refreshToken, result.accessToken!);
  }

  return result;
}

/**
 * Example: Integration with database user verification
 */
export async function exampleDatabaseIntegration() {
  const refreshToken = "some_refresh_token";

  // First validate the token structure
  const isValidStructure = await TokenRefreshService.validateRefreshToken(
    refreshToken
  );
  if (!isValidStructure) {
    return { success: false, error: "Invalid token structure" };
  }

  // Then check if user still exists and is active
  const result = await TokenRefreshService.refreshAccessToken({ refreshToken });

  if (result.success) {
    // Additional verification: check if user is still active
    const userStillActive = await checkUserActiveStatus(result.accessToken!);
    if (!userStillActive) {
      return { success: false, error: "User account is deactivated" };
    }
  }

  return result;
}

// ========================================================================================
// Example 4: Testing and Mocking
// ========================================================================================

/**
 * Example: Easy unit testing of business logic
 * Note: This would be in a test file with proper jest imports
 */
export function createMockTokenRefreshService() {
  return {
    refreshAccessToken: async () => ({
      success: true,
      accessToken: "mock_access_token",
    }),
    validateRefreshToken: async () => true,
  };
}

/**
 * Example: Integration testing with different scenarios
 */
export async function testTokenRefreshScenarios() {
  const testCases = [
    {
      name: "Valid token",
      refreshToken: "valid_token",
      expectedSuccess: true,
    },
    {
      name: "Expired token",
      refreshToken: "expired_token",
      expectedSuccess: false,
      expectedErrorCode: "EXPIRED_TOKEN",
    },
    {
      name: "Invalid token",
      refreshToken: "invalid_token",
      expectedSuccess: false,
      expectedErrorCode: "INVALID_TOKEN",
    },
    {
      name: "Missing token",
      refreshToken: "",
      expectedSuccess: false,
      expectedErrorCode: "MISSING_TOKEN",
    },
  ];

  for (const testCase of testCases) {
    const result = await TokenRefreshService.refreshAccessToken({
      refreshToken: testCase.refreshToken,
    });

    console.assert(
      result.success === testCase.expectedSuccess,
      `Test "${testCase.name}" failed: expected success ${testCase.expectedSuccess}, got ${result.success}`
    );

    if (!testCase.expectedSuccess && testCase.expectedErrorCode) {
      console.assert(
        result.errorCode === testCase.expectedErrorCode,
        `Test "${testCase.name}" failed: expected error code ${testCase.expectedErrorCode}, got ${result.errorCode}`
      );
    }
  }
}

// ========================================================================================
// Utility Functions (you would implement these)
// ========================================================================================

async function checkTokenBlacklist(token: string): Promise<boolean> {
  // Implementation would check Redis or database
  return false;
}

async function logTokenRefresh(
  oldToken: string,
  newToken: string
): Promise<void> {
  // Implementation would log to analytics system
  console.log("Token refreshed successfully");
}

async function checkUserActiveStatus(accessToken: string): Promise<boolean> {
  // Implementation would verify user is still active in database
  return true;
}
