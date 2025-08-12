import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

// Force reload Redis connection (useful for development)
export function clearRedisConnection() {
  redis = null;
  console.log("🔄 Redis connection cleared, will reconnect on next call");
}

export function getRedis(): Redis {
  if (!redis) {
    try {
      // Debug: Log all Redis-related environment variables with actual values (masked)
      console.log("🔍 Debug: All Redis environment variables:", {
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL
          ? "SET"
          : "MISSING",
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
          ? "SET"
          : "MISSING",
        KV_REST_API_URL: process.env.KV_REST_API_URL ? "SET" : "MISSING",
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "SET" : "MISSING",
        REDIS_URL: process.env.REDIS_URL ? "SET" : "MISSING",
        NODE_ENV: process.env.NODE_ENV,
        // Debug: Show first few chars to verify env loading
        urlPrefix:
          process.env.UPSTASH_REDIS_REST_URL?.substring(0, 8) || "NONE",
        tokenPrefix:
          process.env.UPSTASH_REDIS_REST_TOKEN?.substring(0, 8) || "NONE",
        kvUrlPrefix: process.env.KV_REST_API_URL?.substring(0, 8) || "NONE",
        kvTokenPrefix: process.env.KV_REST_API_TOKEN?.substring(0, 8) || "NONE",
      });

      // Check if environment variables are available
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      // Fallback: Try alternative environment variable names
      const fallbackUrl = process.env.KV_REST_API_URL;
      const fallbackToken = process.env.KV_REST_API_TOKEN;

      if (!url || !token) {
        console.warn(
          "🔄 Primary Redis environment variables not found, trying fallback:",
          {
            primaryUrl: !!url,
            primaryToken: !!token,
            fallbackUrl: !!fallbackUrl,
            fallbackToken: !!fallbackToken,
            nodeEnv: process.env.NODE_ENV,
          }
        );

        // Try using fallback environment variables if available
        if (fallbackUrl && fallbackToken) {
          console.log("✅ Using fallback Redis configuration (KV_REST_API_*)");
          redis = new Redis({
            url: fallbackUrl,
            token: fallbackToken,
          });
          console.log(
            "✅ Redis connection initialized successfully with fallback config"
          );
          return redis;
        }

        // Fallback: Create a mock Redis instance for development
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️ Using mock Redis for development mode");
          return createMockRedis();
        }

        throw new Error("Redis configuration missing in production");
      }

      redis = Redis.fromEnv();
      console.log(
        "✅ Redis connection initialized successfully with primary config"
      );
    } catch (error) {
      console.error("❌ Redis initialization failed:", error);

      // In development, return mock Redis to prevent app crashes
      if (process.env.NODE_ENV === "development") {
        console.warn("🔄 Falling back to mock Redis in development");
        return createMockRedis();
      }

      throw error;
    }
  }
  return redis;
}

