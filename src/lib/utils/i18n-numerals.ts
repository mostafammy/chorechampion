/**
 * @fileoverview Internationalization Numerals Utility
 * @description Enterprise-grade utility for converting numbers to locale-specific numeral systems
 * @author Principal Engineer
 * @version 1.0.0
 *
 * Features:
 * - High-performance number conversion with memoization
 * - Type-safe locale handling
 * - Extensible numeral system support
 * - Zero dependencies
 * - Memory-efficient caching
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Supported locale codes for numeral conversion
 */
export type SupportedLocale = "ar" | "en" | "fa" | "ur" | "hi" | "bn";

/**
 * Numeral system mapping interface
 */
interface NumeralSystem {
  readonly name: string;
  readonly digits: readonly string[];
  readonly direction: "ltr" | "rtl";
}

/**
 * Cache entry for memoization
 */
interface CacheEntry {
  readonly result: string;
  readonly timestamp: number;
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Numeral systems mapping with Unicode-compliant digits
 * Performance: Pre-computed readonly arrays for O(1) access
 */
const NUMERAL_SYSTEMS: Readonly<Record<string, NumeralSystem>> = {
  // Arabic-Indic numerals (Eastern Arabic)
  ar: {
    name: "Arabic-Indic",
    digits: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const,
    direction: "rtl",
  },

  // Persian/Farsi numerals
  fa: {
    name: "Persian",
    digits: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const,
    direction: "rtl",
  },

  // Urdu numerals (same as Arabic-Indic)
  ur: {
    name: "Urdu",
    digits: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const,
    direction: "rtl",
  },

  // Devanagari numerals (Hindi)
  hi: {
    name: "Devanagari",
    digits: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"] as const,
    direction: "ltr",
  },

  // Bengali numerals
  bn: {
    name: "Bengali",
    digits: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const,
    direction: "ltr",
  },

  // Western Arabic numerals (default)
  en: {
    name: "Western Arabic",
    digits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const,
    direction: "ltr",
  },
} as const;

/**
 * Cache configuration for performance optimization
 */
const CACHE_CONFIG = {
  MAX_SIZE: 1000, // Maximum cache entries
  TTL_MS: 5 * 60 * 1000, // 5 minutes TTL
  CLEANUP_INTERVAL: 1000, // Cleanup every 1000 operations
} as const;

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

/**
 * LRU Cache implementation for memoization
 * Performance: O(1) get/set operations with automatic cleanup
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Global cache instance for converted numbers
 * Memory-efficient with automatic cleanup
 */
const conversionCache = new LRUCache<string, CacheEntry>(CACHE_CONFIG.MAX_SIZE);
let operationCount = 0;

/**
 * Cleanup expired cache entries
 * Performance: Batch cleanup to minimize GC pressure
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  // Note: LRUCache doesn't expose iteration, so we'll implement TTL differently
  // For now, we'll rely on LRU eviction and periodic full cleanup
  if (operationCount % (CACHE_CONFIG.MAX_SIZE / 2) === 0) {
    conversionCache.clear();
  }
}

// ============================================================================
// CORE CONVERSION LOGIC
// ============================================================================

/**
 * Fast digit lookup using pre-computed character codes
 * Performance: O(1) digit conversion
 */
const DIGIT_CHAR_CODES = new Map([
  [48, 0],
  [49, 1],
  [50, 2],
  [51, 3],
  [52, 4],
  [53, 5],
  [54, 6],
  [55, 7],
  [56, 8],
  [57, 9],
]);

/**
 * Convert a single digit character to target numeral system
 * @param digitChar - Single digit character ('0'-'9')
 * @param targetDigits - Target numeral system digits array
 * @returns Converted digit or original character if not a digit
 */
function convertDigit(
  digitChar: string,
  targetDigits: readonly string[]
): string {
  const charCode = digitChar.charCodeAt(0);
  const digitIndex = DIGIT_CHAR_CODES.get(charCode);

  return digitIndex !== undefined ? targetDigits[digitIndex] : digitChar;
}

/**
 * High-performance number string conversion
 * @param numberStr - String representation of number
 * @param targetDigits - Target numeral system digits
 * @returns Converted number string
 */
function convertNumberString(
  numberStr: string,
  targetDigits: readonly string[]
): string {
  // Fast path for Western Arabic numerals
  if (targetDigits === NUMERAL_SYSTEMS.en.digits) {
    return numberStr;
  }

  // Optimized character-by-character conversion
  let result = "";
  for (let i = 0; i < numberStr.length; i++) {
    result += convertDigit(numberStr[i], targetDigits);
  }

  return result;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Convert a number to locale-specific numeral system
 *
 * @param input - Number or string to convert
 * @param locale - Target locale code
 * @returns Converted number string in target numeral system
 *
 * @example
 * ```typescript
 * toLocaleNumerals(123, 'ar') // Returns '١٢٣'
 * toLocaleNumerals('456.78', 'fa') // Returns '۴۵۶.۷۸'
 * toLocaleNumerals(0, 'hi') // Returns '०'
 * ```
 *
 * @throws {Error} When input contains invalid characters
 */
export function toLocaleNumerals(
  input: number | string,
  locale: SupportedLocale
): string {
  // Input validation and normalization
  const numberStr = typeof input === "number" ? input.toString() : input;

  // Handle empty string
  if (numberStr === "") {
    throw new Error("Invalid number format: empty string");
  }

  // Validate number string format
  if (!/^-?\d+\.?\d*$|^-?\d*\.\d+$/.test(numberStr)) {
    throw new Error(`Invalid number format: ${numberStr}`);
  }

  // Fast path for English locale
  if (locale === "en") {
    return numberStr;
  }

  // Cache key generation
  const cacheKey = `${numberStr}:${locale}`;
  operationCount++;

  // Cache lookup
  const cached = conversionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL_MS) {
    return cached.result;
  }

  // Get target numeral system
  const system = NUMERAL_SYSTEMS[locale];
  if (!system) {
    console.warn(
      `Unsupported locale: ${locale}, falling back to English numerals`
    );
    return numberStr;
  }

  // Perform conversion
  const result = convertNumberString(numberStr, system.digits);

  // Cache the result
  conversionCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  // Periodic cleanup
  if (operationCount % CACHE_CONFIG.CLEANUP_INTERVAL === 0) {
    cleanupExpiredEntries();
  }

  return result;
}

/**
 * Check if a locale uses right-to-left numeral direction
 * @param locale - Locale code to check
 * @returns True if RTL, false otherwise
 */
export function isRTLNumerals(locale: SupportedLocale): boolean {
  return NUMERAL_SYSTEMS[locale]?.direction === "rtl";
}

/**
 * Get available numeral systems information
 * @returns Array of supported numeral systems
 */
export function getSupportedNumeralSystems(): Array<{
  locale: SupportedLocale;
  name: string;
  direction: "ltr" | "rtl";
  sample: string;
}> {
  return Object.entries(NUMERAL_SYSTEMS).map(([locale, system]) => ({
    locale: locale as SupportedLocale,
    name: system.name,
    direction: system.direction,
    sample: convertNumberString("123456789", system.digits),
  }));
}

/**
 * Clear the conversion cache (useful for memory management)
 */
export function clearNumeralCache(): void {
  conversionCache.clear();
  operationCount = 0;
}

/**
 * Get cache statistics for monitoring and debugging
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  operationCount: number;
} {
  return {
    size: conversionCache.size,
    maxSize: CACHE_CONFIG.MAX_SIZE,
    operationCount,
  };
}

// ============================================================================
// CONVENIENCE UTILITIES
// ============================================================================

/**
 * Arabic-specific convenience function
 * @param input - Number or string to convert
 * @returns Number in Arabic-Indic numerals
 */
export function toArabicNumerals(input: number | string): string {
  return toLocaleNumerals(input, "ar");
}

/**
 * Persian-specific convenience function
 * @param input - Number or string to convert
 * @returns Number in Persian numerals
 */
export function toPersianNumerals(input: number | string): string {
  return toLocaleNumerals(input, "fa");
}

/**
 * Hindi-specific convenience function
 * @param input - Number or string to convert
 * @returns Number in Devanagari numerals
 */
export function toHindiNumerals(input: number | string): string {
  return toLocaleNumerals(input, "hi");
}
