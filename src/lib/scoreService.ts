import { getRedis } from "./redis";
import type { ScoreSummary, ScoreLogEntry } from "@/types";
import { IS_DEV } from "./utils";

/**
 * 🚀 Enhanced Score Service - Enterprise Edition
 * ==============================================
 *
 * Optimized score management service with enterprise features:
 * - ✅ Enhanced error handling and validation
 * - ✅ Pagination support for large datasets
 * - ✅ Period filtering for score logs
 * - ✅ Performance optimized Redis operations
 * - ✅ Type-safe data processing
 * - ✅ Comprehensive logging and monitoring
 */

const redis = getRedis();

// ✅ Enhanced error handling for score operations
export class ScoreServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "ScoreServiceError";
  }
}

// ✅ Extended score log entry for API responses
export interface EnhancedScoreLogEntry extends ScoreLogEntry {
  id?: string;
  taskName?: string;
  score?: number;
  period?: "daily" | "weekly" | "monthly";
  completedAt?: string;
  timestamp?: string;
}

/**
 * ✅ Enterprise Score Summary Service
 * Retrieves comprehensive score data with enhanced error handling
 */
export async function getScoreSummary(userId: string): Promise<ScoreSummary> {
  try {
    // ✅ VALIDATION: Input validation
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ScoreServiceError(
        "INVALID_USER_ID",
        "User ID is required and must be a non-empty string",
        400
      );
    }

    const trimmedUserId = userId.trim();

    if (IS_DEV) {
      console.log(
        `[ScoreService] Fetching score summary for user: ${trimmedUserId}`
      );
    }

    // ✅ PERFORMANCE: Redis operation with error handling
    let data: Record<string, string | undefined> | null;
    try {
      data = await redis.hgetall<Record<string, string | undefined>>(
        `user:${trimmedUserId}:score`
      );
    } catch (redisError: any) {
      if (IS_DEV) {
        console.error(
          `[ScoreService] Redis error for user ${trimmedUserId}:`,
          redisError
        );
      }
      throw new ScoreServiceError(
        "REDIS_ERROR",
        "Failed to retrieve score data from database",
        503
      );
    }

    // ✅ SCALABILITY: Handle null response from Redis
    if (!data) {
      data = {};
    }

    // ✅ SCALABILITY: Enhanced data processing with validation
    const scoreSummary: ScoreSummary = {
      total: parseNumber(data?.total, 0),
      adjustment: parseNumber(data?.adjustment, 0),
      completed: parseNumber(data?.completed, 0),
      last_adjusted_at: data?.last_adjusted_at || undefined,
    };

    // ✅ PERFORMANCE: Validate score data integrity
    if (scoreSummary.total < 0 || scoreSummary.completed < 0) {
      if (IS_DEV) {
        console.warn(
          `[ScoreService] Invalid score data detected for user ${trimmedUserId}:`,
          scoreSummary
        );
      }
    }

    if (IS_DEV) {
      console.log(
        `[ScoreService] Score summary retrieved for ${trimmedUserId}:`,
        {
          total: scoreSummary.total,
          completed: scoreSummary.completed,
          hasAdjustment: !!scoreSummary.adjustment,
        }
      );
    }

    return scoreSummary;
  } catch (error: any) {
    if (error instanceof ScoreServiceError) {
      throw error; // Re-throw service errors
    }

    if (IS_DEV) {
      console.error(
        `[ScoreService] Unexpected error in getScoreSummary for user ${userId}:`,
        error
      );
    }

    throw new ScoreServiceError(
      "INTERNAL_ERROR",
      "Internal service error while retrieving score summary"
    );
  }
}

/**
 * ✅ Enterprise Score Logs Service with Pagination and Filtering
 * Retrieves score logs with comprehensive pagination and period filtering
 */
