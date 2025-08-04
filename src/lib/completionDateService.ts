import { getRedis } from "@/lib/redis";
import type { Member, ArchivedTask } from "@/types";
import { completionDateCache } from "@/lib/completionDateCache";

/**
 * PRINCIPAL ENGINEER: Performance-optimized completion date service
 *
 * Features:
 * - Server-side caching for Redis query optimization
 * - Batch processing for multiple tasks
 * - Fallback handling for missing completion dates
 * - Performance monitoring and error resilience
 */

export async function MergeCompletionDate(
  Members: Member[],
  archivedTasks: ArchivedTask[]
): Promise<ArchivedTask[]> {
  const redis = getRedis();

  try {
    console.log(
      `[MergeCompletionDate] 🔍 Processing ${archivedTasks.length} archived tasks for ${Members.length} members`
    );

    // ✅ TIER 1: Check cache for already processed tasks
    const uncachedTasks: ArchivedTask[] = [];
    const cachedResults = new Map<string, Date>();

    for (const task of archivedTasks) {
      const cachedDate = await completionDateCache.get(task.id);
      if (cachedDate) {
        cachedResults.set(task.id, cachedDate);
      } else {
        uncachedTasks.push(task);
      }
    }

    console.log(
      `[MergeCompletionDate] 💾 Cache hits: ${cachedResults.size}, Cache misses: ${uncachedTasks.length}`
    );

    // ✅ TIER 2: Batch fetch completion dates for uncached tasks
    let taskCompletionMap = new Map<string, string>();

    if (uncachedTasks.length > 0) {
      console.log(
        `[MergeCompletionDate] 🔄 Fetching Redis logs for ${uncachedTasks.length} uncached tasks`
      );

      // Batch Redis operations for all members
      const allLogs = await Promise.all(
        Members.map(async (member) => {
          try {
            const logs = await redis.lrange(
              `user:${member.id}:adjustment_log`,
              0,
              100
            );
            return logs.map((entry) =>
              typeof entry === "string" ? JSON.parse(entry) : entry
            );
          } catch (error) {
            console.error(
              `[MergeCompletionDate] ❌ Failed to fetch logs for member ${member.id}:`,
              error
            );
            return [];
          }
        })
      );

      // Flatten and process logs
      const flatLogs = allLogs.flat();
      console.log(
        `[MergeCompletionDate] 📊 Processing ${flatLogs.length} Redis log entries`
      );

      // Build completion date map from Redis logs
      for (const log of flatLogs) {
        if (log.source === "task" && log.taskId && log.at) {
          // If multiple completions, use the latest
          const prev = taskCompletionMap.get(log.taskId);
          if (!prev || new Date(log.at) > new Date(prev)) {
            taskCompletionMap.set(log.taskId, log.at);
          }
        }
      }

      // ✅ TIER 3: Cache the newly fetched completion dates
      const batchCacheEntries: Array<{ taskId: string; completionDate: Date }> =
        [];

      for (const task of uncachedTasks) {
        const completedDateStr = taskCompletionMap.get(task.id);
        if (completedDateStr) {
          const completionDate = new Date(completedDateStr);
          batchCacheEntries.push({ taskId: task.id, completionDate });
        }
      }

      if (batchCacheEntries.length > 0) {
        completionDateCache.setBatch(batchCacheEntries);
        console.log(
          `[MergeCompletionDate] 💾 Cached ${batchCacheEntries.length} new completion dates`
        );
      }
    }

    // ✅ PERFORMANCE: Combine cached and newly fetched results
    const enrichedArchivedTasks = archivedTasks.map((task) => {
      let completedDate: Date;

      // Priority: Cache > Redis logs > Existing task date > Fallback
      const cachedDate = cachedResults.get(task.id);
      const redisDateStr = taskCompletionMap.get(task.id);

      if (cachedDate) {
        completedDate = cachedDate;
      } else if (redisDateStr) {
        completedDate = new Date(redisDateStr);
      } else if (task.completedDate) {
        completedDate = task.completedDate;
      } else {
        console.warn(
          `[MergeCompletionDate] ⚠️ No completion date found for task ${task.id}, using fallback`
        );
        completedDate = new Date(0); // Epoch fallback instead of current time
      }

      return {
        ...task,
        completedDate,
      };
    });

    // ✅ MONITORING: Log performance metrics
    const metrics = completionDateCache.getMetrics();
    console.log(`[MergeCompletionDate] 📈 Performance metrics:`, {
      processedTasks: enrichedArchivedTasks.length,
      cacheHitRate: `${metrics.hitRate.toFixed(1)}%`,
      cacheSize: metrics.cacheSize,
    });

    return enrichedArchivedTasks;
  } catch (error) {
    console.error(
      "[MergeCompletionDate] ❌ Error fetching completion dates:",
      error
    );
    return archivedTasks;
  }
}
