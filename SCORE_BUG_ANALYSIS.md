# 🐛 Principal Engineer: Score Calculation Bug Analysis

## Issue Description

Dashboard showing incorrect scores (140 for user1, 50 for user2) when database scores are zero.

## Root Cause Analysis

### Data Flow Investigation

1. **Layout.tsx** (Server-side):

   - Calls `getAllTasksService()`
   - Filters `allTasks.filter(task => task.completed)` → `initialArchivedTasks`
   - Passes to Dashboard

2. **getAllTasksService.ts**:

   - Fetches task data from Redis
   - Checks completion status using `generateCompletionKey(task.period, task.id)`
   - Marks tasks as `completed: true` if completion key exists in Redis

3. **Dashboard.tsx**:
   - Calculates `completedScore = memberArchivedTasks.reduce((sum, task) => sum + task.score, 0)`
   - This is where the incorrect scores come from

### Root Cause

**Stale completion keys in Redis** are marking tasks as completed when they shouldn't be.

The completion keys follow this pattern:

- `task:completion:daily:${taskId}:${YYYY-MM-DD}`
- `task:completion:weekly:${taskId}:${YYYY-WNN}`
- `task:completion:monthly:${taskId}:${YYYY-MM}`

## Evidence

- Database scores are 0 (confirmed in issue description)
- Dashboard shows 140/50 points (from completed task scores)
- Score adjustments are 0 (server-side fetching working correctly)
- `completedScore` calculation is summing archived task scores

## Fix Strategy

### Immediate Fix

1. Clear stale completion keys from Redis
2. Add completion key validation/expiry
3. Add debug logging to identify the specific tasks

### Long-term Prevention

1. Implement completion key TTL (Time To Live)
2. Add completion key validation in getAllTasksService
3. Add administrative tools to manage completion keys
4. Implement proper cleanup on task deletion/modification

## Implementation Plan

1. Add Redis completion key debugging endpoint
2. Create completion key cleanup utility
3. Add validation in task completion flow
4. Implement proper Redis key lifecycle management
