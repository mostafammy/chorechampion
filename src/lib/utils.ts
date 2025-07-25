import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AdjustScoreInput, Period } from "@/types";
import { Redis } from "@upstash/redis";
import type { Task } from "@/types";
import { prisma } from "@/lib/prismaClient";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Generate a completion key for a task based on its frequency and the current date.
 * @param period Period
 * @param taskId string
 * @param date Optional Date object (defaults to now)
 * @returns string completion key
 */
export function generateCompletionKey(
  period: Period,
  taskId: string,
  date: Date = new Date()
): string {
  let datePart = "";
  if (period === "daily") {
    datePart = date.toISOString().slice(0, 10); // YYYY-MM-DD
  } else if (period === "weekly") {
    // Get ISO week number and year
    const getWeek = (d: Date) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
      return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
    };
    datePart = getWeek(date); // e.g. 2025-W28
  } else if (period === "monthly") {
    datePart = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`; // e.g. 2025-07
  }
  return `task:completion:${period}:${taskId}:${datePart}`;
}

export async function scanCompletionTasks(
  redis: Redis,
  pattern: string = "task:completion:*"
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    let [nextCursor, foundKeys] = await redis.scan(cursor, {
      match: pattern,
      count: 100,
    });
    cursor = Number(nextCursor);
    keys.push(...foundKeys);
  } while (cursor !== 0);

  return keys;
}

interface ParsedCompletionKey {
  period: Period;
  taskId: string;
  datePart: string;
  date: Date;
  isValid: boolean;
}

interface ParsedCompletionKeyError {
  period: null;
  taskId: null;
  datePart: null;
  date: null;
  isValid: false;
  error: string;
}

type ParseResult = ParsedCompletionKey | ParsedCompletionKeyError;

/**
 * Parse a completion key to extract period, taskId, and date information
 * @param key - The Redis key to parse (e.g., "task:completion:daily:task-L-e4UdbrSM:2025-07-14")
 * @returns Parsed key information with the reconstructed Date object
 */
export function parseCompletionKey(key: string): ParseResult {
  // Expected format: task:completion:{period}:{taskId}:{datePart}
  const keyPattern = /^task:completion:(daily|weekly|monthly):(.+):(.+)$/;
  const match = key.match(keyPattern);

  if (!match) {
    return {
      period: null,
      taskId: null,
      datePart: null,
      date: null,
      isValid: false,
      error: `Invalid key format: ${key}`,
    };
  }

  const [, period, taskId, datePart] = match;

  try {
    const date = parseDatePart(period as Period, datePart);

    return {
      period: period as Period,
      taskId,
      datePart,
      date,
      isValid: true,
    };
  } catch (error) {
    return {
      period: null,
      taskId: null,
      datePart: null,
      date: null,
      isValid: false,
      error: `Failed to parse date part "${datePart}" for period "${period}": ${error}`,
    };
  }
}

/**
 * Parse the date part based on the period type
 * @param period - The period type (daily, weekly, monthly)
 * @param datePart - The date string from the key
 * @returns Date object
 */
function parseDatePart(period: Period, datePart: string): Date {
  switch (period) {
    case "daily":
      return parseDailyDate(datePart);
    case "weekly":
      return parseWeeklyDate(datePart);
    case "monthly":
      return parseMonthlyDate(datePart);
    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

/**
 * Parse daily date format: YYYY-MM-DD
 */
function parseDailyDate(datePart: string): Date {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(datePart)) {
    throw new Error(
      `Invalid daily date format: ${datePart}. Expected YYYY-MM-DD`
    );
  }

  const date = new Date(datePart + "T00:00:00.000Z");
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${datePart}`);
  }

  return date;
}

/**
 * Parse weekly date format: YYYY-WNN (e.g., 2025-W28)
 */
function parseWeeklyDate(datePart: string): Date {
  const weekPattern = /^(\d{4})-W(\d{2})$/;
  const match = datePart.match(weekPattern);

  if (!match) {
    throw new Error(
      `Invalid weekly date format: ${datePart}. Expected YYYY-WNN`
    );
  }

  const [, yearStr, weekStr] = match;
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  if (week < 1 || week > 53) {
    throw new Error(`Invalid week number: ${week}. Must be between 1 and 53`);
  }

  // Calculate the date of the Monday of the given ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // Convert Sunday (0) to 7
  const mondayOfWeek1 = new Date(
    jan4.getTime() - (jan4DayOfWeek - 1) * 86400000
  );
  const mondayOfTargetWeek = new Date(
    mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000
  );

  return mondayOfTargetWeek;
}

/**
 * Parse monthly date format: YYYY-MM
 */
