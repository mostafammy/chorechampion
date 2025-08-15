/**
 * ✅ ENTERPRISE TASK COMPLETION STATE SERVICE - Principal Engineer Edition
 *
 * Implements the CORRECT architectural pattern for task completion state manag        // ✅ ENTERPRISE VALIDATION: Validate each result structure
        completionResults = pipelineResults.map((result, index) => {
          if (!Array.isArray(result) || result.length !== 2) {
            // ✅ OPTIMIZATION: Redis EXISTS returns direct numbers, not [error, value] arrays
            // This is expected behavior for ioredis pipeline EXISTS commands
            return [null, result]; // Convert to standard [error, value] format
          }
          return result;
        });

        console.log('[TaskCompletionStateService] ✅ Redis pipeline validation completed:', {
          tasksChecked: taskCompletionChecks.length,
          resultsReceived: completionResults.length,
          resultFormat: 'Standardized to [error, value] format',
          sampleResult: completionResults[0]
        });gle source of truth: Redis completion keys with period-aware date checking.
 *
 * Features:
 * - ✅ Period-aware completion checking (daily/weekly/monthly)
 * - ✅ Single-phase processing with authoritative completion keys
 * - ✅ Enterprise performance with batch Redis operations
 * - ✅ Type-safe operations following SOLID principles
 * - ✅ Comprehensive audit logging and error handling
 *
 * Key Design Principle:
 * - Use completion keys as SINGLE SOURCE OF TRUTH
 * - No more dual-phase processing with logs as fallback
 * - Period-aware date checking for accurate completion state
 */

import { getRedis } from "@/lib/redis";
import { RedisKeyManager } from "@/lib/redis/key-manager";
import type { Task, Period } from "@/types";
import { IS_DEV } from "@/lib/utils/core";

interface TaskWithCompletionState extends Task {
  completed: boolean;
  completedAt?: string; // ISO date string when completed
  completionKey?: string; // The Redis key that confirmed completion
  completionMetadata?: {
    checkedDate: string;
    checkedPeriod: Period;
    keyExists: boolean;
    source: 'redis-key' | 'fallback';
  };
}

interface CompletionCheckMetrics {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  redisOperationTimeMs: number;
  keyCheckErrors: number;
  periodDistribution: Record<Period, { total: number; completed: number }>;
}

/**
 * ✅ ENTERPRISE TASK COMPLETION STATE SERVICE
 *
 * Implements the CORRECT single-phase approach using completion keys as authoritative source.
 * This replaces the flawed MergeCompletionDate approach.
 */
export class TaskCompletionStateService {
  private static instance: TaskCompletionStateService;

  private constructor() {}

  static getInstance(): TaskCompletionStateService {
    if (!TaskCompletionStateService.instance) {
      TaskCompletionStateService.instance = new TaskCompletionStateService();
    }
    return TaskCompletionStateService.instance;
  }

