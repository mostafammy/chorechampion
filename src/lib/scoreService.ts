import { getRedis } from './redis';
import type { ScoreSummary, ScoreLogEntry } from '@/types';

const redis = getRedis();


export async function getScoreSummary(userId: string): Promise<ScoreSummary> {
    const data = await redis.hgetall<Record<string, string | undefined>>(`user:${userId}:score`);
    return {
        total: Number(data?.total ?? 0),
        adjustment: Number(data?.adjustment ?? 0),
        completed: Number(data?.completed ?? 0),
        last_adjusted_at: data?.last_adjusted_at ?? undefined,
    };
}

export async function getScoreLogs(userId: string, limit: number = 10): Promise<ScoreLogEntry[]> {
    const rawLogs = await redis.lrange<string>(`user:${userId}:adjustment_log`, 0, limit - 1);
    return rawLogs.map((entry) => JSON.parse(entry));
}
