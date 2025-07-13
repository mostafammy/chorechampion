import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Generate a completion key for a task based on its frequency and the current date.
 * @param period 'daily' | 'weekly' | 'monthly'
 * @param taskId string
 * @param date Optional Date object (defaults to now)
 * @returns string completion key
 */
export function generateCompletionKey(
  period: "daily" | "weekly" | "monthly",
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
