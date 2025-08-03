/**
 * Enterprise Design System - Color Tokens
 * Principal Engineer Implementation
 *
 * Centralized color management for scalability and maintainability
 * WCAG AA compliant color schemes for both light and dark modes
 */

// ✅ Semantic Color Tokens for Task Components
export const taskColors = {
  // Task List Colors
  taskCard: {
    light: {
      background: "bg-white",
      backgroundHover: "hover:bg-gray-50",
      border: "border-gray-200",
      shadow: "shadow-sm hover:shadow-md",
    },
    dark: {
      background: "dark:bg-gray-800",
      backgroundHover: "dark:hover:bg-gray-750",
      border: "dark:border-gray-700",
      shadow: "dark:shadow-gray-900/20",
    },
  },

  // Task Text Colors
  taskText: {
    primary: "text-gray-900 dark:text-gray-100",
    secondary: "text-gray-600 dark:text-gray-300",
    muted: "text-gray-500 dark:text-gray-400",
    disabled: "text-gray-400 dark:text-gray-500",
  },

  // Task State Colors
  taskStates: {
    pending: {
      background: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-200",
      progress: "bg-amber-500",
    },
    completed: {
      background: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-200",
      score: "bg-green-500 text-white",
    },
    active: {
      score: "bg-blue-500 text-white",
      scoreHover: "hover:bg-blue-600",
    },
  },

  // Admin Controls
  adminControls: {
    disabled: "opacity-50 cursor-not-allowed",
    tooltip: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
  },
} as const;

