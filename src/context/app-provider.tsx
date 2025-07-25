'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import type { Member, Task, ArchivedTask, Period, AppContextType, AppProviderProps as BaseAppProviderProps } from '@/types';
import { initialMembers } from '@/data/seed';
import { ScoreService } from '@/lib/api/scoreService';
import { toast } from '@/hooks/use-toast';

interface AppProviderProps extends BaseAppProviderProps {
  initialActiveTasks?: Task[];
  initialArchivedTasks?: ArchivedTask[];
  initialScoreAdjustments?: Record<string, number>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({
  children,
  initialActiveTasks = [],
  initialArchivedTasks = [],
  initialScoreAdjustments = {},
}: AppProviderProps) {
  const [members] = useState<Member[]>(initialMembers);
  const [activeTasks, setActiveTasks] = useState<Task[]>(initialActiveTasks);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>(initialArchivedTasks);
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>(initialScoreAdjustments);

  // Remove the useEffect that fetches tasks on mount

  useEffect(() => {
    console.log('Active tasks updated:', activeTasks);
  }, [activeTasks]);

  const handleAdjustScore = async (memberId: string, amount: number) => {
    // 1. Validate the input before proceeding
    const validation = ScoreService.validateScoreAdjustment({
      userId: memberId,
      delta: amount,
      source: "manual",
    });

    if (!validation.isValid) {
      toast({
        title: "Invalid Input",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    // 2. Optimistically update UI
    setScoreAdjustments((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || 0) + amount,
    }));

    console.log('Optimistically updated score adjustments:', { memberId, amount });

    // 3. Call the enterprise score service with enhanced error handling
    try {
      const result = await ScoreService.adjustScore(
        { 
          userId: memberId, 
          delta: amount, 
          source: "manual",
          reason: "Manual adjustment from dashboard"
        },
        {
          maxRetries: 2,
          userFriendlyErrors: true,
          correlationId: `manual-adjustment-${memberId}-${Date.now()}`,
        }
      );

      // 4. Handle the result
      if (!result.success) {
        // Revert optimistic update
        setScoreAdjustments((prev) => ({
          ...prev,
          [memberId]: (prev[memberId] || 0) - amount,
        }));

        // Show appropriate error message
        toast({
          title: "Score Adjustment Failed",
          description: result.error || "Failed to adjust score. Please try again.",
          variant: "destructive",
        });

        // Log for debugging
        console.error('Score adjustment failed:', {
          memberId,
          amount,
          error: result.error,
          errorCode: result.errorCode,
          correlationId: result.correlationId,
        });
      } else {
        // Success - show confirmation
        toast({
          title: "Score Updated",
          description: `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} points`,
          variant: "default",
        });

        console.log('Score adjustment successful:', {
          memberId,
          amount,
          correlationId: result.correlationId,
        });
      }
    } catch (error) {
      // Handle unexpected errors (network issues, etc.)
      setScoreAdjustments((prev) => ({
        ...prev,
        [memberId]: (prev[memberId] || 0) - amount,
      }));

      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please refresh the page and try again.",
        variant: "destructive",
      });

      console.error('Unexpected error during score adjustment:', {
        memberId,
        amount,
        error,
      });
    }
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
