// app/api/score/[userId]/scoreLog/route.ts
import { NextResponse } from 'next/server';
import { getScoreLogs } from '@/lib/scoreService';

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    const { userId } = params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const log = await getScoreLogs(userId, limit);
        return NextResponse.json(log);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 });
    }
}
