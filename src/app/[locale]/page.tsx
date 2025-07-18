import { AppProvider } from '@/context/app-provider';
import {baseUrl, SSRfetchAllTasksFromApi } from '@/lib/utils';
import { Dashboard } from '@/components/dashboard';
import { Header } from '@/components/header';
import {initialMembers} from "@/data/seed";

// Add this line to enable ISR with 60-second revalidation
export const revalidate = 60;



export default async function Page() {
  const tasks = await SSRfetchAllTasksFromApi(); // SSR Fetch tasks from API

  const activeTasks = tasks.filter(t => !t.completed);
  const archivedTasks = tasks
    .filter(t => t.completed)
    .map(t => ({
      ...t,
      completedDate: new Date(),
    }));


const members = initialMembers; // or however you get your members

const adjustments: Record<string, number> = {};

await Promise.all(
  members.map(async (member) => {
    const res = await fetch(`${baseUrl}/api/score/${member.id}`, {
        method: "GET",
        cache: "default" });
    if (res.ok) {
      const data = await res.json();
      adjustments[member.id] = data.adjustment ?? 0;
    } else {
      adjustments[member.id] = 0;
    }
  })
);

  return (
    <AppProvider initialActiveTasks={activeTasks} initialArchivedTasks={archivedTasks} initialScoreAdjustments={adjustments}>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <Dashboard />
        </main>
      </div>
    </AppProvider>
  );
}
