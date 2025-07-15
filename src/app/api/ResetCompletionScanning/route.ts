import { NextResponse } from "next/server";
import { scanCompletionTasks } from "@/lib/utils";
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
    // Start: first day of month three months ago
    const startDate = new Date(Date.UTC(year, month - 3, 1));
    // End: last day of month before last
    const endDate = new Date(Date.UTC(year, month - 1 + 1, 0));

    // New: current month start and end
    const currentMonthStart = new Date(Date.UTC(year, month, 1));
    const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0));

    // Filter keys in date range
    // getKeysInDateRange returns ParsedCompletionKey[]
    const { getKeysInDateRange } = await import("@/lib/utils");
    // const keysInRange = getKeysInDateRange(keys, startDate, endDate);  // for production, we can use the start and end dates calculated above

    // New: filter keys for the current month
    const keysInRange = getKeysInDateRange(
      keys,
      currentMonthStart,
      currentMonthEnd
    ); // for test purposes, we can use the current month start and end

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
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/ConfirmResetCompletion`,
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
          filteredKeys: keysInRange,
          completionKeys,
          confirmReset: confirmResetData,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new NextResponse(
      `Reset success - Completion reset triggered with the date ${new Date().toISOString()}`,
      { status: 200 }
    );
  } catch (e) {
    console.error("Error in ResetCompletionScanning:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