function parseMonthlyDate(datePart: string): Date {
  const monthPattern = /^(\d{4})-(\d{2})$/;
  const match = datePart.match(monthPattern);

  if (!match) {
    throw new Error(
      `Invalid monthly date format: ${datePart}. Expected YYYY-MM`
    );
  }

  const [, yearStr, monthStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
  }

  // Return the first day of the month
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Batch parse multiple completion keys
 * @param keys - Array of Redis keys to parse
 * @returns Array of parsed results
 */
export function parseCompletionKeys(keys: string[]): ParseResult[] {
  return keys.map(parseCompletionKey);
}

/**
 * Filter and parse only valid completion keys
 * @param keys - Array of Redis keys to parse
 * @returns Array of valid parsed keys only
 */
export function parseValidCompletionKeys(
  keys: string[]
): ParsedCompletionKey[] {
  return keys
    .map(parseCompletionKey)
    .filter((result): result is ParsedCompletionKey => result.isValid);
}

/**
 * Group parsed keys by period
 * @param keys - Array of Redis keys to parse
 * @returns Object with keys grouped by period
 */
export function groupKeysByPeriod(
  keys: string[]
): Record<Period, ParsedCompletionKey[]> {
  const validKeys = parseValidCompletionKeys(keys);

  return validKeys.reduce((groups, key) => {
    if (!groups[key.period]) {
      groups[key.period] = [];
    }
    groups[key.period].push(key);
    return groups;
  }, {} as Record<Period, ParsedCompletionKey[]>);
}

/**
 * Get keys for a specific date range
 * @param keys - Array of Redis keys to parse
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of parsed keys within the date range
 */
export function getKeysInDateRange(
  keys: string[],
  startDate: Date,
  endDate: Date
): ParsedCompletionKey[] {
  const validKeys = parseValidCompletionKeys(keys);

  return validKeys.filter((key) => {
    const keyDate = key.date;
    return keyDate >= startDate && keyDate <= endDate;
  });
}

// Usage examples
export function examples() {
  // Example 1: Parse a single key
  const key = "task:completion:daily:task-L-e4UdbrSM:2025-07-14";
  const parsed = parseCompletionKey(key);

  if (parsed.isValid) {
    console.log(`Task ID: ${parsed.taskId}`);
    console.log(`Period: ${parsed.period}`);
    console.log(`Date: ${parsed.date.toISOString()}`);
    console.log(`Original date part: ${parsed.datePart}`);
  } else {
    if ("error" in parsed) {
      console.error(`Error parsing key: ${parsed.error}`);
    }
  }

  // Example 2: Parse multiple keys
  const keys = [
    "task:completion:daily:task-L-e4UdbrSM:2025-07-14",
    "task:completion:weekly:task-ABC123:2025-W28",
    "task:completion:monthly:task-XYZ789:2025-07",
    "invalid:key:format",
  ];

  const results = parseCompletionKeys(keys);
  const validResults = results.filter((r) => r.isValid);
  const invalidResults = results.filter((r) => !r.isValid);

  console.log(`Valid keys: ${validResults.length}`);
  console.log(`Invalid keys: ${invalidResults.length}`);

  // Example 3: Group by period
  const groupedKeys = groupKeysByPeriod(keys);
  console.log("Keys by period:", groupedKeys);

  // Example 4: Get keys in date range
  const startDate = new Date("2025-07-01");
  const endDate = new Date("2025-07-31");
  const keysInRange = getKeysInDateRange(keys, startDate, endDate);

  console.log(`Keys in July 2025: ${keysInRange.length}`);
}

export async function SSRfetchAllTasksFromApi(): Promise<Task[]> {
  try {
    const isServer = typeof window === "undefined";
    const baseUrl = isServer
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      : "";
    const res = await fetch(`${baseUrl}/api/GetAllTasks`);
    if (!res.ok) return [];
    return (await res.json()) as Task[];
  } catch (e: unknown) {
    console.error("Failed to fetch tasks from API:", e);
    return [];
  }
}

export const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : process.env.NEXT_PUBLIC_BASE_URL
  ? `https://${process.env.NEXT_PUBLIC_BASE_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function fetchAdjustScoreApi({
  userId,
  delta,
  reason = "",
  source = "manual",
  taskId = null,
}: AdjustScoreInput): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // Import fetchWithAuth dynamically to avoid circular dependencies
    const { fetchWithAuth } = await import("@/lib/auth/fetchWithAuth");

    const response = await fetchWithAuth(`${baseUrl}/api/AdjustScore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        delta,
        reason,
        source,
        taskId,
      }),
      correlationId: `adjust-score-${userId}-${Date.now()}`,
      maxRetries: 2, // Retry up to 2 times for score adjustments
      onRefreshError: (error) => {
        console.warn("[AdjustScore] Token refresh failed:", error);
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("[AdjustScore] API call failed:", error);

    // Handle authentication errors specifically
    if (error.name === "SessionExpiredError") {
      return {
        success: false,
        error:
          "Your session has expired. Please refresh the page and try again.",
      };
    }

    if (error.name === "AuthenticationError") {
      return {
        success: false,
        error: "Authentication failed. Please refresh the page and try again.",
      };
    }

    return {
      success: false,
      error: error?.message || "Failed to adjust score. Please try again.",
    };
  }
}

// Utility to escape HTML
export function escapeHtml(str: string): string {
  return str.replace(/[&<>'"`=\/]/g, function (s) {
    return (
      (
        {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
          "`": "&#96;",
          "=": "&#61;",
          "/": "&#47;",
        } as Record<string, string>
      )[s] || s
    );
  });
}

// Check if email exists (separate, reusable, testable)
export async function isEmailTaken(
  email: string,
  db = prisma
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { email } });
  return !!user;
}
