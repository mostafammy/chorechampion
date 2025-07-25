import { getRedis } from "@/lib/redis";
import { generateCompletionKey } from "@/lib/utils";
import { IS_DEV } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/requireAuth"; // ✅ Add authentication
import { NextRequest } from "next/server";
import type { InitiateCompletionRequest, Task } from "@/types";

function isValidInitiateCompletionRequest(
  body: any
): body is InitiateCompletionRequest {
  return (
    body && typeof body.taskId === "string" && body.taskId.trim().length > 0
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
        { status: 401, headers: { "Content-Type": "application/json" } }
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
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const authenticatedUser = authResult.user!;
    if (IS_DEV) {
      console.log(
        `[InitiateCompletion] Authenticated user: ${authenticatedUser.email} (${authenticatedUser.id})`
      );
    }

    const redis = getRedis();

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      if (IS_DEV) {
        console.error("[InitiateCompletion] Invalid JSON:", e);
      }
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isValidInitiateCompletionRequest(body)) {
      if (IS_DEV) {
        console.error(
          "[InitiateCompletion] Invalid input: taskId is required and must be a non-empty string.",
          body
        );
      }
      return new Response(
        JSON.stringify({
          error:
            "Invalid input: taskId is required and must be a non-empty string.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { taskId } = body;
    const taskStr = await redis.get(`task:${taskId}`);
    if (!taskStr) {
      if (IS_DEV) {
        console.error(
          `[InitiateCompletion] Task not found for taskId: ${taskId}`
        );
      }
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Parse the task object
    let task: Task;
    try {
      task = typeof taskStr === "string" ? JSON.parse(taskStr) : taskStr;
    } catch (e) {
      if (IS_DEV) {
        console.error(
          `[InitiateCompletion] Invalid JSON for task: ${taskId}`,
          taskStr
        );
      }
      return new Response(
        JSON.stringify({ error: `Invalid JSON for task: ${taskId}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (!task) {
      if (IS_DEV) {
        console.error(
          `[InitiateCompletion] Task not found after parsing for taskId: ${taskId}`
        );
      }
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ SECURITY: Log task initiation with authenticated user info
    if (IS_DEV) {
      console.log("[InitiateCompletion] Task completion initiation:", {
        initiatedBy: authenticatedUser.email,
        initiatedById: authenticatedUser.id,
        taskId: task.id,
        taskName: task.name,
        assigneeId: task.assigneeId,
        score: task.score,
        period: task.period,
        timestamp: new Date().toISOString(),
      });
    }

    // Use the reusable function to generate the completion key
    const completionKey = generateCompletionKey(task.period, task.id);

    // ✅ SECURITY: Log successful key generation
    if (IS_DEV) {
      console.log(
        `[InitiateCompletion] Completion key generated: ${completionKey} by ${authenticatedUser.email}`
      );
    }

    return new Response(JSON.stringify({ completionKey }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (IS_DEV) {
      console.error("[InitiateCompletion] Internal Error:", error);
    }
    if (error && typeof error === "object" && error.status && error.message) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
