import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { loginService } from "@/lib/auth/loginService";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt/jwt";
import { setAuthCookies } from "@/lib/auth/cookieService"; // ✅ BEST PRACTICE: Centralized cookie management
import { escapeHtml, IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Enhanced validation schema with Zod (more comprehensive than loginSchema)
const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required")
    .max(254, "Email is too long")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

// Enhanced secure login endpoint with comprehensive protection
export const POST = createSecureEndpoint(
  {
    requireAuth: false, // ✅ Login doesn't require existing auth
    rateLimit: {
      type: "auth", // ✅ Auth-specific rate limiting (30 req/hour in prod)
      customConfig: false, // ✅ Use default auth limits
    },
    validation: {
      schema: loginSchema, // ✅ Automatic input validation
      sanitizeHtml: true, // ✅ XSS protection
      maxStringLength: 500, // ✅ Prevent large payload attacks
    },
    auditLog: true, // ✅ Comprehensive audit logging for auth events
    logRequests: true, // ✅ Request/response logging
    corsEnabled: true, // ✅ CORS enabled for auth endpoint
  },
  async (req: NextRequest, { validatedData }) => {
    try {
      const { email, password } = validatedData;

      // ✅ Enhanced logging for auth attempts
      if (IS_DEV) {
        console.log("[Login] Authentication attempt:", {
          email,
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent"),
          ip:
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown",
        });
      }

      // ✅ Authenticate user with enhanced error handling
      const user = await loginService({
        email: escapeHtml(email),
        password,
      });

      if (IS_DEV) {
        console.log(
          `[Login] User authenticated successfully: ${email} (${user.role})`
        );
      }

      // ✅ Create JWT payload with user data
      const payload = {
        id: user.id,
        role: user.role,
        email: user.email,
      };

      // ✅ Generate tokens
      const accessToken = await generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(payload);

      // ✅ Set secure cookies using centralized service
      await setAuthCookies(accessToken, refreshToken);

      // ✅ Enhanced success logging
      if (IS_DEV) {
        console.log(
          `[Login] Login successful: ${email} with role ${user.role}`
        );
      }

      // ✅ Return clean response (SecureEndpoint adds security headers automatically)
      return NextResponse.json(
        {
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      // ✅ Enhanced error handling (SecureEndpoint provides context)
      if (IS_DEV) {
        console.error("[Login] Authentication failed:", {
          email: validatedData.email,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ Security: Don't reveal whether email exists or password is wrong
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
          errorCode: "AUTHENTICATION_FAILED",
        },
        { status: 401 }
      );
    }
  }
);
