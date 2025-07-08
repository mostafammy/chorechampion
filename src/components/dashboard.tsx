'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddTaskDialog } from './add-task-dialog';
import { TaskList } from './task-list';
import { PerformanceSummary } from './performance-summary';
import { OverallProgressChart } from './overall-progress-chart';
import { Sun, CalendarDays, CalendarRange } from 'lucide-react';
import { useAppContext } from '@/context/app-provider';
import { useTranslations } from 'next-intl';

export function Dashboard() {
  const { 
    members, 
    activeTasks, 
    archivedTasks, 
    scoreAdjustments, 
    handleAddTask, 
    handleToggleTask,
    handleAdjustScore
  } = useAppContext();
  const t = useTranslations('Dashboard');

  const memberData = useMemo(() => {
    return members.map((member) => {
      const memberActiveTasks = activeTasks.filter((task) => task.assigneeId === member.id);
      const memberArchivedTasks = archivedTasks.filter((task) => task.assigneeId === member.id);
      
      const completedScore = memberArchivedTasks.reduce((sum, task) => sum + task.score, 0);
      const totalPossibleScore = [...memberActiveTasks, ...memberArchivedTasks].reduce((sum, task) => sum + task.score, 0);

      return {
        ...member,
        tasks: memberActiveTasks,
        completedScore,
        totalPossibleScore,
      };
    });
  }, [members, activeTasks, archivedTasks]);


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('overallProgress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mx-auto w-full max-w-[200px]">
            <OverallProgressChart tasks={archivedTasks} members={members} scoreAdjustments={scoreAdjustments} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {memberData.map((member) => (
          <Card key={member.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-headline">{member.name}</CardTitle>
              <AddTaskDialog members={members} onAddTask={handleAddTask} />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <PerformanceSummary
                completedScore={member.completedScore}
                totalPossibleScore={member.totalPossibleScore}
                memberId={member.id}
                adjustment={scoreAdjustments[member.id] || 0}
                onAdjustScore={handleAdjustScore}
              />
              <Tabs defaultValue="daily" className="mt-6 flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily"><Sun className="w-4 h-4 mr-2" />{t('daily')}</TabsTrigger>
                  <TabsTrigger value="weekly"><CalendarDays className="w-4 h-4 mr-2" />{t('weekly')}</TabsTrigger>
                  <TabsTrigger value="monthly"><CalendarRange className="w-4 h-4 mr-2" />{t('monthly')}</TabsTrigger>
                </TabsList>
                <div className="flex-1 mt-4">
                  <TabsContent value="daily">
                    <TaskList tasks={member.tasks.filter(t => t.period === 'daily')} onToggleTask={handleToggleTask} />
                  </TabsContent>
                  <TabsContent value="weekly">
                    <TaskList tasks={member.tasks.filter(t => t.period === 'weekly')} onToggleTask={handleToggleTask} />
                  </TabsContent>
                  <TabsContent value="monthly">
                    <TaskList tasks={member.tasks.filter(t => t.period === 'monthly')} onToggleTask={handleToggleTask} />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
