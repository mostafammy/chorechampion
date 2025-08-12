/**
 * ✅ ENTERPRI// ✅ RE-EXPORT CORE UTILITIES
export { cn, IS_DEV, Environment, TypeGuards, Validators, Performance } from './utils/core';

// ✅ RE-EXPORT SECURITY UTILITIES
export { SecurityUtils, RateLimiter } from './security';

// ✅ RE-EXPORT REDIS UTILITIES  
export { RedisKeyManager } from './redis/key-manager';
export { RedisOperations } from './redis/operations';ILITIES - REFACTORED
 * 
 * This file has been refactored to use enterprise-grade architecture
 * while maintaining backward compatibility with existing code.
 * 
 * New architecture location:
 * - Core utilities: ./utils/core.ts
 * - Security utilities: ./security/index.ts
 * - Database operations: ./database/user-repository.ts
 * - Redis operations: ./redis/key-manager.ts, ./redis/operations.ts
 * - API client: ./api/client.ts
 * 
 * @deprecated Individual exports - Use new modular architecture
 * @version 2.0.0 (Backward Compatible)
 */

// Import for internal usage
import { RedisKeyManager } from "./redis/key-manager";

// ✅ RE-EXPORT CORE UTILITIES
export {
  cn,
  IS_DEV,
  Environment,
  TypeGuards,
  Validators,
  Performance,
} from "./utils/core";

// ✅ RE-EXPORT SECURITY UTILITIES
export { SecurityUtils, escapeHtml } from "./security";

// ✅ RE-EXPORT DATABASE OPERATIONS
export { UserRepository, isEmailTaken } from "./database/user-repository";

// ✅ RE-EXPORT REDIS KEY MANAGEMENT
export {
  RedisKeyManager,
  generateCompletionKey,
  parseCompletionKey,
  parseCompletionKeys,
  parseValidCompletionKeys,
  groupKeysByPeriod,
  getKeysInDateRange,
  type ParsedCompletionKey,
  type ParsedCompletionKeyError,
  type ParseResult,
} from "./redis/key-manager";

// ✅ RE-EXPORT REDIS OPERATIONS
export { RedisOperations, scanCompletionTasks } from "./redis/operations";

// ✅ RE-EXPORT API CLIENT
export {
  ApiClient,
  EnvironmentConfig,
  fetchAdjustScoreApi,
  SSRfetchAllTasksFromApi,
  baseUrl,
} from "./api/client";

// ✅ RE-EXPORT TASK STATE MANAGEMENT
export {
  TaskStateManager,
  markTaskCompleted,
  markTaskIncomplete,
  getTaskState,
  batchUpdateTaskStates,
  type TaskStateUpdateOptions,
  type TaskStateResult,
  type TaskCompletionMetadata,
} from "./taskStateManager";

// ✅ LEGACY SUPPORT - EXAMPLE FUNCTION
// This function is kept for backward compatibility but should be migrated
export function examples() {
  console.warn(`
🚨 DEPRECATION NOTICE:
The examples() function is deprecated. Please use the new enterprise architecture:

Core Utilities:
  import { cn, Validators, TypeGuards } from '@/lib/utils/core';

Security:
  import { SecurityUtils } from '@/lib/security';

Database:
  import { UserRepository } from '@/lib/database/user-repository';

Redis:
  import { RedisKeyManager, RedisOperations } from '@/lib/redis';

API:
  import { ApiClient } from '@/lib/api/client';

For examples, see the documentation in each module.
  `);

  // Original example for backward compatibility
  const key = "task:completion:daily:task-L-e4UdbrSM:2025-07-14";
  const parsed = RedisKeyManager.parseCompletionKey(key);

  if (parsed.isValid) {
    console.log(`Task ID: ${parsed.taskId}`);
    console.log(`Period: ${parsed.period}`);
    console.log(`Date: ${parsed.date.toISOString()}`);
    console.log(`Original date part: ${parsed.datePart}`);
  } else {
    console.error(`Error parsing key: ${parsed.error}`);
  }
}
