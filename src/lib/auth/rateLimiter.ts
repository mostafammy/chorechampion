import { Redis } from "@upstash/redis";
import { IS_DEV } from "@/lib/utils";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 20, // Increased for development
  windowMs: number = 5 * 60 * 1000 // 5 minutes (shorter window)
): Promise<RateLimitResult> {
  // Bypass rate limiting in development for easier testing
  if (IS_DEV) {
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: Date.now() + windowMs,
    };
  }
  const key = `rate_limit:login:${identifier}`;
  const window = Math.floor(Date.now() / windowMs);
  const windowKey = `${key}:${window}`;

  try {
    const current = await redis.incr(windowKey);

    if (current === 1) {
      // Set expiration on first attempt
      await redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    const allowed = current <= maxAttempts;
    const remaining = Math.max(0, maxAttempts - current);
    const resetTime = (window + 1) * windowMs;

    return {
      allowed,
      remaining,
      resetTime,
    };
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.error("Rate limiter error:", error);
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: Date.now() + windowMs,
    };
  }
}

export async function recordFailedAttempt(identifier: string): Promise<void> {
  await checkRateLimit(identifier);
}
