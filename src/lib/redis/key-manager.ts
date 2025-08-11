/**
 * ✅ ENTERPRISE REDIS KEY MANAGEMENT SYSTEM
 *
 * Comprehensive Redis key generation, parsing, and management utilities.
 * Follows enterprise patterns with proper validation, error handling,
 * and performance optimization.
 *
 * @module RedisKeyManager
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import type { Period } from "@/types";
import { CoreError, Validators, TypeGuards, Performance } from "../utils/core";

/**
 * ✅ KEY PATTERN DEFINITIONS
 *
 * Centralized key pattern management for consistency
 */
const KEY_PATTERNS = Object.freeze({
  COMPLETION_KEY: /^task:completion:(daily|weekly|monthly):(.+):(.+)$/,
  DATE_PATTERNS: {
    DAILY: /^\d{4}-\d{2}-\d{2}$/,
    WEEKLY: /^(\d{4})-W(\d{2})$/,
    MONTHLY: /^(\d{4})-(\d{2})$/,
  },
  TASK_ID: /^[a-zA-Z0-9\-_]+$/,
} as const);

/**
 * ✅ KEY CONFIGURATION
 *
 * Configuration constants for key management
 */
const KEY_CONFIG = Object.freeze({
  PREFIX: "task:completion",
  SEPARATOR: ":",
  MAX_TASK_ID_LENGTH: 128,
  MAX_KEY_LENGTH: 256,
  SUPPORTED_PERIODS: ["daily", "weekly", "monthly"] as const,
  BATCH_SIZE: 1000,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
} as const);

/**
 * ✅ TYPE DEFINITIONS
 */
export interface ParsedCompletionKey {
  readonly period: Period;
  readonly taskId: string;
  readonly datePart: string;
  readonly date: Date;
  readonly isValid: true;
  readonly keyType: "completion";
  readonly originalKey: string;
}

export interface ParsedCompletionKeyError {
  readonly period: null;
  readonly taskId: null;
  readonly datePart: null;
  readonly date: null;
  readonly isValid: false;
  readonly error: string;
  readonly keyType: "completion";
  readonly originalKey: string;
}

export type ParseResult = ParsedCompletionKey | ParsedCompletionKeyError;

export interface KeyGenerationOptions {
  validateTaskId?: boolean;
  normalizeDate?: boolean;
  allowFutureDate?: boolean;
}

export interface KeyParsingOptions {
  strict?: boolean;
  validateDate?: boolean;
  timezone?: string;
}

export interface DateRangeQuery {
  startDate: Date;
  endDate: Date;
  period?: Period;
  timezone?: string;
}

/**
 * ✅ ENTERPRISE REDIS KEY MANAGER
 *
 * Centralized key management with comprehensive validation and error handling
 */
export class RedisKeyManager {
  private static cache = new Map<
    string,
    { result: ParseResult; expires: number }
  >();

  /**
   * ✅ GENERATE COMPLETION KEY
   *
   * Generates Redis completion keys with comprehensive validation.
   *
   * @param period - Task completion period
   * @param taskId - Unique task identifier
   * @param date - Target date (defaults to current date)
   * @param options - Generation options
   * @returns Generated Redis key
   * @throws CoreError if validation fails
   *
   * @example
   * ```typescript
   * const key = RedisKeyManager.generateCompletionKey('daily', 'task-123', new Date());
   * // Returns: 'task:completion:daily:task-123:2025-08-11'
   * ```
   */
  static generateCompletionKey(
    period: Period,
    taskId: string,
    date: Date = new Date(),
    options: KeyGenerationOptions = {}
  ): string {
    const {
      validateTaskId = true,
      normalizeDate = true,
      allowFutureDate = true,
    } = options;

    // Input validation
    this.validatePeriod(period);
    this.validateTaskId(taskId, validateTaskId);
    this.validateDate(date, allowFutureDate);

    // Normalize date if requested
    const targetDate = normalizeDate ? this.normalizeDate(date, period) : date;

    // Generate date part
    const datePart = this.formatDatePart(period, targetDate);

    // Construct key
    const key = `${KEY_CONFIG.PREFIX}${KEY_CONFIG.SEPARATOR}${period}${KEY_CONFIG.SEPARATOR}${taskId}${KEY_CONFIG.SEPARATOR}${datePart}`;

    // Validate final key length
    if (key.length > KEY_CONFIG.MAX_KEY_LENGTH) {
      throw new CoreError(
        `Generated key exceeds maximum length of ${KEY_CONFIG.MAX_KEY_LENGTH}`,
        "KEY_TOO_LONG",
        { key, length: key.length, maxLength: KEY_CONFIG.MAX_KEY_LENGTH }
      );
    }

    return key;
  }

