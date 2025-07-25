import getAllTasksService, { GetAllTasksError } from "@/lib/getAllTasksService";
import { IS_DEV } from "@/lib/utils";
import {requireAuth} from "@/lib/auth/requireAuth";
import {NextRequest} from "next/server";

export async function GET(request: NextRequest) {
    // If the user is authenticated, proceed to get all tasks
  try {
    const tasksWithCompletion = await getAllTasksService();
    return new Response(JSON.stringify(tasksWithCompletion), { status: 200 });
  } catch (error) {
    if (error instanceof GetAllTasksError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
      });
    }
    if (IS_DEV) {
      console.error("Error in GET request:", error);
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
