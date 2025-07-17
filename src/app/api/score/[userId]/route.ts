import { NextResponse } from 'next/server';
import { getScoreSummary } from '@/lib/scoreService';

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    const { userId } = params;

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const scoreData = await getScoreSummary(userId);
        return NextResponse.json(scoreData);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch score' }, { status: 500 });
    }
}
