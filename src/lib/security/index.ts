/**
 * ✅ ENTERPRISE SECURITY UTILITIES
 *
 * Comprehensive security utilities following OWASP best practices.
 * Designed for XSS prevention, input sanitization, and data validation.
 *
 * @module SecurityUtils
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import { CoreError, Validators, TypeGuards } from "../utils/core";

/**
 * ✅ HTML ESCAPE MAPPING
 *
 * Comprehensive HTML entity mapping following OWASP recommendations.
 * Prevents XSS attacks through proper entity encoding.
 */
const HTML_ESCAPE_MAP = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
  "\n": "&#10;",
  "\r": "&#13;",
  "\t": "&#9;",
} as const);

/**
 * ✅ SECURITY VALIDATION PATTERNS
 *
 * Pre-compiled regex patterns for common security validations
 */
const SECURITY_PATTERNS = Object.freeze({
  EMAIL:
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SAFE_STRING: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  SQL_INJECTION: /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  XSS_BASIC:
    /(<script[\s\S]*?>[\s\S]*?<\/script>)|(<iframe[\s\S]*?>[\s\S]*?<\/iframe>)|(<object[\s\S]*?>[\s\S]*?<\/object>)/gi,
  CONTROL_CHARS: /[\x00-\x1F\x7F]/g,
} as const);

/**
 * ✅ SECURITY CONFIGURATION
 *
 * Configurable security limits and thresholds
 */
