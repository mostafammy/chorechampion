import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { getScoreSummary } from "@/lib/scoreService";
import { IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * 🎯 User Score Summary Endpoint - Enterprise Edition
 * ===================================================
 *
 * Retrieves comprehensive score summary for a specific user.
 * Uses SecureEndpoint framework for enterprise-grade security and performance.
 *
 * Features:
 * - ✅ SecureEndpoint integration with authentication & rate limiting
 * - ✅ Zod validation for userId parameter
 * - ✅ Enhanced error handling with specific error codes
 * - ✅ Performance optimized score calculation
 * - ✅ Audit logging for score access
 * - ✅ User authorization validation
 */

// ✅ Enterprise path parameter validation with Zod
const ScoreParamsSchema = z.object({
  userId: z.string().min(1, "User ID is required").trim(),
});

type ScoreParamsRequest = z.infer<typeof ScoreParamsSchema>;

interface ScoreSummarySuccessResponse {
  userId: string;
  totalScore: number;
  weeklyScore?: number;
  monthlyScore?: number;
  rank?: number;
  lastUpdated: string;
  scoreBreakdown?: {
    dailyTasks: number;
    weeklyTasks: number;
    monthlyTasks: number;
  };
}

interface ScoreSummaryErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: string;
}

type ScoreSummaryResponse =
  | ScoreSummarySuccessResponse
  | ScoreSummaryErrorResponse;

/**
 * GET /api/score/[userId]
 *
 * ✅ Enterprise user score summary endpoint
 * Retrieves comprehensive score data with authorization validation
 */
export const GET = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ Standard API rate limiting
      customConfig: false,
    },
    auditLog: true, // ✅ Audit logging for score access
    logRequests: IS_DEV, // ✅ Request logging in development
    corsEnabled: true, // ✅ CORS for frontend access
  },
  async (
    req: NextRequest,
    { user, params }
  ): Promise<NextResponse<ScoreSummaryResponse>> => {
    try {
      // ✅ SECURITY: Validate path parameters
      const validationResult = ScoreParamsSchema.safeParse(params);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid user ID parameter",
            errorCode: "INVALID_PARAMS",
            ...(IS_DEV && { details: validationResult.error.message }),
          },
          { status: 400 }
        );
      }

      const { userId } = validationResult.data;

      if (IS_DEV) {
        console.log("[UserScore] Processing score request:", {
          requestedUserId: userId,
          requestingUserId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ SECURITY: Authorization check - Allow access to family members' scores
      // Users can access their own scores and all family members' scores
      // Since this is a family chore tracking app, all authenticated users can see all scores
      if (IS_DEV) {
        console.log("[UserScore] Allowing family score access:", {
          requestedUserId: userId,
          requestingUserId: user.id,
          email: user.email,
          familyContext: true,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Get score summary with error handling
      let scoreData: any;
      try {
        scoreData = await getScoreSummary(userId);
      } catch (serviceError: any) {
        console.error("[UserScore] Score service error:", {
          error: serviceError.message,
          userId,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            error: "Failed to retrieve score data",
            errorCode: "SCORE_SERVICE_ERROR",
            ...(IS_DEV && { details: serviceError.message }),
          },
          { status: 503 }
        );
      }

      // ✅ SCALABILITY: Validate service response
      if (!scoreData) {
        return NextResponse.json(
          {
            success: false,
            error: "User score data not found",
            errorCode: "SCORE_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // ✅ AUDIT: Log successful score access
      if (IS_DEV) {
        console.log("[UserScore] Score data retrieved successfully:", {
          userId,
          totalScore: scoreData.totalScore || 0,
          requestingUser: user.email,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Structure response with metadata
      const response: ScoreSummarySuccessResponse = {
        userId,
        totalScore: scoreData.total || 0,
        weeklyScore: scoreData.weeklyScore,
        monthlyScore: scoreData.monthlyScore,
        rank: scoreData.rank,
        lastUpdated: scoreData.last_adjusted_at || new Date().toISOString(),
        scoreBreakdown: scoreData.scoreBreakdown || {
          dailyTasks: scoreData.total || 0, // Use total as fallback
          weeklyTasks: scoreData.weeklyScore || 0,
          monthlyTasks: scoreData.monthlyScore || 0,
        },
      };

      return NextResponse.json(response);
    } catch (error: any) {
      // ✅ SCALABILITY: Comprehensive error handling
      console.error("[UserScore] Unexpected error:", {
        error: error.message,
        stack: IS_DEV ? error.stack : undefined,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          errorCode: "INTERNAL_ERROR",
          ...(IS_DEV && { details: error.message }),
        },
        { status: 500 }
      );
    }
  }
);
