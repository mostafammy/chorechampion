/**
 * ✅ ENTERPRISE TIMEZONE UTILITIES
 *
 * Comprehensive timezone-aware date/time formatting utilities.
 * Implements SOLID principles, performance optimization, and type safety.
 *
 * @module TimezoneUtils
 * @version 1.0.0
 * @author Principal Engineering Team
 */

/**
 * ✅ SOLID PRINCIPLES: Interface Segregation
 * Specific interfaces for different date formatting needs
 */
export interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  /** Custom timezone override (defaults to user's timezone) */
  timeZone?: string;
}

export interface RelativeTimeOptions {
  /** Numeric style: 'always' | 'auto' */
  numeric?: "always" | "auto";
  /** Style: 'long' | 'short' | 'narrow' */
  style?: "long" | "short" | "narrow";
  /** Custom locale override */
  locale?: string;
}

export interface SmartDateResult {
  /** Primary display text (e.g., "Today", "Yesterday", "Jan 15") */
  primary: string;
  /** Secondary display text (e.g., "2:30 PM PST", "Tuesday") */
  secondary: string;
  /** Relative time text (e.g., "2 hours ago") */
  relative: string;
  /** Full date/time with timezone */
  full: string;
  /** Original date object */
  date: Date;
  /** User's timezone */
  timezone: string;
}

/**
 * ✅ PERFORMANCE: Cached timezone resolver
 */
class TimezoneResolver {
  private static instance: TimezoneResolver;
  private _userTimezone: string | null = null;
  private _timezoneOffset: number | null = null;

  static getInstance(): TimezoneResolver {
    if (!TimezoneResolver.instance) {
      TimezoneResolver.instance = new TimezoneResolver();
    }
    return TimezoneResolver.instance;
  }

