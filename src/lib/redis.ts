import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis() {
    if (!redis) {
        redis = Redis.fromEnv();
    }
    return redis;
}
