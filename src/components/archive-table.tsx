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
  Sparkles
} from 'lucide-react';
// ✅ PRINCIPAL ENGINEER: Import enterprise design system
import { useArchiveTheme } from '@/lib/design-system/theme-utils';

interface ArchiveTableProps {
  archivedTasks: ArchivedTask[];
  members: Member[];
}

// ✅ PRINCIPAL ENGINEER: Enhanced date safety with intelligent fallbacks
const ensureDate = (date: Date | string | null | undefined): Date => {
  // Handle null/undefined cases
  if (!date) {
    console.warn('[ArchiveTable] Missing completion date, using fallback');
    // Use a date from the past week instead of current time for archived tasks
    return new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7));
  }
  
  // Handle Date objects
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      console.warn('[ArchiveTable] Invalid Date object, using fallback');
      return new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7));
    }
    return date;
  }
  
  // Handle string dates
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    console.warn('[ArchiveTable] Invalid date string:', date, 'using fallback');
    return new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7));
  }
  
  return parsedDate;
};

// ✅ Smart date formatting with relative labels
const formatSmartDate = (date: Date): { primary: string; secondary: string; variant: 'recent' | 'current' | 'old' } => {
  if (isToday(date)) {
    return { primary: 'Today', secondary: format(date, 'p'), variant: 'recent' };
  } else if (isYesterday(date)) {
    return { primary: 'Yesterday', secondary: format(date, 'p'), variant: 'recent' };
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
  const locale = useLocale();
  
  // ✅ PRINCIPAL ENGINEER: Enterprise design system integration
  const archiveTheme = useArchiveTheme();
  
  // ✅ Enhanced state management for better UX
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

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
        className={archiveTheme.emptyState.container}
      >
        <Archive className={archiveTheme.emptyState.icon} />
        <h3 className={archiveTheme.emptyState.text.primary}>
          {tPage('noTasks')}
        </h3>
        <p className={archiveTheme.emptyState.text.secondary}>
          Complete some tasks to see your achievements here!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Enhanced Controls Bar */}
      <Card className="border-slate-200/60 dark:border-slate-700/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('date')}
                className="gap-2"
              >
                <Clock className="w-4 h-4" />
                Date
              </Button>
              <Button
                variant={sortBy === 'score' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('score')}
                className="gap-2"
              >
                <Trophy className="w-4 h-4" />
                Score
              </Button>
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('name')}
                className="gap-2"
              >
                <SortAsc className="w-4 h-4" />
                Name
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'today', 'week', 'month'].map((period) => (
                <Button
                  key={period}
                  variant={filterPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterPeriod(period as any)}
                  className="capitalize"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
              className={`${archiveTheme.memberCard.container} ${archiveTheme.memberCard.getGradient(member.index)}`}
            >
              {/* ✅ Enhanced Member Header */}
              <CardHeader 
                className={`${archiveTheme.memberHeader.container} cursor-pointer`}
                onClick={() => toggleMemberExpansion(member.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className={archiveTheme.memberHeader.avatar}>
                      <AvatarImage 
                        src={member.avatar} 
                        alt={member.name}
                        data-ai-hint={member.id === '1' ? 'male portrait' : 'female portrait'}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle className={archiveTheme.memberHeader.title}>
                          {member.name}
                        </CardTitle>
                        {index === 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold">
                            <Trophy className="w-3 h-3" />
                            Top Performer
                          </div>
                        )}
                        <Badge className={archiveTheme.badges.getPeriodBadge(member.stats.performanceBadge)}>
                          {member.stats.performanceBadge}
                        </Badge>
                      </div>
                      <CardDescription className={archiveTheme.memberHeader.subtitle}>
                        {tPage('tasksCompleted', { count: member.tasks.length })} • {member.stats.totalScore} points
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Avg: {member.stats.avgScore} pts
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Recent: {member.stats.recentTasks} tasks
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMembers.has(member.id) ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </motion.div>
                  </div>
                </div>
              </CardHeader>

              {/* ✅ Expandable Task Table */}
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
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-slate-200/40 dark:border-slate-600/40">
                            <TableHead className="pl-6 text-slate-700 dark:text-slate-300 font-semibold">
                              {t('task')}
                            </TableHead>
                            <TableHead className="hidden sm:table-cell text-slate-700 dark:text-slate-300 font-semibold">
                              {t('period')}
                            </TableHead>
                            <TableHead className="text-center text-slate-700 dark:text-slate-300 font-semibold">
                              {t('score')}
                            </TableHead>
                            <TableHead className="text-right pr-6 text-slate-700 dark:text-slate-300 font-semibold">
                              {t('completed')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {member.tasks.map((task, taskIndex) => {
                            const dateInfo = formatSmartDate(ensureDate(task.completedDate));
                            return (
                              <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: taskIndex * 0.05, duration: 0.3 }}
                                className={archiveTheme.taskRow.container}
                              >
                                <TableCell className={`font-medium pl-6 ${archiveTheme.taskRow.text.primary}`}>
                                  <div className="flex items-center gap-2">
                                    {dateInfo.variant === 'recent' && (
                                      <Sparkles className="w-4 h-4 text-emerald-500" />
                                    )}
                                    {task.name}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge className={archiveTheme.badges.getPeriodBadge(task.period || 'oneTime')}>
                                    {task.period || 'One-time'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={archiveTheme.badges.score}>
                                    +{task.score}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className={`font-medium ${archiveTheme.taskRow.text.primary}`}>
                                    {dateInfo.primary}
                                  </div>
                                  <div className={`text-xs ${archiveTheme.taskRow.text.muted}`}>
                                    {dateInfo.secondary}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </TableBody>
                      </Table>
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
