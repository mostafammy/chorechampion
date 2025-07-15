import { NextResponse } from "next/server";
import {baseUrl, IS_DEV} from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const cronHeader = request.headers.get("x-vercel-cron");

    // Verify the request is from a Vercel CRON job

    // if (request.method === "POST" && cronHeader !== "true") {
    //   return new NextResponse("Unauthorized - Not a Vercel CRON job", {
    //     status: 401,
    //   });
    // }

    // Call internal logic


    console.log("baseUrl", baseUrl);

    const reset = await fetch(
      `${baseUrl}/api/ResetCompletionScanning`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESET_SECRET}`,
        },
      }
    );

    const result = await reset.text();

    return new NextResponse(`Reset triggered via CRON: ${result}`);
  } catch (e) {
    console.error("Error in InternalCompletionResetTrigger:", e);
    if (IS_DEV) {
      return new NextResponse(
        `Internal Server Error: ${e instanceof Error ? e.message : String(e)}`,
        { status: 500 }
      );
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  } finally {
  }
}

export async function GET(request: Request) {
  return POST(request);
}
