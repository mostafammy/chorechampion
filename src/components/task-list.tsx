'use client';

import { useState, useRef, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'; // ✅ Replace api (ky)
import { ScoreService } from '@/lib/api/scoreService'; // ✅ Replace fetchAdjustScoreApi
import { useUserRole } from '@/hooks/useUserRole'; // ✅ NEW: User role detection
import { IS_DEV } from '@/lib/utils';
import type { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AnimatePresence, motion } from 'framer-motion';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

export function TaskList({ tasks, onToggleTask }: TaskListProps) {
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const completionKeysRef = useRef<Record<string, string>>({});
  const t = useTranslations('TaskList');
  const { toast } = useToast();
  
  // ✅ NEW: User role detection for UI behavior
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  // Cleanup timeouts and resources on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      // Abort all pending requests
      Object.values(abortControllersRef.current).forEach(controller => controller.abort());
      // ✅ CLEANUP: Clear completion keys
      completionKeysRef.current = {};
      
      if (IS_DEV) {
        console.log('[TaskList] Cleanup completed on unmount');
      }
    };
  }, []);

  const handleToggle = async (taskId: string, taskData: Task) => {
    if (timeoutsRef.current[taskId]) return;
    
    // ✅ EARLY WARNING: Show admin requirement immediately for better UX
    if (!roleLoading && !isAdmin) {
      toast({
        title: 'Admin Access Required',
        description: 'Only administrators can complete tasks. Please contact an admin to mark this task as complete.',
        variant: 'destructive',
      });
      return;
    }

    setPendingRemoval((prev) => [...prev, taskId]);

    // Phase 1: Get completion key using fetchWithAuth
    let completionKey: string | undefined;
    try {
      if (IS_DEV) {
        console.log(`[TaskList] Phase 1: Initiating completion for task ${taskId}`);
      }

      // ✅ ENTERPRISE: Use fetchWithAuth for automatic token refresh
      const response = await fetchWithAuth('/api/InitiateCompletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
        enableRefresh: true,
        maxRetries: 1, // Quick retry for Phase 1 (immediate response needed)
        correlationId: `initiate-completion-${taskId}-${Date.now()}`,
      });

      // ✅ ROBUST: Proper response validation
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Failed to parse error response',
          errorCode: 'PARSE_ERROR' 
        }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: { completionKey: string } = await response.json();
      completionKey = data.completionKey;
      
      if (!completionKey) {
        throw new Error('No completion key received from server');
      }

      completionKeysRef.current[taskId] = completionKey;
      
      if (IS_DEV) {
        console.log(`[TaskList] Phase 1 completed: Got completion key ${completionKey}`);
      }
      
    } catch (err) {
      // ✅ ENHANCED: Better error categorization with admin-only detection
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Check if this is an admin-only access error
      let userFriendlyMessage = t('failedToInitiateCompletion') || 'Failed to initiate completion';
      let toastTitle = t('error');
      
      if (errorMessage.includes('Insufficient privileges') || 
          errorMessage.includes('Admin role required') ||
          errorMessage.includes('HTTP 403')) {
        userFriendlyMessage = 'Only administrators can complete tasks. Please contact an admin to mark this task as complete.';
        toastTitle = 'Admin Access Required';
      } else if (errorMessage.includes('HTTP 401') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'Please log in to complete tasks.';
        toastTitle = 'Authentication Required';
      }
      
      toast({
        title: toastTitle,
        description: userFriendlyMessage,
        variant: 'destructive',
      });
      
      if (IS_DEV) {
        console.error('[TaskList] Phase 1 failed:', {
          taskId,
          error: errorMessage,
          userFriendlyMessage,
          timestamp: new Date().toISOString(),
        });
      }
      
      setPendingRemoval((prev) => prev.filter((id) => id !== taskId));
      return;
    }

    // Set up abort logic for Phase 2
    let abortController = new AbortController();
    abortControllersRef.current[taskId] = abortController;

    if (IS_DEV) {
      console.log(`[TaskList] Phase 2: Scheduled for ${4800}ms delay, task ${taskId}`);
    }

    // Phase 2: Wait ~4800ms then send confirm request using fetchWithAuth
    timeoutsRef.current[taskId] = setTimeout(async () => {
      try {
        if (IS_DEV) {
          console.log(`[TaskList] Phase 2: Executing confirmation for task ${taskId}`);
        }

        // ✅ ENTERPRISE: Use fetchWithAuth for Phase 2 with abort signal
        const response = await fetchWithAuth('/api/ConfirmCompletion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            completionKey: completionKeysRef.current[taskId] 
          }),
          signal: abortController.signal, // ✅ PRESERVE: Abort functionality
          enableRefresh: true,
          maxRetries: 2, // More retries for Phase 2 (less time-sensitive)
          correlationId: `confirm-completion-${taskId}-${Date.now()}`,
        });

        // ✅ ROBUST: Handle aborted requests
        if (abortController.signal.aborted) {
          if (IS_DEV) {
            console.log(`[TaskList] Phase 2 aborted by user for task ${taskId}`);
          }
          return; // Don't process further if aborted
        }

        // ✅ ROBUST: Proper response validation
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ 
            error: 'Failed to parse error response',
            success: false 
          }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data: { success: boolean } = await response.json();

        if (data.success) {
          toast({
            title: t('taskCompleted'),
            description: t('taskCompletedSuccessfully') || 'Task completed successfully!',
            variant: 'success',
          });
          
          if (IS_DEV) {
            console.log(`[TaskList] Phase 2 completed successfully for task ${taskId}`);
          }

          // ✅ ENTERPRISE: Use ScoreService instead of fetchAdjustScoreApi
          try {
            const scoreResult = await ScoreService.adjustScore(
              {
                userId: taskData.assigneeId,
                delta: taskData.score,
                source: 'task',
                taskId: taskId,
                reason: `Task completion: ${taskData.name}`,
              },
              {
                maxRetries: 2,
                userFriendlyErrors: true,
                correlationId: `task-score-${taskId}-${Date.now()}`,
              }
            );

            if (!scoreResult.success) {
              // Score adjustment failed, but task was completed
              if (IS_DEV) {
                console.warn(`[TaskList] Score adjustment failed for task ${taskId}:`, scoreResult.error);
              }
              toast({
                title: t('warning') || 'Warning',
                description: 'Task completed but score adjustment failed. This will be retried automatically.',
                variant: 'default',
              });
            } else {
              if (IS_DEV) {
                console.log(`[TaskList] Score adjusted successfully for task ${taskId}`);
              }
            }
          } catch (scoreError) {
            if (IS_DEV) {
              console.error(`[TaskList] Score adjustment error for task ${taskId}:`, scoreError);
            }
            // Don't show error to user for score adjustment failures
          }
          
        } else {
          throw new Error('Task confirmation returned success: false');
        }

      } catch (err) {
        // ✅ ENHANCED: Better error handling for Phase 2
        if (err instanceof Error && err.name === 'AbortError') {
          toast({
            title: t('cancelled'),
            description: t('taskCompletionCancelled') || 'Task completion cancelled by user.',
            variant: 'default',
          });
          if (IS_DEV) {
            console.log(`[TaskList] Phase 2 cancelled by user for task ${taskId}`);
          }
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          toast({
            title: t('error'),
            description: t('taskConfirmationFailed') || 'Task confirmation failed.',
            variant: 'destructive',
          });
          if (IS_DEV) {
            console.error('[TaskList] Phase 2 failed:', {
              taskId,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } finally {
        // ✅ CLEANUP: Always clean up resources
        onToggleTask(taskId);
        delete timeoutsRef.current[taskId];
        delete abortControllersRef.current[taskId];
        delete completionKeysRef.current[taskId]; // Clean up completion key too
      }
    }, 4800); // Fixed delay for Phase 2
  };

  const handleUndo = (taskId: string) => {
    if (timeoutsRef.current[taskId]) {
      if (IS_DEV) {
        console.log(`[TaskList] Undo requested for task ${taskId}`);
      }
      
      // ✅ ENHANCED: Abort the Phase 2 request if in progress
      abortControllersRef.current[taskId]?.abort();
      delete abortControllersRef.current[taskId];
      
      // ✅ CLEANUP: Clear timeout and completion key
      clearTimeout(timeoutsRef.current[taskId]);
      delete timeoutsRef.current[taskId];
      delete completionKeysRef.current[taskId]; // Clean up completion key
      
      // ✅ UI: Remove from pending removal
      setPendingRemoval((prev) => prev.filter((id) => id !== taskId));
      
      if (IS_DEV) {
        console.log(`[TaskList] Undo completed for task ${taskId}`);
      }
    }
  };

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t('noTasks')}</p>;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {tasks.map((task) => {
          const isPending = pendingRemoval.includes(task.id);
          
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 50 }}
              className="rounded-lg overflow-hidden"
            >
              <div
                className={`flex items-center space-x-3 p-3 transition-colors relative ${
                  isPending ? 'bg-background border' : 'bg-card'
                }`}
              >
                {isPending ? (
                  <>
                    <div className="flex-1">
                      <span className="text-muted-foreground line-through">{task.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleUndo(task.id)}>
                      <Undo2 className="mr-2 h-4 w-4" />
                      {t('undo')}
                    </Button>
                    <motion.div
                      key={`${task.id}-progress`}
                      initial={{ width: "100%"}}
                      animate={{ width: "0%"}}
                      transition={{ duration: 5, ease: "linear" }}
                      className="absolute bottom-0 left-0 h-1 bg-primary"
                    />
                  </>
                ) : (
                  <>
                    <Checkbox
                      id={task.id}
                      checked={task.completed}
                      disabled={!roleLoading && !isAdmin && !task.completed} // ✅ Disable for non-admin users (except already completed)
                      onCheckedChange={() => handleToggle(task.id, task)}
                      aria-label={`Mark task ${task.name} as ${task.completed ? 'incomplete' : 'complete'}`}
                      className={!isAdmin && !task.completed ? 'opacity-50' : ''} // ✅ Visual indicator for disabled state
                    />
                    <Label
                      htmlFor={task.id}
                      className={`flex-1 cursor-pointer ${
                        task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                      } ${!isAdmin && !task.completed ? 'opacity-50' : ''}`} // ✅ Dim label for non-admin
                      title={!isAdmin && !task.completed ? 'Only administrators can complete tasks' : undefined} // ✅ Tooltip for explanation
                    >
                      {task.name}
                      {!isAdmin && !task.completed && (
                        <span className="ml-2 text-xs text-muted-foreground">(Admin Only)</span>
                      )}
                    </Label>
                    <span
                      className={`font-bold text-sm px-2 py-1 rounded-md ${
                        task.completed ? 'text-green-700 bg-green-200' : 'text-primary-foreground bg-primary'
                      }`}
                    >
                      +{task.score}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
