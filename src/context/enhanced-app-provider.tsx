/**
 * Enhanced App Provider with Advanced Score Management
 * 
 * This is an optional enhanced version of the app provider that includes:
 * - Loading states for score adjustments
 * - Retry mechanisms with exponential backoff
 * - Offline detection and queueing
 * - Batch operations
 * - Performance optimizations
 */

'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback } from 'react';
import type { Member, Task, ArchivedTask, Period, AppContextType, AppProviderProps as BaseAppProviderProps } from '@/types';
import { initialMembers } from '@/data/seed';
import { ScoreService, ScoreAdjustmentResult } from '@/lib/api/scoreService';
import { toast } from '@/hooks/use-toast';

interface EnhancedAppContextType extends AppContextType {
  // Loading states
  scoreAdjustmentLoading: Record<string, boolean>;
  
  // Batch operations
  handleBatchAdjustScores: (adjustments: Array<{ memberId: string; amount: number; reason?: string }>) => Promise<void>;
  
  // Retry failed operations
  retryFailedAdjustments: () => Promise<void>;
  
  // Get pending operations count
  getPendingOperationsCount: () => number;
  
  // Clear all pending operations
  clearPendingOperations: () => void;
}

interface EnhancedAppProviderProps extends BaseAppProviderProps {
  initialActiveTasks?: Task[];
  initialArchivedTasks?: ArchivedTask[];
  initialScoreAdjustments?: Record<string, number>;
  
  // Enhanced options
  enableOfflineQueue?: boolean;
  enableBatchOperations?: boolean;
  enableRetryMechanism?: boolean;
  maxRetryAttempts?: number;
}

interface PendingOperation {
  id: string;
  type: 'score_adjustment';
  memberId: string;
  amount: number;
  reason?: string;
  attempts: number;
  lastAttempt: Date;
  originalTimestamp: Date;
}

const EnhancedAppContext = createContext<EnhancedAppContextType | undefined>(undefined);

