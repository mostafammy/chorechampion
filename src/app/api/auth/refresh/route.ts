import {refreshTokenService} from "@/lib/auth/jwt/refreshTokenService";


export async function POST() {
try{
    const res = await refreshTokenService();

        return Response.json({ success: true });
    } catch (e) {
        return new Response("Invalid refresh token", { status: 401 });
    }
}
