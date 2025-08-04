/**
 * 🚀 Mock Badge Service for Development
 * ====================================
 *
 * Temporary implementation that provides badge functionality
 * without requiring Redis connection
 */

import { BADGE_REGISTRY, BadgeUtils } from "./badge-definitions";
import {
  BadgeDefinition,
  BadgeProgress,
  BadgeCollection,
  BadgeAnalytics,
  BadgeStatistics,
  EarnedBadge,
  BadgeCategory,
  BadgeRarity,
} from "@/types/badges";

export class MockBadgeService {
  // Mock data storage
  private mockUserData: Map<string, any> = new Map();

  constructor() {
    // Initialize with some sample data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Sample earned badges for demonstration
    const sampleEarnedBadges = [
      {
        badgeId: "first_task",
        earnedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        progress: {
          badgeId: "first_task",
          userId: "default",
          currentValue: 1,
          targetValue: 1,
          progress: 100,
          isUnlocked: true,
          unlockedAt: new Date(Date.now() - 86400000).toISOString(),
          milestones: [],
          isNew: false,
          isHighlighted: false,
          lastUpdated: new Date(Date.now() - 86400000).toISOString(),
        },
      },
      {
        badgeId: "task_veteran_10",
        earnedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        progress: {
          badgeId: "task_veteran_10",
          userId: "default",
          currentValue: 10,
          targetValue: 10,
          progress: 100,
          isUnlocked: true,
          unlockedAt: new Date(Date.now() - 3600000).toISOString(),
          milestones: [],
          isNew: true,
          isHighlighted: true,
          lastViewed: new Date(Date.now() - 3600000).toISOString(),
        },
      },
    ];

    // Store for default user
    this.mockUserData.set("default", {
      earned: sampleEarnedBadges,
      progress: {
        task_champion_50: { current: 15, target: 50 },
        daily_streak_3: { current: 2, target: 3 },
        high_scorer_100: { current: 85, target: 100 },
      },
      analytics: this.createDefaultAnalytics(),
    });
  }

  private createDefaultAnalytics(): BadgeAnalytics {
    return {
      badgeId: "general", // For overall analytics
      totalUnlocks: 2,
      unlockRate: 0.12,
      averageTimeToUnlock: 3,
      difficulty: "medium",
      popularityScore: 75,
      motivationImpact: 85,
      unlocksOverTime: [],
      unlocksByUserType: {
        newUsers: 1,
        regularUsers: 1,
        powerUsers: 0,
      },
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
    const progressMap = new Map<string, BadgeProgress>();

    Object.entries(progressData || {}).forEach(
      ([badgeId, data]: [string, any]) => {
        progressMap.set(badgeId, {
          badgeId,
          userId: "default",
          currentValue: data.current || 0,
          targetValue: data.target || 1,
          progress: Math.min(
            ((data.current || 0) / (data.target || 1)) * 100,
            100
          ),
          isUnlocked: (data.current || 0) >= (data.target || 1),
          milestones: [],
          isNew: false,
          isHighlighted: false,
          lastViewed: new Date().toISOString(),
        });
      }
    );

    return progressMap;
  }

  private calculateStatistics(earnedBadges: any[]): BadgeStatistics {
    const stats = {
      totalBadges: earnedBadges.length,
      totalPoints: earnedBadges.reduce((sum, badge) => {
        const badgeDefinition = BadgeUtils.getById(badge.badgeId);
        return sum + (badgeDefinition?.rewards?.points || 0);
      }, 0),
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
      } as Record<BadgeCategory, number>,
    };

    // Calculate rarity and category counts
    earnedBadges.forEach((badge) => {
      const badgeDefinition = BadgeUtils.getById(badge.badgeId);
      if (badgeDefinition) {
        // Count by rarity
        switch (badgeDefinition.rarity) {
          case "common":
            stats.commonBadges++;
            break;
          case "uncommon":
            stats.uncommonBadges++;
            break;
          case "rare":
            stats.rareBadges++;
            break;
          case "epic":
            stats.epicBadges++;
            break;
          case "legendary":
            stats.legendaryBadges++;
            break;
          case "mythical":
            stats.mythicalBadges++;
            break;
        }

        // Count by category
        stats.categoryCounts[badgeDefinition.category]++;
      }
    });

    return stats;
  }

