import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { baseUrl, IS_DEV } from "@/lib/utils";
import { initialMembers } from "@/data/seed";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expected = `Bearer ${process.env.RESET_SECRET}`;

    if (authHeader !== expected) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const redis = getRedis();
    const keysJson = await redis.get("reset:pending:completionKeys");
    if (IS_DEV) {
      console.log(
        "[ConfirmResetCompletion] Retrieved pending completion keys:",
        keysJson
      );
      console.log("[ConfirmResetCompletion] typeof keysJson:", typeof keysJson);
    }
    if (!keysJson) {
      if (IS_DEV) {
        console.log(
          "[ConfirmResetCompletion] No pending completion keys found."
        );
      }
      return new NextResponse(
        JSON.stringify({ message: "No pending completion keys found." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let keys: string[];
    try {
      if (Array.isArray(keysJson)) {
        keys = keysJson;
      } else if (typeof keysJson === "string") {
        keys = JSON.parse(keysJson);
      } else {
        throw new Error("Unexpected type for keysJson");
      }
      if (!Array.isArray(keys) || !keys.every((k) => typeof k === "string")) {
        throw new Error("Parsed value is not an array of strings");
      }
    } catch (e) {
      if (IS_DEV) {
        console.error(
          "[ConfirmResetCompletion] Failed to parse keys:",
          e,
          keysJson
        );
      }
      return new NextResponse(
        JSON.stringify({ error: "Failed to parse pending completion keys." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use Redis pipeline (multi/exec) for efficient batch deletion
    const pipeline = redis.multi();
    for (const key of keys) {
      pipeline.del(key);
    }
    pipeline.del("reset:pending:completionKeys"); // Clean up the marker key
    const results = await pipeline.exec();

    if (IS_DEV) {
      console.log(
        `[ConfirmResetCompletion] Deleted ${keys.length} completion keys.`
      );
    }

    const members = initialMembers; // or however you get your members

    await Promise.all(
      members.map(async (member) => {
        const scoreKey = `user:${member.id}:score`;
        // Option 1: Reset fields to zero
        await redis.hset(scoreKey, {
          adjustment: 0,
          total: 0,
          last_adjusted_at: new Date().toISOString(),
        });

        // Option 2: To delete the entire score hash, use:
        // await redis.del(scoreKey);
      })
    );

    return new NextResponse(
      JSON.stringify({
        message: `Deleted ${keys.length} completion keys.`,
        deletedKeys: keys,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error in ConfirmResetCompletion:", e);
    if (IS_DEV) {
      return new NextResponse(
        `Internal Server Error: ${e instanceof Error ? e.message : String(e)}`,
        { status: 500 }
      );
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
