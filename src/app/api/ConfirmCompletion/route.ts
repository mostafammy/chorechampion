import { getRedis } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const redis = getRedis();

    const { completionKey } = await request.json();

    // ✅ Simple regex pattern check (at minimum)
    if (!completionKey.startsWith("task:completion:")) {
      return new Response(JSON.stringify({ error: "Invalid key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Optional: extract taskId from key and validate user

    // Finalize the writing of the completion key
    await redis.set(completionKey, "true");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ConfirmCompletion] Internal Error:", e);
    } else {
      console.error("[ConfirmCompletion] Internal Error");
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
