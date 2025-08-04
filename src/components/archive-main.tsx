'use client';

import { useAppContext } from "@/context/app-provider";
import { useTranslations } from "next-intl";
import { ArchiveTable } from "@/components/archive-table";
import { useMemo } from 'react';
import { motion } from "framer-motion";
import { Archive, Calendar, TrendingUp, Users, Award, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LastUpdated } from "@/components/ui/last-updated";
// ✅ PRINCIPAL ENGINEER: Import enterprise design system
import { useArchiveTheme } from '@/lib/design-system/theme-utils';
import '@/app/globals.css';

const ArchiveMain = () => {
    const { archivedTasks, members } = useAppContext();
    const t = useTranslations('ArchivePage');
    
    // ✅ PRINCIPAL ENGINEER: Enterprise design system integration
    const archiveTheme = useArchiveTheme();
    
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
        <div className="container mx-auto space-y-8">
            {/* ✅ Enhanced Header with Visual Appeal */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={archiveTheme.header.container}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                        <Archive className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className={archiveTheme.header.title}>
                            {t('title')}
                        </h1>
                        <p className={archiveTheme.header.subtitle}>
                            {t('description')}
                        </p>
                    </div>
                </div>
                
                {/* ✅ Archive Statistics Grid */}
                {archiveStats.totalTasks > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className={archiveTheme.stats.container}
                        >
                            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                            <div className={archiveTheme.stats.value}>
                                {archiveStats.totalTasks}
                            </div>
                            <div className={archiveTheme.stats.label}>
                                Tasks Completed
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className={archiveTheme.stats.container}
                        >
                            <Award className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                            <div className={archiveTheme.stats.value}>
                                {archiveStats.totalScore}
                            </div>
                            <div className={archiveTheme.stats.label}>
                                Total Points
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className={archiveTheme.stats.container}
                        >
                            <Users className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                            <div className={archiveTheme.stats.value}>
                                {archiveStats.uniqueMembers}
                            </div>
                            <div className={archiveTheme.stats.label}>
                                Active Members
                            </div>
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className={archiveTheme.stats.container}
                        >
                            <Calendar className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                            <div className={archiveTheme.stats.value}>
                                {archiveStats.weeklyTasks}
                            </div>
                            <div className={archiveTheme.stats.label}>
                                This Week
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>

            {/* ✅ Enhanced Archive Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            >
                <ArchiveTable archivedTasks={archivedTasks} members={members} />
            </motion.div>

            {/* ✅ Last Updated Component */}
            {archiveStats.totalTasks > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="flex justify-center mt-8"
                >
                    <LastUpdated 
                        timestamp={archiveStats.lastUpdatedDate}
                        variant="muted"
                        size="sm"
                        labelOverride={t('lastUpdated')}
                        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                    />
                </motion.div>
            )}
        </div>
    );
};

export default ArchiveMain;
