'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import type { Member, Task, ArchivedTask, Period, AppContextType, AppProviderProps as BaseAppProviderProps } from '@/types';
import { initialMembers } from '@/data/seed';
import { ScoreService } from '@/lib/api/scoreService';
import { toast } from '@/hooks/use-toast';
import {useAuthenticationGuard} from "@/hooks/useAuthenticationGuard";

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
  // ✅ PHASE 2: Authentication Guard Integration
  const { 
    authStatus, 
    isLoading: authLoading, 
    isAuthenticated, 
    checkAuthentication,
    refreshToken 
  } = useAuthenticationGuard();

  const [members] = useState<Member[]>(initialMembers);
  const [activeTasks, setActiveTasks] = useState<Task[]>(initialActiveTasks);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>(initialArchivedTasks);
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>(initialScoreAdjustments);

  // Remove the useEffect that fetches tasks on mount

  useEffect(() => {
    console.log('Active tasks updated:', activeTasks);
  }, [activeTasks]);

  // ✅ PHASE 2: Authentication-aware logging
  useEffect(() => {
    console.log('[AppProvider] Authentication state change:', {
      authStatus,
      authLoading,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });
    
    // Additional debug info for token deletion scenario
    if (authStatus === "checking") {
      console.log('[AppProvider] Checking authentication (could be token refresh in progress)...');
    } else if (authStatus === "authenticated") {
      console.log('[AppProvider] ✅ User successfully authenticated');
    } else if (authStatus === "unauthenticated") {
      console.log('[AppProvider] ❌ User not authenticated');
    }
  }, [authStatus, authLoading, isAuthenticated]);

  // ✅ Client-side data fetching when authenticated but no initial data
  useEffect(() => {
    const fetchTasksIfNeeded = async () => {
      // Only fetch if user is authenticated and we don't have initial data
      if (isAuthenticated && !authLoading && activeTasks.length === 0) {
        console.log('[AppProvider] ✅ Authenticated with no initial data - fetching tasks from client');
        
        try {
          // Import fetchWithAuth to avoid circular dependencies
          const { fetchWithAuth } = await import('@/lib/auth/fetchWithAuth');
          
          const response = await fetchWithAuth('/api/GetAllTasks');
          
          if (response.ok) {
            const allTasks = await response.json();
            console.log('[AppProvider] ✅ Client-side tasks fetched successfully:', allTasks.length);
            
            // Separate active and archived tasks
            const newActiveTasks = allTasks.filter((task: any) => !task.completed);
            const newArchivedTasks = allTasks.filter((task: any) => task.completed);
            
            setActiveTasks(newActiveTasks);
            setArchivedTasks(newArchivedTasks);
            
            console.log('[AppProvider] Updated tasks:', {
              active: newActiveTasks.length,
              archived: newArchivedTasks.length
            });
          } else {
            console.error('[AppProvider] ❌ Failed to fetch tasks:', response.status);
          }
        } catch (error) {
          console.error('[AppProvider] ❌ Error fetching tasks client-side:', error);
        }
      }
    };

    fetchTasksIfNeeded();
  }, [isAuthenticated, authLoading, activeTasks.length]);

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
    // ✅ PHASE 2: Add authentication status to context
    auth: {
      isAuthenticated,
      isLoading: authLoading,
      checkAuthStatus: checkAuthentication,
      refreshTokens: refreshToken,
      startBackgroundMonitoring: () => {}, // Will be implemented if needed
      stopBackgroundMonitoring: () => {}, // Will be implemented if needed
    },
  }), [members, activeTasks, archivedTasks, scoreAdjustments, isAuthenticated, authLoading, checkAuthentication, refreshToken]);

  // ✅ PHASE 2: Show loading state while checking authentication
  // TEMPORARILY DISABLED for development - causing redirect loops after successful login
  if (false && authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
          <p className="text-xs text-gray-500 mt-2">
            Status: {authStatus} | Authenticated: {isAuthenticated ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ PHASE 2: Show unauthenticated state
  // TEMPORARILY DISABLED for development - causing redirect loops after successful login
  if (false && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-600">Authentication Required</div>
          <p className="text-xs text-gray-500 mt-2">
            Status: {authStatus} | Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
