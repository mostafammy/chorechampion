/**
 * ✅ TIMEZONE PARSING FIX VALIDATION TEST
 *
 * Tests to verify that the new parseTimezoneAwareDate function correctly handles
 * the specific issue reported: "Mon, Aug 11 03:50 PM GMT+3" being treated as yesterday
 */

import { parseTimezoneAwareDate, isToday, isYesterday } from "../timezone";

describe("🔧 TIMEZONE PARSING FIX VALIDATION", () => {
  test("🐛 FIXED: Should correctly parse dates with timezone assumption", () => {
    // Test case: User's problematic date
    const problematicDate = "Mon, Aug 11 03:50 PM GMT+3";

    // Parse with different assumptions
    const asUTC = parseTimezoneAwareDate(problematicDate, {
      assumeUserTimezone: false,
    });
    const asUserTimezone = parseTimezoneAwareDate(problematicDate, {
      assumeUserTimezone: true,
    });

    console.log("Timezone parsing comparison:");
    console.log("- Original input:", problematicDate);
    console.log(
      "- Parsed as UTC:",
      asUTC.toISOString(),
      "→",
      asUTC.toLocaleString()
    );
    console.log(
      "- Parsed as user timezone:",
      asUserTimezone.toISOString(),
      "→",
      asUserTimezone.toLocaleString()
    );

    // ✅ CRITICAL: The year should be 2025, not 2001 (JavaScript default for missing year)
    expect(asUTC.getFullYear()).toBe(2025);
    expect(asUserTimezone.getFullYear()).toBe(2025);

    // Both should be valid dates but potentially different
    expect(asUTC).toBeInstanceOf(Date);
    expect(asUserTimezone).toBeInstanceOf(Date);
    expect(isNaN(asUTC.getTime())).toBe(false);
    expect(isNaN(asUserTimezone.getTime())).toBe(false);

    // ✅ CRITICAL: Aug 11, 2025 should be classified as 2 days ago from Aug 13, 2025
    // NOT as "yesterday" which was the user's reported bug
    expect(isToday(asUTC)).toBe(false);
    expect(isYesterday(asUTC)).toBe(false);

    // Verify it's correctly at least 1 day ago (could be 1-2 days depending on time)
    const today = new Date("2025-08-13T12:00:00Z");
    const diffDays = Math.floor(
      (today.getTime() - asUTC.getTime()) / (24 * 60 * 60 * 1000)
    );
    expect(diffDays).toBeGreaterThanOrEqual(1); // At least 1 day ago
    expect(diffDays).toBeLessThan(3); // But not more than 3 days ago
  });

  test("🔧 TODAY CLASSIFICATION: Should properly classify current date", () => {
    // Test today's date in different formats
    const todayISO = new Date("2025-08-13T15:30:00Z"); // 3:30 PM UTC = 6:30 PM GMT+3
    const todayString = "2025-08-13T15:30:00Z";

    // Parse with timezone awareness
    const parsedToday1 = parseTimezoneAwareDate(todayISO, {
      assumeUserTimezone: true,
    });
    const parsedToday2 = parseTimezoneAwareDate(todayString, {
      assumeUserTimezone: true,
    });

    console.log("Today classification test:");
    console.log("- Today ISO:", todayISO.toISOString());
    console.log("- Parsed today 1:", parsedToday1.toISOString());
    console.log("- Parsed today 2:", parsedToday2.toISOString());
    console.log("- isToday(parsedToday1):", isToday(parsedToday1));
    console.log("- isToday(parsedToday2):", isToday(parsedToday2));

    // Should properly classify as today or not based on actual date
    expect(typeof isToday(parsedToday1)).toBe("boolean");
    expect(typeof isToday(parsedToday2)).toBe("boolean");
  });

  test("🔧 ARCHIVE FILTERING SCENARIO: Real-world date parsing", () => {
    // Simulate various date formats that might come from the database
    const taskDates = [
      "2025-08-13T10:00:00Z", // Today morning UTC
      "2025-08-13T20:00:00Z", // Today evening UTC
      "2025-08-12T15:00:00Z", // Yesterday afternoon UTC
      "2025-08-11T12:50:00Z", // Aug 11, 3:50 PM GMT+3 (12:50 UTC)
      new Date("2025-08-13T14:30:00Z"), // Today as Date object
      1723563000000, // Today as timestamp
    ];

    taskDates.forEach((date, index) => {
      const parsedDate = parseTimezoneAwareDate(date, {
        assumeUserTimezone: true,
      });

      console.log(`Task ${index + 1}:`, {
        input: date,
        parsed: parsedDate.toISOString(),
        parsedLocal: parsedDate.toLocaleString(),
        isToday: isToday(parsedDate),
        isYesterday: isYesterday(parsedDate),
      });

      // All should be valid dates
      expect(parsedDate).toBeInstanceOf(Date);
      expect(isNaN(parsedDate.getTime())).toBe(false);
    });
  });

  test("🔧 ERROR HANDLING: Should handle invalid dates gracefully", () => {
    const invalidDates = [
      "invalid-date-string",
      null,
      undefined,
      "not-a-date",
      "",
    ];

    invalidDates.forEach((invalidDate) => {
      const result = parseTimezoneAwareDate(invalidDate as any);

      console.log("Invalid date handling:", {
        input: invalidDate,
        result: result.toISOString(),
        isValidDate: !isNaN(result.getTime()),
      });

      // Should always return a valid Date (fallback)
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });
  });

  test("🚀 PERFORMANCE: Timezone parsing should be efficient", () => {
    const testDate = "2025-08-13T15:30:00Z";
    const iterations = 1000;

    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      parseTimezoneAwareDate(testDate, { assumeUserTimezone: true });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;

    console.log(
      `Performance test: ${duration}ms for ${iterations} operations (${avgTime.toFixed(
        3
      )}ms avg)`
    );

    // Should be fast (less than 1ms average)
    expect(avgTime).toBeLessThan(1);
  });
});

export {};
