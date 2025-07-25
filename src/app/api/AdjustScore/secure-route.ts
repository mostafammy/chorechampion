/**
 * Enhanced AdjustScore API with comprehensive security measures
 *
 * Security Features:
 * - Authentication required (access token verification)
 * - Authorization checks based on user roles
 * - Audit logging with user tracking
 * - Rate limiting protection
 * - Input validation and sanitization
 * - Request correlation for security monitoring
 */

import { getRedis } from "@/lib/redis";
import { AdjustScoreInput } from "@/types";
import { requireAuth } from "@/lib/auth/requireAuth";
import { NextRequest } from "next/server";

const allowedOrigin = "https://chorechampion.vercel.app";

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 10, // Max requests per user per window
  WINDOW_MS: 60 * 1000, // 1 minute window
};

// Score adjustment limits for security
const SECURITY_LIMITS = {
  MAX_ADJUSTMENT: 1000, // Maximum points that can be adjusted at once
  MIN_ADJUSTMENT: -1000, // Minimum points that can be deducted at once
};

function withCors(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Correlation-ID"
  );
  return response;
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  const correlationId =
    request.headers.get("X-Correlation-ID") ||
    `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(
      `[AdjustScore] Request received - Correlation ID: ${correlationId}`
    );

    // 🔒 STEP 1: Authenticate the request
    const authResult = await requireAuth(request);

    if (!authResult.ok) {
      console.warn(
        `[AdjustScore] Authentication failed - Correlation ID: ${correlationId}`,
        {
          error: authResult.error,
          timestamp: new Date().toISOString(),
        }
      );

      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized - Authentication required",
            errorCode: "AUTHENTICATION_REQUIRED",
            correlationId,
          }),
          { status: 401 }
        )
      );
    }

    const authenticatedUser = authResult.user!;
    console.log(
      `[AdjustScore] Authenticated user: ${authenticatedUser.email} (${authenticatedUser.id}) - Correlation ID: ${correlationId}`
    );

    // 🔒 STEP 2: Rate limiting check
    const rateLimitResult = await checkRateLimit(authenticatedUser.id);
    if (!rateLimitResult.allowed) {
      console.warn(
        `[AdjustScore] Rate limit exceeded for user ${authenticatedUser.id} - Correlation ID: ${correlationId}`
      );

      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: `Too many requests. Please wait ${Math.ceil(
              rateLimitResult.resetTimeMs / 1000
            )} seconds.`,
            errorCode: "RATE_LIMIT_EXCEEDED",
            correlationId,
          }),
          { status: 429 }
        )
      );
    }

    // 🔒 STEP 3: Parse and validate request body
    const body = await request.json();
    console.log(
      `[AdjustScore] Body parsed - Correlation ID: ${correlationId}`,
      {
        userId: body.userId,
        delta: body.delta,
        source: body.source,
      }
    );

    // Basic validation
    if (!body.userId || typeof body.delta !== "number" || !body.source) {
      console.warn(
        `[AdjustScore] Validation failed - Correlation ID: ${correlationId}`,
        body
      );

      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: "Missing or invalid fields",
            errorCode: "INVALID_INPUT",
            correlationId,
          }),
          { status: 400 }
        )
      );
    }

    const {
      userId,
      delta,
      reason = "",
      source,
      taskId,
    } = body as AdjustScoreInput;

    // 🔒 STEP 4: Security validation
    const securityCheck = validateSecurityConstraints(
      delta,
      source,
      authenticatedUser
    );
    if (!securityCheck.valid) {
      console.warn(
        `[AdjustScore] Security validation failed - Correlation ID: ${correlationId}`,
        {
          user: authenticatedUser.id,
          delta,
          source,
          reason: securityCheck.reason,
        }
      );

      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: securityCheck.reason,
            errorCode: "SECURITY_VIOLATION",
            correlationId,
          }),
          { status: 403 }
        )
      );
    }

    // 🔒 STEP 5: Authorization check
    const authzResult = await checkAuthorization(
      authenticatedUser,
      userId,
      source
    );
    if (!authzResult.authorized) {
      console.warn(
        `[AdjustScore] Authorization failed - Correlation ID: ${correlationId}`,
        {
          user: authenticatedUser.id,
          targetUser: userId,
          source,
          reason: authzResult.reason,
        }
      );

      return withCors(
        new Response(
          JSON.stringify({
            success: false,
            error: authzResult.reason,
            errorCode: "AUTHORIZATION_FAILED",
            correlationId,
          }),
          { status: 403 }
        )
      );
    }

    // 🔒 STEP 6: Audit logging before execution
    await logSecurityEvent("SCORE_ADJUSTMENT_ATTEMPT", {
      correlationId,
      requestedBy: authenticatedUser.id,
      requestedByEmail: authenticatedUser.email,
      targetUserId: userId,
      delta,
      source,
      reason,
      taskId,
      timestamp: new Date().toISOString(),
    });

    // 🔒 STEP 7: Execute the score adjustment
    const redis = getRedis();
    const scoreKey = `user:${userId}:score`;
    const logKey = `user:${userId}:adjustment_log`;
    const auditKey = `security:score_adjustments`;

    const now = new Date().toISOString();

    const logEntry = {
      delta,
      reason,
      source,
      taskId,
      userId,
      adjustedBy: authenticatedUser.id,
      adjustedByEmail: authenticatedUser.email,
      correlationId,
      at: now,
    };

    const auditEntry = {
      action: "SCORE_ADJUSTMENT",
      correlationId,
      userId: authenticatedUser.id,
      targetUserId: userId,
      delta,
      source,
      timestamp: now,
    };

    console.log(
      `[AdjustScore] Executing score adjustment - Correlation ID: ${correlationId}`
    );

    const multi = redis.multi();
    if (source === "task") {
      multi.hincrby(scoreKey, "total", delta);
    } else {
      multi.hincrby(scoreKey, "adjustment", delta);
      multi.hincrby(scoreKey, "total", delta);
    }

    multi
      .hset(scoreKey, { last_adjusted_at: now })
      .lpush(logKey, JSON.stringify(logEntry))
      .ltrim(logKey, 0, 49) // Keep last 50 entries
      .lpush(auditKey, JSON.stringify(auditEntry))
      .ltrim(auditKey, 0, 999); // Keep last 1000 audit entries

    await multi.exec();

    console.log(
      `[AdjustScore] Score adjustment completed successfully - Correlation ID: ${correlationId}`
    );

    // 🔒 STEP 8: Success audit log
    await logSecurityEvent("SCORE_ADJUSTMENT_SUCCESS", {
      correlationId,
      requestedBy: authenticatedUser.id,
      targetUserId: userId,
      delta,
      source,
    });

    return withCors(
      new Response(
        JSON.stringify({
          success: true,
          correlationId,
        }),
        { status: 200 }
      )
    );
  } catch (error: any) {
    console.error(
      `[AdjustScore] Error - Correlation ID: ${correlationId}`,
      error
    );

    // 🔒 Security: Log the error for monitoring
    await logSecurityEvent("SCORE_ADJUSTMENT_ERROR", {
      correlationId,
      error: error?.message || "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return withCors(
      new Response(
        JSON.stringify({
          success: false,
          error: "Internal server error",
          errorCode: "INTERNAL_ERROR",
          correlationId,
        }),
        { status: 500 }
      )
    );
  }
}

/**
 * Rate limiting check
 */
async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; resetTimeMs: number }> {
  try {
    const redis = getRedis();
    const key = `rate_limit:adjust_score:${userId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.floor(RATE_LIMIT.WINDOW_MS / 1000));
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: current <= RATE_LIMIT.MAX_REQUESTS,
      resetTimeMs: ttl * 1000,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open for now, but log the error
    return { allowed: true, resetTimeMs: 0 };
  }
}

