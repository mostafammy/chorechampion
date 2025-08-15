/**
 * ✅ ENTERPRISE DATETIME UTILITIES
 *
 * Centralized datetime utility library with timezone awareness.
 * Provides a clean API for date/time operations across the application.
 *
 * @module DateTimeUtils
 * @version 1.0.0
 * @author Principal Engineering Team
 */

// ✅ SOLID PRINCIPLES: Barrel exports for clean API
export * from "./timezone";

// ✅ CONVENIENCE: Re-export commonly used functions
export {
  formatDateTimeWithTimezone as formatDateTime,
  getRelativeTimeWithTimezone as getRelativeTime,
  getSmartDateDisplay as getSmartDate,
  createTimezoneDateBoundaries as createDateBoundaries,
  parseTimezoneAwareDate as parseDate,
  isToday,
  isYesterday,
  getTimezoneInfo,
  TimezoneResolver,
} from "./timezone";

// ✅ DEFAULT EXPORT: Main timezone utilities
export { default as TimezoneUtils } from "./timezone";
