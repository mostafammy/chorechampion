/**
 * Enterprise Theme Utilities
 * Principal Engineer Implementation
 *
 * High-performance theme utilities with memoization and type safety
 */

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  taskColors,
  performanceColors,
  archiveColors,
  combineColorClasses,
  getColorVariant,
  a11yColors,
} from "./colors";

// ✅ Theme-aware component utilities
export function useComponentTheme() {
  const { theme, systemTheme } = useTheme();

  // ✅ Performance: Memoize theme calculations
  const currentTheme = useMemo(() => {
    return theme === "system" ? systemTheme : theme;
  }, [theme, systemTheme]);

  const isDark = currentTheme === "dark";

  // ✅ Task component theme utilities
  const taskTheme = useMemo(
    () => ({
      card: {
        base: combineColorClasses(
          taskColors.taskCard.light.background,
          taskColors.taskCard.light.backgroundHover,
          taskColors.taskCard.light.border,
          taskColors.taskCard.light.shadow,
          taskColors.taskCard.dark.background,
          taskColors.taskCard.dark.backgroundHover,
          taskColors.taskCard.dark.border,
          taskColors.taskCard.dark.shadow,
          "transition-all duration-200 ease-in-out",
          a11yColors.focusRing
        ),
        pending: combineColorClasses(
          taskColors.taskStates.pending.background,
          taskColors.taskStates.pending.border,
          "border-2 border-dashed"
        ),
        completed: combineColorClasses(
          taskColors.taskStates.completed.background,
          taskColors.taskStates.completed.border,
          "border-2"
        ),
      },
      text: {
        primary: taskColors.taskText.primary,
        secondary: taskColors.taskText.secondary,
        muted: taskColors.taskText.muted,
        disabled: taskColors.taskText.disabled,
      },
      score: {
        active: combineColorClasses(
          taskColors.taskStates.active.score,
          taskColors.taskStates.active.scoreHover,
          "transition-colors duration-200"
        ),
        completed: taskColors.taskStates.completed.score,
      },
      admin: {
        disabled: taskColors.adminControls.disabled,
        tooltip: taskColors.adminControls.tooltip,
      },
    }),
    []
  );

  // ✅ Performance summary theme utilities
  const performanceTheme = useMemo(
    () => ({
      card: combineColorClasses(
        performanceColors.card.background,
        performanceColors.card.border,
        performanceColors.card.shadow,
        "border rounded-lg backdrop-blur-sm",
        a11yColors.focusRing
      ),
      score: {
        display: combineColorClasses(
          performanceColors.scoreDisplay.background,
          performanceColors.scoreDisplay.text,
          "rounded-lg p-2"
        ),
        primary: performanceColors.scoreDisplay.primary,
        accent: performanceColors.scoreDisplay.accent,
      },
      button: {
        primary: combineColorClasses(
          performanceColors.buttons.primary.background,
          performanceColors.buttons.primary.border,
          performanceColors.buttons.primary.text,
          performanceColors.buttons.primary.hover,
          performanceColors.buttons.primary.disabled,
          "border rounded-full transition-all duration-200",
          a11yColors.focusRing
        ),
        destructive: combineColorClasses(
          performanceColors.buttons.destructive.background,
          performanceColors.buttons.destructive.border,
          performanceColors.buttons.destructive.text,
          performanceColors.buttons.destructive.hover,
          "border rounded-full transition-all duration-200",
          a11yColors.focusRing
        ),
      },
      progress: {
        background: performanceColors.progress.background,
        fill: performanceColors.progress.fill,
        text: performanceColors.progress.text,
      },
    }),
    []
  );

  return {
    isDark,
    currentTheme,
    task: taskTheme,
    performance: performanceTheme,
    getVariant: getColorVariant,
    a11y: a11yColors,
  };
}

// ✅ Component-specific theme hooks for optimal performance
export function useTaskTheme() {
  const { task, isDark } = useComponentTheme();
  return { ...task, isDark };
}

export function usePerformanceTheme() {
  const { performance, isDark } = useComponentTheme();
  return { ...performance, isDark };
}

// ✅ Utility for conditional admin styling
export function useAdminAwareTheme(isAdmin: boolean, isLoading: boolean) {
  const theme = useComponentTheme();

  return useMemo(
    () => ({
      ...theme,
      getAdminStyle: (baseStyle: string) => {
        if (isLoading) return `${baseStyle} animate-pulse`;
        if (!isAdmin) return `${baseStyle} ${theme.task.admin.disabled}`;
        return baseStyle;
      },
      getAdminTooltip: () => (isAdmin ? undefined : theme.task.admin.tooltip),
    }),
    [theme, isAdmin, isLoading]
  );
}

