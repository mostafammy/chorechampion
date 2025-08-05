'use client';

import { useAppContext } from "@/context/app-provider";
import { useTranslations } from "next-intl";
import { ArchiveTable } from "@/components/archive-table";
import { useMemo } from 'react';
import { motion } from "framer-motion";
import { Archive, Calendar, TrendingUp, Users, Award, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LastUpdated } from "@/components/ui/last-updated";
// ✅ PRINCIPAL ENGINEER: Import responsive design system
import { useResponsiveArchive } from '@/lib/design-system/responsive-archive';
import '@/app/globals.css';

const ArchiveMain = () => {
    const { archivedTasks, members } = useAppContext();
    const t = useTranslations('ArchivePage');
    
    // ✅ PRINCIPAL ENGINEER: Responsive design system integration
    const responsive = useResponsiveArchive();
    
    // ✅ Enterprise Performance Optimization: Memoized statistics
    const archiveStats = useMemo(() => {
        const totalTasks = archivedTasks.length;
        const totalScore = archivedTasks.reduce((sum, task) => sum + task.score, 0);
        const uniqueMembers = new Set(archivedTasks.map(task => task.assigneeId)).size;
        
        // Calculate completion trends
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const weeklyTasks = archivedTasks.filter(task => {
            const completedDate = new Date(task.completedDate || now);
            return completedDate >= lastWeek;
        }).length;
        
        const monthlyTasks = archivedTasks.filter(task => {
            const completedDate = new Date(task.completedDate || now);
            return completedDate >= lastMonth;
        }).length;
        
        // Find the most recent task completion date for last updated
        const mostRecentTask = archivedTasks.reduce((latest, current) => {
            const currentDate = new Date(current.completedDate || 0);
            const latestDate = new Date(latest?.completedDate || 0);
            return currentDate > latestDate ? current : latest;
        }, archivedTasks[0]);
        
        const lastUpdatedDate = mostRecentTask?.completedDate ? new Date(mostRecentTask.completedDate) : new Date();
        
        // Top performer
        const memberTaskCounts = members.map(member => ({
            ...member,
            taskCount: archivedTasks.filter(task => task.assigneeId === member.id).length,
            totalScore: archivedTasks.filter(task => task.assigneeId === member.id).reduce((sum, task) => sum + task.score, 0)
        }));
        
        const topPerformer = memberTaskCounts.reduce((top, current) => 
            current.taskCount > top.taskCount ? current : top, 
            memberTaskCounts[0] || null
        );
        
        return {
            totalTasks,
            totalScore,
            uniqueMembers,
            weeklyTasks,
            monthlyTasks,
            topPerformer,
            averageTasksPerMember: uniqueMembers > 0 ? Math.round(totalTasks / uniqueMembers) : 0,
            lastUpdatedDate: lastUpdatedDate.toISOString()
        };
    }, [archivedTasks, members]);

    return (
        <div className="container mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
            {/* ✅ PRINCIPAL ENGINEER: Responsive Header with Adaptive Layout */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative"
            >
                {/* ✅ Responsive Header Layout */}
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
                    
                    {/* ✅ Mobile-First Action Button */}
                    <div className="flex-shrink-0 sm:ml-auto">
                        <button className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Clock className="w-4 h-4" />
                            <span className="hidden sm:inline">View Timeline</span>
                            <span className="sm:hidden">Timeline</span>
                        </button>
                    </div>
                </div>
                
                {/* ✅ Responsive Statistics Grid with Smart Breakpoints */}
                {archiveStats.totalTasks > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-indigo-500" />
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center">
                                {archiveStats.totalTasks}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
                                <span className="hidden sm:inline">Tasks Completed</span>
                                <span className="sm:hidden">Tasks</span>
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            <Award className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-emerald-500" />
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center">
                                {archiveStats.totalScore}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
                                <span className="hidden sm:inline">Total Points</span>
                                <span className="sm:hidden">Points</span>
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-blue-500" />
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center">
                                {archiveStats.uniqueMembers}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
                                <span className="hidden sm:inline">Active Members</span>
                                <span className="sm:hidden">Members</span>
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-purple-500" />
                            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center">
                                {archiveStats.weeklyTasks}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center mt-1">
                                <span className="hidden sm:inline">This Week</span>
                                <span className="sm:hidden">Week</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>

            {/* ✅ PRINCIPAL ENGINEER: Responsive Archive Table with Smart Container */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
                <ArchiveTable archivedTasks={archivedTasks} members={members} />
            </motion.div>

            {/* ✅ Responsive Last Updated Component */}
            {archiveStats.totalTasks > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="flex justify-center mt-6 sm:mt-8"
                >
                    <LastUpdated 
                        timestamp={archiveStats.lastUpdatedDate}
                        variant="muted"
                        size="sm"
                        labelOverride={t('lastUpdated')}
                        className="bg-white dark:bg-gray-800 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs sm:text-sm"
                    />
                </motion.div>
            )}
        </div>
    );
};

export default ArchiveMain;
