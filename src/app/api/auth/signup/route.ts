import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { signupSchema } from "@/schemas/auth/signup.schema";
import { SignupService } from "@/lib/auth/signupService";
import { IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/cookieService"; // ✅ BEST PRACTICE: Centralized cookie management

/**
 * POST /api/auth/signup
 * Enhanced secure user registration endpoint with comprehensive protection
 * Creates new user accounts with enterprise-grade validation and security
 */
export const POST = createSecureEndpoint(
  {
    requireAuth: false, // ✅ Public endpoint for new user registration
    rateLimit: {
      type: "auth", // ✅ Auth-specific rate limiting (30 req/hour in prod, stricter than general API)
      customConfig: false, // ✅ Use default auth limits (already strict for signup protection)
    },
    validation: {
      schema: signupSchema, // ✅ Comprehensive input validation
      sanitizeHtml: true, // ✅ Sanitize HTML in input fields
      maxStringLength: 1000, // ✅ Prevent excessively long inputs
    },
    auditLog: true, // ✅ Comprehensive audit logging for security events
    logRequests: true, // ✅ Request/response logging
    corsEnabled: true, // ✅ CORS enabled for frontend integration
  },
  async (req: NextRequest, { validatedData }) => {
    try {
      // ✅ Enhanced logging for signup attempts
      if (IS_DEV) {
        console.log("[Signup] User registration request:", {
          email: validatedData.email,
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
          ip:
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown",
        });
      }

      // ✅ Extract and normalize data (already validated by SecureEndpoint)
      let { name, email, password, role, autoLogin } = validatedData;

      // ✅ Additional normalization (SecureEndpoint already sanitized HTML)
      name = name.trim();
      email = email.trim().toLowerCase();

      // 🎯 BEST PRACTICE: Auto-login by default for better UX
      // Users can immediately start using the app without friction
      const shouldAutoLogin = autoLogin !== false; // Default to true unless explicitly disabled

      // ✅ Create user using enhanced service with optimal UX
      const result = await SignupService.createUser(
        {
          name,
          email,
          password,
          role,
        },
        {
          autoLogin: shouldAutoLogin, // 🚀 Modern UX: immediate access
        }
      );

      if (!result.success) {
        // ✅ Handle service-level errors
        if (IS_DEV) {
          console.warn(`[Signup] Registration failed: ${result.error}`, {
            email,
            errorCode: result.errorCode,
          });
        }

        return NextResponse.json(
          {
            success: false,
            message: result.error || "Registration failed",
            errorCode: result.errorCode || "REGISTRATION_FAILED",
          },
          { status: result.statusCode || 400 }
        );
      }

      // ✅ Enhanced success logging
      if (IS_DEV) {
        console.log(`[Signup] User registered successfully: ${email}`, {
          userId: result.user?.id,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Return comprehensive success response with optimal UX
      const response: any = {
        success: true,
        message: result.tokens
          ? "Account created successfully. You're now logged in!"
          : "Account created successfully",
        user: result.user,
        timestamp: new Date().toISOString(),
      };

      // 🎯 Include tokens for immediate login (modern UX best practice)
      if (result.tokens) {
        response.tokens = result.tokens;
        response.autoLogin = true;

        // 🍪 BEST PRACTICE: Use centralized cookie service for consistent management
        await setAuthCookies(
          result.tokens.accessToken,
          result.tokens.refreshToken
        );
      }

      return NextResponse.json(response, {
        status: 201,
        headers: {
          // ✅ Security headers for account creation
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error: any) {
      // ✅ Enhanced error handling (SecureEndpoint provides context)
      if (IS_DEV) {
        console.error("[Signup] Registration operation failed:", {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Return user-friendly error response
      return NextResponse.json(
        {
          success: false,
          message: "Registration failed due to an internal error",
          error: IS_DEV ? error.message : "Internal server error",
          errorCode: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

// ✅ OPTIONS handler for CORS (handled automatically by SecureEndpoint)
export const OPTIONS = createSecureEndpoint(
  {
    requireAuth: false, // ✅ CORS preflight doesn't need auth
    corsEnabled: true, // ✅ Handle CORS preflight
    logRequests: false, // ✅ Don't log OPTIONS requests
  },
  async () => {
    return new NextResponse(null, { status: 204 });
  }
);
