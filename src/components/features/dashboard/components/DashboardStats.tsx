/**
 * ✅ ENTERPRISE DASHBOARD STATS COMPONENT
 * 
 * Dashboard statistics component following single responsibility principle.
 * Handles only detailed stats display and progress visualization.
 * 
 * @module DashboardStats
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, Award, Clock, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardStatsProps } from '../types';

/**
 * ✅ ENTERPRISE DASHBOARD STATS
 * 
 * Single responsibility: Display detailed dashboard statistics and progress.
 * Optimized with React.memo and proper loading states.
 * 
 * @param props Stats component properties
 * @returns Dashboard stats component
 */
export const DashboardStats = memo<DashboardStatsProps>(({ 
  stats, 
  isLoading = false, 
  className 
}) => {
  const t = useTranslations('Dashboard');

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ✅ CALCULATIONS
  const completionRate = stats.totalActiveTasks > 0 
    ? (stats.totalCompletedTasks / stats.totalActiveTasks) * 100 
    : 0;

  const progressColor = completionRate >= 80 ? 'bg-green-500' : 
                       completionRate >= 60 ? 'bg-blue-500' : 
                       completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* ✅ MAIN PROGRESS CARD */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('familyProgress') || 'Family Progress'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('overallCompletion') || 'Overall task completion rate'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(completionRate)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stats.totalCompletedTasks} / {stats.totalActiveTasks} {t('tasks') || 'tasks'}
            </div>
          </div>
        </div>
        
        <Progress 
          value={completionRate} 
          className={`h-3 ${progressColor}`}
        />
      </Card>

      {/* ✅ DETAILED STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Average Completion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('averageCompletion') || 'Average Completion'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(stats.averageCompletion)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('averageAcrossMembers') || 'Across all family members'}
            </p>
          </CardContent>
        </Card>

        {/* Total Points */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('totalPoints') || 'Total Points'}
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalPoints.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('familyPoints') || 'Family points earned'}
            </p>
          </CardContent>
        </Card>

        {/* Top Performer */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('topPerformer') || 'Top Performer'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.topPerformer ? (
              <>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.topPerformer.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(stats.topPerformer.completionRate)}% {t('completion') || 'completion'}
                </p>
              </>
            ) : (
              <div className="text-lg font-bold text-gray-400">
                {t('noData') || 'No data yet'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ PROGRESS INSIGHTS */}
      {stats.totalActiveTasks > 0 && (
        <Card className="p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>
              {completionRate >= 80 
                ? (t('excellentProgress') || 'Excellent progress! Keep up the great work!')
                : completionRate >= 60 
                ? (t('goodProgress') || 'Good progress! You\'re on the right track.')
                : completionRate >= 40 
                ? (t('fairProgress') || 'Fair progress. Consider encouraging more task completion.')
                : (t('needsImprovement') || 'Room for improvement. Let\'s motivate the family!')
              }
            </span>
          </div>
        </Card>
      )}
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';
