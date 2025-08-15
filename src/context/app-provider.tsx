'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import type { Member, Task, ArchivedTask, Period, AppContextType, AppProviderProps as BaseAppProviderProps } from '@/types';
import { initialMembers, initialActiveTasks as seedActiveTasks, initialArchivedTasks as seedArchivedTasks } from '@/data/seed';
import { ScoreService } from '@/lib/api/scoreService';
import { toast } from '@/hooks/use-toast';
import {useAuthenticationGuard} from "@/hooks/useAuthenticationGuard";
import { MergeCompletionDate } from '@/lib/completionDateService';
import { completeTaskWithPersistence } from '@/lib/services/taskPersistenceService';

interface AppProviderProps extends BaseAppProviderProps {
  initialActiveTasks?: Task[];
  initialArchivedTasks?: ArchivedTask[];
  initialScoreAdjustments?: Record<string, number>;
  initialUserRole?: 'ADMIN' | 'USER' | null; // ✅ ADD: Initial user role
  initialIsAdmin?: boolean; // ✅ ADD: Initial admin status
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({
  children,
  initialActiveTasks = [],
  initialArchivedTasks = [],
  initialScoreAdjustments = {},
  initialUserRole = null, // ✅ ADD: Default to null
  initialIsAdmin = false, // ✅ ADD: Default to false
}: AppProviderProps) {
  // ✅ OPTIMIZATION: Determine initial auth status from server-side data
  const hasServerSideAuth = initialUserRole !== null;
  const initialAuthStatus = hasServerSideAuth ? "authenticated" : "checking";
  
  if (hasServerSideAuth) {
    console.log('[AppProvider] ✅ Server-side authentication detected - optimizing loading state:', {
      userRole: initialUserRole,
      isAdmin: initialIsAdmin,
      skipAuthCheck: true
    });
  }
  
  // ✅ PHASE 2: Authentication Guard Integration with server-side optimization
  const { 
    authStatus, 
    isLoading: authLoading, 
    isAuthenticated, 
    checkAuthentication,
    refreshToken 
  } = useAuthenticationGuard({
    initialAuthStatus,
    skipInitialCheck: hasServerSideAuth, // Skip initial check if we have server-side data
  });

  const [members] = useState<Member[]>(initialMembers);
  
  // ✅ DEVELOPMENT: Use seed data when no initial data provided (for testing)
  const [activeTasks, setActiveTasks] = useState<Task[]>(() => {
    if (initialActiveTasks.length > 0) {
      console.log('[AppProvider] ✅ Using provided initial active tasks:', initialActiveTasks.length);
      return initialActiveTasks;
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[AppProvider] 🧪 Development mode: Using seed active tasks for testing');
      return seedActiveTasks;
    }
    return [];
  });
  
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>(() => {
    if (initialArchivedTasks.length > 0) {
      console.log('[AppProvider] ✅ Using provided initial archived tasks:', initialArchivedTasks.length);
      return initialArchivedTasks;
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[AppProvider] 🧪 Development mode: Using seed archived tasks for testing');
      // Create some tasks for today to test the "today" filtering
      const today = new Date();
      const todayTasks = seedArchivedTasks.map((task, index) => ({
        ...task,
        completedDate: index === 0 ? today : task.completedDate, // Make first task completed today
      }));
      console.log('[AppProvider] 🧪 Created today tasks for testing:', todayTasks.filter(t => 
        new Date(t.completedDate).toDateString() === today.toDateString()
      ).length);
      return todayTasks;
    }
    return [];
  });
  
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>(initialScoreAdjustments);
  
  // ✅ NEW: User role state with server-side initial values
  const [userRole, setUserRole] = useState<'ADMIN' | 'USER' | null>(initialUserRole);
  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin);

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
            const responseData = await response.json();
            
            // Handle the new API response format with metadata
            let allTasks: any[];
            if (Array.isArray(responseData)) {
              // Fallback for old format (just in case)
              allTasks = responseData;
              console.log('[AppProvider] ✅ Client-side tasks fetched successfully (legacy format):', allTasks.length);
            } else if (responseData.tasks && Array.isArray(responseData.tasks)) {
              // New format with metadata
              allTasks = responseData.tasks;
              console.log('[AppProvider] ✅ Client-side tasks fetched successfully:', {
                total: responseData.totalCount,
                active: responseData.activeCount,
                completed: responseData.completedCount,
                lastUpdated: responseData.lastUpdated
              });
            } else {
              console.error('[AppProvider] ❌ Invalid response format:', responseData);
              return;
            }
            
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