// ✅ High contrast mode support
export function useAccessibilityTheme() {
  const theme = useComponentTheme();

  return useMemo(
    () => ({
      ...theme,
      highContrast: a11yColors.highContrast,
      focusRing: a11yColors.focusRing,
      // Enhanced focus styles for keyboard navigation
      enhancedFocus:
        "focus-visible:ring-4 focus-visible:ring-blue-500/50 focus-visible:outline-none",
    }),
    [theme]
  );
}

// ✅ Archive-specific theme utilities
export function useArchiveTheme() {
  const { isDark } = useComponentTheme();

  return useMemo(
    () => ({
      isDark,
      header: {
        container: combineColorClasses(
          archiveColors.header.background,
          archiveColors.header.border,
          archiveColors.header.shadow,
          "rounded-xl p-6 mb-8 backdrop-blur-sm",
          a11yColors.focusRing
        ),
        title: combineColorClasses(
          archiveColors.header.text.primary,
          "text-4xl font-bold font-headline mb-3 tracking-tight"
        ),
        subtitle: combineColorClasses(
          archiveColors.header.text.secondary,
          "text-lg leading-relaxed"
        ),
      },
      memberCard: {
        container: combineColorClasses(
          archiveColors.memberCard.background,
          archiveColors.memberCard.border,
          archiveColors.memberCard.shadow,
          archiveColors.memberCard.hover,
          "rounded-xl border backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden",
          a11yColors.focusRing
        ),
        getGradient: (index: number) => {
          const gradients = [
            archiveColors.memberCard.gradient[1],
            archiveColors.memberCard.gradient[2],
            archiveColors.memberCard.gradient[3],
            archiveColors.memberCard.gradient[4],
          ];
          return gradients[index % gradients.length];
        },
      },
      memberHeader: {
        container: combineColorClasses(
          archiveColors.memberHeader.background,
          archiveColors.memberHeader.border,
          "p-6 backdrop-blur-sm"
        ),
        avatar: combineColorClasses(
          archiveColors.memberHeader.avatar.ring,
          archiveColors.memberHeader.avatar.shadow,
          "h-16 w-16"
        ),
        title: combineColorClasses(
          archiveColors.header.text.primary,
          "text-2xl font-bold font-headline"
        ),
        subtitle: combineColorClasses(
          archiveColors.header.text.secondary,
          "text-base font-medium"
        ),
      },
      taskRow: {
        container: combineColorClasses(
          archiveColors.taskRow.background,
          archiveColors.taskRow.border,
          "transition-colors duration-200 border-b last:border-b-0"
        ),
        text: {
          primary: archiveColors.taskRow.text.primary,
          secondary: archiveColors.taskRow.text.secondary,
          muted: archiveColors.taskRow.text.muted,
        },
      },
      badges: {
        getPeriodBadge: (period: string) => {
          const periodMap: Record<string, string> = {
            daily: archiveColors.badges.period.daily,
            weekly: archiveColors.badges.period.weekly,
            monthly: archiveColors.badges.period.monthly,
            oneTime: archiveColors.badges.period.oneTime,
          };
          return combineColorClasses(
            periodMap[period] || archiveColors.badges.period.oneTime,
            "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
            a11yColors.focusRing
          );
        },
        score: combineColorClasses(
          archiveColors.badges.score.background,
          archiveColors.badges.score.text,
          archiveColors.badges.score.shadow,
          "px-3 py-1 rounded-full text-sm font-bold shadow-lg transform hover:scale-105 transition-all duration-200",
          archiveColors.badges.score.glow,
          a11yColors.focusRing
        ),
      },
      emptyState: {
        container: combineColorClasses(
          archiveColors.emptyState.background,
          archiveColors.emptyState.border,
          "rounded-xl p-12 text-center",
          a11yColors.focusRing
        ),
        text: {
          primary: combineColorClasses(
            archiveColors.emptyState.text.primary,
            "text-xl font-semibold mb-2"
          ),
          secondary: combineColorClasses(
            archiveColors.emptyState.text.secondary,
            "text-base"
          ),
        },
        icon: combineColorClasses(
          archiveColors.emptyState.icon,
          "w-16 h-16 mx-auto mb-4"
        ),
      },
      stats: {
        container: combineColorClasses(
          archiveColors.stats.background,
          archiveColors.stats.border,
          "rounded-lg p-4 text-center backdrop-blur-sm",
          a11yColors.focusRing
        ),
        value: combineColorClasses(
          archiveColors.stats.text.value,
          "text-2xl font-bold mb-1"
        ),
        label: combineColorClasses(
          archiveColors.stats.text.label,
          "text-sm font-medium"
        ),
      },
    }),
    [isDark]
  );
}