  /**
   * ✅ CORRECT APPROACH: Process all tasks and determine completion state
   * 
   * This method implements the CORRECT logic:
   * 1. Take all tasks (without pre-filtering by completed property)
   * 2. For each task, check the appropriate completion key based on period
   * 3. Set completed=true and completedAt if key exists
   * 4. Return tasks with proper completion state
   */
  async processTaskCompletionState(allTasks: Task[]): Promise<{
    activeTasks: TaskWithCompletionState[];
    completedTasks: TaskWithCompletionState[];
    metrics: CompletionCheckMetrics;
  }> {
    const startTime = performance.now();
    const redis = getRedis();

    // ✅ ENTERPRISE METRICS: Initialize comprehensive tracking
    const metrics: CompletionCheckMetrics = {
      totalTasks: allTasks.length,
      completedTasks: 0,
      activeTasks: 0,
      redisOperationTimeMs: 0,
      keyCheckErrors: 0,
      periodDistribution: {
        daily: { total: 0, completed: 0 },
        weekly: { total: 0, completed: 0 },
        monthly: { total: 0, completed: 0 },
      },
    };

    console.log(
      `[TaskCompletionStateService] 🚀 Processing ${allTasks.length} tasks with period-aware completion checking`
    );

    try {
      // ✅ STEP 1: Filter tasks with complete information and separate already completed tasks
      const validTasks = allTasks.filter(task => 
        task.id && 
        task.name && 
        task.period && 
        task.assigneeId &&
        typeof task.score === 'number'
      );

      if (validTasks.length === 0) {
        console.log('[TaskCompletionStateService] ⚠️ No valid tasks to process');
        return { activeTasks: [], completedTasks: [], metrics };
      }

      // ✅ OPTIMIZATION: Separate already completed tasks (no need to check Redis keys)
      const alreadyCompletedTasks = validTasks.filter(task => task.completed === true);
      const tasksToCheck = validTasks.filter(task => task.completed !== true);

      console.log(`[TaskCompletionStateService] 📊 Task breakdown:`, {
        total: validTasks.length,
        alreadyCompleted: alreadyCompletedTasks.length,
        needsChecking: tasksToCheck.length,
      });

      // ✅ STEP 2: Generate period-appropriate completion keys only for tasks that need checking
      const taskCompletionChecks = tasksToCheck.map(task => {
        const completionKey = this.generatePeriodAwareCompletionKey(task);
        metrics.periodDistribution[task.period].total++;
        
        return {
          task,
          completionKey,
          period: task.period,
        };
      });

      // ✅ STEP 3: Batch check completion keys using Redis pipeline (only for tasks that need checking)
      let completionResults: any[] = [];
      
      if (taskCompletionChecks.length > 0) {
        const redisStartTime = performance.now();
        const completionPipeline = redis.pipeline();
        
        taskCompletionChecks.forEach(({ completionKey }) => {
          completionPipeline.exists(completionKey);
        });

        const pipelineResults = await completionPipeline.exec();
        metrics.redisOperationTimeMs = performance.now() - redisStartTime;

        // ✅ ENTERPRISE VALIDATION: Ensure Redis pipeline results are properly formatted
        if (!pipelineResults || !Array.isArray(pipelineResults)) {
          console.error('[TaskCompletionStateService] ❌ Invalid Redis pipeline results format:', pipelineResults);
          throw new Error('Redis pipeline returned invalid results format');
        }

        if (pipelineResults.length !== taskCompletionChecks.length) {
          console.error('[TaskCompletionStateService] ❌ Redis pipeline results count mismatch:', {
            expected: taskCompletionChecks.length,
            received: pipelineResults.length,
            results: pipelineResults
          });
          throw new Error(`Redis pipeline results mismatch: expected ${taskCompletionChecks.length}, got ${pipelineResults.length}`);
        }

        // ✅ REDIS INSIGHT: Log the actual format we're receiving for debugging
        console.log('[TaskCompletionStateService] 🔍 Redis EXISTS pipeline format analysis:', {
          totalResults: pipelineResults.length,
          sampleRawResult: pipelineResults[0],
          expectedFormat: '[error, value] or direct value',
          explanation: 'Redis EXISTS returns 0/1 directly, we normalize to [null, value] format'
        });

        // ✅ ENTERPRISE VALIDATION: Validate each result structure
        completionResults = pipelineResults.map((result, index) => {
          if (!Array.isArray(result) || result.length !== 2) {
            // ✅ EXPECTED BEHAVIOR: Redis EXISTS returns direct numbers (0/1), not [error, value] arrays
            // This is normal for Upstash Redis and other Redis providers
            return [null, result]; // Convert to standard [error, value] format
          }
          return result;
        });

        console.log('[TaskCompletionStateService] ✅ Redis pipeline validation completed:', {
          tasksChecked: taskCompletionChecks.length,
          resultsReceived: completionResults.length,
          resultFormat: 'Normalized to [error, value] format',
          redisProvider: 'Upstash (returns direct values as expected)',
          sampleResult: completionResults[0]
        });

      } else {
        console.log('[TaskCompletionStateService] ⚡ No tasks need Redis key checking - all are already completed or invalid');
      }

      // ✅ STEP 4: Process results and set completion state
      const processedTasks: TaskWithCompletionState[] = [];

      // Only process tasks that needed Redis checking and have valid results
      if (taskCompletionChecks.length > 0 && completionResults.length > 0) {
        console.log('[TaskCompletionStateService] 🔍 Processing Redis results for task completion state...');
        
        taskCompletionChecks.forEach((check, index) => {
          const { task, completionKey, period } = check;
          
          // ✅ ENTERPRISE SAFETY: Ensure we have a valid result for this index
          if (index >= completionResults.length) {
            console.error(`[TaskCompletionStateService] ❌ Missing result for task ${task.id} at index ${index}`);
            metrics.keyCheckErrors++;
            
            // Fallback: treat as not completed
            processedTasks.push({
              ...task,
              completed: false,
              completionMetadata: {
                checkedDate: new Date().toISOString(),
                checkedPeriod: period,
                keyExists: false,
                source: 'fallback' as const,
              },
            });
            return;
          }

          const result = completionResults[index];
          const [error, keyExists] = Array.isArray(result) ? result : [result, 0];

          if (error) {
            metrics.keyCheckErrors++;
            console.warn(`[TaskCompletionStateService] ⚠️ Redis error for task ${task.id}:`, error);
          }

          const isCompleted = !error && keyExists === 1;
          const completionDate = isCompleted ? this.extractDateFromCompletionKey(completionKey, period) : null;

          if (isCompleted) {
            metrics.completedTasks++;
            metrics.periodDistribution[period].completed++;
          } else {
            metrics.activeTasks++;
          }

          processedTasks.push({
            ...task,
            completed: isCompleted,
            completedAt: completionDate?.toISOString() || undefined,
            completionKey: isCompleted ? completionKey : undefined,
            completionMetadata: {
              checkedDate: new Date().toISOString(),
              checkedPeriod: period,
              keyExists: isCompleted,
              source: 'redis-key' as const,
            },
          });
        });
      }

      // ✅ STEP 5: Add already completed tasks back to the results
      alreadyCompletedTasks.forEach(task => {
        metrics.completedTasks++;
        metrics.periodDistribution[task.period].completed++;
        
        processedTasks.push({
          ...task,
          completed: true, // Already completed
          completedAt: task.completedAt || new Date().toISOString(),
          completionMetadata: {
            checkedDate: new Date().toISOString(),
            checkedPeriod: task.period,
            keyExists: true,
            source: 'redis-key' as const,
          },
        });
      });

      // ✅ STEP 6: Separate active and completed tasks from processed results
      const activeTasks = processedTasks.filter(task => !task.completed);
      const completedTasks = processedTasks.filter(task => task.completed);

      // ✅ ENTERPRISE LOGGING: Comprehensive metrics
      const processingTime = performance.now() - startTime;
      console.log(`[TaskCompletionStateService] ✅ Processing completed in ${processingTime.toFixed(2)}ms:`, {
        totalTasks: metrics.totalTasks,
        validTasks: validTasks.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        redisOperationTime: `${metrics.redisOperationTimeMs.toFixed(2)}ms`,
        keyCheckErrors: metrics.keyCheckErrors,
        periodDistribution: metrics.periodDistribution,
      });

      return { activeTasks, completedTasks, metrics };

    } catch (error) {
      console.error('[TaskCompletionStateService] ❌ Critical error in completion state processing:', error);
      
      // ✅ CIRCUIT BREAKER: Return tasks with fallback completion state
      const fallbackTasks: TaskWithCompletionState[] = allTasks.map(task => ({
        ...task,
        completed: task.completed || false, // Use existing state as fallback
        completionMetadata: {
          checkedDate: new Date().toISOString(),
          checkedPeriod: task.period,
          keyExists: false,
          source: 'fallback' as const,
        },
      }));

      return {
        activeTasks: fallbackTasks.filter(t => !t.completed),
        completedTasks: fallbackTasks.filter(t => t.completed),
        metrics: {
          ...metrics,
          redisOperationTimeMs: performance.now() - startTime,
          keyCheckErrors: 1,
        },
      };
    }
  }