  // ✅ CLIENT-SIDE FALLBACK: Fetch user role if not provided server-side
  useEffect(() => {
    const fetchUserRoleIfNeeded = async () => {
      // ✅ OPTIMIZATION: Only fetch if authenticated but no role provided from server AND no server-side auth data
      if (isAuthenticated && !authLoading && userRole === null && !hasServerSideAuth) {
        try {
          console.log('[AppProvider] ⏳ Fetching user role as client-side fallback...');
          
          const { fetchWithAuth } = await import('@/lib/auth/fetchWithAuth');
          const response = await fetchWithAuth('/api/auth/user-info', {
            method: 'GET',
            correlationId: `user-role-fallback-${Date.now()}`,
          });

          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role || 'USER');
            setIsAdmin(data.role === 'ADMIN');
            
            console.log('[AppProvider] ✅ User role fetched as fallback:', {
              role: data.role,
              isAdmin: data.role === 'ADMIN'
            });
          }
        } catch (error) {
          console.error('[AppProvider] ❌ Error fetching user role fallback:', error);
          // Default to USER role if fetch fails
          setUserRole('USER');
          setIsAdmin(false);
        }
      } else if (hasServerSideAuth) {
        console.log('[AppProvider] ✅ Using server-side user role - no fallback needed');
      }
    };

