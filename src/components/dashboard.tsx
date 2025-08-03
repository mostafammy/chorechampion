'use client';

import {useEffect, useMemo} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AddTaskDialog } from './add-task-dialog';
import { TaskList } from './task-list';
import { PerformanceSummary } from './performance-summary';
import { OverallProgressChart } from './overall-progress-chart';
import { LastUpdated } from '@/components/ui/last-updated';
import { 
  Sun, 
  CalendarDays, 
  CalendarRange, 
  Trophy,
  Target,
  TrendingUp,
  Users,
  Zap,
  Crown,
  Star,
  BarChart3
} from 'lucide-react';
import { useAppContext } from '@/context/app-provider';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

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
  const locale = useLocale();

  // ✅ Enterprise Performance Optimization: Memoized calculations
  const { memberData, dashboardStats } = useMemo(() => {
    const data = members.map((member) => {
      const memberActiveTasks = activeTasks.filter((task) => task.assigneeId === member.id);
      const memberArchivedTasks = archivedTasks.filter((task) => task.assigneeId === member.id);
      
      const completedScore = memberArchivedTasks.reduce((sum, task) => sum + task.score, 0);
      const adjustmentScore = scoreAdjustments[member.id] || 0;
      const totalScore = completedScore + adjustmentScore;
      const totalPossibleScore = [...memberActiveTasks, ...memberArchivedTasks].reduce((sum, task) => sum + task.score, 0);
      const completionRate = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

      return {
        ...member,
        tasks: memberActiveTasks,
        completedScore,
        totalScore,
        totalPossibleScore,
        completionRate,
        taskCounts: {
          daily: memberActiveTasks.filter(t => t.period === 'daily').length,
          weekly: memberActiveTasks.filter(t => t.period === 'weekly').length,
          monthly: memberActiveTasks.filter(t => t.period === 'monthly').length,
        }
      };
    });

    // Calculate dashboard statistics
    const totalMembers = data.length;
    const totalActiveTasks = activeTasks.length;
    const totalCompletedTasks = archivedTasks.length;
    const totalPoints = data.reduce((sum, member) => sum + member.totalScore, 0);
    const averageCompletion = totalMembers > 0 ? data.reduce((sum, member) => sum + member.completionRate, 0) / totalMembers : 0;
    const topPerformer = data.reduce((top, member) => member.totalScore > (top?.totalScore || 0) ? member : top, null);

    return {
      memberData: data,
      dashboardStats: {
        totalMembers,
        totalActiveTasks,
        totalCompletedTasks,
        totalPoints,
        averageCompletion,
        topPerformer
      }
    };
  }, [members, activeTasks, archivedTasks, scoreAdjustments]);

  useEffect(() => {
    console.log('Archived Tasks:', archivedTasks);
  }, [archivedTasks]);

  // ✅ Enterprise Visual Design: Member card gradient configurations
  const getMemberCardGradient = (index: number) => {
    const gradients = [
      'bg-gradient-to-br from-blue-50/90 via-blue-100/70 to-indigo-50/90 dark:from-blue-500 dark:via-blue-600 dark:to-purple-600 border-blue-200/50 dark:border-blue-700/50',
      'bg-gradient-to-br from-emerald-50/90 via-emerald-100/70 to-teal-50/90 dark:from-emerald-500 dark:via-emerald-600 dark:to-teal-600 border-emerald-200/50 dark:border-emerald-700/50',
      'bg-gradient-to-br from-orange-50/90 via-orange-100/70 to-amber-50/90 dark:from-orange-500 dark:via-orange-600 dark:to-red-600 border-orange-200/50 dark:border-orange-700/50',
      'bg-gradient-to-br from-pink-50/90 via-pink-100/70 to-rose-50/90 dark:from-pink-500 dark:via-pink-600 dark:to-purple-600 border-pink-200/50 dark:border-pink-700/50',
    ];
    return gradients[index % gradients.length];
  };

  // ✅ Enterprise Achievement System: Dynamic badge assignment
  const getMemberBadge = (member: any) => {
    if (member.totalScore >= 100) {
      return { icon: Crown, text: t('champion') || 'Champion', gradient: 'from-yellow-400 to-yellow-600' };
    } else if (member.completionRate >= 80) {
      return { icon: Trophy, text: t('topPerformer') || 'Top Performer', gradient: 'from-blue-400 to-blue-600' };
    } else if (member.completionRate >= 50) {
      return { icon: Star, text: t('consistent') || 'Consistent', gradient: 'from-green-400 to-green-600' };
    } else if (member.tasks.length > 0) {
      return { icon: Target, text: t('progress') || 'In Progress', gradient: 'from-purple-400 to-purple-600' };
    }
    return null;
  };

  return (
    <div className="container mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* ✅ Enterprise-Grade Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white"
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-72 sm:h-72 bg-white/10 rounded-full blur-3xl -translate-y-24 translate-x-24"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 sm:w-64 sm:h-64 bg-white/5 rounded-full blur-2xl translate-y-18 -translate-x-18"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 flex-shrink-0">
              <BarChart3 className="w-8 h-8 text-yellow-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold font-headline bg-gradient-to-r from-yellow-300 via-white to-yellow-300 bg-clip-text text-transparent">
                {t('title') || 'Family Dashboard'}
              </h1>
              <p className="text-white/90 text-lg mt-2">
                {t('subtitle') || 'Track progress and manage tasks for everyone'}
              </p>
            </div>
          </div>

          {/* ✅ Enterprise Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-300" />
                <div>
                  <p className="text-white/80 text-xs">{t('members') || 'Members'}</p>
                  <p className="text-white font-bold text-lg">{dashboardStats.totalMembers}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-300" />
                <div>
                  <p className="text-white/80 text-xs">{t('activeTasks') || 'Active'}</p>
                  <p className="text-white font-bold text-lg">{dashboardStats.totalActiveTasks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-300" />
                <div>
                  <p className="text-white/80 text-xs">{t('points') || 'Points'}</p>
                  <p className="text-white font-bold text-lg">
                    <bdi dir="ltr">{dashboardStats.totalPoints.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</bdi>
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-300" />
                <div>
                  <p className="text-white/80 text-xs">{t('avgProgress') || 'Avg %'}</p>
                  <p className="text-white font-bold text-lg">{Math.round(dashboardStats.averageCompletion)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ✅ Enterprise Overall Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border border-gray-200/60 dark:border-gray-700/60 shadow-xl bg-gradient-to-br from-white/95 via-slate-50/80 to-white/95 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white border-b border-white/20">
            <CardTitle className="flex items-center gap-3 text-2xl font-headline">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                <BarChart3 className="w-6 h-6 text-emerald-200" />
              </div>
              <span className="font-bold">{t('overallProgress') || 'Overall Progress'}</span>
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1 text-sm font-semibold shadow-lg">
                📊 {t('familyStats') || 'Family Stats'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mx-auto w-full max-w-[200px]">
              <OverallProgressChart tasks={archivedTasks} members={members} scoreAdjustments={scoreAdjustments} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ✅ Enterprise Member Cards Grid */}
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        <AnimatePresence>
          {memberData.map((member, index) => {
            const badge = getMemberBadge(member);
            
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group"
              >
                <Card className={`flex flex-col overflow-hidden shadow-xl transform transition-all duration-300 hover:shadow-2xl ${getMemberCardGradient(index)}`}>
                  {/* ✅ Enhanced Member Header */}
                  <CardHeader className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          {badge && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                              <badge.icon className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="font-headline text-xl text-gray-900 dark:text-gray-100">
                            {member.name}
                          </CardTitle>
                          {badge && (
                            <Badge className={`bg-gradient-to-r ${badge.gradient} text-white border-0 text-xs mt-1 shadow-md`}>
                              <badge.icon className="w-3 h-3 mr-1" />
                              {badge.text}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <AddTaskDialog members={members} onAddTask={handleAddTask} />
                    </div>
                    
                    {/* ✅ Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{member.taskCounts.daily}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('daily') || 'Daily'}</p>
                      </div>
                      <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{member.taskCounts.weekly}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('weekly') || 'Weekly'}</p>
                      </div>
                      <div className="text-center p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{member.taskCounts.monthly}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('monthly') || 'Monthly'}</p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* ✅ Enhanced Card Content */}
                  <CardContent className="flex-1 flex flex-col p-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    <PerformanceSummary
                      completedScore={member.completedScore}
                      totalPossibleScore={member.totalPossibleScore}
                      memberId={member.id}
                      adjustment={scoreAdjustments[member.id] || 0}
                      onAdjustScore={handleAdjustScore}
                    />
                    
                    {/* ✅ Enhanced Tabs with Visual Improvements */}
                    <Tabs defaultValue="daily" className="mt-6 flex-1 flex flex-col">
                      <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-gray-100/80 via-slate-50/90 to-gray-100/80 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm p-1 rounded-xl shadow-inner">
                        <TabsTrigger 
                          value="daily" 
                          className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
                        >
                          <Sun className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('daily') || 'Daily'}</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="weekly" 
                          className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('weekly') || 'Weekly'}</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="monthly" 
                          className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
                        >
                          <CalendarRange className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('monthly') || 'Monthly'}</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="flex-1 mt-4">
                        <TabsContent value="daily" className="space-y-2">
                          <TaskList tasks={member.tasks.filter(t => t.period === 'daily')} onToggleTask={handleToggleTask} />
                        </TabsContent>
                        <TabsContent value="weekly" className="space-y-2">
                          <TaskList tasks={member.tasks.filter(t => t.period === 'weekly')} onToggleTask={handleToggleTask} />
                        </TabsContent>
                        <TabsContent value="monthly" className="space-y-2">
                          <TaskList tasks={member.tasks.filter(t => t.period === 'monthly')} onToggleTask={handleToggleTask} />
                        </TabsContent>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ✅ Enterprise Footer with Last Updated */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <LastUpdated 
          timestamp={new Date().toISOString()}
          size="md"
          variant="muted"
          labelOverride={t('lastRefreshed') || 'Dashboard refreshed'}
        />
      </motion.div>
    </div>
  );
}
