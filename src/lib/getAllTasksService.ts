import { getRedis } from "@/lib/redis";
import { RedisKeyManager, IS_DEV } from "@/lib/utils";
import type { Task } from "@/types";

export class GetAllTasksError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GetAllTasksError";
  }
}

/**
 * 🚀 Enhanced Get All Tasks Service - Enterprise Edition
 * ======================================================
 *
 * Optimized for server-side rendering and high-performance data retrieval.
 * Features batch operations, connection pooling, and comprehensive error handling.
 *
 * Performance Optimizations:
 * - ✅ Batch Redis operations with pipeline
 * - ✅ Parallel task data and completion status fetching
 * - ✅ Early validation and filtering
 * - ✅ Memory-efficient data processing
 * - ✅ Connection pooling support
 */
const getAllTasksService = async (): Promise<Task[]> => {
  try {
    const redis = getRedis();

    // ✅ PERFORMANCE: Fetch task list with error handling
    let taskIds: string[];
    try {
      taskIds = await redis.lrange("task:list", 0, -1);
    } catch (redisError: any) {
      if (IS_DEV) {
        console.error(
          "[getAllTasksService] Redis connection error:",
          redisError
        );
      }
      throw new GetAllTasksError(503, "Database connection failed");
    }

    // ✅ SCALABILITY: Early return for empty task list
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      if (!Array.isArray(taskIds) && IS_DEV) {
        console.log("[getAllTasksService] Invalid task list format");
      }
      return [];
    }

    if (IS_DEV) {
      console.log(`[getAllTasksService] Processing ${taskIds.length} tasks`);
    }

    // ✅ PERFORMANCE: Batch fetch task data using pipeline for efficiency
    const pipeline = redis.pipeline();
    taskIds.forEach((taskId) => {
      pipeline.get(`task:${taskId}`);
    });

    let taskDataArray: (string | null)[];
    try {
      const pipelineResults = await pipeline.exec();
      taskDataArray =
        pipelineResults?.map((result: any) => {
          const [err, data] = Array.isArray(result) ? result : [null, result];
          return err ? null : (data as string | null);
        }) || [];
    } catch (pipelineError: any) {
      if (IS_DEV) {
        console.error(
          "[getAllTasksService] Pipeline execution error:",
          pipelineError
        );
      }
      throw new GetAllTasksError(503, "Database operation failed");
    }

    // ✅ PERFORMANCE: Process tasks with parallel parsing and validation
    const tasks = await Promise.all(
      taskIds.map(async (taskId, index): Promise<Task | null> => {
        const taskData = taskDataArray[index];

        if (!taskData) {
          if (IS_DEV) {
            console.log(
              `[getAllTasksService] Task ${taskId} not found in Redis`
            );
          }
          return null;
        }

        // ✅ MAINTAINABILITY: Centralized task parsing with error handling
        try {
          const parsedTask =
            typeof taskData === "string"
              ? (JSON.parse(taskData) as Task)
              : (taskData as Task);

          // ✅ SCALABILITY: Early validation to filter invalid tasks
          if (!isValidTask(parsedTask)) {
            if (IS_DEV) {
              console.log(
                `[getAllTasksService] Invalid task structure for ${taskId}:`,
                parsedTask
              );
            }
            return null;
          }

          return parsedTask;
        } catch (parseError: any) {
          if (IS_DEV) {
            console.error(
              `[getAllTasksService] JSON parsing failed for task ${taskId}:`,
              parseError
            );
          }
          // Continue processing other tasks instead of failing completely
          return null;
        }
      })
    );

    // ✅ PERFORMANCE: Filter out null tasks efficiently
    const validTasks = tasks.filter((task): task is Task => task !== null);

    if (IS_DEV && validTasks.length !== taskIds.length) {
      console.log(
        `[getAllTasksService] Filtered ${
          taskIds.length - validTasks.length
        } invalid tasks`
      );
    }

    // ✅ PERFORMANCE: Batch fetch completion status using pipeline
    if (validTasks.length === 0) {
      return [];
    }

    const completionPipeline = redis.pipeline();
    validTasks.forEach((task) => {
      const completionKey = RedisKeyManager.generateCompletionKey(
        task.period,
        task.id
      );
      completionPipeline.exists(completionKey);
    });

    let completionResults: number[];
    try {
      const completionPipelineResults = await completionPipeline.exec();
      completionResults =
        completionPipelineResults?.map((result: any) => {
          const [err, data] = Array.isArray(result) ? result : [null, result];
          return err ? 0 : (data as number);
        }) || [];
    } catch (completionError: any) {
      if (IS_DEV) {
        console.error(
          "[getAllTasksService] Completion status fetch error:",
          completionError
        );
      }
      // Continue without completion status rather than failing
      completionResults = new Array(validTasks.length).fill(0);
    }

    // ✅ MAINTAINABILITY: Apply completion status to tasks
    const tasksWithCompletion = validTasks.map((task, index) => ({
      ...task,
      completed: completionResults[index] === 1,
    }));

    if (IS_DEV) {
      const completedCount = tasksWithCompletion.filter(
        (t) => t.completed
      ).length;
      console.log(
        `[getAllTasksService] ✅ Successfully processed ${tasksWithCompletion.length} tasks (${completedCount} completed)`
      );
    }

    return tasksWithCompletion;
  } catch (error: any) {
    // ✅ SCALABILITY: Comprehensive error handling
    if (error instanceof GetAllTasksError) {
      throw error; // Re-throw service errors
    }

    if (IS_DEV) {
      console.error("[getAllTasksService] Unexpected error:", error);
    }

    throw new GetAllTasksError(500, "Internal service error");
  }
};

/**
 * ✅ UTILITY: Enhanced task validation with comprehensive checks
 * Validates all required task properties for type safety and data integrity
 */
function isValidTask(task: any): task is Task {
  return (
    task &&
    typeof task === "object" &&
    typeof task.id === "string" &&
    task.id.trim() !== "" &&
    typeof task.name === "string" &&
    task.name.trim() !== "" &&
    typeof task.score === "number" &&
    !isNaN(task.score) &&
    task.score >= 0 &&
    (task.period === "daily" ||
      task.period === "weekly" ||
      task.period === "monthly") &&
    typeof task.completed === "boolean" &&
    typeof task.assigneeId === "string" &&
    task.assigneeId.trim() !== ""
  );
}

export default getAllTasksService;