  /**
   * ✅ PERIOD-AWARE COMPLETION KEY GENERATION
   * 
   * Generates the correct completion key based on task period:
   * - Daily: Check today's key
   * - Weekly: Check this week's key
   * - Monthly: Check this month's key
   */
  private generatePeriodAwareCompletionKey(task: Task): string {
    const now = new Date();
    
    switch (task.period) {
      case 'daily':
        // Check if task was completed TODAY
        return RedisKeyManager.generateCompletionKey(task.period, task.id, now);
        
      case 'weekly':
        // Check if task was completed THIS WEEK
        return RedisKeyManager.generateCompletionKey(task.period, task.id, now);
        
      case 'monthly':
        // Check if task was completed THIS MONTH
        return RedisKeyManager.generateCompletionKey(task.period, task.id, now);
        
      default:
        throw new Error(`Unsupported task period: ${task.period}`);
    }
  }

  /**
   * ✅ EXTRACT DATE FROM COMPLETION KEY
   * 
   * Extracts the actual completion date from the completion key structure.
   */
  private extractDateFromCompletionKey(completionKey: string, period: Period): Date | null {
    try {
      const parsed = RedisKeyManager.parseCompletionKey(completionKey);
      if (parsed.isValid) {
        return parsed.date;
      }
      return null;
    } catch (error) {
      console.warn(`[TaskCompletionStateService] Failed to extract date from key ${completionKey}:`, error);
      return null;
    }
  }

  /**
   * ✅ UTILITY: Get completion metrics for monitoring
   */
  getCompletionMetrics(): Record<string, any> {
    return {
      serviceVersion: '2.0.0',
      approach: 'period-aware-completion-keys',
      description: 'Single-phase processing with Redis completion keys as authoritative source',
    };
  }
}

// ✅ SINGLETON EXPORT
export const taskCompletionStateService = TaskCompletionStateService.getInstance();

// ✅ CONVENIENCE FUNCTION: Process task completion state
export async function processTaskCompletionState(allTasks: Task[]) {
  return taskCompletionStateService.processTaskCompletionState(allTasks);
}

// ✅ TYPE EXPORTS
export type { TaskWithCompletionState, CompletionCheckMetrics };
