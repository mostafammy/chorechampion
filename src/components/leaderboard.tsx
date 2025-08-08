'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Crown,
  Star,
  Target,
  Calendar,
  Users,
  BarChart3,
  Zap,
  Shield,
  Flame,
  RefreshCw
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
// ✅ PRINCIPAL ENGINEER: Import enterprise-grade SoonBadge component
import { SoonBadge, SoonBadgePresets } from '@/components/ui/soon-badge';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';
import LoadingSpinner from '@/components/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { IS_DEV } from '@/lib/utils';
import { useAppContext } from '@/context/app-provider';
import { initialMembers } from '@/data/seed'; // ✅ ADD: Import members data
import { LastUpdated } from '@/components/ui/last-updated'; // ✅ Enterprise Component Import

// ✅ Type definitions matching the API response
interface LeaderboardMember {
  id: string;
  name: string;
  avatar?: string;
  totalScore: number;
  totalPossibleScore: number; // ✅ ADD: Total possible score for progress calculation
  rank: number;
  scoreBreakdown: {
    taskScore: number;
    adjustmentScore: number;
    bonusScore: number;
  };
  achievements: {
    totalTasksCompleted: number;
    weeklyStreak: number;
    monthlyStreak: number;
    badges: string[];
  };
  periodStats: {
    dailyAverage: number;
    weeklyAverage: number;
    monthlyAverage: number;
    trend: "up" | "down" | "stable";
    trendPercentage: number;
  };
  lastActive: string;
  isActive: boolean;
}

interface LeaderboardStats {
  totalMembers: number;
  totalPointsAwarded: number;
  averageScore: number;
  topPerformer: string;
  mostImproved: string;
  competitionLevel: "low" | "medium" | "high";
}

interface LeaderboardData {
  leaderboard: LeaderboardMember[];
  stats: LeaderboardStats;
  period: string;
  lastUpdated: string;
  pagination: {
    total: number;
    limit: number;
    hasMore: boolean;
  };
}

