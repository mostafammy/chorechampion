import { getRedis } from "@/lib/redis";
import { generateCompletionKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const redis = getRedis();

    const taskIds = await redis.lrange("task:list", 0, -1);

    if (taskIds.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const tasks = await Promise.all(
      taskIds.map(async (taskId) => {
        const taskData = await redis.get(`task:${taskId}`);

        if (!taskData) {
          return null;
        }

        // Handle different data types
        if (typeof taskData === "string") {
          // If it's a string, try to parse it as JSON
          try {
            return JSON.parse(taskData);
          } catch (error) {
            console.error(`Invalid JSON for task ${taskId}:`, taskData);
            return null;
          }
        } else if (typeof taskData === "object") {
          // If it's already an object, return it directly
          return taskData;
        } else {
          console.log(
            `Unexpected data type for task ${taskId}:`,
            typeof taskData
          );
          return null;
        }
      })
    );

    const filteredTasks = tasks.filter((task) => task !== null);

    // Remove 'createdAt' from each task before sending to frontend
    const sanitizedTasks = filteredTasks.map((task) => {
      const { createdAt, ...rest } = task;
      return rest;
    });

    // Only include tasks that have all required properties and valid data
    const validTasks = sanitizedTasks.filter((task) => {
      return (
        typeof task.id === "string" &&
        task.id.trim() !== "" &&
        typeof task.name === "string" &&
        task.name.trim() !== "" &&
        typeof task.score === "number" &&
        !isNaN(task.score) &&
        (task.period === "daily" ||
          task.period === "weekly" ||
          task.period === "monthly") &&
        typeof task.completed === "boolean" &&
        typeof task.assigneeId === "string" &&
        task.assigneeId.trim() !== ""
      );
    });

    // Check completion key for each task and update completed property if found
    const tasksWithCompletion = await Promise.all(
      validTasks.map(async (task) => {
        const completionKey = generateCompletionKey(task.period, task.id);
        const isCompleted = await redis.get(completionKey);
        if (isCompleted) {
          return { ...task, completed: true };
        }
        return task;
      })
    );

    return new Response(JSON.stringify(tasksWithCompletion), { status: 200 });
  } catch (error) {
    console.error("Error in GET request:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
