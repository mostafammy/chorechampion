import { getRedis } from "@/lib/redis";
import { IS_DEV } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/requireAuth"; // ✅ Add authentication
import { NextRequest } from "next/server";
import type { ConfirmCompletionRequest } from "@/types";

function isValidConfirmCompletionRequest(
  body: any
): body is ConfirmCompletionRequest {
  return (
    body &&
    typeof body.completionKey === "string" &&
    body.completionKey.startsWith("task:completion:")
  );
}

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Authenticate the request first
    const authResult = await requireAuth(request);

    if (!authResult.ok) {
      console.log("Authentication failed:", authResult.error);
      return new Response(
        JSON.stringify({
          error: "Unauthorized - Authentication required",
          errorCode: "AUTHENTICATION_REQUIRED",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if token refresh is needed - return special response for client-side handling
    if (authResult.needsRefresh) {
      console.log(
        "Token refresh needed - returning refresh instruction to client"
      );
      return new Response(
        JSON.stringify({
          error: "Token refresh required",
          errorCode: "TOKEN_REFRESH_REQUIRED",
          needsRefresh: true,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const authenticatedUser = authResult.user!;
    if (IS_DEV) {
      console.log(
        `[ConfirmCompletion] Authenticated user: ${authenticatedUser.email} (${authenticatedUser.id})`
      );
    }

    const redis = getRedis();

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      if (IS_DEV) {
        console.error("[ConfirmCompletion] Invalid JSON:", e);
      }
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isValidConfirmCompletionRequest(body)) {
      if (IS_DEV) {
        console.error(
          "[ConfirmCompletion] Invalid input: completionKey is required and must start with 'task:completion:'",
          body
        );
      }
      return new Response(
        JSON.stringify({
          error:
            "Invalid input: completionKey is required and must start with 'task:completion:'",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { completionKey } = body;

    // ✅ SECURITY: Log task completion confirmation with authenticated user info
    if (IS_DEV) {
      console.log("[ConfirmCompletion] Task completion confirmation:", {
        confirmedBy: authenticatedUser.email,
        confirmedById: authenticatedUser.id,
        completionKey: completionKey,
        timestamp: new Date().toISOString(),
      });
    }

    // Finalize the writing of the completion key
    await redis.set(completionKey, "true", { ex: 60 * 60 * 24 * 90 }); // 90 days expiration

    const ttl = await redis.ttl(completionKey); // Should be 7776000

    // ✅ SECURITY: Log successful completion
    if (IS_DEV) {
      console.log(
        `[ConfirmCompletion] Task completion confirmed: ${completionKey} by ${authenticatedUser.email}, TTL: ${ttl}`
      );
    }
    console.log("TTL:", ttl);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (IS_DEV) {
      console.error("[ConfirmCompletion] Internal Error:", e);
    }
    if (e && typeof e === "object" && e.status && e.message) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
