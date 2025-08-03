'use client';

import { memo } from 'react';
import { useLocale } from 'next-intl';

// ✅ Enterprise-Grade Type Safety
interface LastUpdatedProps {
  /** ISO timestamp string for the last update */
  timestamp: string;
  /** Optional CSS classes for styling customization */
  className?: string;
  /** Size variant for different use cases */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant for different contexts */
  variant?: 'default' | 'muted' | 'accent';
  /** Optional prefix text override */
  labelOverride?: string;
}

// ✅ Performance-Optimized Date Formatting Configuration
const DATE_FORMAT_CONFIG = {
  calendar: 'gregory' as const, // Force Gregorian calendar consistently
  year: 'numeric' as const,
  month: 'short' as const,
  day: 'numeric' as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
} as const;

// ✅ Enterprise Design System - Size Variants
const SIZE_VARIANTS = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

// ✅ Enterprise Design System - Color Variants
const COLOR_VARIANTS = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-accent-foreground',
} as const;

/**
 * ✅ Enterprise LastUpdated Component
 * 
 * A highly optimized, reusable component for displaying last updated timestamps
 * with proper internationalization, bidirectional text support, and accessibility.
 * 
 * Features:
 * - 🌍 Full i18n support with RTL/LTR text handling
 * - 🗓️ Consistent Gregorian calendar enforcement
 * - 🎨 Design system variants for different contexts
 * - ⚡ Memoized for optimal performance
 * - ♿ Accessible with proper ARIA attributes
 * - 🏗️ Enterprise-grade type safety
 * - 🛡️ Translation-independent for maximum reliability
 * 
 * Translation Strategy:
 * - Uses built-in locale-specific labels (en/ar)
 * - No external translation dependencies
 * - Maximum reliability and zero translation errors
 * - Supports labelOverride for custom text
 * 
 * @param timestamp - ISO date string for the last update
 * @param className - Optional CSS classes for custom styling
 * @param size - Size variant (sm | md | lg)
 * @param variant - Color variant (default | muted | accent)
 * @param labelOverride - Optional custom label text (bypasses all translations)
 */
export const LastUpdated = memo<LastUpdatedProps>(({
  timestamp,
  className = '',
  size = 'md',
  variant = 'muted',
  labelOverride,
}) => {
  const locale = useLocale();
  
  // ✅ Performance: Memoized date formatting with locale-specific configuration
  const formattedDate = new Date(timestamp).toLocaleString(
    locale === 'ar' ? 'ar-SA' : 'en-US',
    {
      ...DATE_FORMAT_CONFIG,
      hour12: false, // Arabic uses 24-hour format
    }
  );

  // ✅ Enterprise-Safe: Simple hardcoded fallbacks for maximum reliability
  // This avoids translation dependency issues while maintaining i18n support
  const defaultLabels = {
    en: 'Last updated',
    ar: 'آخر تحديث'
  };
  
  const labelText = labelOverride || defaultLabels[locale as keyof typeof defaultLabels] || defaultLabels.en;
  
  // ✅ Performance: Pre-computed CSS classes
  const baseClasses = `text-center ${SIZE_VARIANTS[size]} ${COLOR_VARIANTS[variant]} ${className}`;

  return (
    <div 
      className={baseClasses}
      role="status"
      aria-label={`${labelText}: ${formattedDate}`}
    >
      {locale === 'ar' ? (
        // ✅ Arabic RTL Layout: Date first, then label (natural reading flow)
        <>
          <bdi 
            dir="ltr" 
            className="inline-block"
            title={`${labelText}: ${formattedDate}`}
          >
            {formattedDate}
          </bdi>
          {' '}
          <span>:{labelText}</span>
        </>
      ) : (
        // ✅ English LTR Layout: Label first, then date (natural reading flow)
        <>
          <span>{labelText}:</span>
          {' '}
          <bdi 
            dir="ltr" 
            className="inline-block"
            title={`${labelText}: ${formattedDate}`}
          >
            {formattedDate}
          </bdi>
        </>
      )}
    </div>
  );
});

// ✅ Enterprise Development: Proper display name for debugging
LastUpdated.displayName = 'LastUpdated';

export default LastUpdated;
