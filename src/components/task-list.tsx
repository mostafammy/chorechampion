'use client';

import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

export function TaskList({ tasks, onToggleTask }: TaskListProps) {
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const t = useTranslations('TaskList');

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleToggle = (taskId: string) => {
    if (timeoutsRef.current[taskId]) return;

    setPendingRemoval((prev) => [...prev, taskId]);

    timeoutsRef.current[taskId] = setTimeout(() => {
      onToggleTask(taskId);
      delete timeoutsRef.current[taskId];
    }, 5000); // 5-second delay
  };
  
  const handleUndo = (taskId: string) => {
    if (timeoutsRef.current[taskId]) {
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
