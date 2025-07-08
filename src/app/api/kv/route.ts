export const runtime = 'edge'; // or 'nodejs'
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

export const GET = async () => {
    try {
        const result = await redis.get("item");
        return NextResponse.json({ result }, { status: 200 });
    } catch (error) {
        console.error("Redis fetch error:", error);
        return NextResponse.json({ error: "Redis fetch failed" }, { status: 500 });
    }
};