  /**
   * ✅ PARSE COMPLETION KEY
   *
   * Parses Redis completion keys with comprehensive validation.
   *
   * @param key - Redis key to parse
   * @param options - Parsing options
   * @returns Parsed key information or error
   *
   * @example
   * ```typescript
   * const result = RedisKeyManager.parseCompletionKey('task:completion:daily:task-123:2025-08-11');
   * if (result.isValid) {
   *   console.log(`Task: ${result.taskId}, Date: ${result.date.toISOString()}`);
   * }
   * ```
   */
  static parseCompletionKey(
    key: string,
    options: KeyParsingOptions = {}
  ): ParseResult {
    const { strict = false, validateDate = true } = options;

    // Check cache first
    const cached = this.getFromCache(key);
    if (cached) {
      return cached;
    }

    try {
      // Input validation
      Validators.requireString(key, "key");

      if (key.length > KEY_CONFIG.MAX_KEY_LENGTH) {
        return this.createError(
          key,
          `Key exceeds maximum length of ${KEY_CONFIG.MAX_KEY_LENGTH}`
        );
      }

      // Pattern matching
      const match = key.match(KEY_PATTERNS.COMPLETION_KEY);
      if (!match) {
        return this.createError(
          key,
          "Invalid key format. Expected: task:completion:{period}:{taskId}:{datePart}"
        );
      }

      const [, period, taskId, datePart] = match;

      // Validate components
      if (strict) {
        this.validatePeriod(period as Period);
        this.validateTaskId(taskId, true);
      }

      // Parse date
      let parsedDate: Date;
      try {
        parsedDate = this.parseDatePart(period as Period, datePart);

        if (validateDate && isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        return this.createError(
          key,
          `Failed to parse date part "${datePart}" for period "${period}": ${error}`
        );
      }

      const result: ParsedCompletionKey = {
        period: period as Period,
        taskId,
        datePart,
        date: parsedDate,
        isValid: true,
        keyType: "completion",
        originalKey: key,
      };

      // Cache the result
      this.setCache(key, result);

      // Cache and return result
      this.setCache(key, result);
      return result;
    } catch (error) {
      return this.createError(
        key,
        error instanceof CoreError
          ? error.message
          : `Unexpected error: ${error}`
      );
    }
  }

  /**
   * ✅ BATCH PARSE COMPLETION KEYS
   *
   * Efficiently parses multiple Redis keys with parallel processing.
   *
   * @param keys - Array of Redis keys to parse
   * @param options - Parsing options
   * @returns Array of parsed results
   */
  static parseCompletionKeys(
    keys: string[],
    options: KeyParsingOptions = {}
  ): ParseResult[] {
    if (!Array.isArray(keys)) {
      throw new CoreError("Keys must be an array", "INVALID_INPUT_TYPE", {
        receivedType: typeof keys,
      });
    }

    // Process keys in batches for better performance
    const results: ParseResult[] = [];

    for (let i = 0; i < keys.length; i += KEY_CONFIG.BATCH_SIZE) {
      const batch = keys.slice(i, i + KEY_CONFIG.BATCH_SIZE);
      const batchResults = batch.map((key) =>
        this.parseCompletionKey(key, options)
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * ✅ FILTER VALID KEYS
   *
   * Filters and returns only valid parsed keys.
   *
   * @param keys - Array of Redis keys to parse
   * @param options - Parsing options
   * @returns Array of valid parsed keys only
   */
  static parseValidCompletionKeys(
    keys: string[],
    options: KeyParsingOptions = {}
  ): ParsedCompletionKey[] {
    const results = this.parseCompletionKeys(keys, options);
    return results.filter(
      (result): result is ParsedCompletionKey => result.isValid
    );
  }

  /**
   * ✅ GROUP KEYS BY PERIOD
   *
   * Groups parsed keys by their period type.
   *
   * @param keys - Array of Redis keys to parse
   * @param options - Parsing options
   * @returns Object with keys grouped by period
   */
  static async groupKeysByPeriod(
    keys: string[],
    options: KeyParsingOptions = {}
  ): Promise<Record<Period, ParsedCompletionKey[]>> {
    const validKeys = await this.parseValidCompletionKeys(keys, options);

    return validKeys.reduce((groups, key) => {
      if (!groups[key.period]) {
        groups[key.period] = [];
      }
      groups[key.period].push(key);
      return groups;
    }, {} as Record<Period, ParsedCompletionKey[]>);
  }

  /**
   * ✅ FILTER KEYS BY DATE RANGE
   *
   * Filters keys within a specific date range.
   *
   * @param keys - Array of Redis keys to parse
   * @param query - Date range query parameters
   * @param options - Parsing options
   * @returns Array of keys within the date range
   */
  static getKeysInDateRange(
    keys: string[],
    query: DateRangeQuery,
    options: KeyParsingOptions = {}
  ): ParsedCompletionKey[] {
    const { startDate, endDate, period } = query;

    // Validate date range
    if (startDate >= endDate) {
      throw new CoreError(
        "Start date must be before end date",
        "INVALID_DATE_RANGE",
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      );
    }

    const validKeys = this.parseValidCompletionKeys(keys, options);

    return validKeys.filter((key) => {
      // Filter by period if specified
      if (period && key.period !== period) {
        return false;
      }

      // Filter by date range
      const keyDate = key.date;
      return keyDate >= startDate && keyDate <= endDate;
    });
  }

  /**
   * ✅ GENERATE KEY PATTERN
   *
   * Generates Redis scan patterns for key discovery.
   *
   * @param period - Optional period filter
   * @param taskId - Optional task ID filter
   * @returns Redis scan pattern
   */
  static generateScanPattern(period?: Period, taskId?: string): string {
    let pattern = `${KEY_CONFIG.PREFIX}${KEY_CONFIG.SEPARATOR}`;

    if (period) {
      this.validatePeriod(period);
      pattern += `${period}${KEY_CONFIG.SEPARATOR}`;
    } else {
      pattern += "*:";
    }

    if (taskId) {
      this.validateTaskId(taskId, true);
      pattern += `${taskId}${KEY_CONFIG.SEPARATOR}*`;
    } else {
      pattern += "*";
    }

    return pattern;
  }

  /**
   * ✅ PRIVATE VALIDATION METHODS
   */
  private static validatePeriod(period: string): asserts period is Period {
    if (!KEY_CONFIG.SUPPORTED_PERIODS.includes(period as Period)) {
      throw new CoreError(
        `Invalid period: ${period}. Supported periods: ${KEY_CONFIG.SUPPORTED_PERIODS.join(
          ", "
        )}`,
        "INVALID_PERIOD",
        { period, supportedPeriods: KEY_CONFIG.SUPPORTED_PERIODS }
      );
    }
  }

  private static validateTaskId(taskId: string, strict: boolean): void {
    Validators.requireString(taskId, "taskId");

    if (taskId.length > KEY_CONFIG.MAX_TASK_ID_LENGTH) {
      throw new CoreError(
        `Task ID exceeds maximum length of ${KEY_CONFIG.MAX_TASK_ID_LENGTH}`,
        "TASK_ID_TOO_LONG",
        {
          taskId,
          length: taskId.length,
          maxLength: KEY_CONFIG.MAX_TASK_ID_LENGTH,
        }
      );
    }

    if (strict && !KEY_PATTERNS.TASK_ID.test(taskId)) {
      throw new CoreError(
        "Task ID contains invalid characters. Only alphanumeric, hyphens, and underscores are allowed",
        "INVALID_TASK_ID",
        { taskId }
      );
    }
  }

  private static validateDate(date: Date, allowFuture: boolean): void {
    Validators.requireDate(date, "date");

    if (!allowFuture && date > new Date()) {
      throw new CoreError(
        "Future dates are not allowed",
        "FUTURE_DATE_NOT_ALLOWED",
        { date: date.toISOString() }
      );
    }
  }

  /**
   * ✅ PRIVATE DATE HANDLING METHODS
   */
  private static normalizeDate(date: Date, period: Period): Date {
    const normalized = new Date(date);

    switch (period) {
      case "daily":
        normalized.setUTCHours(0, 0, 0, 0);
        break;
      case "weekly":
        // Set to Monday of the week
        const dayOfWeek = normalized.getUTCDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        normalized.setUTCDate(normalized.getUTCDate() + diff);
        normalized.setUTCHours(0, 0, 0, 0);
        break;
      case "monthly":
        normalized.setUTCDate(1);
        normalized.setUTCHours(0, 0, 0, 0);
        break;
    }

    return normalized;
  }

  private static formatDatePart(period: Period, date: Date): string {
    switch (period) {
      case "daily":
        return date.toISOString().slice(0, 10); // YYYY-MM-DD
      case "weekly":
        return this.formatWeekString(date);
      case "monthly":
        return `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      default:
        throw new CoreError(`Unknown period: ${period}`, "UNKNOWN_PERIOD", {
          period,
        });
    }
  }

  private static formatWeekString(date: Date): string {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
  }

  private static parseDatePart(period: Period, datePart: string): Date {
    switch (period) {
      case "daily":
        return this.parseDailyDate(datePart);
      case "weekly":
        return this.parseWeeklyDate(datePart);
      case "monthly":
        return this.parseMonthlyDate(datePart);
      default:
        throw new CoreError(`Unknown period: ${period}`, "UNKNOWN_PERIOD", {
          period,
        });
    }
  }

  private static parseDailyDate(datePart: string): Date {
    if (!KEY_PATTERNS.DATE_PATTERNS.DAILY.test(datePart)) {
      throw new CoreError(
        `Invalid daily date format: ${datePart}. Expected YYYY-MM-DD`,
        "INVALID_DATE_FORMAT",
        { datePart, expectedFormat: "YYYY-MM-DD" }
      );
    }

    const date = new Date(datePart + "T00:00:00.000Z");
    if (isNaN(date.getTime())) {
      throw new CoreError(`Invalid date: ${datePart}`, "INVALID_DATE", {
        datePart,
      });
    }

    return date;
  }

  private static parseWeeklyDate(datePart: string): Date {
    const match = datePart.match(KEY_PATTERNS.DATE_PATTERNS.WEEKLY);
    if (!match) {
      throw new CoreError(
        `Invalid weekly date format: ${datePart}. Expected YYYY-WNN`,
        "INVALID_DATE_FORMAT",
        { datePart, expectedFormat: "YYYY-WNN" }
      );
    }

    const [, yearStr, weekStr] = match;
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    if (week < 1 || week > 53) {
      throw new CoreError(
        `Invalid week number: ${week}. Must be between 1 and 53`,
        "INVALID_WEEK_NUMBER",
        { week, year }
      );
    }

    // Calculate Monday of the given ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4DayOfWeek = jan4.getUTCDay() || 7;
    const mondayOfWeek1 = new Date(
      jan4.getTime() - (jan4DayOfWeek - 1) * 86400000
    );
    const mondayOfTargetWeek = new Date(
      mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000
    );

    return mondayOfTargetWeek;
  }

  private static parseMonthlyDate(datePart: string): Date {
    const match = datePart.match(KEY_PATTERNS.DATE_PATTERNS.MONTHLY);
    if (!match) {
      throw new CoreError(
        `Invalid monthly date format: ${datePart}. Expected YYYY-MM`,
        "INVALID_DATE_FORMAT",
        { datePart, expectedFormat: "YYYY-MM" }
      );
    }

    const [, yearStr, monthStr] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (month < 1 || month > 12) {
      throw new CoreError(
        `Invalid month: ${month}. Must be between 1 and 12`,
        "INVALID_MONTH",
        { month, year }
      );
    }

    return new Date(Date.UTC(year, month - 1, 1));
  }

  /**
   * ✅ CACHE MANAGEMENT
   */
  private static getFromCache(key: string): ParseResult | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache(key: string, result: ParseResult): void {
    this.cache.set(key, {
      result,
      expires: Date.now() + KEY_CONFIG.CACHE_TTL,
    });
  }

  /**
   * ✅ ERROR CREATION HELPER
   */
  private static createError(
    key: string,
    message: string
  ): ParsedCompletionKeyError {
    return {
      period: null,
      taskId: null,
      datePart: null,
      date: null,
      isValid: false,
      error: message,
      keyType: "completion",
      originalKey: key,
    };
  }

  /**
   * ✅ CACHE CLEANUP
   */
  static cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * ✅ LEGACY COMPATIBILITY FUNCTIONS
 *
 * Maintains backward compatibility with existing code
 */
export function generateCompletionKey(
  period: Period,
  taskId: string,
  date: Date = new Date()
): string {
  return RedisKeyManager.generateCompletionKey(period, taskId, date);
}

export function parseCompletionKey(key: string): ParseResult {
  return RedisKeyManager.parseCompletionKey(key);
}

export function parseCompletionKeys(keys: string[]): ParseResult[] {
  return RedisKeyManager.parseCompletionKeys(keys);
}

export function parseValidCompletionKeys(
  keys: string[]
): ParsedCompletionKey[] {
  return RedisKeyManager.parseValidCompletionKeys(keys);
}

export async function groupKeysByPeriod(
  keys: string[]
): Promise<Record<Period, ParsedCompletionKey[]>> {
  return await RedisKeyManager.groupKeysByPeriod(keys);
}

export function getKeysInDateRange(
  keys: string[],
  startDate: Date,
  endDate: Date
): ParsedCompletionKey[] {
  return RedisKeyManager.getKeysInDateRange(keys, { startDate, endDate });
}