// ✅ Rank configuration for visual styling
const RANK_CONFIG = {
  1: { icon: Trophy, color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-900/20", borderColor: "border-yellow-200 dark:border-yellow-800" },
  2: { icon: Medal, color: "text-gray-500", bgColor: "bg-gray-50 dark:bg-gray-900/20", borderColor: "border-gray-200 dark:border-gray-800" },
  3: { icon: Award, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20", borderColor: "border-amber-200 dark:border-amber-800" },
};

export function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all-time"); // ✅ Default to all-time since other periods are coming soon
  const [refreshing, setRefreshing] = useState(false);

  const t = useTranslations('Leaderboard');
  const locale = useLocale();
  const { toast } = useToast();
  
  // ✅ MAXIMUM PERFORMANCE: Get tasks and members from AppProvider - NO API CALLS!
  const { activeTasks, archivedTasks, scoreAdjustments, members } = useAppContext();
  
  // ✅ Combine all tasks for total possible score calculation
  const allTasks = useMemo(() => [...activeTasks, ...archivedTasks], [activeTasks, archivedTasks]);

  // ✅ Calculate member scores from task completion and adjustments
  const calculateMemberScores = useMemo(() => {
    const memberScores: Record<string, { total: number; completed: number; adjustment: number }> = {};
    
    members.forEach(member => {
      const memberTasks = allTasks.filter(task => task.assigneeId === member.id);
      const completedScore = memberTasks
        .filter(task => task.completed)
        .reduce((sum, task) => sum + task.score, 0);
      
      const adjustmentScore = scoreAdjustments[member.id] || 0;
      const totalScore = completedScore + adjustmentScore;
      
      memberScores[member.id] = {
        completed: completedScore,
        adjustment: adjustmentScore,
        total: totalScore,
      };
    });
    
    return memberScores;
  }, [allTasks, scoreAdjustments, members]);

  // ✅ INSTANT CALCULATION: Calculate leaderboard directly from AppProvider data (NO NETWORK DELAY!)
  const calculateLeaderboardData = useMemo((): LeaderboardData | null => {
    if (!allTasks.length || !members.length) {
      return null;
    }

    try {
      if (IS_DEV) {
        console.log('[Leaderboard] 🚀 INSTANT calculation from AppProvider data (NO API CALL!)');
        console.log('[Leaderboard] Using', allTasks.length, 'tasks and', members.length, 'members locally');
      }

      // Calculate member scores and rankings
      const leaderboard: LeaderboardMember[] = members.map(member => {
        const memberTasks = allTasks.filter(task => task.assigneeId === member.id);
        const totalPossibleScore = memberTasks.reduce((sum, task) => sum + task.score, 0);
        
        // Get member's score from calculated scores
        const memberScore = calculateMemberScores[member.id] || { total: 0, adjustment: 0, completed: 0 };
        
        return {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          totalScore: memberScore.total,
          totalPossibleScore,
          rank: 0, // Will be set after sorting
          scoreBreakdown: {
            taskScore: memberScore.completed,
            adjustmentScore: memberScore.adjustment,
            bonusScore: Math.max(0, memberScore.total - memberScore.completed - memberScore.adjustment),
          },
          achievements: {
            totalTasksCompleted: memberTasks.filter(task => task.completed).length,
            weeklyStreak: 0, // Could be calculated from task completion dates
            monthlyStreak: 0,
            badges: [], // Default empty badges
          },
          periodStats: {
            dailyAverage: memberScore.total / 30, // Rough estimate
            weeklyAverage: memberScore.total / 4,
            monthlyAverage: memberScore.total,
            trend: memberScore.total > 0 ? "up" : "stable" as "up" | "down" | "stable",
            trendPercentage: Math.min(100, Math.max(0, memberScore.total / 10)),
          },
          lastActive: new Date().toISOString(),
          isActive: memberScore.total > 0,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore) // Sort by score
      .map((member, index) => ({ ...member, rank: index + 1 })); // Assign ranks

      // Calculate stats
      const totalMembers = leaderboard.length;
      const totalPointsAwarded = leaderboard.reduce((sum, member) => sum + member.totalScore, 0);
      const averageScore = totalPointsAwarded / totalMembers || 0;
      const topPerformer = leaderboard[0]?.name || 'No one yet';
      const mostImproved = leaderboard.find(m => m.periodStats.trend === 'up')?.name || topPerformer;

      const stats: LeaderboardStats = {
        totalMembers,
        totalPointsAwarded,
        averageScore,
        topPerformer,
        mostImproved,
        competitionLevel: averageScore > 50 ? 'high' : averageScore > 20 ? 'medium' : 'low',
      };

      return {
        leaderboard,
        stats,
        period: selectedPeriod,
        lastUpdated: new Date().toISOString(),
        pagination: {
          total: totalMembers,
          limit: 10,
          hasMore: false,
        },
      };
    } catch (error) {
      console.error('[Leaderboard] Error in instant calculation:', error);
      return null;
    }
  }, [allTasks, members, calculateMemberScores, selectedPeriod]);

  // ✅ Set leaderboard data instantly when calculated
  useEffect(() => {
    if (calculateLeaderboardData) {
      setLeaderboardData(calculateLeaderboardData);
      setIsLoading(false);
      setError(null);
      
      if (IS_DEV) {
        console.log('[Leaderboard] ⚡ INSTANT DATA READY - No network delay!', calculateLeaderboardData);
      }
    } else if (allTasks.length === 0) {
      // Only show loading if we don't have tasks yet
      setIsLoading(true);
    }
  }, [calculateLeaderboardData, allTasks.length]);

  // ✅ INSTANT REFRESH: No API call needed, data recalculates automatically
  const handleInstantRefresh = () => {
    setRefreshing(true);
    
    // Simulate refresh animation and update timestamp
    setTimeout(() => {
      setRefreshing(false);
      
      // Update the leaderboard data with new timestamp
      if (leaderboardData) {
        setLeaderboardData({
          ...leaderboardData,
          lastUpdated: new Date().toISOString()
        });
      }
      
      toast({
        title: t('refreshSuccess') || 'Leaderboard Updated',
        description: t('refreshSuccessDescription') || 'Rankings updated instantly from local data!',
        variant: 'success',
      });
    }, 500);
  };

  // ✅ Period change handler - now instant, no API calls needed
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    // No setIsLoading(true) needed - calculation is instant!
  };

  // ✅ Manual refresh handler
  const handleRefresh = () => {
    handleInstantRefresh();
  };

  // ✅ Render achievement badge with translations
  const renderBadge = (badgeType: string) => {
    // Achievement badge configuration with translations
    const badgeConfig = {
      champion: { icon: Crown, color: "bg-gradient-to-r from-yellow-400 to-yellow-600", label: t('badges.champion') },
      achiever: { icon: Trophy, color: "bg-gradient-to-r from-blue-400 to-blue-600", label: t('badges.achiever') },
      starter: { icon: Star, color: "bg-gradient-to-r from-green-400 to-green-600", label: t('badges.starter') },
      leader: { icon: Crown, color: "bg-gradient-to-r from-purple-400 to-purple-600", label: t('badges.leader') },
      "top-performer": { icon: Medal, color: "bg-gradient-to-r from-orange-400 to-orange-600", label: t('badges.topPerformer') },
      consistent: { icon: Target, color: "bg-gradient-to-r from-teal-400 to-teal-600", label: t('badges.consistent') },
      dedicated: { icon: Shield, color: "bg-gradient-to-r from-red-400 to-red-600", label: t('badges.dedicated') },
      "bonus-earner": { icon: Zap, color: "bg-gradient-to-r from-pink-400 to-pink-600", label: t('badges.bonusEarner') },
      "task-master": { icon: Award, color: "bg-gradient-to-r from-indigo-400 to-indigo-600", label: t('badges.taskMaster') },
    };
    
    const config = badgeConfig[badgeType as keyof typeof badgeConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge 
        key={badgeType}
        className={`${config.color} text-white border-0 shadow-md`}
        title={config.label}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // ✅ Render trend indicator
  const renderTrendIndicator = (trend: "up" | "down" | "stable", percentage: number) => {
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const colorClass = trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500";
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <TrendIcon className="w-4 h-4" />
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
    );
  };

  // ✅ Render member rank indicator
  const renderRankIndicator = (rank: number) => {
    const config = RANK_CONFIG[rank as keyof typeof RANK_CONFIG];
    if (!config) {
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
          <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
        </div>
      );
    }

    const Icon = config.icon;
    return (
      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} border-2 ${config.borderColor}`}>
        <Icon className={`w-6 h-6 ${config.color}`} />
      </div>
    );
  };

  // ✅ Loading state
  if (isLoading && !leaderboardData) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-headline">{t('title') || 'Leaderboard'}</h1>
            <p className="text-muted-foreground">{t('description') || 'See how everyone is performing in the chore challenge!'}</p>
          </div>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  // ✅ Error state
  if (error && !leaderboardData) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-headline">{t('title') || 'Leaderboard'}</h1>
            <p className="text-muted-foreground">{t('description') || 'See how everyone is performing in the chore challenge!'}</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-destructive mb-4">
              <BarChart3 className="w-16 h-16 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('errorTitle') || 'Unable to Load Leaderboard'}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => handleRefresh()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('tryAgain') || 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!leaderboardData) return null;

  const { leaderboard, stats } = leaderboardData;

  return (
    <div className="container mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {refreshing && <LoadingSpinner />}
      
      {/* ✅ Enterprise-Grade Responsive Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600 p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl -translate-y-24 translate-x-24 sm:-translate-y-48 sm:translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 sm:w-72 sm:h-72 bg-white/5 rounded-full blur-2xl translate-y-18 -translate-x-18 sm:translate-y-36 sm:-translate-x-36"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-headline bg-gradient-to-r from-yellow-300 via-white to-yellow-300 bg-clip-text text-transparent leading-tight">
                {t('title') || 'Leaderboard'}
              </h1>
            </div>
            <p className="text-white/90 text-base sm:text-lg mb-3 sm:mb-4 leading-relaxed">
              {t('description') || 'See how everyone is performing in the chore challenge!'}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
              <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-lg whitespace-nowrap">
                📊 {t('allTimeRankings') || 'All-Time Rankings'}
              </Badge>
              <SoonBadge
                variant="default"
                size="lg"
                animation="pulse"
                position="relative"
                text={`🚀 ${t('comingSoonPeriods') || 'Daily/Weekly/Monthly Coming Soon'}`}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold whitespace-nowrap"
                translationNamespace="Leaderboard"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0 mt-4 lg:mt-0">
            <Button 
              onClick={handleRefresh} 
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 transition-all duration-300 shadow-lg w-full sm:w-auto justify-center"
              disabled={refreshing}
              size="lg"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm sm:text-base">{refreshing ? (t('refreshing') || 'Refreshing...') : (t('refresh') || 'Refresh')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ Enterprise-Grade Responsive Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="overflow-hidden border border-blue-200/50 dark:border-blue-700/50 shadow-xl bg-gradient-to-br from-blue-50/90 via-blue-100/70 to-indigo-50/90 dark:from-blue-500 dark:via-blue-600 dark:to-purple-600 text-blue-900 dark:text-white backdrop-blur-sm transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/40 dark:hover:shadow-blue-500/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-blue-100/80 dark:bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-blue-200/50 dark:border-white/30 shadow-lg flex-shrink-0">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-blue-700/80 dark:text-white/80 text-xs sm:text-sm font-medium truncate">{t('totalMembers') || 'Total Members'}</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-white">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-emerald-200/50 dark:border-emerald-700/50 shadow-xl bg-gradient-to-br from-emerald-50/90 via-emerald-100/70 to-teal-50/90 dark:from-emerald-500 dark:via-emerald-600 dark:to-teal-600 text-emerald-900 dark:text-white backdrop-blur-sm transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-200/40 dark:hover:shadow-emerald-500/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-emerald-100/80 dark:bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-emerald-200/50 dark:border-white/30 shadow-lg flex-shrink-0">
                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-emerald-700/80 dark:text-white/80 text-xs sm:text-sm font-medium truncate">{t('totalPoints') || 'Total Points'}</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-white">
                  <bdi dir="ltr">{stats.totalPointsAwarded.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</bdi>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-orange-200/50 dark:border-orange-700/50 shadow-xl bg-gradient-to-br from-orange-50/90 via-orange-100/70 to-amber-50/90 dark:from-orange-500 dark:via-orange-600 dark:to-red-600 text-orange-900 dark:text-white backdrop-blur-sm transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-200/40 dark:hover:shadow-orange-500/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-orange-100/80 dark:bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-orange-200/50 dark:border-white/30 shadow-lg flex-shrink-0">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600 dark:text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-orange-700/80 dark:text-white/80 text-xs sm:text-sm font-medium truncate">{t('averageScore') || 'Average Score'}</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-white">{stats.averageScore.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      
        <Card className="overflow-hidden border border-pink-200/50 dark:border-pink-700/50 shadow-xl bg-gradient-to-br from-pink-50/90 via-pink-100/70 to-rose-50/90 dark:from-pink-500 dark:via-pink-600 dark:to-purple-600 text-pink-900 dark:text-white backdrop-blur-sm transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-200/40 dark:hover:shadow-pink-500/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-pink-100/80 dark:bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-pink-200/50 dark:border-white/30 shadow-lg flex-shrink-0">
                <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-pink-700/80 dark:text-white/80 text-xs sm:text-sm font-medium truncate">{t('topPerformer') || 'Top Performer'}</p>
                <p className="text-lg sm:text-xl font-bold truncate text-pink-900 dark:text-white">{stats.topPerformer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Enterprise-Grade Responsive Period Selection Tabs */}
      <Tabs value={selectedPeriod} onValueChange={handlePeriodChange} className="w-full">
        <TabsList className="grid w-full h-auto grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 bg-gradient-to-r from-white/80 via-slate-50/90 to-white/80 dark:from-slate-800 dark:via-gray-800 dark:to-slate-800 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30 mb-4 overflow-visible">
          <TabsTrigger 
            value="daily" 
            className="text-xs sm:text-sm relative overflow-visible rounded-lg sm:rounded-xl bg-white/60 dark:bg-transparent border border-gray-200/40 dark:border-transparent text-gray-700 dark:text-gray-300 hover:bg-white/80 hover:border-gray-300/60 dark:hover:bg-gray-700/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-md transition-all duration-300 py-2 px-2 sm:px-3 flex items-center justify-center h-8"
            disabled
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 w-full h-full">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 opacity-50 flex-shrink-0" />
              <span className="opacity-50 text-xs sm:text-sm truncate">{t('daily') || 'Daily'}</span>
            </div>
            <SoonBadge {...SoonBadgePresets.leaderboardTab} position="top-center" className={'sm:-translate-x-[350%] sm:-left-1/2 -left-1/2 sm:-top-8'}   />
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className="text-xs sm:text-sm relative overflow-visible rounded-lg sm:rounded-xl bg-white/60 dark:bg-transparent border border-gray-200/40 dark:border-transparent text-gray-700 dark:text-gray-300 hover:bg-white/80 hover:border-gray-300/60 dark:hover:bg-gray-700/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-md transition-all duration-300 py-2 px-2 sm:px-3 flex items-center justify-center h-8"
            disabled
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 w-full h-full">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 opacity-50 flex-shrink-0" />
              <span className="opacity-50 text-xs sm:text-sm truncate">{t('weekly') || 'Weekly'}</span>
            </div>
            <SoonBadge {...SoonBadgePresets.leaderboardTab} position="top-center" className={'sm:-translate-x-[350%] sm:-left-1/2 -left-1/2 sm:-top-8'} />
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="text-xs sm:text-sm relative overflow-visible rounded-lg sm:rounded-xl bg-white/60 dark:bg-transparent border border-gray-200/40 dark:border-transparent text-gray-700 dark:text-gray-300 hover:bg-white/80 hover:border-gray-300/60 dark:hover:bg-gray-700/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-md transition-all duration-300 py-2 px-2 sm:px-3 flex items-center justify-center h-8"
            disabled
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 w-full h-full">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 opacity-50 flex-shrink-0" />
              <span className="opacity-50 text-xs sm:text-sm truncate">{t('monthly') || 'Monthly'}</span>
            </div>
            <SoonBadge {...SoonBadgePresets.leaderboardTab} position="top-center" className={'sm:-translate-x-[350%] sm:-left-1/2 -left-1/2 sm:-top-8'} />
          </TabsTrigger>
          <TabsTrigger 
            value="all-time" 
            className="text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white/60 dark:bg-transparent border border-gray-200/40 dark:border-transparent text-gray-700 dark:text-gray-300 hover:bg-white/80 hover:border-gray-300/60 dark:hover:bg-gray-700/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg transition-all duration-300 font-semibold py-2 px-2 sm:px-3 col-span-2 sm:col-span-1 flex items-center justify-center h-8"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-w-0 w-full h-full">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{t('allTime') || 'All Time'}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
          {/* ✅ Enterprise-Grade Responsive Leaderboard Rankings */}
          <Card className="overflow-hidden border border-gray-200/60 dark:border-gray-700/60 shadow-2xl bg-gradient-to-br from-white/95 via-slate-50/80 to-white/95 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-b border-white/20 p-4 sm:p-6">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3 text-xl sm:text-2xl">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 flex-shrink-0">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                  </div>
                  <span className="font-bold truncate">{t('rankings') || 'Rankings'}</span>
                </div>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-lg w-fit">
                  🏆 {leaderboard.length} {t('members') || 'members'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <AnimatePresence>
                  {leaderboard.map((member, index) => {
                    // ✅ Enterprise-Grade Light/Dark Adaptive Rank Styling
                    const getRankGradient = (rank: number) => {
                      switch (rank) {
                        case 1:
                          return 'bg-gradient-to-br from-yellow-100/80 via-yellow-200/60 to-orange-100/80 dark:from-yellow-500 dark:via-orange-600 dark:to-red-600 border-yellow-300/80 dark:border-yellow-400/60 shadow-lg shadow-yellow-300/50 dark:shadow-yellow-500/30';
                        case 2:
                          return 'bg-gradient-to-br from-gray-100/80 via-gray-200/60 to-slate-100/80 dark:from-gray-400 dark:via-gray-500 dark:to-gray-700 border-gray-300/80 dark:border-gray-400/60 shadow-lg shadow-gray-300/50 dark:shadow-gray-500/30';
                        case 3:
                          return 'bg-gradient-to-br from-amber-100/80 via-amber-200/60 to-orange-100/80 dark:from-amber-600 dark:via-orange-700 dark:to-red-700 border-amber-300/80 dark:border-amber-400/60 shadow-lg shadow-amber-300/50 dark:shadow-amber-500/30';
                        default:
                          return 'bg-gradient-to-br from-blue-100/80 via-indigo-100/60 to-purple-100/80 dark:from-blue-500 dark:via-indigo-600 dark:to-purple-700 border-blue-300/80 dark:border-blue-400/60 shadow-lg shadow-blue-300/50 dark:shadow-blue-500/20';
                      }
                    };

                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <Card className={`${getRankGradient(member.rank)} border-2 transition-all duration-300 hover:shadow-2xl transform`}>
                          <CardContent className="p-3 sm:p-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm m-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60 shadow-inner shadow-gray-100/50 dark:shadow-gray-900/50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                              {/* ✅ Enterprise Responsive Rank Indicator */}
                              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                <motion.div
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  className="relative flex-shrink-0"
                                >
                                  {renderRankIndicator(member.rank)}
                                  <div className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-300 bg-white/90 dark:bg-gray-800/80 rounded-full px-1 sm:px-1.5 py-0.5 shadow-md border border-gray-300/60 dark:border-gray-600/50">
                                    #{member.rank}
                                  </div>
                                </motion.div>

                                {/* ✅ Enhanced Responsive Avatar */}
                                <motion.div whileHover={{ scale: 1.1 }} className="flex-shrink-0">
                                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 sm:border-3 border-white dark:border-gray-700 shadow-lg ring-1 sm:ring-2 ring-gray-200/50 dark:ring-gray-600/50">
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold text-sm sm:text-lg">
                                      {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </motion.div>

                                {/* ✅ Mobile-Optimized Member Name & Score */}
                                <div className="flex-1 min-w-0 sm:hidden">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
                                      {member.name}
                                    </h3>
                                    <motion.div 
                                      whileHover={{ scale: 1.05 }}
                                      className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                                    >
                                      <bdi dir="ltr">{member.totalScore.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</bdi>
                                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                                    </motion.div>
                                  </div>
                                </div>
                              </div>

                              {/* ✅ Desktop Member Info */}
                              <div className="flex-1 min-w-0 hidden sm:block">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 truncate">
                                    {member.name}
                                  </h3>
                                  {!member.isActive && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                      {t('inactive') || 'Inactive'}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4 mb-3">
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                                  >
                                    <bdi dir="ltr">{member.totalScore.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</bdi>
                                    <span className="text-sm text-muted-foreground ml-1">
                                      {t('points') || 'pts'}
                                    </span>
                                  </motion.div>
                                  {renderTrendIndicator(member.periodStats.trend, member.periodStats.trendPercentage)}
                                </div>

                                {/* ✅ Enhanced Achievement Badges - Responsive */}
                                {member.achievements.badges.length > 0 && (
                                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
                                    {member.achievements.badges.slice(0, 3).map((badge) => renderBadge(badge))}
                                    {member.achievements.badges.length > 3 && (
                                      <Badge className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white border-0 text-[10px] sm:text-xs shadow-lg px-1 sm:px-2">
                                        +{member.achievements.badges.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* ✅ Enterprise-Grade Responsive Score Breakdown */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-sm mb-3">
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-2 sm:p-3 bg-gradient-to-br from-green-50/90 via-green-100/80 to-emerald-50/90 dark:from-green-800/30 dark:to-emerald-800/30 rounded-lg shadow-sm border border-green-200/60 dark:border-green-700/50 backdrop-blur-sm"
                                  >
                                    <div className="font-bold text-green-800 dark:text-green-300 text-sm sm:text-base">
                                      {member.scoreBreakdown.taskScore}
                                    </div>
                                    <div className="text-green-700 dark:text-green-400 text-[10px] sm:text-xs font-medium">
                                      {t('tasks') || 'Tasks'}
                                    </div>
                                  </motion.div>
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-2 sm:p-3 bg-gradient-to-br from-blue-50/90 via-blue-100/80 to-cyan-50/90 dark:from-blue-800/30 dark:to-cyan-800/30 rounded-lg shadow-sm border border-blue-200/60 dark:border-blue-700/50 backdrop-blur-sm"
                                  >
                                    <div className="font-bold text-blue-800 dark:text-blue-300 text-sm sm:text-base">
                                      {member.scoreBreakdown.adjustmentScore}
                                    </div>
                                    <div className="text-blue-700 dark:text-blue-400 text-[10px] sm:text-xs font-medium">
                                      {t('adjustments') || 'Adjustments'}
                                    </div>
                                  </motion.div>
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-2 sm:p-3 bg-gradient-to-br from-purple-50/90 via-purple-100/80 to-pink-50/90 dark:from-purple-800/30 dark:to-pink-800/30 rounded-lg shadow-sm border border-purple-200/60 dark:border-purple-700/50 backdrop-blur-sm"
                                  >
                                    <div className="font-bold text-purple-800 dark:text-purple-300 text-sm sm:text-base">
                                      {member.achievements.totalTasksCompleted}
                                    </div>
                                    <div className="text-purple-700 dark:text-purple-400 text-[10px] sm:text-xs font-medium">
                                      {t('completed') || 'Completed'}
                                    </div>
                                  </motion.div>
                                </div>

                                {/* ✅ Enhanced Progress Bar - Real Task Completion */}
                                {member.totalPossibleScore > 0 && (
                                  <div className="mt-3 sm:mt-4">
                                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                                      <span className="font-medium">{t('taskProgress') || 'Task Progress'}</span>
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {Math.round((member.totalScore / member.totalPossibleScore) * 100)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (member.totalScore / member.totalPossibleScore) * 100)}%` }}
                                        transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1">
                                      <span>{member.totalScore} {t('ptsEarned') || 'pts earned'}</span>
                                      <span>{member.totalPossibleScore} {t('ptsPossible') || 'pts possible'}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ✅ Mobile-Only Score Breakdown - Full Width Stacked Layout */}
                              <div className="w-full sm:hidden mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                                {/* Mobile Achievement Badges */}
                                {member.achievements.badges.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {member.achievements.badges.slice(0, 2).map((badge) => renderBadge(badge))}
                                    {member.achievements.badges.length > 2 && (
                                      <Badge className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white border-0 text-[10px] shadow-lg px-1">
                                        +{member.achievements.badges.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Mobile Score Breakdown Grid */}
                                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                                  <div className="text-center p-2 bg-gradient-to-br from-green-50/90 to-emerald-50/90 dark:from-green-800/30 dark:to-emerald-800/30 rounded-lg border border-green-200/60 dark:border-green-700/50">
                                    <div className="font-bold text-green-800 dark:text-green-300 text-sm">
                                      {member.scoreBreakdown.taskScore}
                                    </div>
                                    <div className="text-green-700 dark:text-green-400 text-[10px] font-medium">
                                      {t('tasks') || 'Tasks'}
                                    </div>
                                  </div>
                                  <div className="text-center p-2 bg-gradient-to-br from-blue-50/90 to-cyan-50/90 dark:from-blue-800/30 dark:to-cyan-800/30 rounded-lg border border-blue-200/60 dark:border-blue-700/50">
                                    <div className="font-bold text-blue-800 dark:text-blue-300 text-sm">
                                      {member.scoreBreakdown.adjustmentScore}
                                    </div>
                                    <div className="text-blue-700 dark:text-blue-400 text-[10px] font-medium">
                                      {t('adjustments') || 'Adj'}
                                    </div>
                                  </div>
                                  <div className="text-center p-2 bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-purple-800/30 dark:to-pink-800/30 rounded-lg border border-purple-200/60 dark:border-purple-700/50">
                                    <div className="font-bold text-purple-800 dark:text-purple-300 text-sm">
                                      {member.achievements.totalTasksCompleted}
                                    </div>
                                    <div className="text-purple-700 dark:text-purple-400 text-[10px] font-medium">
                                      {t('completed') || 'Done'}
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile Progress Bar */}
                                {member.totalPossibleScore > 0 && (
                                  <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                      <span className="font-medium">{t('taskProgress') || 'Progress'}</span>
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {Math.round((member.totalScore / member.totalPossibleScore) * 100)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden shadow-inner">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (member.totalScore / member.totalPossibleScore) * 100)}%` }}
                                        transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                      <span>{member.totalScore} {t('earned') || 'earned'}</span>
                                      <span>{member.totalPossibleScore} {t('possible') || 'possible'}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {leaderboard.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="relative mb-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm animate-bounce">
                      !
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    {t('noData') || 'No Rankings Available'}
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-md mx-auto mb-6">
                    {t('noDataDescription') || 'Complete some tasks to see rankings here!'}
                  </p>
                  <div className="flex justify-center gap-3">
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg">
                      🚀 {t('startCompletingTasks') || 'Start Completing Tasks'}
                    </Badge>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg">
                      🏆 {t('earnPoints') || 'Earn Points'}
                    </Badge>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* ✅ Enterprise-Grade Adaptive Insights Card */}
          {stats.mostImproved && (
            <Card className="overflow-hidden border border-gray-200/60 dark:border-gray-700/60 shadow-2xl bg-gradient-to-br from-white/95 via-slate-50/80 to-white/95 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white border-b border-white/20">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                    <TrendingUp className="w-6 h-6 text-emerald-200" />
                  </div>
                  <span className="font-bold">{t('insights') || 'Insights'}</span>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1 text-sm font-semibold shadow-lg">
                    📈 {t('performanceAnalytics') || 'Performance Analytics'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="p-6 bg-gradient-to-br from-green-50/80 via-green-100/60 to-emerald-50/80 dark:from-green-800/30 dark:via-green-700/20 dark:to-emerald-800/30 rounded-xl shadow-lg border border-green-200/70 dark:border-green-700/50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg shadow-md border border-green-400/50 dark:border-green-500/50">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-lg text-green-800 dark:text-green-200">{t('mostImproved') || 'Most Improved'}</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">{stats.mostImproved}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">{t('leadingImprovementCharts')}</p>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="p-6 bg-gradient-to-br from-blue-50/80 via-blue-100/60 to-cyan-50/80 dark:from-blue-800/30 dark:via-blue-700/20 dark:to-cyan-800/30 rounded-xl shadow-lg border border-blue-200/70 dark:border-blue-700/50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg shadow-md border border-blue-400/50 dark:border-blue-500/50">
                        <Flame className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-lg text-blue-800 dark:text-blue-200">{t('competition') || 'Competition Level'}</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 capitalize mb-2">
                      {stats.competitionLevel}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {stats.competitionLevel === 'high' ? t('fiercerCompetition') : 
                       stats.competitionLevel === 'medium' ? t('healthyRivalry') : 
                       t('roomForEngagement')}
                    </p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ✅ Enterprise-Grade LastUpdated Component */}
      <LastUpdated 
        timestamp={leaderboardData.lastUpdated}
        size="md"
        variant="muted"
        className="mt-4"
      />
    </div>
  );
}
