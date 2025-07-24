import { SignJWT, jwtVerify } from "jose";
import { JwtPayload } from "@/types";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error("JWT secrets must be defined in environment variables");
}

const getSecretKey = (secret: string) => new TextEncoder().encode(secret);

export async function generateAccessToken(
  payload: Omit<JwtPayload, "iat" | "exp">
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecretKey(ACCESS_TOKEN_SECRET));
}

export async function generateRefreshToken(
  payload: Omit<JwtPayload, "iat" | "exp">
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey(REFRESH_TOKEN_SECRET));
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecretKey(ACCESS_TOKEN_SECRET)
    );
    return payload as unknown as JwtPayload;
  } catch (error) {
    console.error("[verifyAccessToken] JWT verification failed:", error);
    throw new Error("Access token verification failed");
  }
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecretKey(REFRESH_TOKEN_SECRET)
    );
    return payload as unknown as JwtPayload;
  } catch (error) {
    console.error("[verifyRefreshToken] JWT verification failed:", error);
    throw new Error("Refresh token verification failed");
  }
}