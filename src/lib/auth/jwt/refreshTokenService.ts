import {cookies} from "next/headers";
import {generateAccessToken, verifyRefreshToken} from "@/lib/auth/jwt/jwt";
import {IS_DEV} from "@/lib/utils";

export async function refreshTokenService() {


    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
        return new Response("No refresh token", {status: 401});
    }

    try {
        const decoded = await verifyRefreshToken(refreshToken);
        const newAccessToken = await generateAccessToken({
            id: decoded.id,
            role: decoded.role,
            email: decoded.email,
        });

        cookieStore.set("access_token", newAccessToken, {
            httpOnly: true,
            secure: !IS_DEV, // Non-secure in development for debugging
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 15,
        });
        return Response.json({success: true, accessToken: newAccessToken});
    }catch (error){
        if (IS_DEV) {
            console.error("Error verifying refresh token:", error);
        }
        return new Response("Invalid refresh token", {status: 401});
    }


}