'use client';

import { ArchivedTask, Member } from '@/types';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  format, 
  isToday, 
  isYesterday, 
  isThisWeek, 
  isThisMonth,
  differenceInDays 
} from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { toLocaleNumerals, type SupportedLocale } from '@/lib/utils/i18n-numerals';
import { 
  Calendar, 
  Trophy, 
  Star, 
  Clock, 
  TrendingUp, 
  Archive,
  ChevronDown,
  ChevronUp,
  Filter,
  SortAsc,
  Medal,
  Sparkles,
  MoreVertical,
  Target,
  CheckCircle,
  User,
  Award
} from 'lucide-react';
// ✅ PRINCIPAL ENGINEER: Import responsive design system
import { useResponsiveArchive, responsiveBadges } from '@/lib/design-system/responsive-archive';
import { useIsMobile } from '@/hooks/use-mobile';

interface ArchiveTableProps {
  archivedTasks: ArchivedTask[];
  members: Member[];
}

// Helper function to safely convert completedDate to Date object
const ensureDate = (date: Date | string | null | undefined): Date => {
  if (!date) {
    return new Date();
  }
  
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

// ✅ Smart date formatting with relative labels and localization
const formatSmartDate = (date: Date, tDate: any): { primary: string; secondary: string; variant: 'recent' | 'current' | 'old' } => {
  if (isToday(date)) {
    return { primary: tDate('today'), secondary: format(date, 'p'), variant: 'recent' };
  } else if (isYesterday(date)) {
    return { primary: tDate('yesterday'), secondary: format(date, 'p'), variant: 'recent' };
  } else if (isThisWeek(date)) {
    return { primary: format(date, 'EEEE'), secondary: format(date, 'p'), variant: 'current' };
  } else if (isThisMonth(date)) {
    return { primary: format(date, 'MMM d'), secondary: format(date, 'p'), variant: 'current' };
  } else {
    return { primary: format(date, 'MMM d, yyyy'), secondary: format(date, 'p'), variant: 'old' };
  }
};

export function ArchiveTable({ archivedTasks, members }: ArchiveTableProps) {
  const t = useTranslations('ArchiveTable');
  const tPage = useTranslations('ArchivePage');
  const tStats = useTranslations('ArchivePage.statistics');
  const tSort = useTranslations('ArchiveTable.sortBy');
  const tFilter = useTranslations('ArchiveTable.filterBy');
  const tView = useTranslations('ArchiveTable.viewMode');
  const tDate = useTranslations('ArchiveTable.dateLabels');
  const tPeriods = useTranslations('ArchiveTable.periods');
  const tBadges = useTranslations('ArchiveTable.performanceBadges');
  const locale = useLocale();
  
  // ✅ PRINCIPAL ENGINEER: Responsive design system integration
  const responsive = useResponsiveArchive();
  const isMobile = useIsMobile();
  
  // ✅ Enhanced state management for responsive UX
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(isMobile ? 'cards' : 'table');

  // ✅ Enterprise Performance Optimization: Memoized member data with statistics
  const membersWithTasks = useMemo(() => {
    const processedMembers = members
      .map((member, index) => {
        let tasks = archivedTasks
          .filter((task) => task.assigneeId === member.id)
          .map(task => ({
            ...task,
            completedDate: ensureDate(task.completedDate)
          }));

        // Apply period filter
        if (filterPeriod !== 'all') {
          const now = new Date();
          tasks = tasks.filter(task => {
            const taskDate = ensureDate(task.completedDate);
            switch (filterPeriod) {
              case 'today':
                return isToday(taskDate);
              case 'week':
                return isThisWeek(taskDate);
              case 'month':
                return isThisMonth(taskDate);
              default:
                return true;
            }
          });
        }

        // Apply sorting
        tasks.sort((a, b) => {
          switch (sortBy) {
            case 'date':
              return ensureDate(b.completedDate).getTime() - ensureDate(a.completedDate).getTime();
            case 'score':
              return b.score - a.score;
            case 'name':
              return a.name.localeCompare(b.name);
            default:
              return 0;
          }
        });

        // Calculate member statistics
        const totalScore = tasks.reduce((sum, task) => sum + task.score, 0);
        const avgScore = tasks.length > 0 ? Math.round(totalScore / tasks.length) : 0;
        const recentTasks = tasks.filter(task => {
          const daysDiff = differenceInDays(new Date(), ensureDate(task.completedDate));
          return daysDiff <= 7;
        }).length;
        
        // Member performance badge
        let performanceBadge = 'rookie';
        if (totalScore >= 100) performanceBadge = 'champion';
        else if (totalScore >= 50) performanceBadge = 'achiever';
        else if (recentTasks >= 3) performanceBadge = 'active';

        return { 
          ...member, 
          tasks, 
          index,
          stats: {
            totalScore,
            avgScore,
            recentTasks,
            performanceBadge,
            totalTasks: tasks.length
          }
        };
      })
      .filter((member) => member.tasks.length > 0)
      .sort((a, b) => b.stats.totalScore - a.stats.totalScore); // Sort by total score

    return processedMembers;
  }, [members, archivedTasks, sortBy, filterPeriod]);

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

    // ✅ Enhanced empty state with visual appeal
  if (membersWithTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center space-y-4"
      >
        <Archive className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 dark:text-gray-500" />
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200">
          {tPage('emptyState.title')}
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md">
          {tPage('emptyState.description')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-0">
      {/* ✅ PRINCIPAL ENGINEER: Mobile-First Responsive Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('date')}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{tSort('date')}</span>
              <span className="sm:hidden">{tSort('dateShort')}</span>
            </Button>
            <Button
              variant={sortBy === 'score' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('score')}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{tSort('score')}</span>
              <span className="sm:hidden">{tSort('scoreShort')}</span>
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('name')}
              className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <SortAsc className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{tSort('name')}</span>
              <span className="sm:hidden">{tSort('nameShort')}</span>
            </Button>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', labelKey: 'all', iconKey: 'allShort' },
              { key: 'today', labelKey: 'today', iconKey: 'todayShort' },
              { key: 'week', labelKey: 'week', iconKey: 'weekShort' },
              { key: 'month', labelKey: 'month', iconKey: 'monthShort' }
            ].map((period) => (
              <Button
                key={period.key}
                variant={filterPeriod === period.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPeriod(period.key as any)}
                className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <span className="sm:hidden mr-1">{tFilter(period.iconKey)}</span>
                <span>{tFilter(period.labelKey)}</span>
              </Button>
            ))}
          </div>
          
          {/* View Mode Toggle for Small Screens */}
          {isMobile && (
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="text-xs h-8 flex-1"
              >
                {tView('cards')}
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="text-xs h-8 flex-1"
              >
                {tView('table')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Enhanced Member Cards with Animation */}
      <div className="space-y-6">
        <AnimatePresence>
          {membersWithTasks.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* ✅ Enhanced Member Header with Improved Dark Mode Hover */}
              <CardHeader 
                className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                onClick={() => toggleMemberExpansion(member.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-white dark:ring-gray-800 shadow-sm">
                      <AvatarImage 
                        src={member.avatar} 
                        alt={member.name}
                        data-ai-hint={member.id === '1' ? 'male portrait' : 'female portrait'}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {member.name}
                        </CardTitle>
                        {index === 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold whitespace-nowrap">
                            <Trophy className="w-3 h-3" />
                            <span className="hidden sm:inline">{t('topPerformer')}</span>
                            <span className="sm:hidden">{t('topPerformerShort')}</span>
                          </div>
                        )}
                        <Badge className={responsiveBadges.period(member.stats.performanceBadge)}>
                          {tBadges(member.stats.performanceBadge)}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <span className="hidden sm:inline">
                          {locale === 'ar' ? 
                            `${toLocaleNumerals(member.tasks.length, locale as SupportedLocale)} مهام مكتملة • ${toLocaleNumerals(member.stats.totalScore, locale as SupportedLocale)} نقاط` :
                            `${tPage('tasksCompleted', { count: member.tasks.length })} • ${member.stats.totalScore} ${tPage('points')}`
                          }
                        </span>
                        <span className="sm:hidden">
                          {locale === 'ar' ? 
                            `${toLocaleNumerals(member.tasks.length, locale as SupportedLocale)} مهام • ${toLocaleNumerals(member.stats.totalScore, locale as SupportedLocale)}ن` :
                            `${tPage('tasksCompleted', { count: member.tasks.length })} • ${member.stats.totalScore}${tPage('pointsShort')}`
                          }
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {locale === 'ar' ? 
                          `المتوسط: ${toLocaleNumerals(member.stats.avgScore, locale as SupportedLocale)} نقطة` :
                          tStats('averageScore', { score: member.stats.avgScore })
                        }
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {locale === 'ar' ? 
                          `الحديثة: ${toLocaleNumerals(member.stats.recentTasks, locale as SupportedLocale)} مهام` :
                          tStats('recentTasks', { count: member.stats.recentTasks })
                        }
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMembers.has(member.id) ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </motion.div>
                  </div>
                </div>
              </CardHeader>

              {/* ✅ Expandable Task Table/Cards */}
              <AnimatePresence>
                {expandedMembers.has(member.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <CardContent className="p-0">
                      {/* Mobile Card View */}
                      {isMobile && viewMode === 'cards' ? (
                        <div className="space-y-3 p-4">
                          {member.tasks.map((task, taskIndex) => {
                            const dateInfo = formatSmartDate(ensureDate(task.completedDate), tDate);
                            return (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: taskIndex * 0.05, duration: 0.3 }}
                                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {dateInfo.variant === 'recent' && (
                                      <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    )}
                                    <span className="font-medium text-gray-900 dark:text-white truncate text-sm">
                                      {task.name}
                                    </span>
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700 text-xs">
                                    +{locale === 'ar' ? toLocaleNumerals(task.score, locale as SupportedLocale) : task.score}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${responsiveBadges.period(task.period || 'oneTime')} text-xs py-0.5 px-1.5`}>
                                      {tPeriods(task.period?.toLowerCase() || 'oneTime')}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {dateInfo.primary}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                      {dateInfo.secondary}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Desktop Table View */
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-gray-200 dark:border-gray-700">
                              <TableHead className="pl-6 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                {t('task')}
                              </TableHead>
                              <TableHead className="hidden sm:table-cell text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                {t('period')}
                              </TableHead>
                              <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                {t('score')}
                              </TableHead>
                              <TableHead className="text-right pr-6 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                {t('completed')}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {member.tasks.map((task, taskIndex) => {
                            const dateInfo = formatSmartDate(ensureDate(task.completedDate), tDate);
                            return (
                              <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: taskIndex * 0.05, duration: 0.3 }}
                                className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 border-gray-100 dark:border-gray-700"
                              >
                                <TableCell className="font-medium pl-6 text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    {dateInfo.variant === 'recent' && (
                                      <Sparkles className="w-4 h-4 text-emerald-500" />
                                    )}
                                    <span className="truncate">{task.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge className={responsiveBadges.period(task.period || 'oneTime')}>
                                    {tPeriods(task.period?.toLowerCase() || 'oneTime')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700">
                                    +{locale === 'ar' ? toLocaleNumerals(task.score, locale as SupportedLocale) : task.score}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {dateInfo.primary}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {dateInfo.secondary}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
