// Debug script to check Redis data and identify the score bug
import { getRedis } from "./src/lib/redis";
import { initialMembers } from "./src/data/seed";
import getAllTasksService from "./src/lib/getAllTasksService";
import { getScoreSummary } from "./src/lib/scoreService";

async function debugScoreBug() {
  console.log("🔍 PRINCIPAL ENGINEER: Debugging Score Calculation Bug\n");

  try {
    const redis = getRedis();

    // 1. Check completion keys in Redis
    console.log("📋 1. Checking task completion keys:");
    const completionKeys = await redis.keys("task:completion:*");
    console.log(`Found ${completionKeys.length} completion keys`);

    if (completionKeys.length > 0) {
      console.log("First 10 completion keys:");
      for (const key of completionKeys.slice(0, 10)) {
        console.log(`  ${key}`);
      }
    }

    // 2. Get all tasks from service
    console.log("\n📋 2. Getting all tasks from getAllTasksService:");
    const allTasks = await getAllTasksService();
    const completedTasks = allTasks.filter((task) => task.completed);

    console.log(`Total tasks: ${allTasks.length}`);
    console.log(`Completed tasks: ${completedTasks.length}`);

    if (completedTasks.length > 0) {
      console.log("Completed tasks details:");
      completedTasks.forEach((task) => {
        console.log(
          `  - ${task.name}: ${task.score} pts (assignee: ${task.assigneeId})`
        );
      });
    }

    // 3. Check score adjustments for each member
    console.log("\n💯 3. Checking score adjustments from Redis:");
    for (const member of initialMembers) {
      try {
        const scoreSummary = await getScoreSummary(member.id);
        console.log(`${member.name} (${member.id}):`);
        console.log(`  Total Score: ${scoreSummary.total}`);
        console.log(`  Completed Score: ${scoreSummary.completed}`);
        console.log(`  Adjustment: ${scoreSummary.adjustment}`);

        // Check raw Redis data
        const scoreKey = `user:${member.id}:score`;
        const rawScoreData = await redis.hgetall(scoreKey);
        console.log(`  Raw Redis Data:`, rawScoreData);
      } catch (error) {
        console.log(`  Error for ${member.name}:`, error.message);
      }
    }

    // 4. Calculate what the dashboard would show
    console.log("\n🖥️ 4. Dashboard calculation simulation:");
    const archivedTasks = allTasks.filter((task) => task.completed);

    for (const member of initialMembers) {
      const memberArchivedTasks = archivedTasks.filter(
        (task) => task.assigneeId === member.id
      );
      const completedScore = memberArchivedTasks.reduce(
        (sum, task) => sum + task.score,
        0
      );

      console.log(`${member.name}:`);
      console.log(`  Member archived tasks: ${memberArchivedTasks.length}`);
      console.log(`  Calculated completed score: ${completedScore}`);

      if (memberArchivedTasks.length > 0) {
        console.log(
          `  Tasks: ${memberArchivedTasks
            .map((t) => `${t.name}(${t.score})`)
            .join(", ")}`
        );
      }
    }
  } catch (error) {
    console.error("Debug error:", error);
  }
}

debugScoreBug();