// ✅ Performance Summary Colors
export const performanceColors = {
  card: {
    background: "bg-gray-50/80 dark:bg-gray-800/50",
    border: "border-gray-200/60 dark:border-gray-700/60",
    shadow: "shadow-sm",
  },

  scoreDisplay: {
    background: "bg-white dark:bg-gray-800",
    text: "text-gray-900 dark:text-white",
    primary: "text-blue-600 dark:text-blue-400",
    accent: "text-emerald-600 dark:text-emerald-400",
  },

  buttons: {
    primary: {
      background: "bg-white dark:bg-gray-700",
      border: "border-gray-300 dark:border-gray-600",
      text: "text-gray-700 dark:text-gray-200",
      hover: "hover:bg-gray-50 dark:hover:bg-gray-600",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    destructive: {
      background: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      hover: "hover:bg-red-100 dark:hover:bg-red-900/30",
    },
  },

  progress: {
    background: "bg-gray-200 dark:bg-gray-700",
    fill: "bg-gradient-to-r from-blue-500 to-emerald-500",
    text: "text-gray-600 dark:text-gray-300",
  },
} as const;

// ✅ Utility function for combining color classes
export function combineColorClasses(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

// ✅ Color variant generator for dynamic themes
export function getColorVariant(
  variant: "primary" | "secondary" | "success" | "warning" | "error",
  intensity: "light" | "medium" | "dark" = "medium"
) {
  const variants = {
    primary: {
      light:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      medium:
        "bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-700",
      dark: "bg-blue-700 text-white border-blue-800 dark:bg-blue-800 dark:border-blue-900",
    },
    secondary: {
      light:
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      medium:
        "bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:border-gray-700",
      dark: "bg-gray-700 text-white border-gray-800 dark:bg-gray-800 dark:border-gray-900",
    },
    success: {
      light:
        "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      medium:
        "bg-green-500 text-white border-green-600 dark:bg-green-600 dark:border-green-700",
      dark: "bg-green-700 text-white border-green-800 dark:bg-green-800 dark:border-green-900",
    },
    warning: {
      light:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      medium:
        "bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-700",
      dark: "bg-amber-700 text-white border-amber-800 dark:bg-amber-800 dark:border-amber-900",
    },
    error: {
      light:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      medium:
        "bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700",
      dark: "bg-red-700 text-white border-red-800 dark:bg-red-800 dark:border-red-900",
    },
  };

  return variants[variant][intensity];
}

// ✅ Archive Colors
export const archiveColors = {
  header: {
    background: "bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900/50 dark:to-indigo-900/50",
    border: "border-slate-200/60 dark:border-slate-700/60",
    shadow: "shadow-md dark:shadow-slate-900/20",
    text: {
      primary: "text-slate-900 dark:text-slate-100",
      secondary: "text-slate-600 dark:text-slate-300",
      muted: "text-slate-500 dark:text-slate-400",
    },
  },

  memberCard: {
    background: "bg-white/80 dark:bg-slate-800/90",
    border: "border-slate-200/50 dark:border-slate-700/50",
    shadow: "shadow-lg hover:shadow-xl dark:shadow-slate-900/25",
    hover: "hover:bg-white dark:hover:bg-slate-800",
    gradient: {
      1: "bg-gradient-to-br from-violet-50/90 via-purple-50/70 to-indigo-50/90 dark:from-violet-900/20 dark:via-purple-900/15 dark:to-indigo-900/20 border-violet-200/50 dark:border-violet-700/50",
      2: "bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-cyan-50/90 dark:from-emerald-900/20 dark:via-teal-900/15 dark:to-cyan-900/20 border-emerald-200/50 dark:border-emerald-700/50",
      3: "bg-gradient-to-br from-rose-50/90 via-pink-50/70 to-orange-50/90 dark:from-rose-900/20 dark:via-pink-900/15 dark:to-orange-900/20 border-rose-200/50 dark:border-rose-700/50",
      4: "bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/90 dark:from-amber-900/20 dark:via-yellow-900/15 dark:to-orange-900/20 border-amber-200/50 dark:border-amber-700/50",
    },
  },

  memberHeader: {
    background: "bg-gradient-to-r from-white/95 via-gray-50/90 to-white/95 dark:from-slate-800/95 dark:via-slate-700/90 dark:to-slate-800/95",
    border: "border-b border-slate-200/60 dark:border-slate-600/60",
    avatar: {
      ring: "ring-4 ring-white/80 dark:ring-slate-700/80",
      shadow: "shadow-lg dark:shadow-slate-900/50",
    },
  },

  taskRow: {
    background: "hover:bg-slate-50/80 dark:hover:bg-slate-700/50",
    border: "border-slate-200/40 dark:border-slate-600/40",
    text: {
      primary: "text-slate-900 dark:text-slate-100",
      secondary: "text-slate-600 dark:text-slate-300",
      muted: "text-slate-500 dark:text-slate-400",
    },
  },

  badges: {
    period: {
      daily: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
      weekly: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
      monthly: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
      oneTime: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    },
    score: {
      background: "bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600",
      text: "text-white font-semibold",
      shadow: "shadow-sm dark:shadow-emerald-900/20",
      glow: "shadow-emerald-500/25 dark:shadow-emerald-500/30",
    },
  },

  emptyState: {
    background: "bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-800 dark:via-slate-700/50 dark:to-slate-800",
    border: "border-2 border-dashed border-gray-300 dark:border-slate-600",
    text: {
      primary: "text-gray-700 dark:text-gray-300",
      secondary: "text-gray-500 dark:text-gray-400",
    },
    icon: "text-gray-400 dark:text-gray-500",
  },

  stats: {
    background: "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20",
    border: "border border-indigo-200/50 dark:border-indigo-700/50",
    text: {
      value: "text-indigo-700 dark:text-indigo-300 font-bold",
      label: "text-indigo-600 dark:text-indigo-400",
    },
  },
} as const;

// ✅ Accessibility utilities
export const a11yColors = {
  focusRing:
    "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
  highContrast:
    "contrast-more:border-gray-900 contrast-more:text-gray-900 dark:contrast-more:border-gray-100 dark:contrast-more:text-gray-100",
} as const;
