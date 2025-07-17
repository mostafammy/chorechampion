'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import type { Member, Task, ArchivedTask, Period, AppContextType, AppProviderProps } from '@/types';
import { initialMembers, initialActiveTasks, initialArchivedTasks, fetchAllTasksFromApi } from '@/data/seed';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: AppProviderProps) {
  const [members] = useState<Member[]>(initialMembers);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]); // initialActiveTasks
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]); // initialArchivedTasks
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>({});

  // Fetch tasks from API on mount and update activeTasks
  useEffect(() => {
    fetchAllTasksFromApi().then((tasks: Task[]) => {
      if (Array.isArray(tasks) && tasks.length > 0) {
        setActiveTasks(tasks.filter(t => !t.completed));
        setArchivedTasks(
          tasks.filter(t => t.completed).map(t => ({
            ...t,
            completedDate: new Date(), // or use t.completedDate if available from backend
          }))
        );
      }
    });
  }, []);

  useEffect(() => {
    console.log('Active tasks updated:', activeTasks);
  }, [activeTasks]);

  const handleAdjustScore = (memberId: string, amount: number) => {
    setScoreAdjustments((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || 0) + amount,
    }));
  };

  const handleAddTask = (task: Task) => {
    setActiveTasks((prevTasks) => [...prevTasks, task]);
  };

  const handleToggleTask = (taskId: string) => {
    const taskToArchive = activeTasks.find((task) => task.id === taskId);
    if (taskToArchive) {
      setArchivedTasks((prev) => [
        ...prev,
        { ...taskToArchive, completed: true, completedDate: new Date() },
      ]);
      setActiveTasks((prev) => prev.filter((task) => task.id !== taskId));
    }
  };

  const value = useMemo<AppContextType>(() => ({
    members,
    activeTasks,
    archivedTasks,
    scoreAdjustments,
    handleAddTask,
    handleToggleTask,
    handleAdjustScore,
  }), [members, activeTasks, archivedTasks, scoreAdjustments]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
