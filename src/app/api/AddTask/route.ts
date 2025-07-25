import { getRedis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { IS_DEV } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/requireAuth"; // ✅ Add authentication
import { NextRequest } from "next/server";
import type { Task, Period, AddTaskRequest } from "@/types";

function isValidPeriod(period: any): period is Period {
  return ["daily", "weekly", "monthly"].includes(period);
}

function isValidAddTaskRequest(body: any): body is AddTaskRequest {
  return (
    body &&
    typeof body.name === "string" &&
    body.name.trim().length > 0 &&
    typeof body.score === "number" &&
    !isNaN(body.score) &&
    typeof body.assigneeId === "string" &&
    body.assigneeId.trim().length > 0 &&
    isValidPeriod(body.period)
  );
}

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Authenticate the request first
    const authResult = await requireAuth(request);

    if (!authResult.ok) {
      console.log("Authentication failed:", authResult.error);
      return new Response(
        JSON.stringify({
          error: "Unauthorized - Authentication required",
          errorCode: "AUTHENTICATION_REQUIRED",
        }),
        { status: 401 }
      );
    }

    // Check if token refresh is needed - return special response for client-side handling
    if (authResult.needsRefresh) {
      console.log(
        "Token refresh needed - returning refresh instruction to client"
      );
      return new Response(
        JSON.stringify({
          error: "Token refresh required",
          errorCode: "TOKEN_REFRESH_REQUIRED",
          needsRefresh: true,
        }),
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user!;
    if (IS_DEV) {
      console.log(
        `[AddTask] Authenticated user: ${authenticatedUser.email} (${authenticatedUser.id})`
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      if (IS_DEV) {
        console.error("[AddTask] Invalid JSON:", e);
      }
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
      });
    }

    if (!isValidAddTaskRequest(body)) {
      if (IS_DEV) {
        console.error(
          "[AddTask] Invalid input: name, score, assigneeId, and period are required and must be valid.",
          body
        );
      }
      return new Response(
        JSON.stringify({
          error:
            "Invalid input: name, score, assigneeId, and period are required and must be valid.",
        }),
        {
          status: 400,
        }
      );
    }

    const redis = getRedis();
    const taskId = `task-${nanoid(10)}`;

    // ✅ SECURITY: Log task creation with authenticated user info
    if (IS_DEV) {
      console.log("[AddTask] Task creation request:", {
        createdBy: authenticatedUser.email,
        createdById: authenticatedUser.id,
        taskData: {
          name: body.name,
          score: body.score,
          assigneeId: body.assigneeId,
          period: body.period,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const AddTaskDataSent: Task = {
      id: taskId,
      name: body.name,
      score: body.score,
      assigneeId: body.assigneeId,
      period: body.period,
      completed: false,
    };

    const TaskRedisKey = `task:${AddTaskDataSent.id}`;

    await redis.set(TaskRedisKey, JSON.stringify(AddTaskDataSent));
    await redis.lpush("task:list", taskId);

    // ✅ SECURITY: Log successful task creation
    if (IS_DEV) {
      console.log(
        `[AddTask] Task created successfully: ${taskId} by ${authenticatedUser.email}`
      );
    }

    // Only return the properties matching the Task type
    const responseTask: Task = {
      id: AddTaskDataSent.id,
      name: AddTaskDataSent.name,
      score: AddTaskDataSent.score,
      assigneeId: AddTaskDataSent.assigneeId,
      period: AddTaskDataSent.period,
      completed: AddTaskDataSent.completed,
    };

    return new Response(JSON.stringify(responseTask), { status: 200 });
  } catch (error: any) {
    if (IS_DEV) {
      console.error("[AddTask] Internal Error:", error);
    }
    if (error && typeof error === "object" && error.status && error.message) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
      });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