export async function getScoreLogs(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  period: "daily" | "weekly" | "monthly" | "all" = "all"
): Promise<EnhancedScoreLogEntry[]> {
  try {
    // ✅ VALIDATION: Input validation
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ScoreServiceError(
        "INVALID_USER_ID",
        "User ID is required and must be a non-empty string",
        400
      );
    }

    if (limit <= 0 || limit > 100) {
      throw new ScoreServiceError(
        "INVALID_LIMIT",
        "Limit must be between 1 and 100",
        400
      );
    }

    if (offset < 0) {
      throw new ScoreServiceError(
        "INVALID_OFFSET",
        "Offset must be non-negative",
        400
      );
    }

    const validPeriods = ["daily", "weekly", "monthly", "all"] as const;
    if (!validPeriods.includes(period)) {
      throw new ScoreServiceError(
        "INVALID_PERIOD",
        "Period must be one of: daily, weekly, monthly, all",
        400
      );
    }

    const trimmedUserId = userId.trim();

    if (IS_DEV) {
      console.log(
        `[ScoreService] Fetching score logs for user: ${trimmedUserId}`,
        {
          limit,
          offset,
          period,
        }
      );
    }

    // ✅ PERFORMANCE: Calculate Redis range with pagination
    const start = offset;
    const end = offset + limit - 1;

    // ✅ SCALABILITY: Redis operation with error handling
    let rawLogs: string[];
    try {
      rawLogs = await redis.lrange<string>(
        `user:${trimmedUserId}:adjustment_log`,
        start,
        end
      );
    } catch (redisError: any) {
      if (IS_DEV) {
        console.error(
          `[ScoreService] Redis error fetching logs for user ${trimmedUserId}:`,
          redisError
        );
      }
      throw new ScoreServiceError(
        "REDIS_ERROR",
        "Failed to retrieve score logs from database",
        503
      );
    }

    // ✅ PERFORMANCE: Process logs with error handling and validation
    const logs: EnhancedScoreLogEntry[] = [];

    for (let i = 0; i < rawLogs.length; i++) {
      try {
        const rawLogEntry = JSON.parse(rawLogs[i]) as any;

        // ✅ MAINTAINABILITY: Validate log entry structure
        if (!isValidRawLogEntry(rawLogEntry)) {
          if (IS_DEV) {
            console.warn(
              `[ScoreService] Invalid log entry skipped for user ${trimmedUserId}:`,
              rawLogEntry
            );
          }
          continue; // Skip invalid entries instead of failing
        }

        // ✅ SCALABILITY: Apply period filtering based on available data
        const entryPeriod =
          rawLogEntry.period ||
          extractPeriodFromReason(rawLogEntry.reason) ||
          "daily";
        if (period !== "all" && entryPeriod !== period) {
          continue; // Skip entries that don't match the period filter
        }

        // ✅ PERFORMANCE: Transform to enhanced log entry format
        const enhancedLogEntry: EnhancedScoreLogEntry = {
          // Core ScoreLogEntry properties
          delta: parseNumber(rawLogEntry.delta, 0),
          reason: rawLogEntry.reason || "Score adjustment",
          source: rawLogEntry.source || "manual",
          userId: rawLogEntry.userId || trimmedUserId,
          taskId: rawLogEntry.taskId,
          at:
            rawLogEntry.at || rawLogEntry.timestamp || new Date().toISOString(),

          // Enhanced properties for API response
          id:
            rawLogEntry.id ||
            `${rawLogEntry.taskId || "adj"}-${rawLogEntry.at || Date.now()}`,
          taskName:
            rawLogEntry.taskName ||
            extractTaskNameFromReason(rawLogEntry.reason),
          score: parseNumber(rawLogEntry.delta, 0), // Map delta to score for compatibility
          period: entryPeriod,
          completedAt:
            rawLogEntry.completedAt || rawLogEntry.at || rawLogEntry.timestamp,
          timestamp:
            rawLogEntry.timestamp || rawLogEntry.at || new Date().toISOString(),
        };

        logs.push(enhancedLogEntry);
      } catch (parseError: any) {
        if (IS_DEV) {
          console.warn(
            `[ScoreService] Failed to parse log entry for user ${trimmedUserId}:`,
            {
              rawEntry: rawLogs[i],
              error: parseError.message,
            }
          );
        }
        // Continue processing other entries instead of failing completely
        continue;
      }
    }

    // ✅ PERFORMANCE: Apply additional filtering if needed
    let filteredLogs = logs;

    // If period filtering reduced the results significantly, we might need more data
    if (
      period !== "all" &&
      filteredLogs.length < limit &&
      rawLogs.length === limit
    ) {
      // This indicates we might have more matching entries beyond our current range
      // For now, we return what we have, but this could be enhanced with smarter pagination
      if (IS_DEV) {
        console.log(
          `[ScoreService] Period filtering reduced results for user ${trimmedUserId}`,
          {
            originalCount: rawLogs.length,
            filteredCount: filteredLogs.length,
            period,
          }
        );
      }
    }

    if (IS_DEV) {
      console.log(`[ScoreService] Score logs retrieved for ${trimmedUserId}:`, {
        totalLogs: filteredLogs.length,
        limit,
        offset,
        period,
        hasMore: rawLogs.length === limit,
      });
    }

    return filteredLogs;
  } catch (error: any) {
    if (error instanceof ScoreServiceError) {
      throw error; // Re-throw service errors
    }

    if (IS_DEV) {
      console.error(
        `[ScoreService] Unexpected error in getScoreLogs for user ${userId}:`,
        error
      );
    }

    throw new ScoreServiceError(
      "INTERNAL_ERROR",
      "Internal service error while retrieving score logs"
    );
  }
}

