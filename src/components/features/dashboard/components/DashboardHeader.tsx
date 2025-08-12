/**
 * ✅ ENTERPRISE DASHBOARD HEADER COMPONENT
 * 
 * Dashboard header component following single responsibility principle.
 * Handles only header display and basic stats overview.
 * 
 * @module DashboardHeader
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Users, Target, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardStats } from '../types';

/**
 * ✅ ENTERPRISE: Dashboard Header Props
 */
interface DashboardHeaderProps {
  stats: DashboardStats;
  className?: string;
}

/**
 * ✅ ENTERPRISE DASHBOARD HEADER
 * 
 * Single responsibility: Display dashboard title and quick stats overview.
 * Optimized with React.memo for performance.
 * 
 * @param props Header properties
 * @returns Dashboard header component
 */
export const DashboardHeader = memo<DashboardHeaderProps>(({ stats, className }) => {
  const t = useTranslations('Dashboard');

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* ✅ MAIN TITLE */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title') || 'Family Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('subtitle') || 'Track family tasks and achievements together'}
          </p>
        </div>
        
        {/* ✅ CHAMPION BADGE */}
        {stats.topPerformer && (
          <div className="text-right">
            <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <Trophy className="w-4 h-4 mr-1" />
              {t('champion') || 'Family Champion'}
            </Badge>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {stats.topPerformer.name}
            </p>
          </div>
        )}
      </div>

      {/* ✅ QUICK STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('totalMembers') || 'Members'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('totalTasks') || 'Tasks'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveTasks}</div>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('completedTasks') || 'Completed'}
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalCompletedTasks}
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('progress') || 'Progress'}
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(stats.averageCompletion)}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
