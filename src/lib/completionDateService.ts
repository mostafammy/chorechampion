import { getRedis } from "@/lib/redis";
import type { ArchivedTask, Member } from "@/types";

export async function MergeCompletionDate(
  Members: Member[],
  archivedTasks: ArchivedTask[]
): Promise<ArchivedTask[]> {
  const redis = getRedis();
  try {
    // Build a map of taskId to completion date from all members
    const allLogs = await Promise.all(
      Members.map(async (member) => {
        const logs = await redis.lrange(
          `user:${member.id}:adjustment_log`,
          0,
          100
        );
        return logs.map((entry) =>
          typeof entry === "string" ? JSON.parse(entry) : entry
        );
      })
    );
    // Flatten all logs
    const flatLogs = allLogs.flat();
    // Build a map: taskId -> completion date (use the latest 'at' if multiple)
    const taskCompletionMap = new Map<string, string>();
    for (const log of flatLogs) {
      if (log.source === "task" && log.taskId) {
        // If multiple completions, use the latest
        const prev = taskCompletionMap.get(log.taskId);
        if (!prev || new Date(log.at) > new Date(prev)) {
          taskCompletionMap.set(log.taskId, log.at);
        }
      }
    }
    // Enrich archivedTasks with completion date
    const enrichedArchivedTasks = archivedTasks.map((task) => {
      const completedDateStr = taskCompletionMap.get(task.id);
      let completedDate: Date;
      if (completedDateStr) {
        completedDate = new Date(completedDateStr);
      } else if (task.completedDate) {
        completedDate = task.completedDate;
      } else {
        completedDate = new Date(0); // fallback to epoch if not found
      }
      return {
        ...task,
        completedDate,
      };
    });
    return enrichedArchivedTasks;
  } catch (error) {
    console.error("Error fetching completion date:", error);
    return archivedTasks;
  }
}
