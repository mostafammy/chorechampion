/**
 * Reset Completion Scanning API Route
 *
 * This endpoint scans and resets completion tasks based on environment:
 * - Development: Uses current month data for easier testing
 * - Production: Uses historical range (3-1 months ago) for safe cleanup
 *
 * Optimized for Vercel serverless functions with proper error handling
 * and environment-aware behavior.
 */

import { NextResponse } from "next/server";
import { baseUrl, scanCompletionTasks } from "@/lib/utils";
import { getRedis } from "@/lib/redis";
import { IS_DEV } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expected = `Bearer ${process.env.RESET_SECRET}`;

    if (authHeader !== expected) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Start The Reset Logic Here

    const redis = getRedis();
    const keys = await scanCompletionTasks(redis, "task:completion:*");

    // Calculate date range: from three months ago (start of month) to one month ago (end of month)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-based: July = 6

    // ✅ PRODUCTION RANGE: Historical cleanup (safe for production)
    // Start: first day of month three months ago
    const startDate = new Date(Date.UTC(year, month - 3, 1));
    // End: last day of month before last
    const endDate = new Date(Date.UTC(year, month - 1 + 1, 0));

    // ✅ DEVELOPMENT RANGE: Current month (easier testing)
    // Start: first day of current month
    const currentMonthStart = new Date(Date.UTC(year, month, 1));
    // End: last day of current month
    const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0));

    // Filter keys in date range
    // getKeysInDateRange returns ParsedCompletionKey[]
    const { getKeysInDateRange } = await import("@/lib/utils");

    // ✅ Environment-aware date range selection
    // Development: Use current month for easier testing and debugging
    // Production: Use historical range (3 months ago to 1 month ago) for safe cleanup
    const [rangeStart, rangeEnd] = IS_DEV
      ? [currentMonthStart, currentMonthEnd] // Dev: Current month for testing
      : [startDate, endDate]; // Prod: Historical range for safe cleanup

    const keysInRange = getKeysInDateRange(keys, rangeStart, rangeEnd);

    // ✅ Environment-aware logging for debugging
    if (IS_DEV) {
      console.log(`[DEV] Using current month range for testing:`, {
        start: currentMonthStart.toISOString(),
        end: currentMonthEnd.toISOString(),
        totalKeys: keys.length,
        filteredKeys: keysInRange.length,
      });
    } else {
      console.log(`[PROD] Using historical range for cleanup:`, {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        totalKeys: keys.length,
        filteredKeys: keysInRange.length,
      });
    }

    // For demonstration, log the filtered keys count
    console.log(`Filtered completion keys in range:`, keysInRange.length);

    const completionKeys = keysInRange.map(
      (k) => `task:completion:${k.period}:${k.taskId}:${k.datePart}`
    );

    // Store completionKeys in Redis for later deletion (expires in 1 hour)
    await redis.set(
      "reset:pending:completionKeys",
      JSON.stringify(completionKeys),
      { ex: 60 * 60 }
    );
    // End The Reset Logic Here

    // Call ConfirmResetCompletion endpoint to delete the keys
    const confirmResetRes = await fetch(
      `${baseUrl}/api/ConfirmResetCompletion`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESET_SECRET}`,
        },
      }
    );
    const confirmResetData = await confirmResetRes.json();

    if (IS_DEV) {
      return new NextResponse(
        JSON.stringify({
          message:
            "Reset success - Completion reset triggered (development mode)",
          environment: "development",
          dateRange: {
            mode: "current_month_testing",
            start: currentMonthStart.toISOString(),
            end: currentMonthEnd.toISOString(),
          },
          filteredKeys: keysInRange,
          completionKeys,
          confirmReset: confirmResetData,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new NextResponse(
      JSON.stringify({
        message: `Reset success - Completion reset triggered with date ${new Date().toISOString()}`,
        environment: "production",
        dateRange: {
          mode: "historical_cleanup",
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        keysProcessed: keysInRange.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error in ResetCompletionScanning:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
