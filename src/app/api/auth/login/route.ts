import { loginSchema } from "@/schemas/auth/login.schema";
import { LoginInputType } from "@/types";
import { loginService } from "@/lib/auth/loginService";
import { escapeHtml, IS_DEV } from "@/lib/utils";
import {generateAccessToken, generateRefreshToken} from "@/lib/auth/jwt/jwt";
import {cookies} from "next/headers";
import { checkRateLimit } from "@/lib/auth/rateLimiter";

export async function POST(req: Request) {
  // Get client IP for rate limiting
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown";

  // Check rate limit
  const rateLimitResult = await checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    if (IS_DEV) {
      console.error("[Login] Validation failed:", parsed.error.flatten());
    }
    return new Response(
      JSON.stringify({
        message: "Validation failed",
        errors: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let { email, password }: LoginInputType = parsed.data;
  email = escapeHtml(email.trim().toLowerCase());

  try {
    const user = await loginService({ email, password });
    if (IS_DEV) {
      console.log(`[Login] User logged in: ${email}`);
    }

    const payload = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    const cookieStore = await cookies();

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: !IS_DEV, // Non-secure in development for debugging
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 15, // 15 mins
      domain: IS_DEV ? undefined : undefined, // Let browser handle domain
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: !IS_DEV, // Non-secure in development for debugging
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      domain: IS_DEV ? undefined : undefined, // Let browser handle domain
    });



    return new Response(JSON.stringify({ success: true, user }), {
      status: 200,
    });
  } catch (err: any) {
    // Record failed attempt for rate limiting
    await checkRateLimit(`${ip}:${email}`);

    if (IS_DEV) {
      console.warn(`[Login] Failed login attempt for: ${email} from IP: ${ip}`);
    }
    return new Response(
      JSON.stringify({ error: "Invalid email or password" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
}
