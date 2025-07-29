import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { getScoreLogs } from "@/lib/scoreService";
import { IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * 🎯 User Score Log Endpoint - Enterprise Edition
 * ===============================================
 *
 * Retrieves paginated score logs for a specific user with filtering options.
 * Uses SecureEndpoint framework for enterprise-grade security and performance.
 *
 * Features:
 * - ✅ SecureEndpoint integration with authentication & rate limiting
 * - ✅ Zod validation for parameters and query parameters
 * - ✅ Pagination support with configurable limits
 * - ✅ Enhanced error handling with specific error codes
 * - ✅ Performance optimized log retrieval
 * - ✅ Audit logging for log access
 * - ✅ User authorization validation
 */

// ✅ Enterprise path parameter validation with Zod
const ScoreLogParamsSchema = z.object({
  userId: z.string().min(1, "User ID is required").trim(),
});

// ✅ Enterprise query parameter validation with Zod
const ScoreLogQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100"),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 0, "Offset must be non-negative"),
  period: z
    .enum(["daily", "weekly", "monthly", "all"])
    .optional()
    .default("all"),
});

type ScoreLogParamsRequest = z.infer<typeof ScoreLogParamsSchema>;
type ScoreLogQueryRequest = z.infer<typeof ScoreLogQuerySchema>;

interface ScoreLogEntry {
  id: string;
  userId: string;
  taskId: string;
  taskName: string;
  score: number;
  period: "daily" | "weekly" | "monthly";
  completedAt: string;
  timestamp: string;
}

interface ScoreLogSuccessResponse {
  userId: string;
  logs: ScoreLogEntry[];
  pagination: {
    limit: number;
    offset: number;
    total?: number;
    hasMore?: boolean;
  };
  filters: {
    period: string;
  };
  lastUpdated: string;
}

interface ScoreLogErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: string;
}

type ScoreLogResponse = ScoreLogSuccessResponse | ScoreLogErrorResponse;

/**
 * GET /api/score/[userId]/scoreLog
 *
 * ✅ Enterprise user score log endpoint
 * Retrieves paginated score logs with filtering and authorization
 */
export const GET = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ Standard API rate limiting
      customConfig: false,
    },
    auditLog: true, // ✅ Audit logging for log access
    logRequests: IS_DEV, // ✅ Request logging in development
    corsEnabled: true, // ✅ CORS for frontend access
  },
  async (
    req: NextRequest,
    { user, params }
  ): Promise<NextResponse<ScoreLogResponse>> => {
    try {
      // ✅ SECURITY: Validate path parameters
      const paramsValidation = ScoreLogParamsSchema.safeParse(params);
      if (!paramsValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid user ID parameter",
            errorCode: "INVALID_PARAMS",
            ...(IS_DEV && { details: paramsValidation.error.message }),
          },
          { status: 400 }
        );
      }

      const { userId } = paramsValidation.data;

      // ✅ PERFORMANCE: Parse and validate query parameters
      const url = new URL(req.url);
      const queryParams = {
        limit: url.searchParams.get("limit"),
        offset: url.searchParams.get("offset"),
        period: url.searchParams.get("period"),
      };

      const queryValidation = ScoreLogQuerySchema.safeParse(queryParams);
      if (!queryValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid query parameters",
            errorCode: "INVALID_QUERY_PARAMS",
            ...(IS_DEV && { details: queryValidation.error.message }),
          },
          { status: 400 }
        );
      }

      const { limit, offset, period } = queryValidation.data;

      if (IS_DEV) {
        console.log("[UserScoreLog] Processing score log request:", {
          requestedUserId: userId,
          requestingUserId: user.id,
          email: user.email,
          limit,
          offset,
          period,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ SECURITY: Authorization check - users can only access their own logs
      if (userId !== user.id) {
        console.warn("[UserScoreLog] Unauthorized log access attempt:", {
          requestedUserId: userId,
          requestingUserId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            error: "Access denied. You can only view your own score logs.",
            errorCode: "ACCESS_DENIED",
          },
          { status: 403 }
        );
      }

      // ✅ PERFORMANCE: Get score logs with error handling
      let logs: any[];
      try {
        // Enhanced getScoreLogs with offset and period filtering support
        logs = await getScoreLogs(userId, limit, offset, period);
      } catch (serviceError: any) {
        console.error("[UserScoreLog] Score log service error:", {
          error: serviceError.message,
          userId,
          limit,
          offset,
          period,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            error: "Failed to retrieve score logs",
            errorCode: "SCORE_LOG_SERVICE_ERROR",
            ...(IS_DEV && { details: serviceError.message }),
          },
          { status: 503 }
        );
      }

      // ✅ SCALABILITY: Validate service response
      if (!Array.isArray(logs)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid score log data format",
            errorCode: "INVALID_LOG_FORMAT",
          },
          { status: 500 }
        );
      }

      // ✅ AUDIT: Log successful score log access
      if (IS_DEV) {
        console.log("[UserScoreLog] Score logs retrieved successfully:", {
          userId,
          logCount: logs.length,
          limit,
          offset,
          period,
          requestingUser: user.email,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Structure response with pagination metadata
      const response: ScoreLogSuccessResponse = {
        userId,
        logs: logs.map((log: any) => ({
          id: log.id || `${log.taskId}-${log.completedAt}`,
          userId: log.userId || userId,
          taskId: log.taskId,
          taskName: log.taskName || "Unknown Task",
          score: log.score || 0,
          period: log.period || "daily",
          completedAt: log.completedAt || log.timestamp,
          timestamp: log.timestamp || new Date().toISOString(),
        })),
        pagination: {
          limit,
          offset,
          total: logs.length < limit ? offset + logs.length : undefined,
          hasMore: logs.length === limit,
        },
        filters: {
          period,
        },
        lastUpdated: new Date().toISOString(),
      };

      return NextResponse.json(response);
    } catch (error: any) {
      // ✅ SCALABILITY: Comprehensive error handling
      console.error("[UserScoreLog] Unexpected error:", {
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
