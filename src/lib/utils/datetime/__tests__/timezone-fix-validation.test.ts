/**
 * ✅ CRITICAL TIMEZONE LOGIC VALIDATION
 *
 * Tests to verify our timezone boundary fixes are working correctly.
 * Validates that "today" tasks are properly identified and not misclassified.
 */

import {
  createTimezoneDateBoundaries,
  isToday,
  isYesterday,
  getTimezoneInfo,
  TimezoneResolver,
} from "../timezone";

describe("🔧 TIMEZONE LOGIC FIX VALIDATION", () => {
  beforeEach(() => {
    // Reset timezone resolver for clean test state
    TimezoneResolver.getInstance().reset();

    // Mock timezone to GMT+3 (user's timezone from the issue)
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        timeZone: "Europe/Moscow", // GMT+3
        locale: "en-US",
        calendar: "gregory",
        numberingSystem: "latn",
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("🐛 FIXED: Today tasks should be correctly identified", () => {
    // Test case: Aug 13, 2025 (current date according to context)
    const todayUTC = new Date("2025-08-13T10:00:00Z"); // 10 AM UTC
    const todayGMTPlus3 = new Date("2025-08-13T15:50:00Z"); // 3:50 PM UTC (6:50 PM GMT+3)

    console.log("Testing today classification:");
    console.log("- Today UTC:", todayUTC.toISOString());
    console.log("- Today GMT+3:", todayGMTPlus3.toISOString());

    // Both should be classified as "today" in GMT+3 timezone
    expect(isToday(todayUTC)).toBe(true);
    expect(isToday(todayGMTPlus3)).toBe(true);
  });

  test("🐛 FIXED: Yesterday tasks should not be misclassified", () => {
    // Test case: Aug 11, 2025 3:50 PM GMT+3 (the problematic date from issue)
    const aug11GMTPlus3 = new Date("2025-08-11T12:50:00Z"); // 12:50 UTC = 3:50 PM GMT+3

    console.log("Testing yesterday classification:");
    console.log("- Aug 11 GMT+3:", aug11GMTPlus3.toISOString());
    console.log(
      "- Should be classified as neither today nor yesterday (2 days ago)"
    );

    // Aug 11 should NOT be today or yesterday (it's 2 days ago from Aug 13)
    expect(isToday(aug11GMTPlus3)).toBe(false);
    expect(isYesterday(aug11GMTPlus3)).toBe(false);
  });

  test("🐛 FIXED: Actual yesterday should be correctly identified", () => {
    // Test case: Aug 12, 2025 (actual yesterday from Aug 13)
    const actualYesterday = new Date("2025-08-12T15:30:00Z"); // 3:30 PM UTC = 6:30 PM GMT+3

    console.log("Testing actual yesterday:");
    console.log("- Aug 12 GMT+3:", actualYesterday.toISOString());

    expect(isToday(actualYesterday)).toBe(false);
    expect(isYesterday(actualYesterday)).toBe(true);
  });

  test("🔧 TIMEZONE BOUNDARIES: Today boundary should include all of today in user timezone", () => {
    const boundaries = createTimezoneDateBoundaries();

    // Test various times during "today" in GMT+3
    const earlyMorning = new Date("2025-08-13T02:00:00Z"); // 5 AM GMT+3
    const afternoon = new Date("2025-08-13T12:00:00Z"); // 3 PM GMT+3
    const lateEvening = new Date("2025-08-13T20:59:00Z"); // 11:59 PM GMT+3

    console.log("Testing today boundary filtering:");
    console.log("- Boundary:", boundaries.today.toISOString());
    console.log(
      "- Early morning:",
      earlyMorning.toISOString(),
      ">=?",
      earlyMorning >= boundaries.today
    );
    console.log(
      "- Afternoon:",
      afternoon.toISOString(),
      ">=?",
      afternoon >= boundaries.today
    );
    console.log(
      "- Late evening:",
      lateEvening.toISOString(),
      ">=?",
      lateEvening >= boundaries.today
    );

    // All of these should be included in "today" filter
    expect(earlyMorning >= boundaries.today).toBe(true);
    expect(afternoon >= boundaries.today).toBe(true);
    expect(lateEvening >= boundaries.today).toBe(true);
  });

  test("🔧 TIMEZONE BOUNDARIES: Yesterday tasks should be excluded from today filter", () => {
    const boundaries = createTimezoneDateBoundaries();

    // Test yesterday times that should be excluded
    const yesterdayMorning = new Date("2025-08-12T02:00:00Z"); // Aug 12, 5 AM GMT+3
    const yesterdayEvening = new Date("2025-08-12T20:59:00Z"); // Aug 12, 11:59 PM GMT+3

    console.log("Testing yesterday exclusion:");
    console.log("- Boundary:", boundaries.today.toISOString());
    console.log(
      "- Yesterday morning:",
      yesterdayMorning.toISOString(),
      ">=?",
      yesterdayMorning >= boundaries.today
    );
    console.log(
      "- Yesterday evening:",
      yesterdayEvening.toISOString(),
      ">=?",
      yesterdayEvening >= boundaries.today
    );

    // These should be excluded from "today" filter
    expect(yesterdayMorning >= boundaries.today).toBe(false);
    expect(yesterdayEvening >= boundaries.today).toBe(false);
  });

  test("🔧 TIMEZONE INFO: Should correctly detect GMT+3 timezone", () => {
    const timezoneInfo = getTimezoneInfo();

    console.log("Timezone detection:");
    console.log("- Detected timezone:", timezoneInfo.timezone);
    console.log("- Offset hours:", timezoneInfo.offsetHours);

    expect(timezoneInfo.timezone).toBe("Europe/Moscow");
    expect(timezoneInfo.offsetHours).toBe(3); // GMT+3
  });

  test("🚀 PERFORMANCE: Timezone calculations should be efficient", () => {
    const startTime = Date.now();

    // Run multiple operations
    for (let i = 0; i < 100; i++) {
      isToday(new Date());
      isYesterday(new Date());
      createTimezoneDateBoundaries();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Performance test: ${duration}ms for 300 operations`);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
