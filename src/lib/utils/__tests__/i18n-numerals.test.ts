/**
 * @fileoverview Test suite for i18n-numerals utility
 * @description Comprehensive unit tests for internationalization numerals
 */

import {
  toLocaleNumerals,
  toArabicNumerals,
  toPersianNumerals,
  toHindiNumerals,
  isRTLNumerals,
  getSupportedNumeralSystems,
  clearNumeralCache,
  getCacheStats,
  type SupportedLocale,
} from "../i18n-numerals";

describe("i18n-numerals utility", () => {
  beforeEach(() => {
    clearNumeralCache();
  });

  describe("toLocaleNumerals", () => {
    test("converts numbers to Arabic-Indic numerals", () => {
      expect(toLocaleNumerals(123, "ar")).toBe("١٢٣");
      expect(toLocaleNumerals("456.78", "ar")).toBe("٤٥٦.٧٨");
      expect(toLocaleNumerals(0, "ar")).toBe("٠");
    });

    test("converts numbers to Persian numerals", () => {
      expect(toLocaleNumerals(123, "fa")).toBe("۱۲۳");
      expect(toLocaleNumerals("456.78", "fa")).toBe("۴۵۶.۷۸");
    });

    test("converts numbers to Hindi numerals", () => {
      expect(toLocaleNumerals(123, "hi")).toBe("१२३");
      expect(toLocaleNumerals("456.78", "hi")).toBe("४५६.७८");
    });

    test("returns original for English locale", () => {
      expect(toLocaleNumerals(123, "en")).toBe("123");
      expect(toLocaleNumerals("456.78", "en")).toBe("456.78");
    });

    test("handles negative numbers", () => {
      expect(toLocaleNumerals(-123, "ar")).toBe("-١٢٣");
      expect(toLocaleNumerals("-456.78", "fa")).toBe("-۴۵۶.۷۸");
    });

    test("throws error for invalid input", () => {
      expect(() => toLocaleNumerals("abc", "ar")).toThrow(
        "Invalid number format"
      );
      expect(() => toLocaleNumerals("12.34.56", "ar")).toThrow(
        "Invalid number format"
      );
    });

    test("handles unsupported locale gracefully", () => {
      // This should log a warning and return original
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      expect(toLocaleNumerals(123, "xx" as SupportedLocale)).toBe("123");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Unsupported locale: xx, falling back to English numerals"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("convenience functions", () => {
    test("toArabicNumerals works correctly", () => {
      expect(toArabicNumerals(123)).toBe("١٢٣");
      expect(toArabicNumerals("456.78")).toBe("٤٥٦.٧٨");
    });

    test("toPersianNumerals works correctly", () => {
      expect(toPersianNumerals(123)).toBe("۱۲۳");
      expect(toPersianNumerals("456.78")).toBe("۴۵۶.۷۸");
    });

    test("toHindiNumerals works correctly", () => {
      expect(toHindiNumerals(123)).toBe("१२३");
      expect(toHindiNumerals("456.78")).toBe("४५६.७८");
    });
  });

  describe("utility functions", () => {
    test("isRTLNumerals returns correct values", () => {
      expect(isRTLNumerals("ar")).toBe(true);
      expect(isRTLNumerals("fa")).toBe(true);
      expect(isRTLNumerals("ur")).toBe(true);
      expect(isRTLNumerals("en")).toBe(false);
      expect(isRTLNumerals("hi")).toBe(false);
      expect(isRTLNumerals("bn")).toBe(false);
    });

    test("getSupportedNumeralSystems returns all systems", () => {
      const systems = getSupportedNumeralSystems();
      expect(systems).toHaveLength(6);
      expect(systems.find((s) => s.locale === "ar")).toMatchObject({
        locale: "ar",
        name: "Arabic-Indic",
        direction: "rtl",
        sample: "١٢٣٤٥٦٧٨٩",
      });
    });
  });

  describe("performance and caching", () => {
    test("caching improves performance", () => {
      const input = 123456789;
      const locale = "ar";

      // First call
      const start1 = performance.now();
      const result1 = toLocaleNumerals(input, locale);
      const time1 = performance.now() - start1;

      // Second call (should be cached)
      const start2 = performance.now();
      const result2 = toLocaleNumerals(input, locale);
      const time2 = performance.now() - start2;

      expect(result1).toBe(result2);
      expect(time2).toBeLessThan(time1); // Cached call should be faster
    });

    test("cache statistics work correctly", () => {
      clearNumeralCache();
      let stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.operationCount).toBe(0);

      toLocaleNumerals(123, "ar");
      stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.operationCount).toBe(1);
    });

    test("cache can be cleared", () => {
      toLocaleNumerals(123, "ar");
      expect(getCacheStats().size).toBe(1);

      clearNumeralCache();
      expect(getCacheStats().size).toBe(0);
      expect(getCacheStats().operationCount).toBe(0);
    });
  });

  describe("edge cases", () => {
    test("handles empty string", () => {
      expect(() => toLocaleNumerals("", "ar")).toThrow("Invalid number format");
    });

    test("handles very large numbers", () => {
      const largeNumber = "123456789012345678901234567890";
      expect(toLocaleNumerals(largeNumber, "ar")).toBe(
        "١٢٣٤٥٦٧٨٩٠١٢٣٤٥٦٧٨٩٠١٢٣٤٥٦٧٨٩٠"
      );
    });

    test("handles decimal-only numbers", () => {
      expect(toLocaleNumerals(".123", "ar")).toBe(".١٢٣");
      expect(toLocaleNumerals("123.", "ar")).toBe("١٢٣.");
    });

    test("handles zero variations", () => {
      expect(toLocaleNumerals("0", "ar")).toBe("٠");
      expect(toLocaleNumerals("00", "ar")).toBe("٠٠");
      expect(toLocaleNumerals("0.0", "ar")).toBe("٠.٠");
    });
  });
});
