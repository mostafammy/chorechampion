import { AppProvider } from '@/context/app-provider';
import { SSRfetchAllTasksFromApi } from '@/lib/utils';
import { Dashboard } from '@/components/dashboard';
import { Header } from '@/components/header';

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

  return (
    <AppProvider initialActiveTasks={activeTasks} initialArchivedTasks={archivedTasks}>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <Dashboard />
        </main>
      </div>
    </AppProvider>
  );
}
