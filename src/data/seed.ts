import type { Member, Task, ArchivedTask } from "@/types";

export const initialMembers: Member[] = [
  { id: "1", name: "Brother", avatar: "https://placehold.co/128x128.png" },
  { id: "2", name: "Sister", avatar: "https://placehold.co/128x128.png" },
];

const allInitialTasks: (Omit<Task, "completed"> & { completed: boolean })[] = [
  {
    id: "t1",
    name: "Take out the trash",
    score: 10,
    period: "daily",
    completed: true,
    assigneeId: "1",
  },
  {
    id: "t2",
    name: "Walk the dog",
    score: 15,
    period: "daily",
    completed: false,
    assigneeId: "1",
  },
  {
    id: "t3",
    name: "Clean your room",
    score: 20,
    period: "weekly",
    completed: false,
    assigneeId: "1",
  },
  {
    id: "t8",
    name: "Mow the lawn",
    score: 40,
    period: "monthly",
    completed: false,
    assigneeId: "1",
  },
  {
    id: "t4",
    name: "Do the dishes",
    score: 10,
    period: "daily",
    completed: true,
    assigneeId: "2",
  },
  {
    id: "t5",
    name: "Feed the cat",
    score: 5,
    period: "daily",
    completed: true,
    assigneeId: "2",
  },
  {
    id: "t6",
    name: "Water the plants",
    score: 10,
    period: "weekly",
    completed: false,
    assigneeId: "2",
  },
  {
    id: "t7",
    name: "Deep clean the kitchen",
    score: 50,
    period: "monthly",
    completed: false,
    assigneeId: "2",
  },
];

export const initialActiveTasks: Task[] = allInitialTasks
  .filter((t) => !t.completed)
  .map(({ ...rest }) => ({ ...rest, completed: false }));

export const initialArchivedTasks: ArchivedTask[] = allInitialTasks
  .filter((t) => t.completed)
  .map(({ ...rest }) => ({
    ...rest,
    completed: true,
    completedDate: new Date(
      Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7)
    ),
  }));

// Fetch tasks from the API endpoint
export async function fetchAllTasksFromApi(): Promise<Task[]> {
  try {
    const res = await fetch("/api/GetAllTasks");
    if (!res.ok) return [];
    return (await res.json()) as Task[];
  } catch (e: unknown) {
    console.error("Failed to fetch tasks from API:", e);
    return [];
  }
}
