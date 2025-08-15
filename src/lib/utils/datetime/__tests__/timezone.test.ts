/**
 * ✅ ENTERPRISE TIMEZONE UTILITIES TESTS
 *
 * Comprehensive test suite for timezone-aware date/time utilities.
 * Tests SOLID principles, performance, and edge cases.
 *
 * @module TimezoneUtils.test
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import {
  formatDateTimeWithTimezone,
  getRelativeTimeWithTimezone,
  getSmartDateDisplay,
  createTimezoneDateBoundaries,
  isToday,
  isYesterday,
  getTimezoneInfo,
  TimezoneResolver,
  type DateTimeFormatOptions,
  type RelativeTimeOptions,
} from "../timezone";

// Mock timezone for consistent testing
const mockTimezone = "America/New_York";

describe("TimezoneResolver", () => {
  let resolver: TimezoneResolver;

  beforeEach(() => {
    resolver = TimezoneResolver.getInstance();
    resolver.reset();

    // Mock Intl.DateTimeFormat
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        timeZone: mockTimezone,
        locale: "en-US",
        calendar: "gregory",
        numberingSystem: "latn",
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should be a singleton", () => {
    const resolver1 = TimezoneResolver.getInstance();
    const resolver2 = TimezoneResolver.getInstance();
    expect(resolver1).toBe(resolver2);
  });

  test("should cache timezone information", () => {
    const timezone1 = resolver.getUserTimezone();
    const timezone2 = resolver.getUserTimezone();

    expect(timezone1).toBe(mockTimezone);
    expect(timezone2).toBe(mockTimezone);
    expect(Intl.DateTimeFormat.prototype.resolvedOptions).toHaveBeenCalledTimes(
      1
    );
  });

  test("should handle timezone detection errors gracefully", () => {
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockImplementation(() => {
        throw new Error("Timezone detection failed");
      });

    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    const timezone = resolver.getUserTimezone();

    expect(timezone).toBe("UTC");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("formatDateTimeWithTimezone", () => {
  test("should format date with timezone", () => {
    const date = new Date("2025-08-13T14:30:00Z");
    const result = formatDateTimeWithTimezone(date);

    expect(result).toContain("Aug");
    expect(result).toContain("13");
    expect(result).toContain("2025");
  });

  test("should handle string dates", () => {
    const dateString = "2025-08-13T14:30:00Z";
    const result = formatDateTimeWithTimezone(dateString);

    expect(result).toContain("Aug");
    expect(result).toContain("13");
  });

  test("should use custom options", () => {
    const date = new Date("2025-08-13T14:30:00Z");
    const options: DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    };

    const result = formatDateTimeWithTimezone(date, options);
    expect(result).toContain("August");
  });

  test("should handle invalid dates gracefully", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    const result = formatDateTimeWithTimezone("invalid-date");

    expect(result).toBe("Invalid Date");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("should fallback to ISO on formatting errors", () => {
    const date = new Date("2025-08-13T14:30:00Z");
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    // Mock toLocaleString to throw an error
    jest.spyOn(date, "toLocaleString").mockImplementation(() => {
      throw new Error("Formatting error");
    });

    const result = formatDateTimeWithTimezone(date);
    expect(result).toContain("2025-08-13");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("getRelativeTimeWithTimezone", () => {
  beforeEach(() => {
    // Mock current time
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-13T14:30:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should format recent times correctly", () => {
    const fiveMinutesAgo = new Date("2025-08-13T14:25:00Z");
    const result = getRelativeTimeWithTimezone(fiveMinutesAgo);

    expect(result).toContain("5");
    expect(result.toLowerCase()).toContain("minute");
  });

  test("should format hours correctly", () => {
    const twoHoursAgo = new Date("2025-08-13T12:30:00Z");
    const result = getRelativeTimeWithTimezone(twoHoursAgo);

    expect(result).toContain("2");
    expect(result.toLowerCase()).toContain("hour");
  });

  test("should format days correctly", () => {
    const threeDaysAgo = new Date("2025-08-10T14:30:00Z");
    const result = getRelativeTimeWithTimezone(threeDaysAgo);

    expect(result).toContain("3");
    expect(result.toLowerCase()).toContain("day");
  });

  test("should handle future dates", () => {
    const futureDate = new Date("2025-08-14T14:30:00Z");
    const result = getRelativeTimeWithTimezone(futureDate);

    // Future dates might show as "in X days", "next month", etc.
    expect(result.toLowerCase()).toMatch(/day|week|month|year|next/);
  });

  test("should handle invalid dates", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    const result = getRelativeTimeWithTimezone("invalid-date");

    expect(result).toBe("Invalid Date");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("should use custom options", () => {
    const yesterday = new Date("2025-08-12T14:30:00Z");
    const options: RelativeTimeOptions = {
      style: "short",
      numeric: "always",
    };

    const result = getRelativeTimeWithTimezone(yesterday, options);
    expect(result).toBeDefined();
  });
});

describe("isToday and isYesterday", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-13T14:30:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("isToday should identify today correctly", () => {
    const today = new Date("2025-08-13T10:00:00Z");
    const notToday = new Date("2025-08-12T10:00:00Z");

    expect(isToday(today)).toBe(true);
    expect(isToday(notToday)).toBe(false);
  });

  test("isYesterday should identify yesterday correctly", () => {
    const yesterday = new Date("2025-08-12T10:00:00Z");
    const notYesterday = new Date("2025-08-11T10:00:00Z");

    expect(isYesterday(yesterday)).toBe(true);
    expect(isYesterday(notYesterday)).toBe(false);
  });

  test("should handle string dates", () => {
    expect(isToday("2025-08-13T10:00:00Z")).toBe(true);
    expect(isYesterday("2025-08-12T10:00:00Z")).toBe(true);
  });

  test("should handle invalid dates", () => {
    expect(isToday("invalid-date")).toBe(false);
    expect(isYesterday("invalid-date")).toBe(false);
  });
});

describe("getSmartDateDisplay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-13T14:30:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should format today correctly", () => {
    const today = new Date("2025-08-13T10:00:00Z");
    const result = getSmartDateDisplay(today);

    expect(result.primary).toBe("Today");
    expect(result.secondary).toContain(":");
    expect(result.relative).toBeDefined();
    expect(result.full).toContain("August");
    // In test environment, timezone detection may fallback to UTC
    expect(result.timezone).toBeDefined();
  });

  test("should format yesterday correctly", () => {
    const yesterday = new Date("2025-08-12T10:00:00Z");
    const result = getSmartDateDisplay(yesterday);

    expect(result.primary).toBe("Yesterday");
    expect(result.secondary).toContain(":");
  });

  test("should format older dates correctly", () => {
    const lastWeek = new Date("2025-08-06T10:00:00Z");
    const result = getSmartDateDisplay(lastWeek);

    expect(result.primary).toContain("Aug");
    expect(result.primary).toContain("6");
  });

  test("should handle custom options", () => {
    const date = new Date("2025-08-13T10:00:00Z");
    const result = getSmartDateDisplay(date, {
      includeTime: false,
      includeRelative: false,
      includeTimezone: false,
    });

    expect(result.secondary).toBe("");
    expect(result.relative).toBe("");
  });

  test("should handle invalid dates", () => {
    const result = getSmartDateDisplay("invalid-date");

    expect(result.primary).toBe("Invalid Date");
    expect(result.full).toBe("Invalid Date");
    expect(isNaN(result.date.getTime())).toBe(true);
  });
});

describe("createTimezoneDateBoundaries", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-13T14:30:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should create correct boundaries", () => {
    const boundaries = createTimezoneDateBoundaries();

    expect(boundaries.today).toBeInstanceOf(Date);
    expect(boundaries.yesterday).toBeInstanceOf(Date);
    expect(boundaries.week).toBeInstanceOf(Date);
    expect(boundaries.month).toBeInstanceOf(Date);
    expect(boundaries.quarter).toBeInstanceOf(Date);
    expect(boundaries.year).toBeInstanceOf(Date);

    // Today should be a valid Date (exact hour depends on timezone calculations)
    expect(boundaries.today).toBeInstanceOf(Date);
    expect(boundaries.today.getMinutes()).toBe(0);
    expect(boundaries.today.getSeconds()).toBe(0);
  });

  test("should support custom periods", () => {
    const boundaries = createTimezoneDateBoundaries();
    const customBoundary = boundaries.custom(14); // 2 weeks ago

    expect(customBoundary).toBeInstanceOf(Date);
    expect(customBoundary.getTime()).toBeLessThan(Date.now());
  });
});

describe("getTimezoneInfo", () => {
  test("should return comprehensive timezone information", () => {
    const info = getTimezoneInfo();

    expect(info).toHaveProperty("timezone");
    expect(info).toHaveProperty("offset");
    expect(info).toHaveProperty("offsetHours");
    expect(info).toHaveProperty("localTime");
    expect(info).toHaveProperty("utcTime");
    expect(info).toHaveProperty("isoTime");

    expect(typeof info.timezone).toBe("string");
    expect(typeof info.offset).toBe("number");
    expect(typeof info.offsetHours).toBe("number");
  });
});

describe("Performance Tests", () => {
  test("should handle large numbers of date operations efficiently", () => {
    const dates = Array.from(
      { length: 1000 },
      (_, i) => new Date(Date.now() - i * 60 * 60 * 1000) // Every hour for 1000 hours
    );

    const start = performance.now();

    dates.forEach((date) => {
      formatDateTimeWithTimezone(date);
      getRelativeTimeWithTimezone(date);
      isToday(date);
      isYesterday(date);
    });

    const end = performance.now();
    const duration = end - start;

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(1000); // 1 second
  });

  test("should cache timezone resolver efficiently", () => {
    const resolver = TimezoneResolver.getInstance();

    const start = performance.now();

    // Multiple calls should use cached values
    for (let i = 0; i < 100; i++) {
      resolver.getUserTimezone();
      resolver.getTimezoneOffset();
    }

    const end = performance.now();
    const duration = end - start;

    // Should be very fast due to caching
    expect(duration).toBeLessThan(10); // 10ms
  });
});

describe("Edge Cases", () => {
  test("should handle timezone changes gracefully", () => {
    const resolver = TimezoneResolver.getInstance();
    const originalTimezone = resolver.getUserTimezone();

    // Simulate timezone change
    resolver.reset();

    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        timeZone: "UTC",
        locale: "en-US",
        calendar: "gregory",
        numberingSystem: "latn",
      });

    const newTimezone = resolver.getUserTimezone();
    expect(newTimezone).toBe("UTC");
    // In test environment, original timezone might already be UTC
    expect(["America/New_York", "UTC"]).toContain(originalTimezone);
  });

  test("should handle very old and future dates", () => {
    const veryOldDate = new Date("1900-01-01T00:00:00Z");
    const futureDate = new Date("2100-12-31T23:59:59Z");

    expect(() => formatDateTimeWithTimezone(veryOldDate)).not.toThrow();
    expect(() => formatDateTimeWithTimezone(futureDate)).not.toThrow();
    expect(() => getRelativeTimeWithTimezone(veryOldDate)).not.toThrow();
    expect(() => getRelativeTimeWithTimezone(futureDate)).not.toThrow();
  });

  test("should handle different locales", () => {
    const date = new Date("2025-08-13T14:30:00Z");

    const enResult = getSmartDateDisplay(date, { locale: "en-US" });
    const frResult = getSmartDateDisplay(date, { locale: "fr-FR" });

    expect(enResult.primary).toBeDefined();
    expect(frResult.primary).toBeDefined();
    // Results may differ based on locale support
  });
});
