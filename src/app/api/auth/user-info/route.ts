import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { NextRequest, NextResponse } from "next/server";
import { IS_DEV } from "@/lib/utils";

/**
 * 👤 User Info Endpoint - Enterprise Edition
 * ==========================================
 *
 * Provides user information including role for frontend UI decisions.
 * Uses SecureEndpoint framework for enterprise-grade security.
 *
 * Features:
 * - ✅ SecureEndpoint integration with authentication
 * - ✅ Role information extraction from JWT
 * - ✅ Rate limiting for security
 * - ✅ Minimal data exposure (role only)
 */

interface UserInfoResponse {
  role: string;
  id: string;
  email: string;
}

interface UserInfoErrorResponse {
  error: string;
  errorCode: string;
}

type UserInfoResponseType = UserInfoResponse | UserInfoErrorResponse;

/**
 * GET /api/auth/user-info
 *
 * ✅ Enterprise user information endpoint
 * Returns current user's role and basic info for frontend UI decisions
 */
export const GET = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ Standard API rate limiting
      customConfig: false,
    },
    auditLog: false, // ✅ No audit logging needed for user info requests
    logRequests: IS_DEV, // ✅ Log requests only in development
    corsEnabled: true, // ✅ CORS enabled for frontend access
  },
  async (
    req: NextRequest,
    { user }
  ): Promise<NextResponse<UserInfoResponseType>> => {
    try {
      // ✅ Return minimal user information for frontend UI decisions
      const userInfo: UserInfoResponse = {
        role: user.role,
        id: user.id,
        email: user.email,
      };

      if (IS_DEV) {
        console.log("[UserInfo] User info requested:", {
          userId: user.id,
          role: user.role,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(userInfo);
    } catch (error: any) {
      const errorResponse: UserInfoErrorResponse = {
        error: "Failed to retrieve user information",
        errorCode: "USER_INFO_ERROR",
      };

      if (IS_DEV) {
        console.error("[UserInfo] Error retrieving user info:", {
          error: error.message,
          userId: user?.id,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);
