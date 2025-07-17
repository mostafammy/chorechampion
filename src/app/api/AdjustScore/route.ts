import { getRedis } from "@/lib/redis";
import { AdjustScoreInput } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.userId || typeof body.delta !== "number" || !body.source) {
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

    await redis
      .multi()
      .hincrby(scoreKey, "adjustment", delta)
      .hincrby(scoreKey, "total", delta)
      .hset(scoreKey, { last_adjusted_at: now })
      .lpush(logKey, JSON.stringify(logEntry))
      .ltrim(logKey, 0, 49)
      .exec();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Internal server error",
      }),
      { status: 500 }
    );
  }
}
