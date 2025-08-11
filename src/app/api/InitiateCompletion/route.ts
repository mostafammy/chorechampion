import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import {
  requireRole,
  logSuccessfulAccess,
} from "@/lib/security/roleValidation";
import { getRedis } from "@/lib/redis";
import { RedisKeyManager, IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Task } from "@/types";

/**
 * 🚀 Task Completion Initiation Endpoint - Enterprise Edition
 * ===========================================================
 *
 * Initiates task completion flow by generating a secure completion key.
 * Uses SecureEndpoint framework for enterprise-grade security and performance.
 *
 * ⚠️  ADMIN ONLY ACCESS - Only administrators can initiate task completion.
 *
 * Features:
 * - ✅ SecureEndpoint integration with authentication & rate limiting
 * - ✅ Admin-only role-based access control
 * - ✅ Zod validation for type-safe input validation
 * - ✅ Redis-based task retrieval with error handling
 * - ✅ Secure completion key generation
 * - ✅ Comprehensive audit logging
 * - ✅ Performance optimized with early returns
 */

// ✅ Enterprise input validation with Zod
const InitiateCompletionSchema = z.object({
  taskId: z.string().min(1, "Task ID is required and cannot be empty").trim(),
});

type InitiateCompletionRequest = z.infer<typeof InitiateCompletionSchema>;

interface InitiateCompletionSuccessResponse {
  completionKey: string;
  taskInfo?: {
    id: string;
    name: string;
    period: string;
    score: number;
  };
}

interface InitiateCompletionErrorResponse {
  error: string;
  errorCode: string;
  details?: string;
}

type InitiateCompletionResponse =
  | InitiateCompletionSuccessResponse
  | InitiateCompletionErrorResponse;

/**
 * POST /api/InitiateCompletion
 *
 * ✅ Enterprise task completion initiation endpoint - ADMIN ONLY
 * Generates secure completion key for task completion workflow
 * Only administrators can initiate task completion for security and control
 */
export const POST = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ Standard API rate limiting
      customConfig: false,
    },
    validation: {
      schema: InitiateCompletionSchema, // ✅ Zod validation
    },
    auditLog: true, // ✅ Audit logging for task operations
    logRequests: IS_DEV, // ✅ Request logging in development
    corsEnabled: true, // ✅ CORS for frontend access
  },
  async (
    req: NextRequest,
    { user, validatedData }
  ): Promise<NextResponse<InitiateCompletionResponse>> => {
    try {
      // ✅ SECURITY: Role-based access validation (admin-only task completion)
      const roleCheckError = requireRole(
        "TASK_COMPLETION",
        "InitiateCompletion"
      )(user);
      if (roleCheckError) {
        return roleCheckError as NextResponse<InitiateCompletionResponse>;
      }

      const { taskId } = validatedData as InitiateCompletionRequest;

      // ✅ AUDIT: Log successful admin access
      logSuccessfulAccess(user, "TASK_COMPLETION", "InitiateCompletion", {
        taskId,
      });

      if (IS_DEV) {
        console.log("[InitiateCompletion] Processing task initiation:", {
          taskId,
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Get Redis connection
      const redis = getRedis();

      // ✅ SCALABILITY: Retrieve task data with error handling
      let taskStr: string | null;
      try {
        taskStr = await redis.get(`task:${taskId}`);
      } catch (redisError: any) {
        console.error("[InitiateCompletion] Redis error:", redisError);
        return NextResponse.json(
          {
            error: "Database connection failed",
            errorCode: "DATABASE_ERROR",
          },
          { status: 503 }
        );
      }

      if (!taskStr) {
        if (IS_DEV) {
          console.log(`[InitiateCompletion] Task not found: ${taskId}`);
        }
        return NextResponse.json(
          {
            error: "Task not found",
            errorCode: "TASK_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // ✅ PERFORMANCE: Parse task with proper error handling
      let task: Task;
      try {
        task = typeof taskStr === "string" ? JSON.parse(taskStr) : taskStr;
      } catch (parseError: any) {
        console.error(
          `[InitiateCompletion] Task parsing failed for ${taskId}:`,
          parseError
        );
        return NextResponse.json(
          {
            error: "Task data corrupted",
            errorCode: "TASK_DATA_CORRUPTED",
          },
          { status: 500 }
        );
      }

      // ✅ SECURITY: Validate task structure
      if (!task || !task.id || !task.period) {
        console.error(
          `[InitiateCompletion] Invalid task structure for ${taskId}:`,
          task
        );
        return NextResponse.json(
          {
            error: "Invalid task data",
            errorCode: "INVALID_TASK_DATA",
          },
          { status: 400 }
        );
      }

      // ✅ PERFORMANCE: Generate completion key using optimized utility
      const completionKey = RedisKeyManager.generateCompletionKey(
        task.period,
        task.id
      );

      // ✅ AUDIT: Log successful initiation
      if (IS_DEV) {
        console.log("[InitiateCompletion] Task initiation successful:", {
          taskId: task.id,
          taskName: task.name,
          completionKey,
          initiatedBy: user.email,
          userId: user.id,
          assigneeId: task.assigneeId,
          score: task.score,
          period: task.period,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        completionKey,
        taskInfo: {
          id: task.id,
          name: task.name,
          period: task.period,
          score: task.score,
        },
      });
    } catch (error: any) {
      // ✅ SCALABILITY: Comprehensive error handling
      console.error("[InitiateCompletion] Unexpected error:", {
        error: error.message,
        stack: IS_DEV ? error.stack : undefined,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Internal server error",
          errorCode: "INTERNAL_ERROR",
          ...(IS_DEV && { details: error.message }),
        },
        { status: 500 }
      );
    }
  }
);
