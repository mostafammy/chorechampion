/**
 * ✅ ENTERPRISE DATABASE REPOSITORY LAYER
 *
 * Repository pattern implementation for user operations.
 * Follows Domain-Driven Design principles with proper error handling,
 * input validation, and performance optimization.
 *
 * @module UserRepository
 * @version 1.0.0
 * @author Principal Engineering Team
 */

import { prisma } from "@/lib/prismaClient";
import { CoreError, Validators, Performance, safeAsync } from "../utils/core";
import { SecurityUtils } from "../security";
import type { PrismaClient, User, Prisma } from "@prisma/client";

/**
 * ✅ REPOSITORY INTERFACES
 *
 * Type-safe interfaces for repository operations
 */
export interface UserCreateData {
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  role?: string;
}

export interface UserUpdateData {
  name?: string;
  avatar?: string;
  role?: string;
  updatedAt?: Date;
}

export interface UserQueryOptions {
  includeDeleted?: boolean;
  select?: Prisma.UserSelect;
  orderBy?: Prisma.UserOrderByWithRelationInput;
  take?: number;
  skip?: number;
}

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: CoreError;
  metadata?: {
    executionTime?: number;
    recordsAffected?: number;
    fromCache?: boolean;
  };
}

/**
 * ✅ ENTERPRISE USER REPOSITORY
 *
 * Centralized user data operations with comprehensive error handling,
 * input validation, caching, and performance monitoring.
 */
export class UserRepository {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly OPERATION_TIMEOUT = 10000; // 10 seconds
  private static cache = new Map<string, { data: any; expires: number }>();

  /**
   * ✅ CHECK EMAIL AVAILABILITY
   *
   * Enhanced version of isEmailTaken with comprehensive validation,
   * caching, and error handling.
   *
   * @param email - Email address to check
   * @param options - Query options
   * @returns Promise resolving to availability result
   *
   * @example
   * ```typescript
   * const result = await UserRepository.isEmailTaken('user@example.com');
   * if (result.success && result.data) {
   *   console.log('Email is already taken');
   * }
   * ```
   */
  static async isEmailTaken(
    email: string,
    options: { useCache?: boolean; db?: PrismaClient } = {}
  ): Promise<RepositoryResult<boolean>> {
    const { useCache = true, db = prisma } = options;

    return Performance.measureTime("UserRepository.isEmailTaken", async () => {
      try {
        // Input validation and sanitization
        const validatedEmail = SecurityUtils.validateEmail(email);
        const cacheKey = `email_exists:${validatedEmail}`;

        // Check cache first
        if (useCache) {
          const cached = this.getFromCache<boolean>(cacheKey);
          if (cached !== null) {
            return {
              success: true,
              data: cached,
              metadata: { fromCache: true },
            };
          }
        }

        // Database query with timeout
        const [user, error] = await safeAsync(() =>
          Promise.race([
            db.user.findUnique({
              where: { email: validatedEmail },
              select: { id: true }, // Only select minimal data for performance
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Query timeout")),
                this.OPERATION_TIMEOUT
              )
            ),
          ])
        );

        if (error) {
          return {
            success: false,
            error: new CoreError(
              "Failed to check email availability",
              "DATABASE_ERROR",
              { email: validatedEmail, originalError: error }
            ),
          };
        }

        const exists = !!user;

        // Cache the result
        if (useCache) {
          this.setCache(cacheKey, exists);
        }

        return {
          success: true,
          data: exists,
          metadata: { fromCache: false },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError(
                  "Unexpected error during email check",
                  "UNEXPECTED_ERROR",
                  { originalError: error }
                ),
        };
      }
    });
  }

  /**
   * ✅ FIND USER BY EMAIL
   *
   * Retrieves user by email with comprehensive error handling and caching.
   *
   * @param email - Email address to search for
   * @param options - Query options
   * @returns Promise resolving to user or null
   */
  static async findByEmail(
    email: string,
    options: UserQueryOptions & { useCache?: boolean; db?: PrismaClient } = {}
  ): Promise<RepositoryResult<User | null>> {
    const {
      useCache = true,
      db = prisma,
      select,
      includeDeleted = false,
    } = options;

    return Performance.measureTime("UserRepository.findByEmail", async () => {
      try {
        // Input validation
        const validatedEmail = SecurityUtils.validateEmail(email);
        const cacheKey = `user_by_email:${validatedEmail}:${JSON.stringify(
          select
        )}`;

        // Check cache
        if (useCache) {
          const cached = this.getFromCache<User | null>(cacheKey);
          if (cached !== undefined) {
            return {
              success: true,
              data: cached,
              metadata: { fromCache: true },
            };
          }
        }

        // Execute query
        const [user, error] = await safeAsync(() =>
          Promise.race([
            db.user.findUnique({
              where: { email: validatedEmail },
              select: select || undefined,
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Query timeout")),
                this.OPERATION_TIMEOUT
              )
            ),
          ])
        );

        if (error) {
          return {
            success: false,
            error: new CoreError(
              "Failed to find user by email",
              "DATABASE_ERROR",
              { email: validatedEmail, originalError: error }
            ),
          };
        }

        // Cache result
        if (useCache) {
          this.setCache(cacheKey, user);
        }

        return {
          success: true,
          data: user as User | null,
          metadata: { fromCache: false },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError(
                  "Unexpected error during user lookup",
                  "UNEXPECTED_ERROR",
                  { originalError: error }
                ),
        };
      }
    });
  }