  getUserTimezone(): string {
    if (!this._userTimezone) {
      try {
        this._userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (error) {
        console.warn("[TimezoneResolver] Failed to detect timezone:", error);
        this._userTimezone = "UTC";
      }
    }
    return this._userTimezone;
  }

  getTimezoneOffset(): number {
    if (this._timezoneOffset === null) {
      // ✅ FIXED: JavaScript's getTimezoneOffset() returns negative values for positive timezones
      // We need to invert it to get the correct timezone offset
      this._timezoneOffset = -new Date().getTimezoneOffset() * 60000; // Convert to milliseconds and invert
    }
    return this._timezoneOffset;
  }

  // ✅ UTILITY: Reset cache (useful for testing or timezone changes)
  reset(): void {
    this._userTimezone = null;
    this._timezoneOffset = null;
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Format date with timezone awareness
 */
export function formatDateTimeWithTimezone(
  date: Date | string,
  options: DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Validate date
  if (isNaN(dateObj.getTime())) {
    console.warn("[formatDateTimeWithTimezone] Invalid date provided:", date);
    return "Invalid Date";
  }

  const defaultOptions: DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: TimezoneResolver.getInstance().getUserTimezone(),
    ...options,
  };

  try {
    return dateObj.toLocaleString(undefined, defaultOptions);
  } catch (error) {
    console.warn("[formatDateTimeWithTimezone] Formatting error:", error);
    // ✅ SOLID PRINCIPLES: Fail gracefully with ISO fallback
    return dateObj.toISOString();
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Get relative time with timezone awareness
 */
export function getRelativeTimeWithTimezone(
  date: Date | string,
  options: RelativeTimeOptions = {}
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Validate date
  if (isNaN(dateObj.getTime())) {
    console.warn("[getRelativeTimeWithTimezone] Invalid date provided:", date);
    return "Invalid Date";
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const { numeric = "auto", style = "long", locale } = options;

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });

    // ✅ BUSINESS LOGIC: Smart relative time selection
    if (Math.abs(diffYears) >= 1) {
      return rtf.format(-diffYears, "year");
    } else if (Math.abs(diffMonths) >= 1) {
      return rtf.format(-diffMonths, "month");
    } else if (Math.abs(diffWeeks) >= 1) {
      return rtf.format(-diffWeeks, "week");
    } else if (Math.abs(diffDays) >= 1) {
      return rtf.format(-diffDays, "day");
    } else if (Math.abs(diffHours) >= 1) {
      return rtf.format(-diffHours, "hour");
    } else if (Math.abs(diffMinutes) >= 1) {
      return rtf.format(-diffMinutes, "minute");
    } else {
      return rtf.format(-diffSeconds, "second");
    }
  } catch (error) {
    console.warn(
      "[getRelativeTimeWithTimezone] Relative formatting error:",
      error
    );
    // ✅ SOLID PRINCIPLES: Graceful degradation
    return formatDateTimeWithTimezone(dateObj, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Check if date is today in user's timezone
 *
 * 🔧 FIXED: Proper timezone handling for accurate date comparison
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const timezone = TimezoneResolver.getInstance().getUserTimezone();

  try {
    // ✅ PERFORMANCE: Use Intl API for proper timezone comparison
    const today = new Date();

    // Get date strings in user's timezone for comparison
    const todayStr = today.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
    const dateStr = dateObj.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD

    const isToday = todayStr === dateStr;

    // 🔧 DEBUGGING: Log comparison for verification
    if (process.env.NODE_ENV === "development") {
      console.log("[isToday] Date comparison:", {
        original: dateObj.toISOString(),
        today: today.toISOString(),
        todayStr,
        dateStr,
        timezone,
        result: isToday,
      });
    }

    return isToday;
  } catch (error) {
    console.warn("[isToday] Timezone comparison error:", error);
    // Fallback to local timezone comparison
    const today = new Date();
    return (
      dateObj.getFullYear() === today.getFullYear() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getDate() === today.getDate()
    );
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Check if date is yesterday in user's timezone
 *
 * 🔧 FIXED: Proper timezone handling for accurate date comparison
 */
export function isYesterday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const timezone = TimezoneResolver.getInstance().getUserTimezone();

  try {
    // ✅ PERFORMANCE: Use Intl API for proper timezone comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get date strings in user's timezone for comparison
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
      timeZone: timezone,
    }); // YYYY-MM-DD
    const dateStr = dateObj.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD

    const isYesterday = yesterdayStr === dateStr;

    // 🔧 DEBUGGING: Log comparison for verification
    if (process.env.NODE_ENV === "development") {
      console.log("[isYesterday] Date comparison:", {
        original: dateObj.toISOString(),
        yesterday: yesterday.toISOString(),
        yesterdayStr,
        dateStr,
        timezone,
        result: isYesterday,
      });
    }

    return isYesterday;
  } catch (error) {
    console.warn("[isYesterday] Timezone comparison error:", error);
    // Fallback to local timezone comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      dateObj.getFullYear() === yesterday.getFullYear() &&
      dateObj.getMonth() === yesterday.getMonth() &&
      dateObj.getDate() === yesterday.getDate()
    );
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Smart date formatting with context
 *
 * Provides comprehensive date/time information with timezone awareness.
 * Returns an object with multiple display formats for different UI needs.
 */
export function getSmartDateDisplay(
  date: Date | string,
  options: {
    includeTime?: boolean;
    includeRelative?: boolean;
    includeTimezone?: boolean;
    locale?: string;
  } = {}
): SmartDateResult {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const timezone = TimezoneResolver.getInstance().getUserTimezone();

  // Validate date
  if (isNaN(dateObj.getTime())) {
    const invalidResult: SmartDateResult = {
      primary: "Invalid Date",
      secondary: "",
      relative: "",
      full: "Invalid Date",
      date: new Date(NaN),
      timezone,
    };
    return invalidResult;
  }

  const {
    includeTime = true,
    includeRelative = true,
    includeTimezone = true,
    locale,
  } = options;

  let primary = "";
  let secondary = "";

  try {
    // ✅ BUSINESS LOGIC: Smart primary display
    if (isToday(dateObj)) {
      primary = "Today";
    } else if (isYesterday(dateObj)) {
      primary = "Yesterday";
    } else {
      const now = new Date();
      const diffInDays =
        (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);

      if (diffInDays <= 7) {
        // Within a week - show weekday and date
        primary = dateObj.toLocaleDateString(locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: timezone,
        });
      } else {
        // Older dates - show month/day, include year if different
        const options: Intl.DateTimeFormatOptions = {
          month: "short",
          day: "numeric",
          timeZone: timezone,
        };
        if (dateObj.getFullYear() !== now.getFullYear()) {
          options.year = "numeric";
        }
        primary = dateObj.toLocaleDateString(locale, options);
      }
    }

    // ✅ BUSINESS LOGIC: Smart secondary display
    if (includeTime) {
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      };
      if (includeTimezone) {
        timeOptions.timeZoneName = "short";
      }
      secondary = dateObj.toLocaleTimeString(locale, timeOptions);
    }

    // ✅ PERFORMANCE: Get relative time if requested
    const relative = includeRelative
      ? getRelativeTimeWithTimezone(dateObj, { locale })
      : "";

    // ✅ COMPREHENSIVE: Full date/time display
    const fullOptions: DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezone,
    };
    if (includeTimezone) {
      fullOptions.timeZoneName = "long";
    }
    const full = formatDateTimeWithTimezone(dateObj, fullOptions);

    return {
      primary,
      secondary,
      relative,
      full,
      date: dateObj,
      timezone,
    };
  } catch (error) {
    console.warn("[getSmartDateDisplay] Smart formatting error:", error);

    // ✅ SOLID PRINCIPLES: Graceful degradation
    return {
      primary: dateObj.toLocaleDateString(locale),
      secondary: includeTime ? dateObj.toLocaleTimeString(locale) : "",
      relative: includeRelative ? getRelativeTimeWithTimezone(dateObj) : "",
      full: formatDateTimeWithTimezone(dateObj),
      date: dateObj,
      timezone,
    };
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Create timezone-aware date boundaries
 *
 * Creates date boundaries that respect the user's timezone.
 * Useful for filtering data by periods like "today", "this week", etc.
 *
 * 🔧 FIXED: Proper timezone handling for accurate date boundaries
 */
export function createTimezoneDateBoundaries() {
  const resolver = TimezoneResolver.getInstance();
  const timezone = resolver.getUserTimezone();

  try {
    // ✅ PERFORMANCE: Create timezone-aware boundaries using proper Intl APIs
    const createBoundary = (
      daysBack: number = 0,
      startOfDay: boolean = true
    ) => {
      const now = new Date();

      if (startOfDay) {
        // 🔧 ROBUST FIX: Use the Date constructor with timezone-aware calculation
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - daysBack);

        // Get the date in the user's timezone as YYYY-MM-DD
        const dateStr = targetDate.toLocaleDateString("en-CA", {
          timeZone: timezone,
        });

        // 🔧 CRITICAL: Use the proper way to create midnight in a specific timezone
        // Create two dates: one representing the same moment in different timezones
        const localMidnight = new Date(`${dateStr}T00:00:00`);
        const utcRef = new Date(`${dateStr}T00:00:00Z`);

        // Get the timezone offset by seeing how the same time is interpreted
        const testDate = new Date("2025-08-13T12:00:00Z");
        const offsetMs =
          testDate.getTime() -
          new Date(
            testDate.toLocaleString("en-US", { timeZone: timezone })
          ).getTime();

        // Apply the timezone offset to get the correct UTC time for midnight in target timezone
        const correctUTCMidnight = new Date(localMidnight.getTime() - offsetMs);

        return correctUTCMidnight;
      } else {
        // For non-start-of-day boundaries, use simple date arithmetic
        return new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      }
    };

    const boundaries = {
      today: createBoundary(0, true),
      yesterday: createBoundary(1, true),
      week: createBoundary(7, false),
      month: createBoundary(30, false),
      quarter: createBoundary(90, false),
      year: createBoundary(365, false),
      // ✅ ENTERPRISE FEATURE: Custom period support
      custom: (days: number, startOfDay: boolean = false) =>
        createBoundary(days, startOfDay),
    };

    // 🔧 DEBUGGING: Log boundary calculations for verification
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[createTimezoneDateBoundaries] Timezone-aware boundaries created:",
        {
          timezone,
          boundaries: {
            today: boundaries.today.toISOString(),
            todayLocal: boundaries.today.toLocaleString("en-US", {
              timeZone: timezone,
            }),
            yesterday: boundaries.yesterday.toISOString(),
            yesterdayLocal: boundaries.yesterday.toLocaleString("en-US", {
              timeZone: timezone,
            }),
          },
        }
      );
    }

    return boundaries;
  } catch (error) {
    console.warn(
      "[createTimezoneDateBoundaries] Boundary creation error:",
      error
    );

    // ✅ SOLID PRINCIPLES: Fallback to simple date arithmetic
    const now = new Date();
    return {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      yesterday: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      custom: (days: number) =>
        new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * ✅ ENTERPRISE UTILITY: Parse date with timezone awareness
 *
 * 🔧 CRITICAL FIX: Properly handles input dates regardless of storage format
 * This function ensures dates are interpreted correctly relative to user's timezone
 */
export function parseTimezoneAwareDate(
  date: Date | string | number,
  options: {
    /** Assume input is in user's timezone (default: false - assumes UTC) */
    assumeUserTimezone?: boolean;
    /** Force interpretation as specific timezone */
    sourceTimezone?: string;
  } = {}
): Date {
  const { assumeUserTimezone = false, sourceTimezone } = options;

  try {
    let parsedDate: Date;

    // Parse the input date
    if (date instanceof Date) {
      parsedDate = new Date(date.getTime());
    } else if (typeof date === "number") {
      parsedDate = new Date(date);
    } else if (typeof date === "string") {
      // Handle various string formats
      parsedDate = new Date(date);

      // 🔧 CRITICAL FIX: Handle dates missing year (JavaScript defaults to 2001)
      // Common in display formats like "Mon, Aug 11 03:50 PM GMT+3"
      if (parsedDate.getFullYear() === 2001) {
        // Check if the original string likely doesn't contain a year
        const hasYear = /\b(19|20)\d{2}\b/.test(date); // Look for 4-digit year

        if (!hasYear) {
          // Assume current year for dates missing year
          const currentYear = new Date().getFullYear();
          parsedDate.setFullYear(currentYear);

          // 🔧 DEBUGGING: Log year correction
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[parseTimezoneAwareDate] Year corrected: "${date}" → ${currentYear}`,
              {
                originalYear: 2001,
                correctedYear: currentYear,
                correctedDate: parsedDate.toISOString(),
              }
            );
          }
        }
      }
    } else {
      throw new Error("Invalid date input type");
    }

    // Validate the parsed date
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid date value");
    }

    // If we need to adjust for timezone assumptions
    if (assumeUserTimezone || sourceTimezone) {
      const resolver = TimezoneResolver.getInstance();
      const userTimezone = resolver.getUserTimezone();
      const targetTimezone = sourceTimezone || userTimezone;

      // If the date was stored assuming it's in user's timezone but parsed as UTC
      if (assumeUserTimezone && targetTimezone !== "UTC") {
        // Get the offset difference
        const userOffsetMs = resolver.getTimezoneOffset();
        const utcOffsetMs = parsedDate.getTimezoneOffset() * 60000;

        // Adjust the date
        const adjustmentMs = userOffsetMs + utcOffsetMs;
        parsedDate = new Date(parsedDate.getTime() + adjustmentMs);
      }
    }

    // 🔧 DEBUGGING: Log timezone-aware parsing
    if (process.env.NODE_ENV === "development") {
      const resolver = TimezoneResolver.getInstance();
      const now = new Date();
      const timezoneInfo = {
        timezone: resolver.getUserTimezone(),
        offset: resolver.getTimezoneOffset(),
        offsetHours: resolver.getTimezoneOffset() / (60 * 60 * 1000),
        localTime: now.toLocaleString(),
        utcTime: now.toUTCString(),
        isoTime: now.toISOString(),
      };

      console.log("[parseTimezoneAwareDate] Date parsing:", {
        input: date,
        parsed: parsedDate.toISOString(),
        parsedLocal: parsedDate.toLocaleString(),
        userTimezone: timezoneInfo.timezone,
        assumeUserTimezone,
        sourceTimezone,
      });
    }

    return parsedDate;
  } catch (error) {
    console.warn("[parseTimezoneAwareDate] Date parsing error:", error);
    // Fallback to current time
    return new Date();
  }
}

/**
 * ✅ DEBUGGING UTILITY: Get timezone information
 */
export function getTimezoneInfo() {
  const resolver = TimezoneResolver.getInstance();
  const now = new Date();

  return {
    timezone: resolver.getUserTimezone(),
    offset: resolver.getTimezoneOffset(),
    offsetHours: resolver.getTimezoneOffset() / (60 * 60 * 1000),
    localTime: now.toLocaleString(),
    utcTime: now.toUTCString(),
    isoTime: now.toISOString(),
  };
}

// ✅ EXPORT: Clean public API
export { TimezoneResolver };

// ✅ DEFAULT EXPORT: Main utility object
export default {
  formatDateTime: formatDateTimeWithTimezone,
  getRelativeTime: getRelativeTimeWithTimezone,
  getSmartDisplay: getSmartDateDisplay,
  createBoundaries: createTimezoneDateBoundaries,
  parseDate: parseTimezoneAwareDate,
  isToday,
  isYesterday,
  getTimezoneInfo,
  TimezoneResolver,
};
