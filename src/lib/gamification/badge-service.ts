/**
 * 🚀 Enterprise Badge Service
 * ===========================
 *
 * Principal Engineer Implementation
 * Complete badge management system with Redis integration
 *
 * Features:
 * - 📊 Real-time progress tracking
 * - 🔓 Intelligent unlock system
 * - 📈 Performance analytics
 * - 🎯 Smart recommendations
 */

import { BADGE_REGISTRY, BadgeUtils } from "./badge-definitions";
import {
  BadgeDefinition,
  BadgeProgress,
  BadgeCollection,
  BadgeAnalytics,
  BadgeCategory,
  BadgeRarity,
} from "@/types/badges";

// ✅ Redis Connection (assumes existing pattern)
import { getRedis } from "@/lib/redis";
import {Redis} from "@upstash/redis";

export class BadgeService {
  private redis: Redis;

  constructor() {
    this.redis = getRedis();
  }

  // ✅ CORE PROGRESS TRACKING

  /**
   * Get user's complete badge collection
   */
  async getUserBadgeCollection(userId: string): Promise<BadgeCollection> {
    try {
      const [earnedData, progressData, analyticsData] = await Promise.all([
        this.redis.hget(`user:${userId}:badges`, "earned"),
        this.redis.hget(`user:${userId}:badges`, "progress"),
        this.redis.hget(`user:${userId}:badges`, "analytics"),
      ]);

      const earned = earnedData ? JSON.parse(earnedData) : [];
      const progress = progressData ? JSON.parse(progressData) : {};
      const analytics = analyticsData
        ? JSON.parse(analyticsData)
        : this.createDefaultAnalytics();

      return {
        userId,
        earnedBadges: earned,
        progress: this.buildProgressMap(progress),
        statistics: this.calculateStatistics(earned),
        analytics,
        lastUpdated: new Date().toISOString(),
        totalPoints: this.calculateTotalPoints(earned),
      };
    } catch (error) {
      console.error("❌ Error fetching badge collection:", error);
      return this.createEmptyCollection(userId);
    }
  }

  /**
   * Track user action and update badge progress
   */
  async trackProgress(
    userId: string,
    action: string,
    data: any
  ): Promise<string[]> {
    const newlyEarnedBadges: string[] = [];

    try {
      // Get current progress
      const collection = await this.getUserBadgeCollection(userId);

      // Update progress for relevant badges
      for (const badge of BADGE_REGISTRY) {
        if (
          !badge.isActive ||
          collection.earnedBadges.some((eb) => eb.badgeId === badge.id)
        ) {
          continue; // Skip inactive or already earned badges
        }

        const updated = await this.updateBadgeProgress(
          userId,
          badge,
          action,
          data,
          collection
        );
        if (updated) {
          newlyEarnedBadges.push(badge.id);
        }
      }

      // Update analytics
      await this.updateAnalytics(userId, action, data, newlyEarnedBadges);

      return newlyEarnedBadges;
    } catch (error) {
      console.error("❌ Error tracking progress:", error);
      return [];
    }
  }

  /**
   * Update progress for a specific badge
   */
  private async updateBadgeProgress(
    userId: string,
    badge: BadgeDefinition,
    action: string,
    data: any,
    collection: BadgeCollection
  ): Promise<boolean> {
    const currentProgress =
      collection.progress.get(badge.id) || this.createInitialProgress(badge);

    // Calculate new progress based on badge criteria
    const newProgress = this.calculateProgress(
      badge,
      action,
      data,
      currentProgress
    );

    // Check if badge should be unlocked
    if (
      newProgress.currentValue >= badge.criteria.target &&
      !newProgress.isEarned
    ) {
      await this.unlockBadge(userId, badge, newProgress);
      return true;
    }

    // Save updated progress
    if (newProgress.currentValue !== currentProgress.currentValue) {
      await this.saveProgress(userId, badge.id, newProgress);
    }

    return false;
  }

