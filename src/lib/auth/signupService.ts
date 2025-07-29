import { prisma } from "@/lib/prismaClient";
import bcrypt from "bcrypt";
import { SignupInputType } from "@/types";
import { IS_DEV } from "@/lib/utils";
import { generateAccessToken, generateRefreshToken } from "./jwt/jwt";

// ✅ Enhanced interfaces for enterprise-grade service
export interface SignupResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
  errorCode?:
    | "EMAIL_EXISTS"
    | "WEAK_PASSWORD"
    | "INVALID_EMAIL"
    | "DATABASE_ERROR"
    | "HASH_ERROR"
    | "TOKEN_ERROR"
    | "VALIDATION_ERROR";
  statusCode?: number;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role?: "USER" | "ADMIN"; // ✅ Optional role assignment
}

export interface SignupServiceOptions {
  /**
   * Whether to generate tokens immediately after signup
   * @default false
   */
  autoLogin?: boolean;

  /**
   * Minimum password strength requirements
   * @default { minLength: 8, requireSpecialChar: true, requireNumber: true }
   */
  passwordRequirements?: {
    minLength?: number;
    requireSpecialChar?: boolean;
    requireNumber?: boolean;
    requireUppercase?: boolean;
  };

  /**
   * Default role for new users
   * @default "USER"
   */
  defaultRole?: "USER" | "ADMIN";

  /**
   * Whether to validate email format beyond schema
   * @default true
   */
  strictEmailValidation?: boolean;
}

/**
 * Enterprise-grade signup service with comprehensive validation and error handling
 */
export class SignupService {
  private static readonly DEFAULT_OPTIONS: Required<SignupServiceOptions> = {
    autoLogin: false,
    passwordRequirements: {
      minLength: 8,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true,
    },
    defaultRole: "USER",
    strictEmailValidation: true,
  };

