'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { motion, type Variants } from 'framer-motion';
import { memo, useMemo } from 'react';

// ✅ PRINCIPAL ENGINEER: Type-safe configuration interface
interface SoonBadgeProps {
  /** Visual variant of the badge */
  variant?: 'default' | 'subtle' | 'prominent' | 'gradient';
  
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  /** Animation type */
  animation?: 'bounce' | 'pulse' | 'glow' | 'none';
  
  /** Position relative to parent */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'relative';
  
  /** Custom text override (uses translation by default) */
  text?: string;
  
  /** Translation namespace for the 'soon' key */
  translationNamespace?: string;
  
  /** Custom CSS classes */
  className?: string;
  
  /** Additional custom classes for fine-tuning positioning and styling */
  CustomClasses?: string;
  
  /** Whether the badge should be visible */
  visible?: boolean;
  
  /** Custom colors for gradient variant */
  gradientColors?: {
    from: string;
    to: string;
  };
  
  /** Accessibility label */
  ariaLabel?: string;
  
  /** Click handler for interactive badges */
  onClick?: () => void;
  
  /** Whether the badge is disabled/clickable */
  disabled?: boolean;
}

// ✅ PRINCIPAL ENGINEER: Performance-optimized style configurations
const VARIANT_STYLES = {
  default: 'bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0',
  subtle: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  prominent: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-lg',
  gradient: 'text-white border-0', // Custom gradient applied separately
} as const;

const SIZE_STYLES = {
  xs: 'text-[8px] px-1 py-0.5 h-3',
  sm: 'text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 sm:py-1 h-3 sm:h-5',
  md: 'text-xs px-2 py-1 h-5',
  lg: 'text-sm px-3 py-1.5 h-6',
} as const;

const POSITION_STYLES = {
  'top-left': 'absolute -top-2 sm:-top-3 -left-1 z-20',
  'top-center': 'absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 z-40 transform',
  'top-right': 'absolute -top-2 sm:-top-3 -right-1 z-20',
  'bottom-left': 'absolute -bottom-1 -left-1 z-10',
  'bottom-center': 'absolute -bottom-1 left-1/2 -translate-x-1/2 z-10',
  'bottom-right': 'absolute -bottom-1 -right-1 z-10',
  'relative': 'relative',
} as const;