const SECURITY_LIMITS = Object.freeze({
  MAX_INPUT_LENGTH: 10000,
  MAX_EMAIL_LENGTH: 254,
  MAX_URL_LENGTH: 2048,
  MAX_JSON_DEPTH: 10,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const);

/**
 * ✅ ENTERPRISE SECURITY UTILITIES CLASS
 *
 * Centralized security operations with comprehensive error handling
 */
export class SecurityUtils {
  /**
   * ✅ ENHANCED HTML ESCAPING
   *
   * Escapes HTML entities to prevent XSS attacks.
   * More comprehensive than basic implementations.
   *
   * @param input - String to escape
   * @returns HTML-safe string
   * @throws CoreError if input is invalid
   *
   * @example
   * ```typescript
   * SecurityUtils.escapeHtml('<script>alert("xss")</script>')
   * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
   * ```
   */
  static escapeHtml(input: string): string {
    // Input validation
    if (typeof input !== "string") {
      throw new CoreError("Input must be a string", "INVALID_INPUT_TYPE", {
        receivedType: typeof input,
      });
    }

    // Length validation
    if (input.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
      throw new CoreError(
        `Input exceeds maximum length of ${SECURITY_LIMITS.MAX_INPUT_LENGTH}`,
        "INPUT_TOO_LONG",
        {
          inputLength: input.length,
          maxLength: SECURITY_LIMITS.MAX_INPUT_LENGTH,
        }
      );
    }

    // Escape HTML entities
    return input.replace(/[&<>"'`=\/\n\r\t]/g, (char) => {
      return HTML_ESCAPE_MAP[char as keyof typeof HTML_ESCAPE_MAP] || char;
    });
  }

  /**
   * ✅ COMPREHENSIVE INPUT SANITIZATION
   *
   * Sanitizes user input for safe processing and storage.
   * Removes control characters and normalizes whitespace.
   *
   * @param input - String to sanitize
   * @param options - Sanitization options
   * @returns Sanitized string
   */
  static sanitizeInput(
    input: string,
    options: {
      maxLength?: number;
      allowHtml?: boolean;
      preserveWhitespace?: boolean;
      strict?: boolean;
    } = {}
  ): string {
    const {
      maxLength = SECURITY_LIMITS.MAX_INPUT_LENGTH,
      allowHtml = false,
      preserveWhitespace = false,
      strict = false,
    } = options;

    // Input validation
    Validators.requireString(input, "input");

    let sanitized = input;

    // Remove control characters
    sanitized = sanitized.replace(SECURITY_PATTERNS.CONTROL_CHARS, "");

    // Normalize whitespace if not preserving
    if (!preserveWhitespace) {
      sanitized = sanitized.replace(/\s+/g, " ").trim();
    }

    // Escape HTML if not allowed
    if (!allowHtml) {
      sanitized = this.escapeHtml(sanitized);
    }

    // Strict mode: only allow safe characters
    if (strict && !SECURITY_PATTERNS.SAFE_STRING.test(sanitized)) {
      throw new CoreError(
        "Input contains unsafe characters",
        "UNSAFE_CHARACTERS",
        { input: sanitized }
      );
    }

    // Length validation
    if (sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength);
    }

    return sanitized;
  }

  /**
   * ✅ EMAIL VALIDATION & SANITIZATION
   *
   * Validates and sanitizes email addresses according to RFC 5322.
   * Includes comprehensive security checks.
   *
   * @param email - Email address to validate
   * @returns Normalized email address
   * @throws CoreError if email is invalid
   */
  static validateEmail(email: string): string {
    // Input validation
    Validators.requireString(email, "email");

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Length validation
    if (normalizedEmail.length > SECURITY_LIMITS.MAX_EMAIL_LENGTH) {
      throw new CoreError(
        `Email exceeds maximum length of ${SECURITY_LIMITS.MAX_EMAIL_LENGTH}`,
        "EMAIL_TOO_LONG",
        { email: normalizedEmail, maxLength: SECURITY_LIMITS.MAX_EMAIL_LENGTH }
      );
    }

    // Format validation
    if (!SECURITY_PATTERNS.EMAIL.test(normalizedEmail)) {
      throw new CoreError("Invalid email format", "INVALID_EMAIL_FORMAT", {
        email: normalizedEmail,
      });
    }

    // Security validation
    if (SECURITY_PATTERNS.SQL_INJECTION.test(normalizedEmail)) {
      throw new CoreError(
        "Email contains potentially malicious content",
        "SUSPICIOUS_EMAIL",
        { email: normalizedEmail }
      );
    }

    return normalizedEmail;
  }

  /**
   * ✅ UUID VALIDATION
   *
   * Validates UUID format with comprehensive error handling.
   *
   * @param uuid - UUID string to validate
   * @returns Normalized UUID
   * @throws CoreError if UUID is invalid
   */
  static validateUuid(uuid: string): string {
    Validators.requireString(uuid, "uuid");

    const normalizedUuid = uuid.toLowerCase().trim();

    if (!SECURITY_PATTERNS.UUID.test(normalizedUuid)) {
      throw new CoreError("Invalid UUID format", "INVALID_UUID_FORMAT", {
        uuid: normalizedUuid,
      });
    }

    return normalizedUuid;
  }

  /**
   * ✅ XSS DETECTION
   *
   * Detects potential XSS attacks in user input.
   *
   * @param input - String to check for XSS
   * @returns true if XSS detected
   */
  static detectXss(input: string): boolean {
    if (!TypeGuards.isNonEmptyString(input)) {
      return false;
    }

    return SECURITY_PATTERNS.XSS_BASIC.test(input);
  }

  /**
   * ✅ SQL INJECTION DETECTION
   *
   * Detects potential SQL injection attempts.
   *
   * @param input - String to check for SQL injection
   * @returns true if SQL injection detected
   */
  static detectSqlInjection(input: string): boolean {
    if (!TypeGuards.isNonEmptyString(input)) {
      return false;
    }

    return SECURITY_PATTERNS.SQL_INJECTION.test(input);
  }

  /**
   * ✅ SAFE JSON PARSING
   *
   * Safely parses JSON with depth and size limits.
   *
   * @param jsonString - JSON string to parse
   * @param maxDepth - Maximum object depth allowed
   * @returns Parsed object
   * @throws CoreError if parsing fails or limits exceeded
   */
  static safeJsonParse<T = any>(
    jsonString: string,
    maxDepth: number = SECURITY_LIMITS.MAX_JSON_DEPTH
  ): T {
    Validators.requireString(jsonString, "jsonString");

    // Length validation
    if (jsonString.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
      throw new CoreError("JSON string too large", "JSON_TOO_LARGE", {
        length: jsonString.length,
        maxLength: SECURITY_LIMITS.MAX_INPUT_LENGTH,
      });
    }

    try {
      const parsed = JSON.parse(jsonString);

      // Depth validation
      if (this.getObjectDepth(parsed) > maxDepth) {
        throw new CoreError(
          "JSON object depth exceeds maximum",
          "JSON_TOO_DEEP",
          { maxDepth }
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof CoreError) {
        throw error;
      }

      throw new CoreError("Invalid JSON format", "INVALID_JSON", {
        originalError: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * ✅ CONTENT SECURITY POLICY NONCE GENERATOR
   *
   * Generates cryptographically secure nonces for CSP.
   *
   * @returns Base64-encoded nonce
   */
  static generateNonce(): string {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array));
    }

    // Fallback for Node.js
    if (typeof require !== "undefined") {
      const crypto = require("crypto");
      return crypto.randomBytes(16).toString("base64");
    }

    throw new CoreError("Crypto API not available", "CRYPTO_UNAVAILABLE");
  }

  /**
   * ✅ PRIVATE HELPER: Calculate object depth
   */
  private static getObjectDepth(obj: any, depth: number = 0): number {
    if (depth > SECURITY_LIMITS.MAX_JSON_DEPTH) {
      return depth;
    }

    if (obj === null || typeof obj !== "object") {
      return depth;
    }

    if (Array.isArray(obj)) {
      return Math.max(
        depth,
        ...obj.map((item) => this.getObjectDepth(item, depth + 1))
      );
    }

    return Math.max(
      depth,
      ...Object.values(obj).map((value) =>
        this.getObjectDepth(value, depth + 1)
      )
    );
  }
}

/**
 * ✅ RATE LIMITING UTILITY
 *
 * In-memory rate limiting for security protection
 */
export class RateLimiter {
  private static requests = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * Check if request is within rate limits
   *
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if within limits
   */
  static isWithinLimits(
    identifier: string,
    maxRequests: number = SECURITY_LIMITS.RATE_LIMIT_MAX_REQUESTS,
    windowMs: number = SECURITY_LIMITS.RATE_LIMIT_WINDOW
  ): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Clear expired rate limit records
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * ✅ LEGACY COMPATIBILITY
 *
 * Backwards compatibility with existing code
 */
export function escapeHtml(str: string): string {
  return SecurityUtils.escapeHtml(str);
}

/**
 * ✅ TYPE EXPORTS
 */
export type SecurityConfig = typeof SECURITY_LIMITS;
export type SecurityPatterns = typeof SECURITY_PATTERNS;
