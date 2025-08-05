/**
 * PRINCIPAL ENGINEER: Responsive Archive Design System
 *
 * Enterprise-grade responsive utilities for Archive components
 * Ensures consistency across all device types and screen sizes
 */

import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// ✅ RESPONSIVE BREAKPOINTS CONFIGURATION
export const archiveBreakpoints = {
  mobile: "(max-width: 639px)",
  tablet: "(min-width: 640px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",

  // Specific device targets
  phone: "(max-width: 479px)",
  largeMobile: "(min-width: 480px) and (max-width: 639px)",
  tabletPortrait: "(min-width: 640px) and (max-width: 767px)",
  tabletLandscape: "(min-width: 768px) and (max-width: 1023px)",
  desktopSmall: "(min-width: 1024px) and (max-width: 1279px)",
  desktopLarge: "(min-width: 1280px)",
} as const;

// ✅ RESPONSIVE SPACING SYSTEM
export const archiveSpacing = {
  container: "px-4 sm:px-6 lg:px-8",
  section: "space-y-4 sm:space-y-6 lg:space-y-8",
  card: "p-3 sm:p-4 lg:p-6",
  cardGap: "gap-3 sm:gap-4 lg:gap-6",

  // Component-specific spacing
  header: "gap-3 sm:gap-4 lg:gap-6",
  stats: "gap-2 sm:gap-4 lg:gap-6",
  controls: "gap-2 sm:gap-3 lg:gap-4",
  member: "gap-3 sm:gap-4 lg:gap-5",
} as const;

// ✅ RESPONSIVE TYPOGRAPHY SCALE
export const archiveTypography = {
  // Headings
  h1: "text-2xl sm:text-3xl lg:text-4xl font-bold",
  h2: "text-xl sm:text-2xl lg:text-3xl font-semibold",
  h3: "text-lg sm:text-xl lg:text-2xl font-semibold",
  h4: "text-base sm:text-lg lg:text-xl font-medium",

  // Body text
  body: "text-sm sm:text-base",
  bodyLarge: "text-base sm:text-lg",
  bodySmall: "text-xs sm:text-sm",

  // UI elements
  button: "text-xs sm:text-sm",
  badge: "text-xs sm:text-sm",
  caption: "text-xs",

  // Member-specific
  memberName: "text-sm sm:text-lg font-semibold",
  memberStats: "text-xs sm:text-sm",
  taskName: "text-sm font-medium",
} as const;

// ✅ RESPONSIVE COMPONENT SIZES
export const archiveComponents = {
  // Avatars
  avatar: {
    small: "w-8 h-8 sm:w-10 sm:h-10",
    medium: "w-10 h-10 sm:w-12 sm:h-12",
    large: "w-12 h-12 sm:w-16 sm:h-16",
  },

  // Icons
  icon: {
    small: "w-3 h-3 sm:w-4 sm:h-4",
    medium: "w-4 h-4 sm:w-5 sm:h-5",
    large: "w-5 h-5 sm:w-6 sm:h-6",
  },

  // Buttons
  button: {
    height: "h-8 sm:h-9 lg:h-10",
    padding: "px-2 sm:px-3 lg:px-4",
    gap: "gap-1 sm:gap-2",
  },

  // Badges
  badge: {
    padding: "px-1.5 py-0.5 sm:px-2 sm:py-1",
    text: "text-xs sm:text-sm",
  },

  // Cards
  card: {
    radius: "rounded-lg sm:rounded-xl",
    padding: "p-3 sm:p-4 lg:p-6",
    border: "border border-gray-200 dark:border-gray-700",
  },
} as const;

// ✅ RESPONSIVE GRID SYSTEMS
export const archiveGrids = {
  // Statistics grid
  stats: "grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6",

  // Member info grid
  memberInfo: "grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4",

  // Controls grid
  controls:
    "flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between",
  controlButtons: "flex flex-wrap gap-2",

  // Task grid (mobile cards)
  taskGrid: "space-y-3 sm:space-y-4",
} as const;

// ✅ RESPONSIVE COLOR SYSTEM
export const archiveColors = {
  // Background colors
  background: {
    primary: "bg-white dark:bg-gray-800",
    secondary: "bg-gray-50 dark:bg-gray-700",
    accent: "bg-blue-50 dark:bg-blue-900/20",
  },

  // Text colors
  text: {
    primary: "text-gray-900 dark:text-white",
    secondary: "text-gray-600 dark:text-gray-300",
    muted: "text-gray-500 dark:text-gray-400",
  },

  // Border colors
  border: {
    primary: "border-gray-200 dark:border-gray-700",
    secondary: "border-gray-300 dark:border-gray-600",
    accent: "border-blue-200 dark:border-blue-800",
  },

  // Status colors
  status: {
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  },
} as const;

// ✅ RESPONSIVE ANIMATION CONFIGURATIONS
export const archiveAnimations = {
  // Entry animations
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" },
  },

  // Staggered animations for lists
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.1 } },
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },

  // Expansion animations
  expandHeight: {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" },
  },

  // Mobile-specific animations (reduced motion for performance)
  mobile: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 },
    },
  },
} as const;

// ✅ RESPONSIVE UTILITIES HOOK
export function useResponsiveArchive() {
  const isMobile = useIsMobile();

  return useMemo(
    () => ({
      // Device detection
      isMobile,
      isTablet: !isMobile && window.innerWidth < 1024,
      isDesktop: !isMobile && window.innerWidth >= 1024,

      // Responsive class generators
      spacing: archiveSpacing,
      typography: archiveTypography,
      components: archiveComponents,
      grids: archiveGrids,
      colors: archiveColors,
      animations: isMobile ? archiveAnimations.mobile : archiveAnimations,

      // Utility functions
      getResponsiveClass: (mobile: string, desktop: string) =>
        isMobile ? mobile : desktop,

      getGridCols: (mobileCols: number, desktopCols: number) =>
        `grid-cols-${isMobile ? mobileCols : desktopCols}`,

      getIconSize: (size: "small" | "medium" | "large") =>
        archiveComponents.icon[size],

      getAvatarSize: (size: "small" | "medium" | "large") =>
        archiveComponents.avatar[size],

      // View mode helpers
      shouldUseCardView: () => isMobile,
      shouldUseTableView: () => !isMobile,

      // Performance helpers
      getSafeAnimations: () =>
        isMobile ? archiveAnimations.mobile : archiveAnimations,
      getOptimalSpacing: () => (isMobile ? "space-y-3" : "space-y-6"),
    }),
    [isMobile]
  );
}

// ✅ RESPONSIVE BADGE UTILITIES
export const responsiveBadges = {
  rank: (rank: number) =>
    ({
      1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      2: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      3: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    }[rank] || "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"),

  period: (period: string) =>
    ({
      daily:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      weekly: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      monthly:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      oneTime: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }[period] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"),

  score:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-semibold",
  taskCount: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

// ✅ EXPORT COMPREHENSIVE DESIGN SYSTEM
export const responsiveArchiveDesign = {
  breakpoints: archiveBreakpoints,
  spacing: archiveSpacing,
  typography: archiveTypography,
  components: archiveComponents,
  grids: archiveGrids,
  colors: archiveColors,
  animations: archiveAnimations,
  badges: responsiveBadges,
  useResponsive: useResponsiveArchive,
} as const;

export default responsiveArchiveDesign;