// ✅ PRINCIPAL ENGINEER: Optimized animation variants
const ANIMATION_VARIANTS: Record<string, Variants> = {
  bounce: {
    animate: {
      y: [0, -2, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },
  glow: {
    animate: {
      boxShadow: [
        "0 0 5px rgba(249, 115, 22, 0.5)",
        "0 0 15px rgba(249, 115, 22, 0.8)",
        "0 0 5px rgba(249, 115, 22, 0.5)"
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },
  none: {}
};

/**
 * ✅ PRINCIPAL ENGINEER: Enterprise-grade SoonBadge Component
 * 
 * A highly reusable, configurable badge component for indicating "coming soon" features.
 * Optimized for performance, accessibility, and maintainability.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <SoonBadge />
 * 
 * // Advanced configuration
 * <SoonBadge
 *   variant="prominent"
 *   size="md"
 *   animation="glow"
 *   position="top-right"
 *   gradientColors={{ from: "purple-500", to: "pink-600" }}
 * />
 * 
 * // Custom positioning with CustomClasses
 * <SoonBadge
 *   position="top-center"
 *   CustomClasses="sm:-translate-x-[350%] sm:-left-1/2"
 * />
 * 
 * // Interactive badge
 * <SoonBadge
 *   onClick={() => toast("Feature coming soon!")}
 *   ariaLabel="Click for more information about upcoming feature"
 * />
 * ```
 */
export const SoonBadge = memo<SoonBadgeProps>(({
  variant = 'default',
  size = 'sm',
  animation = 'bounce',
  position = 'top-center',
  text,
  translationNamespace = 'Leaderboard',
  className,
  CustomClasses,
  visible = true,
  gradientColors,
  ariaLabel,
  onClick,
  disabled = false,
}) => {
  const t = useTranslations(translationNamespace);
  
  // ✅ PERFORMANCE: Memoize computed styles
  const computedStyles = useMemo(() => {
    let baseStyles = cn(
      'inline-flex items-center justify-center font-semibold whitespace-nowrap rounded-full shadow-lg transition-all duration-300',
      'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-500',
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      POSITION_STYLES[position],
      {
        'cursor-pointer hover:scale-105 active:scale-95': onClick && !disabled,
        'opacity-50 cursor-not-allowed': disabled,
        'select-none': true,
      },
      className,
      CustomClasses
    );
    
    // Apply custom gradient if specified
    if (variant === 'gradient' && gradientColors) {
      baseStyles = cn(
        baseStyles.replace('text-white border-0', ''),
        `bg-gradient-to-r from-${gradientColors.from} to-${gradientColors.to} text-white border-0`
      );
    }
    
    return baseStyles;
  }, [variant, size, position, className, CustomClasses, onClick, disabled, gradientColors]);
  
  // ✅ PERFORMANCE: Memoize display text
  const displayText = useMemo(() => {
    return text || t('soon') || 'Soon';
  }, [text, t]);
  
  // ✅ ACCESSIBILITY: Enhanced ARIA properties
  const accessibilityProps = useMemo(() => ({
    'aria-label': ariaLabel || `${displayText} - Feature coming soon`,
    'role': onClick ? 'button' : 'status',
    'aria-live': 'polite' as const,
    'tabIndex': onClick && !disabled ? 0 : -1,
  }), [ariaLabel, displayText, onClick, disabled]);
  
  // ✅ PERFORMANCE: Early return for hidden badges
  if (!visible) return null;
  
  // ✅ PRINCIPAL ENGINEER: Conditional animation wrapper
  const BadgeContent = (
    <Badge
      className={computedStyles}
      onClick={onClick && !disabled ? onClick : undefined}
      onKeyDown={onClick && !disabled ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      {...accessibilityProps}
    >
      {displayText}
    </Badge>
  );
  
  // ✅ PERFORMANCE: Only wrap with motion when animation is needed
  if (animation === 'none') {
    return BadgeContent;
  }
  
  return (
    <motion.div
      variants={ANIMATION_VARIANTS[animation]}
      animate="animate"
      className="inline-block"
    >
      {BadgeContent}
    </motion.div>
  );
});

SoonBadge.displayName = 'SoonBadge';

// ✅ PRINCIPAL ENGINEER: Export type for external consumption
export type { SoonBadgeProps };

// ✅ PRINCIPAL ENGINEER: Preset configurations for common use cases
export const SoonBadgePresets = {
  /** Small badge for tab indicators */
  tabIndicator: {
    variant: 'default' as const,
    size: 'sm' as const,
    animation: 'bounce' as const,
    position: 'top-center' as const,
  },
  
  /** Prominent badge for major features */
  featureAnnouncement: {
    variant: 'prominent' as const,
    size: 'md' as const,
    animation: 'glow' as const,
    position: 'top-center' as const,
  },
  
  /** Subtle badge for minor features */
  minorFeature: {
    variant: 'subtle' as const,
    size: 'sm' as const,
    animation: 'pulse' as const,
    position: 'bottom-right' as const,
  },
  
  /** Interactive badge with click handler */
  interactive: {
    variant: 'gradient' as const,
    size: 'md' as const,
    animation: 'pulse' as const,
    position: 'relative' as const,
    gradientColors: { from: 'blue-500', to: 'purple-600' },
  },
  
  /** Leaderboard specific preset matching current design */
  leaderboardTab: {
    variant: 'default' as const,
    size: 'sm' as const,
    animation: 'bounce' as const,
    position: 'top-center' as const,
    translationNamespace: 'Leaderboard',
  },
} as const;
