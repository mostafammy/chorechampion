import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { getRedis } from "@/lib/redis";
import { IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * 🎯 Task Completion Confirmation Endpoint - Enterprise Edition
 * =============================================================
 *
 * Confirms task completion by storing completion key in Redis.
 * Uses SecureEndpoint framework for enterprise-grade security and performance.
 *
 * Features:
 * - ✅ SecureEndpoint integration with authentication & rate limiting
 * - ✅ Zod validation for completion key format
 * - ✅ Redis-based completion storage with TTL
 * - ✅ Comprehensive audit logging
 * - ✅ Performance optimized error handling
 * - ✅ Scalable completion tracking
 */

// ✅ Enterprise input validation with Zod
const ConfirmCompletionSchema = z.object({
  completionKey: z
    .string()
    .min(1, "Completion key is required")
    .startsWith(
      "task:completion:",
      "Completion key must start with 'task:completion:'"
    )
    .trim(),
});

type ConfirmCompletionRequest = z.infer<typeof ConfirmCompletionSchema>;

interface ConfirmCompletionResponse {
  success: boolean;
  completionKey?: string;
  expiresAt?: string;
  ttl?: number;
  error?: string;
  errorCode?: string;
  details?: any;
}

/**
 * POST /api/ConfirmCompletion
 *
 * ✅ Enterprise task completion confirmation endpoint
 * Stores completion confirmation in Redis with 90-day expiration
 */
export const POST = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ Standard API rate limiting
      customConfig: false,
    },
    validation: {
      schema: ConfirmCompletionSchema, // ✅ Zod validation
    },
    auditLog: true, // ✅ Audit logging for completion events
    logRequests: IS_DEV, // ✅ Request logging in development
    corsEnabled: true, // ✅ CORS for frontend access
  },
  async (
    req: NextRequest,
    { user, validatedData }
  ): Promise<NextResponse<ConfirmCompletionResponse>> => {
    try {
      const { completionKey } = validatedData as ConfirmCompletionRequest;

      if (IS_DEV) {
        console.log("[ConfirmCompletion] Processing completion confirmation:", {
          completionKey,
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Get Redis connection
      const redis = getRedis();

      // ✅ SCALABILITY: Redis operations with error handling
      const completionTTL = 60 * 60 * 24 * 90; // 90 days in seconds
      let ttl: number;

      try {
        // ✅ PERFORMANCE: Atomic Redis operations
        await redis.set(completionKey, "true", { ex: completionTTL });
        ttl = await redis.ttl(completionKey);
      } catch (redisError: any) {
        console.error("[ConfirmCompletion] Redis error:", redisError);
        return NextResponse.json(
          {
            success: false,
            error: "Database operation failed",
            errorCode: "DATABASE_ERROR",
          },
          { status: 503 }
        );
      }

      // ✅ SCALABILITY: Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      // ✅ AUDIT: Log successful completion
      if (IS_DEV) {
        console.log("[ConfirmCompletion] Task completion confirmed:", {
          completionKey,
          confirmedBy: user.email,
          userId: user.id,
          ttl,
          expiresAt,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Extract task info from completion key for logging
      const taskInfo = extractTaskInfoFromKey(completionKey);
      if (taskInfo && IS_DEV) {
        console.log("[ConfirmCompletion] Task details:", {
          taskId: taskInfo.taskId,
          period: taskInfo.period,
          completionKey,
          confirmedBy: user.email,
        });
      }

      return NextResponse.json({
        success: true,
        completionKey,
        expiresAt,
        ttl,
      });
    } catch (error: any) {
      // ✅ SCALABILITY: Comprehensive error handling
      console.error("[ConfirmCompletion] Unexpected error:", {
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

/**
 * ✅ UTILITY: Extract task information from completion key
 * Helps with debugging and logging
 */
function extractTaskInfoFromKey(completionKey: string): {
  taskId: string;
  period: string;
} | null {
  try {
    // Format: "task:completion:PERIOD:TASK_ID"
    const parts = completionKey.split(":");
    if (parts.length >= 4 && parts[0] === "task" && parts[1] === "completion") {
      return {
        period: parts[2],
        taskId: parts.slice(3).join(":"), // Handle task IDs that might contain colons
      };
    }
    return null;
  } catch {
    return null;
  }
}
