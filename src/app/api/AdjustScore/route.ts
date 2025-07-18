import { getRedis } from "@/lib/redis";
import { AdjustScoreInput } from "@/types";

export async function POST(request: Request) {
  try {
    console.log("AdjustScore API called");
    const body = await request.json();
    console.log("Body parsed:", body);

    // Basic validation
    if (!body.userId || typeof body.delta !== "number" || !body.source) {
      console.log("Validation failed", body);
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid fields" }),
        { status: 400 }
      );
    }

    const {
      userId,
      delta,
      reason = "",
      source,
      taskId,
    } = body as AdjustScoreInput;

    const redis = getRedis();
    const scoreKey = `user:${userId}:score`;
    const logKey = `user:${userId}:adjustment_log`;

    const now = new Date().toISOString();

    const logEntry = {
      delta,
      reason,
      source,
      taskId,
      userId,
      at: now,
    };

    console.log("About to update Redis");
    await redis
      .multi()
      .hincrby(scoreKey, "adjustment", delta)
      .hincrby(scoreKey, "total", delta)
      .hset(scoreKey, { last_adjusted_at: now })
      .lpush(logKey, JSON.stringify(logEntry))
      .ltrim(logKey, 0, 49)
      .exec();
    console.log("Redis updated");

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("AdjustScore error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Internal server error",
      }),
      { status: 500 }
    );
  }
}
