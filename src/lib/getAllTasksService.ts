import { getRedis } from "@/lib/redis";
import { generateCompletionKey, IS_DEV } from "@/lib/utils";
import type { Task } from "@/types";

export class GetAllTasksError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GetAllTasksError";
  }
}

const getAllTasksService = async (): Promise<Task[]> => {
  const redis = getRedis();

  const taskIds = await redis.lrange("task:list", 0, -1);

  if (!Array.isArray(taskIds)) {
    if (IS_DEV) {
      console.log("Invalid data: task list is not an array.");
    }
    throw new GetAllTasksError(400, "Invalid data: task list is not an array.");
  }

  if (taskIds.length === 0) {
    return [];
  }

  const tasks = await Promise.all(
    taskIds.map(async (taskId): Promise<Task | null> => {
      const taskData = await redis.get(`task:${taskId}`);

      if (!taskData) {
        // Task ID exists in list but not in Redis, possible data inconsistency
        return null;
      }

      // Handle different data types
      if (typeof taskData === "string") {
        // If it's a string, try to parse it as JSON
        try {
          return JSON.parse(taskData) as Task;
        } catch (error) {
          if (IS_DEV) {
            console.log(`Invalid JSON for task ${taskId}:`, taskData);
          }
          // Invalid JSON for a task, throw for error handling
          throw new GetAllTasksError(400, `Invalid JSON for task ${taskId}`);
        }
      } else if (typeof taskData === "object") {
        // If it's already an object, return it directly
        return taskData as Task;
      } else {
        if (IS_DEV) {
          console.log(
            `Unexpected data type for task ${taskId}:`,
            typeof taskData
          );
        }
        // Unexpected data type
        throw new GetAllTasksError(
          400,
          `Unexpected data type for task ${taskId}: ${typeof taskData}`
        );
      }
    })
  );

  const filteredTasks = tasks.filter((task): task is Task => task !== null);

  // Remove 'createdAt' from each task before sending to frontend
  const sanitizedTasks = filteredTasks.map((task) => {
    const { createdAt, ...rest } = task as Task & { createdAt?: string };
    return rest as Task;
  });

  // Only include tasks that have all required properties and valid data
  const validTasks = sanitizedTasks.filter((task: Task) => {
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

  if (validTasks.length !== sanitizedTasks.length) {
    if (IS_DEV) {
      console.log("Some tasks had invalid or missing properties.");
    }
  }

  // Check completion key for each task and update completed property if found
  return await Promise.all(
    validTasks.map(async (task: Task) => {
      const completionKey = generateCompletionKey(task.period, task.id);
      const isCompleted = await redis.get(completionKey);
      if (isCompleted) {
        return { ...task, completed: true };
      }
      return task;
    })
  );
};

export default getAllTasksService;
