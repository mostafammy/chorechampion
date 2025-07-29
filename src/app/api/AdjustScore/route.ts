import { getRedis } from "@/lib/redis";
import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { IS_DEV } from "@/lib/utils";

// Enhanced validation schema with Zod
const adjustScoreSchema = z.object({
  userId: z.string().min(1, "User ID is required").trim(),
  delta: z
    .number()
    .int("Score delta must be an integer")
    .min(-1000, "Score delta cannot be less than -1000")
    .max(1000, "Score delta cannot be more than 1000"),
  reason: z
    .string()
    .max(500, "Reason must be less than 500 characters")
    .optional(),
  source: z.enum(["manual", "task", "bonus", "admin"], {
    errorMap: () => ({
      message: "Source must be manual, task, bonus, or admin",
    }),
  }),
  taskId: z.string().optional().nullable(),
});

// Enhanced secure endpoint with comprehensive protection
export const POST = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ API-level rate limiting (600 req/hour in prod)
      customConfig: false, // ✅ Use default limits
    },
    validation: {
      schema: adjustScoreSchema, // ✅ Automatic input validation
      sanitizeHtml: true, // ✅ XSS protection
      maxStringLength: 1000, // ✅ Prevent large payload attacks
    },
    // ✅ Using role-based access instead of permissions (works with current JWT)
    auditLog: true, // ✅ Comprehensive audit logging
    logRequests: true, // ✅ Request/response logging
    corsEnabled: true, // ✅ CORS enabled for this endpoint
  },
  async (req: NextRequest, { user, validatedData }) => {
    try {
      // 🔍 Debug: Log the complete user object to see what we're working with
      if (IS_DEV) {
        console.log("🔍 [AdjustScore] Complete user debug info:", {
          user: JSON.stringify(user, null, 2),
          userRole: user.role,
          userRoleType: typeof user.role,
          userKeys: Object.keys(user),
        });
      }

      // ✅ Role-based access control (works with current JWT structure)
      const allowedRoles = ["ADMIN", "admin"]; // Check both uppercase and lowercase
      if (!allowedRoles.includes(user.role)) {
        if (IS_DEV) {
          console.log(
            `[AdjustScore] Access denied for role: "${
              user.role
            }" (type: ${typeof user.role}), required: ${allowedRoles.join(
              " or "
            )}`
          );
          console.log("Full user object:", JSON.stringify(user, null, 2));
        }

        return NextResponse.json(
          {
            error: "Insufficient privileges to adjust scores",
            errorCode: "INSUFFICIENT_ROLE",
            requiredRoles: allowedRoles,
            userRole: user.role,
          },
          { status: 403 }
        );
      }
      // ✅ Enhanced logging with authenticated user context
      if (IS_DEV) {
        console.log("[AdjustScore] Score adjustment request:", {
          requestedBy: user.email,
          requestedById: user.userId || user.id,
          targetUserId: validatedData.userId,
          delta: validatedData.delta,
          source: validatedData.source,
          reason: validatedData.reason,
          taskId: validatedData.taskId,
          timestamp: new Date().toISOString(),
        });
      }

      const redis = getRedis();
      const scoreKey = `user:${validatedData.userId}:score`;
      const logKey = `user:${validatedData.userId}:adjustment_log`;
      const now = new Date().toISOString();

      // ✅ Create audit log entry with validated data
      const logEntry = {
        delta: validatedData.delta,
        reason: validatedData.reason || "",
        source: validatedData.source,
        taskId: validatedData.taskId,
        userId: validatedData.userId,
        adjustedBy: user.userId || user.id, // ✅ Track who made the adjustment
        adjustedByEmail: user.email,
        at: now,
      };

      // ✅ Atomic Redis operations with enhanced logic
      const multi = redis.multi();

      if (validatedData.source === "task") {
        // Task-based score adjustments only affect total
        multi.hincrby(scoreKey, "total", validatedData.delta);
      } else {
        // Manual/bonus/admin adjustments track separately and affect total
        multi.hincrby(scoreKey, "adjustment", validatedData.delta);
        multi.hincrby(scoreKey, "total", validatedData.delta);
      }

      multi
        .hset(scoreKey, { last_adjusted_at: now })
        .lpush(logKey, JSON.stringify(logEntry))
        .ltrim(logKey, 0, 49); // Keep last 50 entries

      await multi.exec();

      // ✅ Enhanced success logging
      if (IS_DEV) {
        console.log(
          `[AdjustScore] Score adjusted successfully: ${validatedData.delta} points for user ${validatedData.userId} by ${user.email}`
        );
      }

      // ✅ Return clean response (SecureEndpoint adds security headers automatically)
      return NextResponse.json(
        {
          success: true,
          message: "Score adjusted successfully",
          adjustment: {
            delta: validatedData.delta,
            source: validatedData.source,
            userId: validatedData.userId,
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      // ✅ Enhanced error handling (SecureEndpoint provides context)
      if (IS_DEV) {
        console.error("[AdjustScore] Redis operation failed:", error);
      }

      // ✅ Let SecureEndpoint handle error formatting and logging
      throw new Error("Failed to adjust score. Please try again.");
    }
  }
);

// ✅ OPTIONS handler for CORS (handled automatically by SecureEndpoint when corsEnabled: true)
export const OPTIONS = createSecureEndpoint(
  {
    requireAuth: false, // ✅ CORS preflight doesn't need auth
    corsEnabled: true, // ✅ Handle CORS preflight
    logRequests: false, // ✅ Don't log OPTIONS requests
  },
  async () => {
    return new NextResponse(null, { status: 204 });
  }
);
