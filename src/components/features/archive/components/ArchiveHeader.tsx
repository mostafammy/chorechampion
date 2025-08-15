'use client';

/**
 * ✅ ENTERPRISE ARCHIVE HEADER COMPONENT
 *
 * Professional header with statistics and actions.
 * Implements responsive design, accessibility, and enterprise UX patterns.
 *
 * @module ArchiveHeader
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Archive, 
  Calendar, 
  TrendingUp, 
  Users, 
  Award, 
  Clock,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SoonBadge } from '@/components/ui/soon-badge';
import { toLocaleNumerals, type SupportedLocale } from '@/lib/utils/i18n-numerals';
import type { ArchiveHeaderProps, ArchiveStats } from '../types';

/**
 * ✅ SOLID PRINCIPLES: Single Responsibility
 * This component only handles header display and user interactions
 */
export function ArchiveHeader({ 
  stats, 
  onActionClick,
  className 
}: ArchiveHeaderProps) {
  const t = useTranslations('ArchivePage');
  const tStats = useTranslations('ArchivePage.statistics');
  const tControls = useTranslations('ArchivePage.controls');
  const locale = useLocale() as SupportedLocale;

  // ✅ PERFORMANCE: Memoized statistics cards configuration
  const statsCards = React.useMemo(() => [
    {
      id: 'totalTasks',
      icon: TrendingUp,
      value: stats.totalTasks,
      label: tStats('totalTasks'),
      labelShort: tStats('totalTasksShort'),
      color: 'indigo',
      delay: 0.1,
    },
    {
      id: 'totalScore',
      icon: Award,
      value: stats.totalScore,
      label: tStats('totalPoints'),
      labelShort: tStats('totalPointsShort'),
      color: 'emerald',
      delay: 0.2,
    },
    {
      id: 'uniqueMembers',
      icon: Users,
      value: stats.uniqueMembers,
      label: tStats('activeMembers'),
      labelShort: tStats('activeMembersShort'),
      color: 'blue',
      delay: 0.3,
    },
    {
      id: 'weeklyTasks',
      icon: Calendar,
      value: stats.weeklyTasks,
      label: tStats('thisWeek'),
      labelShort: tStats('thisWeekShort'),
      color: 'purple',
      delay: 0.4,
    },
  ], [stats, tStats]);

  // ✅ ACCESSIBILITY: Color mapping for different statistics
  const colorClasses = {
    indigo: 'text-indigo-500',
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("relative", className)}
    >
      {/* ✅ RESPONSIVE HEADER LAYOUT */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shrink-0">
            <Archive className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white truncate">
              {t('title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {t('description')}
            </p>
          </div>
        </div>
        
        {/* ✅ ENTERPRISE UX: Action buttons with proper spacing */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 sm:ml-auto">
          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log('[ArchiveHeader] Export clicked')}
            className="hidden sm:inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {tControls('export')}
          </Button>
          
          {/* Timeline Button with Soon Badge */}
          <div className="relative overflow-visible">
            <SoonBadge 
              position="top-center" 
              className="translate-x-[50%] -translate-y-full"
              translationNamespace="Leaderboard"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onActionClick}
              className="inline-flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">{tControls('viewTimeline')}</span>
              <span className="sm:hidden">{tControls('viewTimelineShort')}</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* ✅ RESPONSIVE STATISTICS GRID */}
      {stats.totalTasks > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-6">
          {statsCards.map((stat) => {
            const IconComponent = stat.icon;
            const colorClass = colorClasses[stat.color as keyof typeof colorClasses];
            
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: stat.delay, duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <IconComponent className={cn("w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2", colorClass)} />
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center">
                  {toLocaleNumerals(stat.value, locale)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
                  <span className="hidden sm:inline">{stat.label}</span>
                  <span className="sm:hidden">{stat.labelShort}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* ✅ EMPTY STATE: Show placeholder when no data */}
      {stats.totalTasks === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center py-12"
        >
          <Archive className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t('emptyState.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('emptyState.description')}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * ✅ PERFORMANCE: Memoized component to prevent unnecessary re-renders
 */
export default React.memo(ArchiveHeader);
