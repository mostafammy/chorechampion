import { z } from "zod";
import { IS_DEV } from "@/lib/utils";
import { DevUtils } from "@/lib/dev/environmentUtils";

export class InputSecurityValidator {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    const perfTimer = DevUtils.performance.start("HTML-Sanitization");

    // Skip sanitization in development if configured
    if (DevUtils.validation.skipInDev("html-sanitization")) {
      DevUtils.log.debug("HTML sanitization bypassed in development", {
        inputLength: input.length,
      });
      perfTimer.end();
      return input;
    }

    // Basic HTML sanitization without external dependency
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .trim();

    DevUtils.log.trace("HTML sanitization completed", {
      originalLength: input.length,
      sanitizedLength: sanitized.length,
      removed: input.length - sanitized.length,
    });

    perfTimer.end();
    return sanitized;
  }

  /**
   * Sanitize SQL input to prevent SQL injection
   */
  static sanitizeSql(input: string): string {
    // Remove dangerous SQL keywords and characters
    return input
      .replace(/['";\\]/g, "") // Remove quotes and backslashes
      .replace(/(--)|(\/\*.*?\*\/)/g, "") // Remove SQL comments
      .replace(
        /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
        ""
      ); // Remove SQL keywords
  }

  /**
   * Validate and sanitize file paths to prevent directory traversal
   */
  static sanitizeFilePath(input: string): string {
    return input
      .replace(/\.\./g, "") // Remove directory traversal attempts
      .replace(/[<>:"|?*]/g, "") // Remove invalid filename characters
      .trim();
  }

  /**
   * Deep sanitization of objects
   */
  static deepSanitize<T>(obj: T): T {
    if (typeof obj === "string") {
      return this.sanitizeHtml(obj) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepSanitize(item)) as T;
    }

    if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.deepSanitize(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Enhanced validation with security checks
   */
  static validateAndSanitize<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: {
      sanitizeHtml?: boolean;
      sanitizeSql?: boolean;
      maxStringLength?: number;
      allowedFileExtensions?: string[];
    } = {}
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      // Pre-sanitization
      let sanitizedData = data;

      if (options.sanitizeHtml) {
        sanitizedData = this.deepSanitize(sanitizedData);
      }

      // Length validation
      if (options.maxStringLength) {
        sanitizedData = this.enforceMaxLength(
          sanitizedData,
          options.maxStringLength
        );
      }

      // Schema validation
      const result = schema.safeParse(sanitizedData);

      if (!result.success) {
        if (IS_DEV) {
          console.error("Validation failed:", result.error.flatten());
        }
        return {
          success: false,
          error:
            "Validation failed: " +
            result.error.issues.map((i) => i.message).join(", "),
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      if (IS_DEV) {
        console.error("Validation error:", error);
      }
      return { success: false, error: "Validation error occurred" };
    }
  }

  /**
   * Enforce maximum string length recursively
   */
  private static enforceMaxLength(obj: unknown, maxLength: number): unknown {
    if (typeof obj === "string") {
      return obj.slice(0, maxLength);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.enforceMaxLength(item, maxLength));
    }

    if (obj && typeof obj === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.enforceMaxLength(value, maxLength);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate file uploads
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { valid: true } | { valid: false; error: string } {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ["image/jpeg", "image/png", "image/gif"],
      allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"],
    } = options;

    // Size check
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${maxSize} bytes` };
    }

    // Type check
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed` };
    }

    // Extension check
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return { valid: false, error: `File extension ${extension} not allowed` };
    }

    return { valid: true };
  }

  /**
   * Enhanced email validation with security checks
   */
  static validateEmail(
    email: string
  ): { valid: true; email: string } | { valid: false; error: string } {
    // Basic sanitization
    const sanitized = email.trim().toLowerCase();

    // Length check
    if (sanitized.length > 254) {
      return { valid: false, error: "Email too long" };
    }

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      return { valid: false, error: "Invalid email format" };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [/script/i, /javascript/i, /<[^>]*>/, /['"]/];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        return { valid: false, error: "Email contains suspicious content" };
      }
    }

    return { valid: true, email: sanitized };
  }
}