/**
 * ✅ UTILITY: Enhanced number parsing with validation
 * Safely converts string values to numbers with fallbacks
 */
function parseNumber(
  value: string | number | undefined,
  fallback: number = 0
): number {
  if (typeof value === "number") {
    return isNaN(value) ? fallback : value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

/**
 * ✅ UTILITY: Log entry validation
 * Validates the structure and required fields of score log entries
 */
function isValidLogEntry(entry: any): entry is ScoreLogEntry {
  return (
    entry &&
    typeof entry === "object" &&
    (typeof entry.delta === "number" || typeof entry.delta === "string") &&
    typeof entry.reason === "string" &&
    typeof entry.source === "string" &&
    typeof entry.userId === "string" &&
    typeof entry.at === "string"
  );
}

/**
 * ✅ UTILITY: Raw log entry validation
 * Validates the structure of raw log entries from Redis
 */
function isValidRawLogEntry(entry: any): boolean {
  return (
    entry &&
    typeof entry === "object" &&
    (typeof entry.delta === "number" || typeof entry.delta === "string") &&
    (typeof entry.reason === "string" || entry.reason === undefined)
  );
}

/**
 * ✅ UTILITY: Extract period from reason string
 * Attempts to determine task period from the reason field
 */
function extractPeriodFromReason(
  reason: string
): "daily" | "weekly" | "monthly" | null {
  if (!reason || typeof reason !== "string") {
    return null;
  }

  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("daily")) return "daily";
  if (lowerReason.includes("weekly")) return "weekly";
  if (lowerReason.includes("monthly")) return "monthly";

  return null;
}

/**
 * ✅ UTILITY: Extract task name from reason string
 * Attempts to extract meaningful task name from the reason field
 */
function extractTaskNameFromReason(reason: string): string {
  if (!reason || typeof reason !== "string") {
    return "Unknown Task";
  }

  // Try to extract task name from common patterns
  // Example: "Completed task: Clean Kitchen" -> "Clean Kitchen"
  const patterns = [
    /completed task:\s*(.+)/i,
    /task completed:\s*(.+)/i,
    /finished:\s*(.+)/i,
    /done:\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = reason.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, return a cleaned version of the reason
  return reason.length > 50 ? reason.substring(0, 47) + "..." : reason;
}

/**
 * ✅ UTILITY: Get total log count for a user (for pagination metadata)
 * Efficiently retrieves the total number of log entries
 */
export async function getScoreLogCount(userId: string): Promise<number> {
  try {
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new ScoreServiceError(
        "INVALID_USER_ID",
        "User ID is required",
        400
      );
    }

    const trimmedUserId = userId.trim();
    const count = await redis.llen(`user:${trimmedUserId}:adjustment_log`);
    return count || 0;
  } catch (error: any) {
    if (error instanceof ScoreServiceError) {
      throw error;
    }

    if (IS_DEV) {
      console.error(
        `[ScoreService] Error getting log count for user ${userId}:`,
        error
      );
    }

    throw new ScoreServiceError("REDIS_ERROR", "Failed to get log count");
  }
}
