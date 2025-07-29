import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rateLimiter";
import { IS_DEV } from "@/lib/utils";
import { DevUtils } from "@/lib/dev/environmentUtils";

interface SecurityConfig {
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  allowedMethods: string[];
  maxPayloadSize: number;
}

export class SecurityMiddleware {
  private static getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    return forwarded
      ? forwarded.split(",")[0]
      : req.headers.get("x-real-ip") || "unknown";
  }

  private static getSecurityConfig(): SecurityConfig {
    // Environment-specific security configuration
    return {
      rateLimit: {
        maxRequests: DevUtils.validation.skipInDev("rate-limit") ? 10000 : 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
      },
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      maxPayloadSize: DevUtils.validation.getMaxRequestSize(),
    };
  }

  static async validateRequest(
    req: NextRequest,
    config: Partial<SecurityConfig> = {}
  ): Promise<NextResponse | null> {
    const perfTimer = DevUtils.performance.start(
      `SecurityValidation-${req.nextUrl.pathname}`
    );

    const defaultConfig = this.getSecurityConfig();
    const fullConfig = { ...defaultConfig, ...config };
    const ip = this.getClientIP(req);

    DevUtils.log.debug("Security validation starting", {
      method: req.method,
      pathname: req.nextUrl.pathname,
      ip,
      config: fullConfig,
    });

    // 1. Method validation
    if (!fullConfig.allowedMethods.includes(req.method)) {
      DevUtils.log.security("METHOD_NOT_ALLOWED", {
        method: req.method,
        pathname: req.nextUrl.pathname,
        ip,
        allowedMethods: fullConfig.allowedMethods,
      });

      perfTimer.end();
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    // 2. Rate limiting (with development bypass)
    if (!DevUtils.rateLimit.shouldBypass("security-middleware")) {
      const rateLimitResult = await checkRateLimit(
        `endpoint:${req.nextUrl.pathname}:${ip}`,
        fullConfig.rateLimit.maxRequests,
        fullConfig.rateLimit.windowMs
      );
      if (!rateLimitResult.allowed) {
        DevUtils.log.security("RATE_LIMIT_EXCEEDED", {
          ip,
          pathname: req.nextUrl.pathname,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        });

        perfTimer.end();
        return NextResponse.json(
          {
            error: "Too many requests",
            retryAfter: Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ),
          },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000
              ).toString(),
              "X-RateLimit-Limit": fullConfig.rateLimit.maxRequests.toString(),
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            },
          }
        );
      }
    } else {
      DevUtils.log.debug("Rate limiting bypassed in development");
    }

    // 3. Payload size validation
    if (req.headers.get("content-length")) {
      const contentLength = parseInt(req.headers.get("content-length") || "0");
      if (contentLength > fullConfig.maxPayloadSize) {
        DevUtils.log.security("PAYLOAD_TOO_LARGE", {
          ip,
          pathname: req.nextUrl.pathname,
          contentLength,
          maxAllowed: fullConfig.maxPayloadSize,
        });

        perfTimer.end();
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413 }
        );
      }
    }

    DevUtils.log.debug("Security validation passed", {
      method: req.method,
      pathname: req.nextUrl.pathname,
      ip,
    });

    perfTimer.end();
    return null; // No blocking response needed
  }

  static setSecurityHeaders(response: NextResponse): void {
    // Use environment-specific security headers
    const headers: Record<string, string> = {
      "X-XSS-Protection": "1; mode=block",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Robots-Tag": "noindex, nofollow",
    };

    // Enhanced CSP based on environment
    const cspPolicy = DevUtils.security.getCSPPolicy();
    headers["Content-Security-Policy"] = cspPolicy;

    // Add HSTS in production only
    if (!IS_DEV) {
      headers["Strict-Transport-Security"] =
        "max-age=31536000; includeSubDomains";
    }

    DevUtils.log.trace("Setting security headers", {
      environment: IS_DEV ? "development" : "production",
      headerCount: Object.keys(headers).length,
      cspLength: cspPolicy.length,
    });

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  static async logSecurityEvent(
    req: NextRequest,
    event:
      | "RATE_LIMIT"
      | "INVALID_METHOD"
      | "LARGE_PAYLOAD"
      | "SUSPICIOUS_ACTIVITY",
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ip: this.getClientIP(req),
      userAgent: req.headers.get("user-agent") || "",
      endpoint: req.nextUrl.pathname,
      method: req.method,
      metadata,
    };

    if (IS_DEV) {
      console.warn("🚨 Security Event:", logEntry);
    }

    // In production: send to logging service
    // await this.sendToSecurityLog(logEntry);
  }
}