  /**
   * Calculate progress based on badge criteria
   */
  private calculateProgress(
    badge: BadgeDefinition,
    action: string,
    data: any,
    currentProgress: BadgeProgress
  ): BadgeProgress {
    const { criteria } = badge;
    let newValue = currentProgress.currentValue;

    switch (criteria.type) {
      case "count":
        if (this.actionMatchesCriteria(action, badge)) {
          newValue += 1;
        }
        break;

      case "score":
        if (action === "score_earned" && data.points) {
          newValue += data.points;
        }
        break;

      case "streak":
        if (action === "streak_updated" && data.streakCount) {
          newValue = Math.max(newValue, data.streakCount);
        }
        break;

      case "percentage":
        if (action === "week_completed" && data.completionRate) {
          newValue = data.completionRate;
        }
        break;

      case "custom":
        newValue = this.handleCustomCriteria(
          badge,
          action,
          data,
          currentProgress
        );
        break;
    }

    return {
      ...currentProgress,
      currentValue: Math.min(newValue, criteria.target),
      percentage: Math.min((newValue / criteria.target) * 100, 100),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Handle custom badge criteria
   */
  private handleCustomCriteria(
    badge: BadgeDefinition,
    action: string,
    data: any,
    currentProgress: BadgeProgress
  ): number {
    switch (badge.id) {
      case "rising_star":
        return action === "leaderboard_updated" && data.position <= 3
          ? 1
          : currentProgress.currentValue;

      case "leaderboard_king":
        return action === "leaderboard_updated" && data.position === 1
          ? 1
          : currentProgress.currentValue;

      case "comeback_kid":
        return action === "return_after_absence" && data.daysAway >= 7
          ? 1
          : currentProgress.currentValue;

      case "speed_demon":
        return action === "daily_tasks_completed" && data.count >= 5
          ? 1
          : currentProgress.currentValue;

      case "morning_bird":
        return action === "task_completed" && data.hour < 9
          ? currentProgress.currentValue + 1
          : currentProgress.currentValue;

      case "night_owl":
        return action === "task_completed" && data.hour >= 21
          ? currentProgress.currentValue + 1
          : currentProgress.currentValue;

      default:
        return currentProgress.currentValue;
    }
  }

  /**
   * Check if action matches badge criteria
   */
  private actionMatchesCriteria(
    action: string,
    badge: BadgeDefinition
  ): boolean {
    const criteriaMap: Record<string, string[]> = {
      task_completed: [
        "first_task",
        "task_veteran_10",
        "task_champion_50",
        "task_legend_100",
        "task_master_250",
        "task_deity_500",
      ],
      daily_streak: [
        "daily_streak_3",
        "daily_streak_7",
        "daily_streak_30",
        "daily_streak_100",
      ],
    };

    return criteriaMap[action]?.includes(badge.id) || false;
  }

  /**
   * Unlock a badge for the user
   */
  private async unlockBadge(
    userId: string,
    badge: BadgeDefinition,
    progress: BadgeProgress
  ): Promise<void> {
    const earnedBadge = {
      badgeId: badge.id,
      earnedAt: new Date().toISOString(),
      progress: { ...progress, isEarned: true },
    };

    // Get current earned badges
    const currentEarned = await this.redis.hget(
      `user:${userId}:badges`,
      "earned"
    );
    const earnedBadges = currentEarned ? JSON.parse(currentEarned) : [];

    // Add new badge
    earnedBadges.push(earnedBadge);

    // Save to Redis
    await Promise.all([
      this.redis.hset(
        `user:${userId}:badges`,
        "earned",
        JSON.stringify(earnedBadges)
      ),
      this.redis.lpush(
        `user:${userId}:badge_notifications`,
        JSON.stringify({
          badgeId: badge.id,
          type: "unlock",
          timestamp: new Date().toISOString(),
          seen: false,
        })
      ),
    ]);

    console.log(`🏆 Badge unlocked: ${badge.name} for user ${userId}`);
  }

  // ✅ ANALYTICS & INSIGHTS

  /**
   * Update user analytics
   */
  private async updateAnalytics(
    userId: string,
    action: string,
    data: any,
    newBadges: string[]
  ): Promise<void> {
    const currentAnalytics = await this.redis.hget(
      `user:${userId}:badges`,
      "analytics"
    );
    const analytics = currentAnalytics
      ? JSON.parse(currentAnalytics)
      : this.createDefaultAnalytics();

    // Update engagement metrics
    analytics.totalInteractions += 1;
    analytics.lastActive = new Date().toISOString();

    if (newBadges.length > 0) {
      analytics.badgesEarnedToday += newBadges.length;
      analytics.currentStreak = this.calculateStreak(analytics);
    }

    // Update session data
    if (!analytics.sessionsToday || !this.isSameDay(analytics.lastActive)) {
      analytics.sessionsToday = 1;
      analytics.badgesEarnedToday = newBadges.length;
    }

    await this.redis.hset(
      `user:${userId}:badges`,
      "analytics",
      JSON.stringify(analytics)
    );
  }

  /**
   * Get badge recommendations for user
   */
  async getRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<BadgeDefinition[]> {
    const collection = await this.getUserBadgeCollection(userId);
    const earnedIds = collection.earnedBadges.map((eb) => eb.badgeId);

    return BADGE_REGISTRY.filter(
      (badge) => !earnedIds.includes(badge.id) && badge.isActive
    )
      .sort((a, b) => {
        const progressA = collection.progress.get(a.id)?.percentage || 0;
        const progressB = collection.progress.get(b.id)?.percentage || 0;
        return progressB - progressA; // Sort by progress descending
      })
      .slice(0, limit);
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(
    limit: number = 10
  ): Promise<Array<{ userId: string; points: number; badgeCount: number }>> {
    try {
      // Get all users with badge data
      const userKeys = await this.redis.keys("user:*:badges");
      const leaderboardData = [];

      for (const key of userKeys) {
        const userId = key.split(":")[1];
        const collection = await this.getUserBadgeCollection(userId);

        leaderboardData.push({
          userId,
          points: collection.totalPoints,
          badgeCount: collection.earnedBadges.length,
        });
      }

      return leaderboardData
        .sort((a, b) => b.points - a.points)
        .slice(0, limit);
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error);
      return [];
    }
  }

  // ✅ UTILITY FUNCTIONS

  private createInitialProgress(badge: BadgeDefinition): BadgeProgress {
    return {
      badgeId: badge.id,
      currentValue: 0,
      targetValue: badge.criteria.target,
      percentage: 0,
      milestones: [],
      isEarned: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  private createDefaultAnalytics(): BadgeAnalytics {
    return {
      totalInteractions: 0,
      sessionsToday: 0,
      badgesEarnedToday: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActive: new Date().toISOString(),
      favoriteCategory: "achievement",
      averageTimeToEarn: 0,
      completionRate: 0,
    };
  }

  private createEmptyCollection(userId: string): BadgeCollection {
    return {
      userId,
      earnedBadges: [],
      progress: new Map(),
      statistics: {
        totalBadges: 0,
        totalPoints: 0,
        commonBadges: 0,
        uncommonBadges: 0,
        rareBadges: 0,
        epicBadges: 0,
        legendaryBadges: 0,
        mythicalBadges: 0,
        categoryCounts: {
          achievement: 0,
          streak: 0,
          performance: 0,
          milestone: 0,
          social: 0,
          seasonal: 0,
          special: 0,
        },
      },
      analytics: this.createDefaultAnalytics(),
      lastUpdated: new Date().toISOString(),
      totalPoints: 0,
    };
  }

  private buildProgressMap(progressData: any): Map<string, BadgeProgress> {
    const progressMap = new Map();

    for (const badge of BADGE_REGISTRY) {
      const existing = progressData[badge.id];
      progressMap.set(badge.id, existing || this.createInitialProgress(badge));
    }

    return progressMap;
  }

  private calculateStatistics(earnedBadges: any[]) {
    const stats = {
      totalBadges: earnedBadges.length,
      totalPoints: 0,
      commonBadges: 0,
      uncommonBadges: 0,
      rareBadges: 0,
      epicBadges: 0,
      legendaryBadges: 0,
      mythicalBadges: 0,
      categoryCounts: {
        achievement: 0,
        streak: 0,
        performance: 0,
        milestone: 0,
        social: 0,
        seasonal: 0,
        special: 0,
      },
    };

    for (const earned of earnedBadges) {
      const badge = BadgeUtils.getById(earned.badgeId);
      if (!badge) continue;

      stats.totalPoints += badge.rewards?.points || 0;
      stats[`${badge.rarity}Badges` as keyof typeof stats] =
        (stats[`${badge.rarity}Badges` as keyof typeof stats] as number) + 1;
      stats.categoryCounts[badge.category] += 1;
    }

    return stats;
  }

  private calculateTotalPoints(earnedBadges: any[]): number {
    return earnedBadges.reduce((total, earned) => {
      const badge = BadgeUtils.getById(earned.badgeId);
      return total + (badge?.rewards?.points || 0);
    }, 0);
  }

  private async saveProgress(
    userId: string,
    badgeId: string,
    progress: BadgeProgress
  ): Promise<void> {
    const currentProgressData = await this.redis.hget(
      `user:${userId}:badges`,
      "progress"
    );
    const progressData = currentProgressData
      ? JSON.parse(currentProgressData)
      : {};

    progressData[badgeId] = progress;

    await this.redis.hset(
      `user:${userId}:badges`,
      "progress",
      JSON.stringify(progressData)
    );
  }

  private calculateStreak(analytics: BadgeAnalytics): number {
    // Simplified streak calculation - would need more sophisticated logic
    return analytics.currentStreak + 1;
  }

  private isSameDay(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
}

// ✅ SINGLETON INSTANCE
export const badgeService = new BadgeService();

// ✅ CONVENIENCE FUNCTIONS
export const trackUserProgress = (
  userId: string,
  action: string,
  data: any
) => {
  return badgeService.trackProgress(userId, action, data);
};

export const getUserBadges = (userId: string) => {
  return badgeService.getUserBadgeCollection(userId);
};

export const getBadgeRecommendations = (userId: string, limit?: number) => {
  return badgeService.getRecommendations(userId, limit);
};

export const getBadgeLeaderboard = (limit?: number) => {
  return badgeService.getLeaderboard(limit);
};