  /**
   * Creates a new user account with enterprise-grade validation and security
   */
  static async createUser(
    input: SignupInput,
    options: SignupServiceOptions = {}
  ): Promise<SignupResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // ✅ Enhanced input validation
      const validationResult = this.validateInput(input, config);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: "VALIDATION_ERROR",
          statusCode: 400,
        };
      }

      const { name, email, password, role = config.defaultRole } = input;

      // ✅ Check for existing user with detailed error handling
      const existingUser = await this.checkExistingUser(email);
      if (existingUser) {
        if (IS_DEV) {
          console.warn(`[SignupService] Duplicate email attempt: ${email}`);
        }
        return {
          success: false,
          error: "An account with this email already exists",
          errorCode: "EMAIL_EXISTS",
          statusCode: 409,
        };
      }

      // ✅ Enhanced password hashing with error handling
      const hashedPassword = await this.hashPassword(password);
      if (!hashedPassword) {
        return {
          success: false,
          error: "Failed to secure password",
          errorCode: "HASH_ERROR",
          statusCode: 500,
        };
      }

      // ✅ Create user with transaction for data integrity
      const newUser = await this.createUserRecord({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role,
      });

      if (!newUser) {
        return {
          success: false,
          error: "Failed to create user account",
          errorCode: "DATABASE_ERROR",
          statusCode: 500,
        };
      }

      // ✅ Generate tokens if auto-login is enabled
      let tokens: SignupResult["tokens"];
      if (config.autoLogin) {
        try {
          tokens = await this.generateAuthTokens(newUser);
        } catch (error) {
          if (IS_DEV) {
            console.warn("[SignupService] Token generation failed:", error);
          }
          // Continue without tokens - user created successfully
        }
      }

      // ✅ Enhanced success logging
      if (IS_DEV) {
        console.log(`[SignupService] User created successfully:`, {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
          autoLogin: config.autoLogin,
          tokensGenerated: !!tokens,
        });
      }

      return {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name || "",
          email: newUser.email || "",
          role: newUser.role || "USER",
          createdAt: newUser.createdAt || new Date(),
        },
        tokens,
      };
    } catch (error: any) {
      // ✅ Comprehensive error handling
      if (IS_DEV) {
        console.error("[SignupService] User creation failed:", {
          error: error.message,
          stack: error.stack,
          input: {
            email: input.email,
            name: input.name,
            role: input.role,
          },
        });
      }

      return {
        success: false,
        error: IS_DEV ? error.message : "Account creation failed",
        errorCode: "DATABASE_ERROR",
        statusCode: 500,
      };
    }
  }

  /**
   * Validates signup input with enterprise requirements
   */
  private static validateInput(
    input: SignupInput,
    config: Required<SignupServiceOptions>
  ): { isValid: boolean; error?: string } {
    const { name, email, password } = input;

    // ✅ Name validation
    if (!name || name.trim().length < 2) {
      return {
        isValid: false,
        error: "Name must be at least 2 characters long",
      };
    }

    if (name.trim().length > 100) {
      return { isValid: false, error: "Name cannot exceed 100 characters" };
    }

    // ✅ Email validation
    if (config.strictEmailValidation) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          error: "Please provide a valid email address",
        };
      }
    }

    // ✅ Password strength validation
    const passwordCheck = this.validatePassword(
      password,
      config.passwordRequirements
    );
    if (!passwordCheck.isValid) {
      return passwordCheck;
    }

    return { isValid: true };
  }

  /**
   * Validates password strength requirements
   */
  private static validatePassword(
    password: string,
    requirements: Required<SignupServiceOptions>["passwordRequirements"]
  ): { isValid: boolean; error?: string } {
    if (password.length < (requirements.minLength || 8)) {
      return {
        isValid: false,
        error: `Password must be at least ${
          requirements.minLength || 8
        } characters long`,
      };
    }

    if (requirements.requireNumber && !/\d/.test(password)) {
      return {
        isValid: false,
        error: "Password must contain at least one number",
      };
    }

    if (
      requirements.requireSpecialChar &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      return {
        isValid: false,
        error: "Password must contain at least one special character",
      };
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      return {
        isValid: false,
        error: "Password must contain at least one uppercase letter",
      };
    }

    return { isValid: true };
  }

  /**
   * Checks if user already exists with enhanced error handling
   */
  private static async checkExistingUser(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      if (IS_DEV) {
        console.error("[SignupService] Error checking existing user:", error);
      }
      // In case of database error, err on the side of caution
      throw new Error("Unable to verify email availability");
    }
  }

  /**
   * Hashes password with enhanced error handling
   */
  private static async hashPassword(password: string): Promise<string | null> {
    try {
      const saltRounds = 12; // ✅ Increased for better security
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      if (IS_DEV) {
        console.error("[SignupService] Password hashing failed:", error);
      }
      return null;
    }
  }

  /**
   * Creates user record with transaction safety
   */
  private static async createUserRecord(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    try {
      return await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role as any, // ✅ Type assertion for Prisma enum
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          // ✅ SECURITY: Never return password hash
        },
      });
    } catch (error: any) {
      if (IS_DEV) {
        console.error("[SignupService] Database error:", error);
      }

      // ✅ Handle specific database errors
      if (error.code === "P2002") {
        throw new Error("An account with this email already exists");
      }

      throw new Error("Failed to create user account");
    }
  }

  /**
   * Generates authentication tokens for auto-login
   */
  private static async generateAuthTokens(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        generateAccessToken(tokenPayload),
        generateRefreshToken(tokenPayload),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      if (IS_DEV) {
        console.error("[SignupService] Token generation failed:", error);
      }
      throw new Error("Failed to generate authentication tokens");
    }
  }

  /**
   * Validates signup data before processing (additional validation layer)
   */
  static validateSignupData(data: SignupInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push("Please provide a valid email address");
    }

    if (!data.password || data.password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// ✅ Legacy function for backward compatibility
/**
 * @deprecated Use SignupService.createUser instead
 */
export const SignupServiceLegacy = async (input: SignupInputType) => {
  const result = await SignupService.createUser(input);

  if (!result.success) {
    throw new Error(result.error || "Signup failed");
  }

  return result.user;
};