  /**
   * ✅ CREATE USER
   *
   * Creates a new user with comprehensive validation and error handling.
   *
   * @param userData - User creation data
   * @param options - Creation options
   * @returns Promise resolving to created user
   */
  static async create(
    userData: UserCreateData,
    options: { db?: PrismaClient } = {}
  ): Promise<RepositoryResult<User>> {
    const { db = prisma } = options;

    return Performance.measureTime("UserRepository.create", async () => {
      try {
        // Input validation
        const validatedEmail = SecurityUtils.validateEmail(userData.email);
        const validatedName = SecurityUtils.sanitizeInput(
          Validators.requireString(userData.name, "name"),
          { maxLength: 100, strict: true }
        );

        // Check if email already exists
        const emailCheckResult = await this.isEmailTaken(validatedEmail, {
          useCache: false,
          db,
        });
        if (!emailCheckResult.success) {
          return {
            success: false,
            error: emailCheckResult.error,
          };
        }

        if (emailCheckResult.data) {
          return {
            success: false,
            error: new CoreError(
              "Email address is already registered",
              "EMAIL_ALREADY_EXISTS",
              { email: validatedEmail }
            ),
          };
        }

        // Prepare user data
        const createData: any = {
          email: validatedEmail,
          name: validatedName,
          ...(userData.password && { password: userData.password }),
          ...(userData.avatar && {
            avatar: SecurityUtils.sanitizeInput(userData.avatar, {
              maxLength: 500,
            }),
          }),
          ...(userData.role && {
            role: SecurityUtils.sanitizeInput(userData.role, { maxLength: 50 }),
          }),
        };

        // Create user
        const [user, error] = await safeAsync(() =>
          Promise.race([
            db.user.create({
              data: createData,
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Query timeout")),
                this.OPERATION_TIMEOUT
              )
            ),
          ])
        );

        if (error) {
          return {
            success: false,
            error: new CoreError("Failed to create user", "DATABASE_ERROR", {
              userData: createData,
              originalError: error,
            }),
          };
        }

        // Invalidate cache
        this.invalidateEmailCache(validatedEmail);

        return {
          success: true,
          data: user as User,
          metadata: { recordsAffected: 1 },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError(
                  "Unexpected error during user creation",
                  "UNEXPECTED_ERROR",
                  { originalError: error }
                ),
        };
      }
    });
  }

  /**
   * ✅ UPDATE USER
   *
   * Updates user data with validation and cache invalidation.
   *
   * @param userId - User ID to update
   * @param updateData - Data to update
   * @param options - Update options
   * @returns Promise resolving to updated user
   */
  static async update(
    userId: string,
    updateData: UserUpdateData,
    options: { db?: PrismaClient } = {}
  ): Promise<RepositoryResult<User>> {
    const { db = prisma } = options;

    return Performance.measureTime("UserRepository.update", async () => {
      try {
        // Input validation
        const validatedUserId = SecurityUtils.validateUuid(userId);

        // Sanitize update data
        const sanitizedData: any = {
          updatedAt: new Date(),
          ...(updateData.name && {
            name: SecurityUtils.sanitizeInput(updateData.name, {
              maxLength: 100,
              strict: true,
            }),
          }),
          ...(updateData.avatar && {
            avatar: SecurityUtils.sanitizeInput(updateData.avatar, {
              maxLength: 500,
            }),
          }),
          ...(updateData.role && {
            role: SecurityUtils.sanitizeInput(updateData.role, {
              maxLength: 50,
            }),
          }),
        };

        // Update user
        const [user, error] = await safeAsync(() =>
          Promise.race([
            db.user.update({
              where: { id: validatedUserId },
              data: sanitizedData,
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Query timeout")),
                this.OPERATION_TIMEOUT
              )
            ),
          ])
        );

        if (error) {
          return {
            success: false,
            error: new CoreError("Failed to update user", "DATABASE_ERROR", {
              userId: validatedUserId,
              updateData: sanitizedData,
              originalError: error,
            }),
          };
        }

        // Invalidate cache
        this.invalidateUserCache(validatedUserId);

        return {
          success: true,
          data: user as User,
          metadata: { recordsAffected: 1 },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof CoreError
              ? error
              : new CoreError(
                  "Unexpected error during user update",
                  "UNEXPECTED_ERROR",
                  { originalError: error }
                ),
        };
      }
    });
  }

  /**
   * ✅ CACHE MANAGEMENT
   */
  private static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_TTL,
    });
  }

  private static invalidateEmailCache(email: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (
        key.includes(`email_exists:${email}`) ||
        key.includes(`user_by_email:${email}`)
      ) {
        this.cache.delete(key);
      }
    });
  }

  private static invalidateUserCache(userId: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * ✅ CACHE CLEANUP
   *
   * Removes expired cache entries
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
 * ✅ LEGACY COMPATIBILITY FUNCTION
 *
 * Maintains backward compatibility with existing code
 */
export async function isEmailTaken(
  email: string,
  db = prisma
): Promise<boolean> {
  const result = await UserRepository.isEmailTaken(email, {
    db,
    useCache: false,
  });

  if (!result.success) {
    // Log error but don't throw to maintain backward compatibility
    console.error("[UserRepository] Email check failed:", result.error);
    return false; // Safe fallback
  }

  return result.data ?? false;
}