// Mock Redis for development when environment variables are missing
function createMockRedis(): Redis {
  console.log("🔧 Creating Mock Redis instance for development");
  const mockStore = new Map<string, string>();
  const mockLists = new Map<string, string[]>();

  return {
    get: async (key: string) => {
      const value = mockStore.get(key) || null;
      console.log(`🔍 Mock Redis GET: ${key} = ${value}`);
      return value;
    },
    set: async (key: string, value: any) => {
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      mockStore.set(key, stringValue);
      console.log(`✅ Mock Redis SET: ${key} = ${stringValue}`);
      return "OK";
    },
    del: async (key: string) => {
      const existed = mockStore.has(key) || mockLists.has(key);
      mockStore.delete(key);
      mockLists.delete(key);
      console.log(`🗑️ Mock Redis DEL: ${key} (existed: ${existed})`);
      return existed ? 1 : 0;
    },
    exists: async (key: string) => {
      const exists = mockStore.has(key) || mockLists.has(key) ? 1 : 0;
      console.log(`❓ Mock Redis EXISTS: ${key} = ${exists}`);
      return exists;
    },
    expire: async (key: string, seconds: number) => {
      console.log(`⏰ Mock Redis EXPIRE: ${key} in ${seconds}s (simulated)`);
      return 1;
    },
    ttl: async (key: string) => {
      console.log(`⏰ Mock Redis TTL: ${key} = -1 (simulated)`);
      return -1;
    },
    incr: async (key: string) => {
      const current = parseInt(mockStore.get(key) || "0");
      const newValue = current + 1;
      mockStore.set(key, newValue.toString());
      console.log(`➕ Mock Redis INCR: ${key} = ${newValue}`);
      return newValue;
    },
    decr: async (key: string) => {
      const current = parseInt(mockStore.get(key) || "0");
      const newValue = current - 1;
      mockStore.set(key, newValue.toString());
      console.log(`➖ Mock Redis DECR: ${key} = ${newValue}`);
      return newValue;
    },
    // List operations for completion date service
    lpush: async (key: string, ...values: string[]) => {
      const list = mockLists.get(key) || [];
      list.unshift(...values);
      mockLists.set(key, list);
      console.log(
        `📝 Mock Redis LPUSH: ${key} (${values.length} items) = length ${list.length}`
      );
      return list.length;
    },
    rpush: async (key: string, ...values: string[]) => {
      const list = mockLists.get(key) || [];
      list.push(...values);
      mockLists.set(key, list);
      console.log(
        `📝 Mock Redis RPUSH: ${key} (${values.length} items) = length ${list.length}`
      );
      return list.length;
    },
    lrange: async (key: string, start: number, stop: number) => {
      const list = mockLists.get(key) || [];
      const result = list.slice(start, stop === -1 ? undefined : stop + 1);
      console.log(
        `📋 Mock Redis LRANGE: ${key} [${start}:${stop}] = ${result.length} items`
      );
      return result;
    },
    llen: async (key: string) => {
      const list = mockLists.get(key) || [];
      console.log(`📏 Mock Redis LLEN: ${key} = ${list.length}`);
      return list.length;
    },
    ltrim: async (key: string, start: number, stop: number) => {
      const list = mockLists.get(key) || [];
      const trimmed = list.slice(start, stop === -1 ? undefined : stop + 1);
      mockLists.set(key, trimmed);
      console.log(
        `✂️ Mock Redis LTRIM: ${key} [${start}:${stop}] = ${trimmed.length} items remaining`
      );
      return "OK";
    },
    // Hash operations
    hget: async (key: string, field: string) => {
      const hashKey = `${key}:${field}`;
      const value = mockStore.get(hashKey) || null;
      console.log(`🔍 Mock Redis HGET: ${key}.${field} = ${value}`);
      return value;
    },
    hset: async (key: string, field: string, value: any) => {
      const hashKey = `${key}:${field}`;
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      mockStore.set(hashKey, stringValue);
      console.log(`✅ Mock Redis HSET: ${key}.${field} = ${stringValue}`);
      return 1;
    },
    hdel: async (key: string, ...fields: string[]) => {
      let deleted = 0;
      fields.forEach((field) => {
        const hashKey = `${key}:${field}`;
        if (mockStore.has(hashKey)) {
          mockStore.delete(hashKey);
          deleted++;
        }
      });
      console.log(
        `🗑️ Mock Redis HDEL: ${key} (${fields.length} fields) = ${deleted} deleted`
      );
      return deleted;
    },
    // Set operations
    sadd: async (key: string, ...members: string[]) => {
      const setKey = `set:${key}`;
      const existing = JSON.parse(mockStore.get(setKey) || "[]");
      const uniqueMembers = [...new Set([...existing, ...members])];
      mockStore.set(setKey, JSON.stringify(uniqueMembers));
      console.log(
        `➕ Mock Redis SADD: ${key} (${members.length} members) = ${uniqueMembers.length} total`
      );
      return members.length;
    },
    smembers: async (key: string) => {
      const setKey = `set:${key}`;
      const members = JSON.parse(mockStore.get(setKey) || "[]");
      console.log(`👥 Mock Redis SMEMBERS: ${key} = ${members.length} members`);
      return members;
    },
    // Add other Redis methods as needed
    multi: () => {
      console.log("🔧 Mock Redis MULTI: Creating mock transaction");
      const operations: Array<() => Promise<any>> = [];

      const multiObj = {
        set: (key: string, value: any, options?: any) => {
          operations.push(async () => {
            const stringValue =
              typeof value === "string" ? value : JSON.stringify(value);
            mockStore.set(key, stringValue);
            console.log(`✅ Mock Redis MULTI SET: ${key} = ${stringValue}`);
            return "OK";
          });
          return multiObj;
        },
        del: (key: string) => {
          operations.push(async () => {
            const existed = mockStore.has(key) || mockLists.has(key);
            mockStore.delete(key);
            mockLists.delete(key);
            console.log(
              `🗑️ Mock Redis MULTI DEL: ${key} (existed: ${existed})`
            );
            return existed ? 1 : 0;
          });
          return multiObj;
        },
        exec: async () => {
          console.log(
            `🎯 Mock Redis MULTI EXEC: Executing ${operations.length} operations`
          );
          const results = [];
          for (const operation of operations) {
            try {
              const result = await operation();
              results.push([null, result]); // [error, result] format
            } catch (error) {
              results.push([error, null]);
            }
          }
          return results;
        },
      };

      return multiObj;
    },
  } as any;
}
