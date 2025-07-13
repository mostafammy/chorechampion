import { getRedis } from "@/lib/redis";
import { IS_DEV } from "@/lib/utils";
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

export async function POST(request: Request) {
  try {
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

    // Finalize the writing of the completion key
    await redis.set(completionKey, "true");

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
