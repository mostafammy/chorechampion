import { getRedis } from "@/lib/redis";
import { AdjustScoreInput } from "@/types";
import { requireAuth } from "@/lib/auth/requireAuth";
import { NextRequest } from "next/server";

const allowedOrigin = "https://chorechampion.vercel.app"; // or "*" for all origins

function withCors(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export async function OPTIONS() {
  // Respond to preflight request
  return withCors(new Response(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    console.log("AdjustScore API called");

    // 🔒 CRITICAL: Authenticate the request first
    const authResult = await requireAuth(request);

    if (!authResult.ok) {
      console.log("Authentication failed:", authResult.error);
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized - Authentication required",
            errorCode: "AUTHENTICATION_REQUIRED",
          }),
          { status: 401 }
        )
      );
    }

    // Check if token refresh is needed - return special response for client-side handling
    if (authResult.needsRefresh) {
      console.log(
        "Token refresh needed - returning refresh instruction to client"
      );
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: "Token refresh required",
            errorCode: "TOKEN_REFRESH_REQUIRED",
            needsRefresh: true,
          }),
          { status: 401 }
        )
      );
    }

    const authenticatedUser = authResult.user!;
    console.log(
      `Authenticated user: ${authenticatedUser.email} (${authenticatedUser.id})`
    );

    const body = await request.json();
    console.log("Body parsed:", body);

    // Basic validation
    if (!body.userId || typeof body.delta !== "number" || !body.source) {
      console.log("Validation failed", body);
      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: "Missing or invalid fields",
          }),
          { status: 400 }
        )
      );
    }

    const {
      userId,
      delta,
      reason = "",
      source,
      taskId,
    } = body as AdjustScoreInput;

    // 🔒 SECURITY: Additional authorization checks
    // For now, allow any authenticated user to adjust scores
    // You might want to add role-based restrictions here
    console.log(
      `User ${authenticatedUser.email} adjusting score for user ${userId}`
    );

    // 🔒 SECURITY: Log the operation with authenticated user info
    console.log("Score adjustment request:", {
      requestedBy: authenticatedUser.email,
      requestedById: authenticatedUser.id,
      targetUserId: userId,
      delta,
      source,
      reason,
      taskId,
      timestamp: new Date().toISOString(),
    });

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
      adjustedBy: authenticatedUser.id, // 🔒 SECURITY: Track who made the adjustment
      adjustedByEmail: authenticatedUser.email,
      at: now,
    };

    console.log("About to update Redis");
    const multi = redis.multi();
    if (source === "task") {
      multi.hincrby(scoreKey, "total", delta);
    } else {
      multi.hincrby(scoreKey, "adjustment", delta);
      multi.hincrby(scoreKey, "total", delta);
    }
    multi
      .hset(scoreKey, { last_adjusted_at: now })
      .lpush(logKey, JSON.stringify(logEntry))
      .ltrim(logKey, 0, 49);
    await multi.exec();
    console.log("Redis updated");

    return withCors(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  } catch (error: any) {
    console.error("AdjustScore error:", error);
    return withCors(
      new Response(
        JSON.stringify({
          success: false,
          error: error?.message || "Internal server error",
        }),
        { status: 500 }
      )
    );
  }
}
