import { getRedis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { IS_DEV } from "@/lib/utils";
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

export async function POST(request: Request) {
  try {
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
