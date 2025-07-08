'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Member, Task, ArchivedTask, Period } from '@/types';
import { initialMembers, initialActiveTasks, initialArchivedTasks } from '@/data/seed';

interface AppContextType {
  members: Member[];
  activeTasks: Task[];
  archivedTasks: ArchivedTask[];
  scoreAdjustments: Record<string, number>;
  handleAddTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  handleToggleTask: (taskId: string) => void;
  handleAdjustScore: (memberId: string, amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [members] = useState<Member[]>(initialMembers);
  const [activeTasks, setActiveTasks] = useState<Task[]>(initialActiveTasks);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>(initialArchivedTasks);
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>({});

  const handleAdjustScore = (memberId: string, amount: number) => {
    setScoreAdjustments((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || 0) + amount,
    }));
  };

  const handleAddTask = (task: Omit<Task, 'id' | 'completed'>) => {
    const newTask: Task = {
      ...task,
      id: `t${Date.now()}`,
      completed: false,
    };
    setActiveTasks((prevTasks) => [...prevTasks, newTask]);
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

  const value = useMemo(() => ({
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

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
