import getAllTasksService, { GetAllTasksError } from "@/lib/getAllTasksService";
import { IS_DEV } from "@/lib/utils";

export async function GET() {
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
