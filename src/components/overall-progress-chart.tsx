'use client';

import * as React from 'react';
import { Pie, PieChart, Tooltip, Cell } from 'recharts';
import { Member, Task } from '@/types';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useTranslations } from 'next-intl';

interface OverallProgressChartProps {
  tasks: Task[];
  members: Member[];
  scoreAdjustments: Record<string, number>;
}

export function OverallProgressChart({ tasks, members, scoreAdjustments }: OverallProgressChartProps) {
  const t = useTranslations('OverallProgressChart');
  const chartData = React.useMemo(() => {
    return members.map((member) => {
      const taskScore = tasks
        .filter((task) => task.assigneeId === member.id && task.completed)
        .reduce((sum, task) => sum + task.score, 0);
      const adjustment = scoreAdjustments[member.id] || 0;
      return {
        name: member.name,
        score: taskScore + adjustment,
      }
    }).filter(d => d.score > 0);
  }, [tasks, members, scoreAdjustments]);

  const totalScore = chartData.reduce((sum, data) => sum + data.score, 0);
  
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  if (totalScore === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <p className="text-lg font-medium text-muted-foreground">{t('noPoints')}</p>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
    );
  }

  return (
    <ChartContainer config={{}} className="h-[200px] w-full">
      <PieChart>
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="score"
          nameKey="name"
          innerRadius={60}
          strokeWidth={5}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