  private calculateTotalPoints(earnedBadges: any[]): number {
    return earnedBadges.reduce((sum, badge) => {
      const badgeDefinition = BadgeUtils.getById(badge.badgeId);
      return sum + (badgeDefinition?.rewards?.points || 0);
    }, 0);
  }

  /**
   * Get user's complete badge collection (Mock Implementation)
   */
  async getUserBadgeCollection(userId: string): Promise<BadgeCollection> {
    try {
      console.log(
        "🎯 [MockBadgeService] Fetching badge collection for user:",
        userId
      );

      const userData =
        this.mockUserData.get(userId) || this.mockUserData.get("default");

      if (!userData) {
        console.log(
          "📝 [MockBadgeService] No data found, returning empty collection"
        );
        return this.createEmptyCollection(userId);
      }

      const { earned, progress, analytics } = userData;

      const collection: BadgeCollection = {
        userId,
        earnedBadges: earned || [],
        progress: this.buildProgressMap(progress || {}),
        statistics: this.calculateStatistics(earned || []),
        analytics: analytics || this.createDefaultAnalytics(),
        lastUpdated: new Date().toISOString(),
        totalPoints: this.calculateTotalPoints(earned || []),
      };

      console.log(
        "✅ [MockBadgeService] Badge collection retrieved successfully:",
        {
          earnedCount: collection.earnedBadges.length,
          progressCount: collection.progress.size,
          totalPoints: collection.totalPoints,
        }
      );

      return collection;
    } catch (error) {
      console.error(
        "❌ [MockBadgeService] Error fetching badge collection:",
        error
      );
      return this.createEmptyCollection(userId);
    }
  }

  /**
   * Track user progress (Mock Implementation)
   */
  async trackProgress(
    userId: string,
    action: string,
    data: any
  ): Promise<string[]> {
    console.log("🎯 [MockBadgeService] Tracking progress:", {
      userId,
      action,
      data,
    });

    // For now, just return empty array (no new badges earned)
    // In a real implementation, this would check criteria and award badges
    return [];
  }

  /**
   * Get recommendations (Mock Implementation)
   */
  async getRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<BadgeDefinition[]> {
    console.log(
      "🎯 [MockBadgeService] Getting recommendations for user:",
      userId
    );

    // Return first few available badges as recommendations
    return BADGE_REGISTRY.filter((badge) => badge.isActive && badge.isVisible)
      .sort((a, b) => a.criteria.target - b.criteria.target)
      .slice(0, limit);
  }

  /**
   * Get leaderboard (Mock Implementation)
   */
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    console.log("🎯 [MockBadgeService] Getting badge leaderboard");

    // Return mock leaderboard data
    return [
      { userId: "user1", totalBadges: 15, totalPoints: 750, rank: 1 },
      { userId: "user2", totalBadges: 12, totalPoints: 600, rank: 2 },
      { userId: "user3", totalBadges: 8, totalPoints: 400, rank: 3 },
    ];
  }
}

// Create singleton instance
const mockBadgeService = new MockBadgeService();

// Export the same interface as the real badge service
export const trackUserProgress = (
  userId: string,
  action: string,
  data: any
) => {
  console.log("🎯 [MockBadgeService] trackUserProgress called");
  return mockBadgeService.trackProgress(userId, action, data);
};

export const getUserBadges = (userId: string) => {
  console.log("🎯 [MockBadgeService] getUserBadges called for:", userId);
  return mockBadgeService.getUserBadgeCollection(userId);
};

export const getBadgeRecommendations = (userId: string, limit?: number) => {
  console.log("🎯 [MockBadgeService] getBadgeRecommendations called");
  return mockBadgeService.getRecommendations(userId, limit);
};

export const getBadgeLeaderboard = (limit?: number) => {
  console.log("🎯 [MockBadgeService] getBadgeLeaderboard called");
  return mockBadgeService.getLeaderboard(limit);
};

export default mockBadgeService;
