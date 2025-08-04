/**
 * 🏆 Enterprise Badge Definitions
 * ================================
 *
 * Principal Engineer Implementation
 * Comprehensive badge catalog for maximum engagement
 *
 * Features:
 * - 🎯 Multi-tier progression system
 * - 🏅 Diverse achievement categories
 * - 🎨 Rich visual design system
 * - 📊 Performance-based rewards
 */

import {
  Trophy,
  Star,
  Crown,
  Medal,
  Award,
  Zap,
  Flame,
  Target,
  TrendingUp,
  Heart,
  Clock,
  Calendar,
  Sparkles,
  Shield,
  Gem,
  Rocket,
  Mountain,
  Sun,
  Moon,
  Sunrise,
  Users,
  CheckCircle,
  RotateCcw,
  ArrowUp,
  Gift,
  CircuitBoard,
  Palette,
  Briefcase,
  Lightbulb,
  Atom,
  Hexagon,
  Infinity,
} from "lucide-react";

import {
  BadgeDefinition,
  BadgeCategory,
  BadgeRarity,
  BadgeAnimation,
} from "@/types/badges";

// ✅ Color Palettes for Different Rarities
const RARITY_COLORS = {
  common: {
    primary: "#22c55e",
    secondary: "#16a34a",
    background: "#dcfce7",
    text: "#15803d",
  },
  uncommon: {
    primary: "#3b82f6",
    secondary: "#2563eb",
    background: "#dbeafe",
    text: "#1d4ed8",
  },
  rare: {
    primary: "#a855f7",
    secondary: "#9333ea",
    background: "#f3e8ff",
    text: "#7c3aed",
  },
  epic: {
    primary: "#f59e0b",
    secondary: "#d97706",
    background: "#fef3c7",
    text: "#b45309",
  },
  legendary: {
    primary: "#ef4444",
    secondary: "#dc2626",
    background: "#fee2e2",
    text: "#b91c1c",
  },
  mythical: {
    primary: "#8b5cf6",
    secondary: "#7c3aed",
    background: "#ede9fe",
    text: "#6d28d9",
  },
} as const;

