import { getRedis } from "@/lib/redis";
import { generateCompletionKey } from "@/lib/utils";
import { IS_DEV } from "@/lib/utils";
import type { InitiateCompletionRequest, Task } from "@/types";

function isValidInitiateCompletionRequest(
  body: any
): body is InitiateCompletionRequest {
  return (
    body && typeof body.taskId === "string" && body.taskId.trim().length > 0
  );
}

export async function POST(request: Request) {
  try {
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
    // Use the reusable function to generate the completion key
    const completionKey = generateCompletionKey(task.period, task.id);
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