    fetchUserRoleIfNeeded();
  }, [isAuthenticated, authLoading, userRole, hasServerSideAuth]);

  // ✅ CLEAR USER ROLE ON LOGOUT (but protect server-side auth during tab switching)
  useEffect(() => {
    if (!isAuthenticated && userRole !== null) {
      // ✅ SAFEGUARD: Don't clear user role if we have server-side auth and just temporarily checking
      if (hasServerSideAuth && authStatus === "checking") {
        console.log('[AppProvider] ⏸️ Skipping user role clear - temporary check with server-side auth');
        return;
      }
      
      console.log('[AppProvider] 🔄 Clearing user role on logout');
      setUserRole(null);
      setIsAdmin(false);
    }
  }, [isAuthenticated, userRole, hasServerSideAuth, authStatus]);

  // ✅ REMOVED: Client-side score fetching (now handled server-side in layout)
  // Scores are now loaded server-side and passed as initialScoreAdjustments

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
    setActiveTasks((prevTasks) => {
      const newTasks = [...prevTasks, task];
      
      // ✅ DEVELOPMENT FIX: Persist to localStorage in development
      if (process.env.NODE_ENV === 'development') {
        try {
          localStorage.setItem('chorechampion-active-tasks', JSON.stringify(newTasks));
          console.log('[AppProvider] 💾 Persisted new task to localStorage');
        } catch (error) {
          console.warn('[AppProvider] ⚠️ Failed to persist new task:', error);
        }
      }
      
      return newTasks;
    });
  };

  const handleToggleTask = async (taskId: string) => {
    const taskToArchive = activeTasks.find((task) => task.id === taskId);
    if (!taskToArchive) {
      console.error('[AppProvider] ❌ Task not found for completion:', taskId);
      return;
    }

    console.log('[AppProvider] 🚀 Starting enterprise task completion process:', {
      taskId,
      taskName: taskToArchive.name,
      assigneeId: taskToArchive.assigneeId,
      timestamp: new Date().toISOString(),
    });

    try {
      // ✅ ENTERPRISE SOLUTION: Use robust persistence service
      // const completionResult = await completeTaskWithPersistence(
      //   taskToArchive,
      //   auth.userRole || 'system', // Who completed the task
      //   new Date(), // Completion time
      //   {
      //     userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      //     source: 'handleToggleTask',
      //   }
      // );

      // if (completionResult.success && completionResult.archivedTask) {
      //   console.log('[AppProvider] ✅ Enterprise task completion successful:', {
      //     transactionId: completionResult.transactionId,
      //     persistenceMethod: completionResult.persistenceMethod,
      //     processingTime: completionResult.auditLog.processingTimeMs.toFixed(2) + 'ms',
      //     completedAt: completionResult.archivedTask.completedDate.toISOString(),
      //     isToday: completionResult.archivedTask.completedDate.toDateString() === new Date().toDateString(),
      //   });
      //
      const newArchivedTask = initialActiveTasks.filter((task) => task.id === taskId);
        // ✅ ATOMIC STATE UPDATE: Only update state after successful persistence
        setArchivedTasks((prev) => [...prev, { ...taskToArchive, completed: true, completedDate: new Date() }]);
        setActiveTasks((prev) => prev.filter((task) => task.id !== taskId));
      //
      //   console.log('[AppProvider] ✅ State updated successfully - task archived and removed from active tasks');
      // } else {
      //   console.error('[AppProvider] ❌ Task completion failed:', {
      //     error: completionResult.error,
      //     persistenceMethod: completionResult.persistenceMethod,
      //     transactionId: completionResult.transactionId,
      //   });
      //
      //   // ✅ FALLBACK: Use legacy completion if enterprise method fails
      //   console.log('[AppProvider] 🔄 Attempting legacy fallback...');
      //   await legacyTaskCompletion(taskToArchive, taskId);
      // }
    } catch (error) {
      console.error('[AppProvider] ❌ Critical error in task completion:', error);
      
      // ✅ CIRCUIT BREAKER: Use legacy method as last resort
      console.log('[AppProvider] 🆘 Using legacy completion as circuit breaker...');
      await legacyTaskCompletion(taskToArchive, taskId);
    }
  };

  // ✅ LEGACY FALLBACK: Maintain backward compatibility
  const legacyTaskCompletion = async (taskToArchive: Task, taskId: string) => {
    try {
      // Legacy completion date resolution
      let realCompletionDate = new Date(); // Default fallback - current time
      
      console.log('[AppProvider] 🎯 Legacy task completion started:', {
        taskId,
        taskName: taskToArchive.name,
        assigneeId: taskToArchive.assigneeId,
        fallbackDate: realCompletionDate.toLocaleString(),
      });
      
      try {
        console.log('[AppProvider] 🕐 Fetching real completion date for task:', taskId);
        const completionDates = await MergeCompletionDate(
          members, 
          [{ ...taskToArchive, completed: true, completedDate: new Date() }]
        );
        
        if (completionDates.length > 0 && completionDates[0].completedDate) {
          realCompletionDate = completionDates[0].completedDate;
          console.log('[AppProvider] ✅ Real completion date found:', {
            original: realCompletionDate,
            iso: realCompletionDate.toISOString(),
            local: realCompletionDate.toLocaleString(),
            isToday: realCompletionDate.toDateString() === new Date().toDateString(),
          });
        } else {
          console.log('[AppProvider] ⚠️ No real completion date found, using current time:', {
            fallback: realCompletionDate.toLocaleString(),
            isToday: true,
          });
        }
      } catch (error) {
        console.error('[AppProvider] ❌ Failed to fetch real completion date:', error);
        console.log('[AppProvider] 🔄 Using fallback current time:', realCompletionDate.toLocaleString());
      }
      
      const archivedTask = { ...taskToArchive, completed: true, completedDate: realCompletionDate };
      
      console.log('[AppProvider] 📝 Adding task to archive (legacy):', {
        taskId: archivedTask.id,
        taskName: archivedTask.name,
        completedDate: archivedTask.completedDate,
        completedDateType: typeof archivedTask.completedDate,
        completedDateLocal: new Date(archivedTask.completedDate).toLocaleString(),
        isCompletedToday: new Date(archivedTask.completedDate).toDateString() === new Date().toDateString(),
      });
      
      setArchivedTasks((prev) => [...prev, archivedTask]);
      setActiveTasks((prev) => prev.filter((task) => task.id !== taskId));
      
      console.log('[AppProvider] ✅ Legacy task completion successful');
    } catch (legacyError) {
      console.error('[AppProvider] ❌ Legacy task completion also failed:', legacyError);
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
      userRole, // ✅ ADD: User role from server-side or client-side fallback
      isAdmin, // ✅ ADD: Admin status derived from role
    },
  }), [members, activeTasks, archivedTasks, scoreAdjustments, isAuthenticated, authLoading, checkAuthentication, refreshToken, userRole, isAdmin]);

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
