import { getRedis } from "@/lib/redis";
import { generateCompletionKey } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const redis = getRedis();
    const { taskId } = await request.json();
    const taskStr = await redis.get(`task:${taskId}`);
    if (!taskStr)
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    // Parse the task object
    const task = typeof taskStr === "string" ? JSON.parse(taskStr) : taskStr;
    if (!task)
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    // Use the reusable function to generate the completion key
    const completionKey = generateCompletionKey(task.period, task.id);
    return new Response(JSON.stringify({ completionKey }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log the error for debugging (only output stack in development)
    if (process.env.NODE_ENV === "development") {
      console.error("[InitiateCompletion] Internal Error:", error);
    } else {
      console.error("[InitiateCompletion] Internal Error");
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