// ✅ Helper function to create badge definitions
const createBadge = (
  id: string,
  name: string,
  description: string,
  category: BadgeCategory,
  rarity: BadgeRarity,
  icon: any,
  criteriaType: string,
  target: number,
  animation: BadgeAnimation = "glow",
  timeframe?: string,
  rewards?: any,
  gradient?: string
): BadgeDefinition => ({
  id,
  name,
  description,
  category,
  rarity,
  icon,
  colors: RARITY_COLORS[rarity],
  criteria: {
    type: criteriaType as any,
    target,
    timeframe: timeframe as any,
    description: `${
      criteriaType === "count" ? "Complete" : "Achieve"
    } ${target} ${criteriaType === "score" ? "points" : "tasks"}${
      timeframe ? ` ${timeframe}` : ""
    }`,
  },
  rewards: rewards || {
    points:
      target *
      (rarity === "common"
        ? 1
        : rarity === "uncommon"
        ? 2
        : rarity === "rare"
        ? 5
        : rarity === "epic"
        ? 10
        : rarity === "legendary"
        ? 25
        : 50),
  },
  animation,
  gradient,
  glowIntensity:
    rarity === "mythical"
      ? 100
      : rarity === "legendary"
      ? 80
      : rarity === "epic"
      ? 60
      : 40,
  isVisible: true,
  isActive: true,
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ✅ ACHIEVEMENT BADGES (Task Completion Milestones)
const achievementBadges: BadgeDefinition[] = [
  createBadge(
    "first_task",
    "First Steps",
    "Complete your very first task",
    "achievement",
    "common",
    CheckCircle,
    "count",
    1,
    "bounce",
    undefined,
    { points: 10, title: "Task Rookie", unlocks: ["quick_learner"] }
  ),
  createBadge(
    "task_veteran_10",
    "Task Veteran",
    "Complete 10 tasks - you're getting the hang of it!",
    "achievement",
    "uncommon",
    Trophy,
    "count",
    10,
    "glow",
    undefined,
    { points: 50, title: "Dedicated Helper" }
  ),
  createBadge(
    "task_champion_50",
    "Task Champion",
    "Complete 50 tasks - a true household hero!",
    "achievement",
    "rare",
    Award,
    "count",
    50,
    "shine",
    undefined,
    { points: 200, title: "Household Hero" }
  ),
  createBadge(
    "task_legend_100",
    "Task Legend",
    "Complete 100 tasks - legendary dedication!",
    "achievement",
    "epic",
    Crown,
    "count",
    100,
    "sparkle",
    undefined,
    { points: 500, title: "Chore Legend" }
  ),
  createBadge(
    "task_master_250",
    "Task Master",
    "Complete 250 tasks - you are the ultimate task master!",
    "achievement",
    "legendary",
    Medal,
    "count",
    250,
    "sparkle",
    undefined,
    { points: 1000, title: "Ultimate Task Master" }
  ),
  createBadge(
    "task_deity_500",
    "Task Deity",
    "Complete 500 tasks - transcendent household mastery!",
    "achievement",
    "mythical",
    Infinity,
    "count",
    500,
    "sparkle",
    undefined,
    { points: 2500, title: "Household Deity" }
  ),
];

// ✅ STREAK BADGES (Consistency Rewards)
const streakBadges: BadgeDefinition[] = [
  createBadge(
    "daily_streak_3",
    "Consistent Helper",
    "Complete tasks for 3 days in a row",
    "streak",
    "common",
    Flame,
    "streak",
    3,
    "pulse",
    "daily",
    { points: 30, title: "Consistent Helper" }
  ),
  createBadge(
    "daily_streak_7",
    "Week Warrior",
    "Complete tasks for 7 days straight - a full week!",
    "streak",
    "uncommon",
    Flame,
    "streak",
    7,
    "pulse",
    "daily",
    { points: 70, title: "Week Warrior" }
  ),
  createBadge(
    "daily_streak_30",
    "Monthly Master",
    "Complete tasks for 30 days straight - incredible consistency!",
    "streak",
    "rare",
    Rocket,
    "streak",
    30,
    "glow",
    "daily",
    { points: 300, title: "Consistency Champion" }
  ),
  createBadge(
    "daily_streak_100",
    "Century Streaker",
    "Complete tasks for 100 days straight - legendary consistency!",
    "streak",
    "epic",
    Mountain,
    "streak",
    100,
    "sparkle",
    "daily",
    { points: 1000, title: "Century Champion" }
  ),
  createBadge(
    "perfect_week",
    "Perfect Week",
    "Complete all assigned tasks in a week",
    "streak",
    "rare",
    Star,
    "percentage",
    100,
    "shine",
    "weekly",
    { points: 150, title: "Perfectionist" }
  ),
];

// ✅ PERFORMANCE BADGES (Skill-based Achievements)
const performanceBadges: BadgeDefinition[] = [
  createBadge(
    "high_scorer_100",
    "High Scorer",
    "Earn 100 points in total",
    "performance",
    "uncommon",
    Target,
    "score",
    100,
    "glow",
    "allTime",
    { points: 50, title: "Point Collector" }
  ),
  createBadge(
    "score_crusher_500",
    "Score Crusher",
    "Earn 500 points in total",
    "performance",
    "rare",
    TrendingUp,
    "score",
    500,
    "shine",
    "allTime",
    { points: 150, title: "Score Master" }
  ),
  createBadge(
    "point_legend_1000",
    "Point Legend",
    "Earn 1000 points in total - incredible performance!",
    "performance",
    "epic",
    Gem,
    "score",
    1000,
    "sparkle",
    "allTime",
    { points: 300, title: "Point Legend" }
  ),
  createBadge(
    "speed_demon",
    "Speed Demon",
    "Complete 5 tasks in a single day",
    "performance",
    "rare",
    Zap,
    "count",
    5,
    "pulse",
    "daily",
    { points: 100, title: "Speed Demon" }
  ),
  createBadge(
    "efficiency_expert",
    "Efficiency Expert",
    "Complete 10 tasks in a single day",
    "performance",
    "epic",
    CircuitBoard,
    "count",
    10,
    "sparkle",
    "daily",
    { points: 250, title: "Efficiency Expert" }
  ),
];

// ✅ MILESTONE BADGES (Major Accomplishments)
const milestoneBadges: BadgeDefinition[] = [
  createBadge(
    "rising_star",
    "Rising Star",
    "Reach the top 3 on the leaderboard",
    "milestone",
    "rare",
    Sunrise,
    "custom",
    3,
    "shine",
    undefined,
    { points: 200, title: "Rising Star" }
  ),
  createBadge(
    "leaderboard_king",
    "Leaderboard King",
    "Reach #1 on the leaderboard",
    "milestone",
    "epic",
    Crown,
    "custom",
    1,
    "sparkle",
    undefined,
    { points: 500, title: "Champion" }
  ),
  createBadge(
    "comeback_kid",
    "Comeback Kid",
    "Return to complete tasks after 7+ days away",
    "milestone",
    "uncommon",
    RotateCcw,
    "custom",
    1,
    "bounce",
    undefined,
    { points: 75, title: "Comeback Kid" }
  ),
  createBadge(
    "improvement_master",
    "Improvement Master",
    "Double your previous week's score",
    "milestone",
    "rare",
    ArrowUp,
    "custom",
    1,
    "glow",
    undefined,
    { points: 150, title: "Improvement Master" }
  ),
];

// ✅ SOCIAL BADGES (Community Interaction)
const socialBadges: BadgeDefinition[] = [
  createBadge(
    "team_player",
    "Team Player",
    "Help complete tasks in multiple categories",
    "social",
    "uncommon",
    Users,
    "custom",
    3,
    "glow",
    undefined,
    { points: 100, title: "Team Player" }
  ),
  createBadge(
    "helpful_spirit",
    "Helpful Spirit",
    "Maintain positive contribution for a month",
    "social",
    "rare",
    Heart,
    "custom",
    1,
    "pulse",
    "monthly",
    { points: 200, title: "Helpful Spirit" }
  ),
  createBadge(
    "family_champion",
    "Family Champion",
    "Be the top performer in your household",
    "social",
    "epic",
    Shield,
    "custom",
    1,
    "shine",
    undefined,
    { points: 300, title: "Family Champion" }
  ),
];

// ✅ SEASONAL BADGES (Time-limited Events)
const seasonalBadges: BadgeDefinition[] = [
  createBadge(
    "morning_bird",
    "Morning Bird",
    "Complete tasks before 9 AM",
    "seasonal",
    "uncommon",
    Sun,
    "custom",
    5,
    "glow",
    undefined,
    { points: 75, title: "Early Bird" }
  ),
  createBadge(
    "night_owl",
    "Night Owl",
    "Complete tasks after 9 PM",
    "seasonal",
    "uncommon",
    Moon,
    "custom",
    5,
    "glow",
    undefined,
    { points: 75, title: "Night Owl" }
  ),
  createBadge(
    "weekend_warrior",
    "Weekend Warrior",
    "Complete extra tasks on weekends",
    "seasonal",
    "rare",
    Calendar,
    "custom",
    10,
    "pulse",
    "weekly",
    { points: 150, title: "Weekend Warrior" }
  ),
  createBadge(
    "holiday_helper",
    "Holiday Helper",
    "Complete tasks during holiday periods",
    "seasonal",
    "epic",
    Gift,
    "custom",
    15,
    "sparkle",
    undefined,
    { points: 250, title: "Holiday Helper" }
  ),
];

// ✅ SPECIAL BADGES (Admin/Unique Awards)
const specialBadges: BadgeDefinition[] = [
  createBadge(
    "beta_tester",
    "Beta Tester",
    "Participated in the beta testing program",
    "special",
    "epic",
    Briefcase,
    "custom",
    1,
    "glow",
    undefined,
    { points: 500, title: "Beta Pioneer" }
  ),
  createBadge(
    "feedback_champion",
    "Feedback Champion",
    "Provided valuable feedback to improve the app",
    "special",
    "rare",
    Lightbulb,
    "custom",
    1,
    "shine",
    undefined,
    { points: 200, title: "Feedback Champion" }
  ),
  createBadge(
    "bug_hunter",
    "Bug Hunter",
    "Reported and helped fix app issues",
    "special",
    "epic",
    Atom,
    "custom",
    1,
    "pulse",
    undefined,
    { points: 300, title: "Bug Hunter" }
  ),
  createBadge(
    "innovator",
    "Innovator",
    "Suggested features that were implemented",
    "special",
    "legendary",
    Hexagon,
    "custom",
    1,
    "sparkle",
    undefined,
    { points: 750, title: "Feature Innovator" }
  ),
  createBadge(
    "founder",
    "Founder",
    "One of the first users of ChoreChampion",
    "special",
    "mythical",
    Gem,
    "custom",
    1,
    "sparkle",
    undefined,
    { points: 1000, title: "Founding Member" }
  ),
];

// ✅ Master Badge Registry
export const BADGE_REGISTRY: BadgeDefinition[] = [
  ...achievementBadges,
  ...streakBadges,
  ...performanceBadges,
  ...milestoneBadges,
  ...socialBadges,
  ...seasonalBadges,
  ...specialBadges,
];

// ✅ Badge Categories for Organization
export const BADGE_CATEGORIES = {
  achievement: achievementBadges,
  streak: streakBadges,
  performance: performanceBadges,
  milestone: milestoneBadges,
  social: socialBadges,
  seasonal: seasonalBadges,
  special: specialBadges,
};

// ✅ Badge Utilities
export const BadgeUtils = {
  // Get badges by category
  getByCategory: (category: BadgeCategory): BadgeDefinition[] => {
    return BADGE_CATEGORIES[category] || [];
  },

  // Get badges by rarity
  getByRarity: (rarity: BadgeRarity): BadgeDefinition[] => {
    return BADGE_REGISTRY.filter((badge) => badge.rarity === rarity);
  },

  // Get badge by ID
  getById: (id: string): BadgeDefinition | undefined => {
    return BADGE_REGISTRY.find((badge) => badge.id === id);
  },

  // Get next logical badge in progression
  getNextInSeries: (currentBadgeId: string): BadgeDefinition | undefined => {
    const current = BadgeUtils.getById(currentBadgeId);
    if (!current) return undefined;

    // Find badges in same category with higher targets
    const sameCategoryBadges = BadgeUtils.getByCategory(current.category)
      .filter((badge) => badge.criteria.target > current.criteria.target)
      .sort((a, b) => a.criteria.target - b.criteria.target);

    return sameCategoryBadges[0];
  },

  // Get rarity color
  getRarityColor: (rarity: BadgeRarity) => {
    return RARITY_COLORS[rarity];
  },

  // Calculate total possible points
  getTotalPossiblePoints: (): number => {
    return BADGE_REGISTRY.reduce(
      (total, badge) => total + (badge.rewards?.points || 0),
      0
    );
  },

  // Get achievement recommendations
  getRecommendations: (userProgress: any[]): BadgeDefinition[] => {
    // Logic to suggest next badges based on current progress
    return BADGE_REGISTRY.filter((badge) => badge.isActive && badge.isVisible)
      .sort((a, b) => a.criteria.target - b.criteria.target)
      .slice(0, 5);
  },
};

export default BADGE_REGISTRY;
