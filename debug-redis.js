const { Redis } = require("ioredis");

// Simple Redis debugging script
async function debugRedis() {
  const redis = new Redis({
    host: "localhost",
    port: 6379,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });

  try {
    console.log("🔍 Debugging Redis data...\n");

    // Check all task completion keys
    console.log("📋 Task completion keys:");
    const completionKeys = await redis.keys("task:completion:*");
    console.log("Total completion keys found:", completionKeys.length);

    for (const key of completionKeys.slice(0, 10)) {
      // Show first 10
      const exists = await redis.exists(key);
      console.log(`  ${key} -> exists: ${exists}`);
    }

    console.log("\n📋 All task keys:");
    const taskKeys = await redis.lrange("task:list", 0, -1);
    console.log("Total tasks:", taskKeys.length);

    // Check a few task data
    for (const taskId of taskKeys.slice(0, 5)) {
      const taskData = await redis.get(`task:${taskId}`);
      const parsed = JSON.parse(taskData);
      console.log(
        `  Task ${taskId}: ${parsed.name} (${parsed.score} pts, assigned to ${parsed.assigneeId})`
      );
    }

    console.log("\n💯 Score data:");
    const scoreKeys = await redis.keys("user:*:score");
    for (const scoreKey of scoreKeys) {
      const scoreData = await redis.hgetall(scoreKey);
      console.log(`  ${scoreKey}:`, scoreData);
    }
  } catch (error) {
    console.error("Redis error:", error);
  } finally {
    redis.disconnect();
  }
}

debugRedis();
