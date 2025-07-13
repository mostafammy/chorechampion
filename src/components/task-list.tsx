'use client';

import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { IS_DEV } from '@/lib/utils';

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      // Abort all pending requests
      Object.values(abortControllersRef.current).forEach(controller => controller.abort());
      // Optionally clear completion keys
      completionKeysRef.current = {};
    };
  }, []);

  const handleToggle = async (taskId: string) => {
    if (timeoutsRef.current[taskId]) return;

    setPendingRemoval((prev) => [...prev, taskId]);

    // Phase 1: Get completion key
    let completionKey: string | undefined;
    try {
      const res = await fetch('/api/InitiateCompletion', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      completionKey = data.completionKey;
      if (!completionKey) {
        toast({
          title: t('error'),
          description: t('failedToGetCompletionKey') || 'Failed to get completion key',
          variant: 'destructive',
        });
        if (IS_DEV) {
          console.error('Failed to get completion key for task', taskId);
        }
        setPendingRemoval((prev) => prev.filter((id) => id !== taskId));
        return;
      }
      completionKeysRef.current[taskId] = completionKey;
    } catch (err) {
      toast({
        title: t('error'),
        description: t('failedToInitiateCompletion') || 'Failed to initiate completion',
        variant: 'destructive',
      });
      if (IS_DEV) {
        console.error('Failed to initiate completion for task', taskId, err);
      }
      setPendingRemoval((prev) => prev.filter((id) => id !== taskId));
      return;
    }

    // Set up abort logic
    let abortController = new AbortController();
    abortControllersRef.current[taskId] = abortController;

    // Phase 2: Wait ~4800ms then send confirm request
    timeoutsRef.current[taskId] = setTimeout(() => {
      fetch('/api/ConfirmCompletion', {
        method: 'POST',
        signal: abortController.signal, // Hook into abort logic
        body: JSON.stringify({ completionKey: completionKeysRef.current[taskId] }),
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            toast({
              title: t('taskCompleted'),
              description: t('taskCompletedSuccessfully') || 'Task completed successfully!',
              variant: 'success',
            });
            if (IS_DEV) {
              console.log('Task completed:', taskId);
            }
          } else {
            toast({
              title: t('error'),
              description: t('taskCompletionFailed') || 'Task completion failed.',
              variant: 'destructive',
            });
            if (IS_DEV) {
              console.error('Task completion failed:', taskId, data);
            }
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') {
            toast({
              title: t('cancelled'),
              description: t('taskCompletionCancelled') || 'Task completion cancelled by user.',
              variant: 'destructive',
            });
            if (IS_DEV) {
              console.log('Task completion cancelled by user:', taskId);
            }
          } else {
            toast({
              title: t('error'),
              description: t('taskConfirmationFailed') || 'Task confirmation failed.',
              variant: 'destructive',
            });
            if (IS_DEV) {
              console.error('Task confirmation failed:', taskId, err);
            }
          }
        });

      onToggleTask(taskId);
      delete timeoutsRef.current[taskId];
      delete abortControllersRef.current[taskId];
    }, 4800); // Fixed delay for Phase 2
  };
  
  const handleUndo = (taskId: string) => {
    if (timeoutsRef.current[taskId]) {
      abortControllersRef.current[taskId]?.abort(); // 💥 Instantly cancel the Phase 2 call
      delete abortControllersRef.current[taskId];
      clearTimeout(timeoutsRef.current[taskId]);
      delete timeoutsRef.current[taskId];
      setPendingRemoval((prev) => prev.filter((id) => id !== taskId));
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
                      onCheckedChange={() => handleToggle(task.id)}
                      aria-label={`Mark task ${task.name} as ${task.completed ? 'incomplete' : 'complete'}`}
                    />
                    <Label
                      htmlFor={task.id}
                      className={`flex-1 cursor-pointer ${
                        task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {task.name}
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
