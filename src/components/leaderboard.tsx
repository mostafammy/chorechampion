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
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';
import LoadingSpinner from '@/components/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { IS_DEV } from '@/lib/utils';
import { useAppContext } from '@/context/app-provider';
import { initialMembers } from '@/data/seed'; // ✅ ADD: Import members data

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

// ✅ Achievement badge configuration
const BADGE_CONFIG = {
  champion: { icon: Crown, color: "bg-gradient-to-r from-yellow-400 to-yellow-600", label: "Champion" },
  achiever: { icon: Trophy, color: "bg-gradient-to-r from-blue-400 to-blue-600", label: "Achiever" },
  starter: { icon: Star, color: "bg-gradient-to-r from-green-400 to-green-600", label: "Starter" },
  leader: { icon: Crown, color: "bg-gradient-to-r from-purple-400 to-purple-600", label: "Leader" },
  "top-performer": { icon: Medal, color: "bg-gradient-to-r from-orange-400 to-orange-600", label: "Top Performer" },
  consistent: { icon: Target, color: "bg-gradient-to-r from-teal-400 to-teal-600", label: "Consistent" },
  dedicated: { icon: Shield, color: "bg-gradient-to-r from-red-400 to-red-600", label: "Dedicated" },
  "bonus-earner": { icon: Zap, color: "bg-gradient-to-r from-pink-400 to-pink-600", label: "Bonus Earner" },
  "task-master": { icon: Award, color: "bg-gradient-to-r from-indigo-400 to-indigo-600", label: "Task Master" },
};

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
    
    // Simulate refresh animation
    setTimeout(() => {
      setRefreshing(false);
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

  // ✅ Render achievement badge
  const renderBadge = (badgeType: string) => {
    const config = BADGE_CONFIG[badgeType as keyof typeof BADGE_CONFIG];
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
    <div className="container mx-auto space-y-6">
      {refreshing && <LoadingSpinner />}
      
      {/* ✅ Enhanced Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-2xl translate-y-36 -translate-x-36"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Trophy className="w-8 h-8 text-yellow-300" />
              </div>
              <h1 className="text-5xl font-bold font-headline bg-gradient-to-r from-yellow-300 via-white to-yellow-300 bg-clip-text text-transparent">
                {t('title') || 'Leaderboard'}
              </h1>
            </div>
            <p className="text-white/90 text-lg mb-4">
              {t('description') || 'See how everyone is performing in the chore challenge!'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg">
                📊 All-Time Rankings
              </Badge>
              <Badge className="bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg animate-pulse">
                🚀 Daily/Weekly/Monthly Coming Soon
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRefresh} 
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 transition-all duration-300 shadow-lg"
              disabled={refreshing}
              size="lg"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? (t('refreshing') || 'Refreshing...') : (t('refresh') || 'Refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ Enhanced Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{t('totalMembers') || 'Total Members'}</p>
                <p className="text-3xl font-bold">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Trophy className="w-7 h-7 text-yellow-300" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{t('totalPoints') || 'Total Points'}</p>
                <p className="text-3xl font-bold">{stats.totalPointsAwarded.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-600 text-white transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{t('averageScore') || 'Average Score'}</p>
                <p className="text-3xl font-bold">{stats.averageScore.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white transform hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Flame className="w-7 h-7 text-yellow-300" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{t('topPerformer') || 'Top Performer'}</p>
                <p className="text-xl font-bold truncate">{stats.topPerformer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Enhanced Period Selection Tabs */}
      <Tabs value={selectedPeriod} onValueChange={handlePeriodChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-2 rounded-2xl shadow-lg">
          <TabsTrigger 
            value="daily" 
            className="text-sm relative rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300"
            disabled
          >
            <Calendar className="w-4 h-4 mr-2 opacity-50" />
            <span className="opacity-50">{t('daily') || 'Daily'}</span>
            <Badge className="absolute -top-2 -right-2 text-[10px] px-2 py-1 h-5 bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0 animate-bounce">
              Soon
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className="text-sm relative rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white transition-all duration-300"
            disabled
          >
            <Calendar className="w-4 h-4 mr-2 opacity-50" />
            <span className="opacity-50">{t('weekly') || 'Weekly'}</span>
            <Badge className="absolute -top-2 -right-2 text-[10px] px-2 py-1 h-5 bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0 animate-bounce">
              Soon
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="text-sm relative rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white transition-all duration-300"
            disabled
          >
            <Calendar className="w-4 h-4 mr-2 opacity-50" />
            <span className="opacity-50">{t('monthly') || 'Monthly'}</span>
            <Badge className="absolute -top-2 -right-2 text-[10px] px-2 py-1 h-5 bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0 animate-bounce">
              Soon
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="all-time" 
            className="text-sm rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold"
          >
            <Trophy className="w-4 h-4 mr-2" />
            {t('allTime') || 'All Time'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-4 mt-6">
          {/* ✅ Enhanced Leaderboard Rankings */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
            <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Trophy className="w-6 h-6 text-yellow-300" />
                </div>
                <span className="font-bold">{t('rankings') || 'Rankings'}</span>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-2 text-sm font-semibold">
                  🏆 {leaderboard.length} {t('members') || 'members'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <AnimatePresence>
                  {leaderboard.map((member, index) => {
                    // Enhanced rank styling with colorful gradients
                    const getRankGradient = (rank: number) => {
                      switch (rank) {
                        case 1:
                          return 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 border-yellow-300 shadow-lg shadow-yellow-300/50';
                        case 2:
                          return 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-600 border-gray-300 shadow-lg shadow-gray-300/50';
                        case 3:
                          return 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 border-amber-300 shadow-lg shadow-amber-300/50';
                        default:
                          return 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 border-blue-300 shadow-lg shadow-blue-300/30';
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
                          <CardContent className="p-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm m-1 rounded-lg">
                            <div className="flex items-center gap-4">
                              {/* Enhanced Rank Indicator */}
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative"
                              >
                                {renderRankIndicator(member.rank)}
                                <div className="absolute -top-1 -right-1 text-xs font-bold text-gray-600 dark:text-gray-400">
                                  #{member.rank}
                                </div>
                              </motion.div>

                              {/* Enhanced Avatar */}
                              <motion.div whileHover={{ scale: 1.1 }}>
                                <Avatar className="w-14 h-14 border-3 border-white shadow-lg">
                                  <AvatarImage src={member.avatar} alt={member.name} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold text-lg">
                                    {member.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>

                              {/* Enhanced Member Info */}
                              <div className="flex-1 min-w-0">
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
                                    className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                                  >
                                    {member.totalScore.toLocaleString()}
                                    <span className="text-sm text-muted-foreground ml-1">
                                      {t('points') || 'pts'}
                                    </span>
                                  </motion.div>
                                  {renderTrendIndicator(member.periodStats.trend, member.periodStats.trendPercentage)}
                                </div>

                                {/* Enhanced Achievement Badges */}
                                {member.achievements.badges.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {member.achievements.badges.slice(0, 3).map((badge) => renderBadge(badge))}
                                    {member.achievements.badges.length > 3 && (
                                      <Badge className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white border-0 text-xs shadow-lg">
                                        +{member.achievements.badges.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Enhanced Score Breakdown */}
                                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-800/30 dark:to-emerald-800/30 rounded-lg shadow-sm"
                                  >
                                    <div className="font-bold text-green-700 dark:text-green-300">
                                      {member.scoreBreakdown.taskScore}
                                    </div>
                                    <div className="text-green-600 dark:text-green-400 text-xs">
                                      {t('tasks') || 'Tasks'}
                                    </div>
                                  </motion.div>
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-3 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-800/30 dark:to-cyan-800/30 rounded-lg shadow-sm"
                                  >
                                    <div className="font-bold text-blue-700 dark:text-blue-300">
                                      {member.scoreBreakdown.adjustmentScore}
                                    </div>
                                    <div className="text-blue-600 dark:text-blue-400 text-xs">
                                      {t('adjustments') || 'Adjustments'}
                                    </div>
                                  </motion.div>
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="text-center p-3 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800/30 dark:to-pink-800/30 rounded-lg shadow-sm"
                                  >
                                    <div className="font-bold text-purple-700 dark:text-purple-300">
                                      {member.achievements.totalTasksCompleted}
                                    </div>
                                    <div className="text-purple-600 dark:text-purple-400 text-xs">
                                      {t('completed') || 'Completed'}
                                    </div>
                                  </motion.div>
                                </div>

                                {/* Enhanced Progress Bar - Real Task Completion */}
                                {member.totalPossibleScore > 0 && (
                                  <div className="mt-4">
                                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                      <span className="font-medium">{t('taskProgress') || 'Task Progress'}</span>
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {Math.round((member.totalScore / member.totalPossibleScore) * 100)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (member.totalScore / member.totalPossibleScore) * 100)}%` }}
                                        transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                                      />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                      <span>{member.totalScore} pts earned</span>
                                      <span>{member.totalPossibleScore} pts possible</span>
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
                      🚀 Start Completing Tasks
                    </Badge>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg">
                      🏆 Earn Points
                    </Badge>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* ✅ Additional Stats Card */}
          {stats.mostImproved && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  {t('insights') || 'Insights'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{t('mostImproved') || 'Most Improved'}</span>
                    </div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{stats.mostImproved}</p>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{t('competition') || 'Competition Level'}</span>
                    </div>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 capitalize">
                      {stats.competitionLevel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ✅ Last Updated Info */}
      <div className="text-center text-sm text-muted-foreground">
        {t('lastUpdated') || 'Last updated'}: {new Date(leaderboardData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