export function EnhancedAppProvider({
  children,
  initialActiveTasks = [],
  initialArchivedTasks = [],
  initialScoreAdjustments = {},
  enableOfflineQueue = true,
  enableBatchOperations = true,
  enableRetryMechanism = true,
  maxRetryAttempts = 3,
}: EnhancedAppProviderProps) {
  const [members] = useState<Member[]>(initialMembers);
  const [activeTasks, setActiveTasks] = useState<Task[]>(initialActiveTasks);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>(initialArchivedTasks);
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>(initialScoreAdjustments);
  
  // Enhanced state
  const [scoreAdjustmentLoading, setScoreAdjustmentLoading] = useState<Record<string, boolean>>({});
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process pending operations when coming back online
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      processPendingOperations();
    }
  }, [isOnline]);

  const setMemberLoading = useCallback((memberId: string, loading: boolean) => {
    setScoreAdjustmentLoading(prev => ({
      ...prev,
      [memberId]: loading,
    }));
  }, []);

  const addPendingOperation = useCallback((operation: Omit<PendingOperation, 'id' | 'attempts' | 'lastAttempt' | 'originalTimestamp'>) => {
    const newOperation: PendingOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      attempts: 0,
      lastAttempt: new Date(),
      originalTimestamp: new Date(),
    };
    
    setPendingOperations(prev => [...prev, newOperation]);
    return newOperation.id;
  }, []);

  const removePendingOperation = useCallback((operationId: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  const processPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOperations.length === 0) return;

    const operationsToProcess = pendingOperations.filter(
      op => op.attempts < maxRetryAttempts
    );

    for (const operation of operationsToProcess) {
      try {
        if (operation.type === 'score_adjustment') {
          const result = await ScoreService.adjustScore({
            userId: operation.memberId,
            delta: operation.amount,
            source: "manual",
            reason: operation.reason || "Queued manual adjustment",
          });

          if (result.success) {
            removePendingOperation(operation.id);
            toast({
              title: "Queued Operation Completed",
              description: `Score adjustment for user ${operation.memberId} completed successfully`,
              variant: "default",
            });
          } else {
            // Update attempt count
            setPendingOperations(prev =>
              prev.map(op =>
                op.id === operation.id
                  ? { ...op, attempts: op.attempts + 1, lastAttempt: new Date() }
                  : op
              )
            );
          }
        }
      } catch (error) {
        console.error('Failed to process pending operation:', operation, error);
        
        // Update attempt count
        setPendingOperations(prev =>
          prev.map(op =>
            op.id === operation.id
              ? { ...op, attempts: op.attempts + 1, lastAttempt: new Date() }
              : op
          )
        );
      }
    }
  }, [isOnline, pendingOperations, maxRetryAttempts, removePendingOperation]);

  const handleAdjustScore = async (memberId: string, amount: number, reason?: string) => {
    // 1. Validate the input
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

    // 2. Set loading state
    setMemberLoading(memberId, true);

    // 3. Optimistically update UI
    setScoreAdjustments((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || 0) + amount,
    }));

    try {
      // 4. If offline and queueing is enabled, queue the operation
      if (!isOnline && enableOfflineQueue) {
        addPendingOperation({
          type: 'score_adjustment',
          memberId,
          amount,
          reason,
        });

        toast({
          title: "Operation Queued",
          description: "You're offline. The score adjustment will be processed when you're back online.",
          variant: "default",
        });

        setMemberLoading(memberId, false);
        return;
      }

      // 5. Attempt the score adjustment
      const result = await ScoreService.adjustScore(
        { 
          userId: memberId, 
          delta: amount, 
          source: "manual",
          reason: reason || "Manual adjustment from dashboard"
        },
        {
          maxRetries: 2,
          userFriendlyErrors: true,
          correlationId: `manual-adjustment-${memberId}-${Date.now()}`,
        }
      );

      // 6. Handle the result
      if (!result.success) {
        // Revert optimistic update
        setScoreAdjustments((prev) => ({
          ...prev,
          [memberId]: (prev[memberId] || 0) - amount,
        }));

        // If retry mechanism is enabled and it's a retryable error, queue it
        if (enableRetryMechanism && result.errorCode !== 'SESSION_EXPIRED') {
          addPendingOperation({
            type: 'score_adjustment',
            memberId,
            amount,
            reason,
          });

          toast({
            title: "Operation Failed - Queued for Retry",
            description: "The operation failed but will be retried automatically.",
            variant: "default",
          });
        } else {
          toast({
            title: "Score Adjustment Failed",
            description: result.error || "Failed to adjust score. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Success
        toast({
          title: "Score Updated",
          description: `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} points`,
          variant: "default",
        });
      }
    } catch (error) {
      // Handle unexpected errors
      setScoreAdjustments((prev) => ({
        ...prev,
        [memberId]: (prev[memberId] || 0) - amount,
      }));

      if (enableRetryMechanism) {
        addPendingOperation({
          type: 'score_adjustment',
          memberId,
          amount,
          reason,
        });

        toast({
          title: "Unexpected Error - Queued for Retry",
          description: "An unexpected error occurred. The operation will be retried.",
          variant: "default",
        });
      } else {
        toast({
          title: "Unexpected Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setMemberLoading(memberId, false);
    }
  };

  const handleBatchAdjustScores = async (adjustments: Array<{ memberId: string; amount: number; reason?: string }>) => {
    if (!enableBatchOperations) {
      // Fall back to individual adjustments
      for (const adjustment of adjustments) {
        await handleAdjustScore(adjustment.memberId, adjustment.amount, adjustment.reason);
      }
      return;
    }

    // Set loading for all members
    adjustments.forEach(adj => setMemberLoading(adj.memberId, true));

    // Optimistically update all scores
    setScoreAdjustments(prev => {
      const updated = { ...prev };
      adjustments.forEach(adj => {
        updated[adj.memberId] = (updated[adj.memberId] || 0) + adj.amount;
      });
      return updated;
    });

    try {
      const scoreInputs = adjustments.map(adj => ({
        userId: adj.memberId,
        delta: adj.amount,
        source: "manual" as const,
        reason: adj.reason || "Batch manual adjustment",
      }));

      const results = await ScoreService.batchAdjustScores(scoreInputs);
      
      // Handle results
      const failedAdjustments = results
        .map((result, index) => ({ result, adjustment: adjustments[index] }))
        .filter(({ result }) => !result.success);

      if (failedAdjustments.length > 0) {
        // Revert failed adjustments
        setScoreAdjustments(prev => {
          const updated = { ...prev };
          failedAdjustments.forEach(({ adjustment }) => {
            updated[adjustment.memberId] = (updated[adjustment.memberId] || 0) - adjustment.amount;
          });
          return updated;
        });

        toast({
          title: "Batch Operation Partially Failed",
          description: `${failedAdjustments.length} out of ${adjustments.length} operations failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch Operation Successful",
          description: `Successfully processed ${adjustments.length} score adjustments`,
          variant: "default",
        });
      }
    } catch (error) {
      // Revert all optimistic updates
      setScoreAdjustments(prev => {
        const updated = { ...prev };
        adjustments.forEach(adj => {
          updated[adj.memberId] = (updated[adj.memberId] || 0) - adj.amount;
        });
        return updated;
      });

      toast({
        title: "Batch Operation Failed",
        description: "Failed to process batch score adjustments",
        variant: "destructive",
      });
    } finally {
      // Clear loading states
      adjustments.forEach(adj => setMemberLoading(adj.memberId, false));
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

  const retryFailedAdjustments = async () => {
    await processPendingOperations();
  };

  const getPendingOperationsCount = () => pendingOperations.length;

  const clearPendingOperations = () => {
    setPendingOperations([]);
    toast({
      title: "Pending Operations Cleared",
      description: "All pending operations have been cleared",
      variant: "default",
    });
  };

  const value = useMemo<EnhancedAppContextType>(() => ({
    members,
    activeTasks,
    archivedTasks,
    scoreAdjustments,
    scoreAdjustmentLoading,
    handleAddTask,
    handleToggleTask,
    handleAdjustScore,
    handleBatchAdjustScores,
    retryFailedAdjustments,
    getPendingOperationsCount,
    clearPendingOperations,
  }), [
    members, 
    activeTasks, 
    archivedTasks, 
    scoreAdjustments, 
    scoreAdjustmentLoading,
    handleBatchAdjustScores,
    retryFailedAdjustments,
    getPendingOperationsCount,
    clearPendingOperations,
  ]);

  return <EnhancedAppContext.Provider value={value}>{children}</EnhancedAppContext.Provider>;
}

export function useEnhancedAppContext(): EnhancedAppContextType {
  const context = useContext(EnhancedAppContext);
  if (context === undefined) {
    throw new Error('useEnhancedAppContext must be used within an EnhancedAppProvider');
  }
  return context;
}

// Export both providers for flexibility
export { EnhancedAppProvider as AppProvider, useEnhancedAppContext as useAppContext };