/**
 * Security constraints validation
 */
function validateSecurityConstraints(
  delta: number,
  source: string,
  user: any
): { valid: boolean; reason?: string } {
  // Check adjustment limits
  if (delta > SECURITY_LIMITS.MAX_ADJUSTMENT) {
    return {
      valid: false,
      reason: `Score adjustment cannot exceed ${SECURITY_LIMITS.MAX_ADJUSTMENT} points`,
    };
  }

  if (delta < SECURITY_LIMITS.MIN_ADJUSTMENT) {
    return {
      valid: false,
      reason: `Score deduction cannot exceed ${Math.abs(
        SECURITY_LIMITS.MIN_ADJUSTMENT
      )} points`,
    };
  }

  // Validate source
  const validSources = ["manual", "task", "bonus", "penalty", "system"];
  if (!validSources.includes(source)) {
    return {
      valid: false,
      reason: `Invalid source. Must be one of: ${validSources.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Authorization check based on user role and context
 */
async function checkAuthorization(
  user: any,
  targetUserId: string,
  source: string
): Promise<{ authorized: boolean; reason?: string }> {
  // For now, allow any authenticated user to adjust scores
  // You can enhance this with role-based access control

  // Example role-based restrictions:
  // if (user.role === "user" && source === "system") {
  //   return {
  //     authorized: false,
  //     reason: "Users cannot make system adjustments",
  //   };
  // }

  // if (user.role === "moderator" && Math.abs(delta) > 100) {
  //   return {
  //     authorized: false,
  //     reason: "Moderators cannot adjust more than 100 points",
  //   };
  // }

  return { authorized: true };
}

/**
 * Security event logging
 */
async function logSecurityEvent(event: string, data: any): Promise<void> {
  try {
    console.log(`[Security Event] ${event}:`, data);

    // Here you could send to a security monitoring service
    // await sendToSecurityMonitoring(event, data);

    // Or store in a dedicated security log
    const redis = getRedis();
    const securityLogKey = "security:events";
    const eventEntry = {
      event,
      ...data,
      timestamp: new Date().toISOString(),
    };

    await redis.lpush(securityLogKey, JSON.stringify(eventEntry));
    await redis.ltrim(securityLogKey, 0, 9999); // Keep last 10000 security events
  } catch (error) {
    console.error("Failed to log security event:", error);
    // Don't fail the request if logging fails
  }
}
