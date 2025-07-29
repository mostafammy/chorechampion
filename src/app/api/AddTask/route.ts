import { getRedis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { IS_DEV } from "@/lib/utils";
import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import type { Task, Period, AddTaskRequest } from "@/types";

// Enhanced validation schema with Zod
const addTaskSchema = z.object({
  name: z
    .string()
    .min(1, "Task name is required")
    .max(100, "Task name must be less than 100 characters")
    .trim(),
  score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(1000, "Score must be less than 1000"),
  assigneeId: z.string().min(1, "Assignee ID is required").trim(),
  period: z.enum(["daily", "weekly", "monthly"], {
    errorMap: () => ({ message: "Period must be daily, weekly, or monthly" }),
  }),
});

// Enhanced secure endpoint with comprehensive protection
export const POST = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ API-level rate limiting
      customConfig: false, // ✅ Use default limits (100 req/min prod, 10000 req/min dev)
    },
    validation: {
      schema: addTaskSchema, // ✅ Automatic input validation
      sanitizeHtml: true, // ✅ XSS protection
      maxStringLength: 1000, // ✅ Prevent large payload attacks
    },
    auditLog: true, // ✅ Comprehensive audit logging
    logRequests: true, // ✅ Request/response logging
    corsEnabled: false, // ✅ Internal API - no CORS needed
  },
  async (req: NextRequest, { user, validatedData }) => {
    try {
      // ✅ Enhanced logging with authenticated user context
      if (IS_DEV) {
        console.log("[AddTask] Task creation request:", {
          createdBy: user.email,
          createdById: user.userId || user.id,
          taskData: validatedData,
          timestamp: new Date().toISOString(),
        });
      }

      const redis = getRedis();
      const taskId = `task-${nanoid(10)}`;

      // ✅ Create task with validated data (already sanitized by SecureEndpoint)
      const newTask: Task = {
        id: taskId,
        name: validatedData.name,
        score: validatedData.score,
        assigneeId: validatedData.assigneeId,
        period: validatedData.period,
        completed: false,
      };

      const taskRedisKey = `task:${newTask.id}`;

      // ✅ Store task in Redis
      await redis.set(taskRedisKey, JSON.stringify(newTask));
      await redis.lpush("task:list", taskId);

      // ✅ Enhanced success logging
      if (IS_DEV) {
        console.log(
          `[AddTask] Task created successfully: ${taskId} by ${user.email}`
        );
      }

      // ✅ Return clean response (SecureEndpoint adds security headers automatically)
      return NextResponse.json(newTask, { status: 201 });
    } catch (error: any) {
      // ✅ Enhanced error handling (SecureEndpoint provides context)
      if (IS_DEV) {
        console.error("[AddTask] Redis operation failed:", error);
      }

      // ✅ Let SecureEndpoint handle error formatting and logging
      throw new Error("Failed to create task. Please try again.");
    }
  }
);
