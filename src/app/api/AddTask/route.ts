import {getRedis} from "@/lib/redis";
import {nanoid} from "nanoid";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Validations

        // Redis Connection
        const redis = getRedis();

        // Add Task Id Generation

        const taskId = `task-${nanoid(10)}`;

        // Create Task Object

        const AddTaskDataSent = {
            id: taskId,
            name: body.name,
            score: body.score,
            assigneeId: body.assigneeId,
            period: body.period,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        // Redis Key Generation

        const TaskRedisKey = `task:${AddTaskDataSent.id}`;

        // Check if the task already exists for the assignee



        // Add New Task Logic => Add The Task Id + Add The Task Object

        await redis.set(TaskRedisKey, JSON.stringify(AddTaskDataSent));

        await redis.lpush("task:list", taskId);

        // Only return the properties matching the Task type
        const responseTask = {
            id: AddTaskDataSent.id,
            name: AddTaskDataSent.name,
            score: AddTaskDataSent.score,
            assigneeId: AddTaskDataSent.assigneeId,
            period: AddTaskDataSent.period,
            completed: AddTaskDataSent.completed,
        };

        return new Response(JSON.stringify(responseTask), { status: 200 });
    }catch (error) {
        console.error("Error in POST request:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }finally {

    }
}