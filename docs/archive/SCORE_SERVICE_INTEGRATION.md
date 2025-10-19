# Score Service Integration Guide

## Overview

This guide explains how your `app-provider.tsx` has been refactored to use the new enterprise-grade authentication system with automatic token refresh capabilities.

## What Changed

### Before (Old Implementation)

```typescript
// Old: Basic fetch without authentication handling
const result = await fetchAdjustScoreApi({
  userId: memberId,
  delta: amount,
  source: "manual",
});
```

### After (New Enterprise Implementation)

```typescript
// New: Enterprise-grade with automatic auth handling
const result = await ScoreService.adjustScore(
  {
    userId: memberId,
    delta: amount,
    source: "manual",
    reason: "Manual adjustment from dashboard",
  },
  {
    maxRetries: 2,
    userFriendlyErrors: true,
    correlationId: `manual-adjustment-${memberId}-${Date.now()}`,
  }
);
```

## Key Benefits

### 🔐 **Automatic Authentication Handling**

- Automatically refreshes tokens when they expire
- Handles 401 errors gracefully
- Provides clear error messages for authentication issues

### 🔄 **Enhanced Retry Logic**

- Configurable retry attempts (default: 2)
- Exponential backoff for transient failures
- Request correlation for debugging

### ✅ **Input Validation**

- Validates score adjustments before sending
- Prevents invalid data from reaching the API
- User-friendly validation error messages

### 📊 **Better Error Handling**

- Specific error codes for different failure types
- User-friendly error messages
- Detailed logging for debugging

### 🎯 **Request Tracking**

- Unique correlation IDs for each request
- Enhanced logging for troubleshooting
- Performance monitoring capabilities

## Usage Examples

### Basic Score Adjustment (Current Implementation)

```typescript
// In your component
const { handleAdjustScore } = useAppContext();

// Adjust score - handles all authentication automatically
await handleAdjustScore(memberId, 50); // Add 50 points
await handleAdjustScore(memberId, -25); // Deduct 25 points
```

### Advanced Usage with Enhanced Provider

```typescript
// If you want even more features, use the enhanced provider
import {
  EnhancedAppProvider,
  useEnhancedAppContext,
} from "@/context/enhanced-app-provider";

function MyComponent() {
  const {
    handleAdjustScore,
    handleBatchAdjustScores,
    scoreAdjustmentLoading,
    retryFailedAdjustments,
    getPendingOperationsCount,
  } = useEnhancedAppContext();

  // Check if a specific member's score adjustment is loading
  const isLoading = scoreAdjustmentLoading[memberId];

  // Batch adjust multiple scores
  await handleBatchAdjustScores([
    { memberId: "user1", amount: 50, reason: "Task completion" },
    { memberId: "user2", amount: 25, reason: "Bonus points" },
  ]);

  // Retry failed operations
  await retryFailedAdjustments();

  // Check pending operations
  const pendingCount = getPendingOperationsCount();
}
```

## Error Handling

The new system provides comprehensive error handling:

### Authentication Errors

```typescript
// Session expired - user needs to refresh page
{
  success: false,
  error: "Your session has expired. Please refresh the page and try again.",
  errorCode: "SESSION_EXPIRED"
}

// Authentication failed - user needs to re-authenticate
{
  success: false,
  error: "Authentication failed. Please refresh the page and try again.",
  errorCode: "AUTHENTICATION_ERROR"
}
```

### Validation Errors

```typescript
// Invalid input data
{
  success: false,
  error: "Delta must be a valid number",
  errorCode: "VALIDATION_ERROR"
}
```

### Network Errors

```typescript
// Network connectivity issues
{
  success: false,
  error: "Failed to adjust score. Please check your connection and try again.",
  errorCode: "NETWORK_ERROR"
}
```

## Configuration Options

### ScoreService Options

```typescript
const result = await ScoreService.adjustScore(input, {
  maxRetries: 3, // Number of retry attempts
  userFriendlyErrors: true, // Show user-friendly error messages
  correlationId: "custom-id", // Custom correlation ID
  timeout: 10000, // Request timeout in milliseconds
});
```

### Environment-Specific Configuration

```typescript
// Create environment-specific score service
const scoreService = createScoreService("production"); // or 'development', 'staging'

// Use it
const result = await scoreService.adjustScore(input);
```

## Migration Guide

### Step 1: Update Imports (Already Done)

```typescript
// Old
import { fetchAdjustScoreApi } from "@/lib/utils";

// New
import { ScoreService } from "@/lib/api/scoreService";
```

### Step 2: Update Function Calls (Already Done)

```typescript
// Old
const result = await fetchAdjustScoreApi({ userId, delta, source });

// New
const result = await ScoreService.adjustScore(
  { userId, delta, source },
  options
);
```

### Step 3: Enhanced Error Handling (Already Done)

```typescript
// The new implementation includes comprehensive error handling
// with validation, user-friendly messages, and proper error recovery
```

## Testing

### Mock the ScoreService for Testing

```typescript
// In your test files
jest.mock("@/lib/api/scoreService", () => ({
  ScoreService: {
    adjustScore: jest.fn(),
    validateScoreAdjustment: jest.fn(),
    batchAdjustScores: jest.fn(),
  },
}));

// Test success case
ScoreService.adjustScore.mockResolvedValue({
  success: true,
  correlationId: "test-correlation-id",
});

// Test failure case
ScoreService.adjustScore.mockResolvedValue({
  success: false,
  error: "Test error message",
  errorCode: "TEST_ERROR",
});
```

## Monitoring and Debugging

### Correlation IDs

Every request now includes a correlation ID for tracking:

```
manual-adjustment-user123-1643723400000-abc123def
```

This helps with:

- Debugging issues across logs
- Performance monitoring
- Request tracing

### Logging

The system provides structured logging:

```typescript
console.log("Score adjustment successful:", {
  memberId: "user123",
  amount: 50,
  correlationId: "manual-adjustment-user123-1643723400000-abc123def",
});
```

## Performance Considerations

### Optimistic Updates

- UI updates immediately for better user experience
- Reverts changes if the API call fails
- Shows loading states for clarity

### Retry Logic

- Automatic retries for transient failures
- Exponential backoff to prevent server overload
- Maximum retry limits to prevent infinite loops

### Batch Operations

- Process multiple score adjustments efficiently
- Controlled concurrency to prevent overwhelming the server
- Partial failure handling

## Security Features

### Automatic Token Refresh

- Seamlessly handles expired access tokens
- Uses secure refresh token flow
- Maintains user session without interruption

### Input Validation

- Validates all inputs before sending to API
- Prevents malicious or malformed requests
- User-friendly validation error messages

### Request Correlation

- Unique IDs for tracking and auditing
- Helps with security monitoring
- Enables request tracing

## Best Practices

### 1. Always Use the Service Layer

```typescript
// Good
const result = await ScoreService.adjustScore(input, options);

// Avoid - direct API calls
const response = await fetch('/api/AdjustScore', { ... });
```

### 2. Handle Errors Gracefully

```typescript
// The new implementation automatically handles errors
// and provides user-friendly messages
```

### 3. Use Validation

```typescript
// Validate before calling
const validation = ScoreService.validateScoreAdjustment(input);
if (!validation.isValid) {
  // Handle validation errors
  return;
}
```

### 4. Leverage Request Tracking

```typescript
// Use correlation IDs for debugging
const result = await ScoreService.adjustScore(input, {
  correlationId: `operation-${userId}-${Date.now()}`,
});
```

## Troubleshooting

### Common Issues

#### 1. Session Expired Errors

**Symptom**: Users see "Session expired" messages
**Solution**: The system automatically handles this. If persistent, check refresh token configuration.

#### 2. Network Errors

**Symptom**: "Network error" messages
**Solution**: The system retries automatically. Check internet connectivity and server status.

#### 3. Validation Errors

**Symptom**: "Invalid input" messages
**Solution**: Check the input data format. The system provides detailed validation error messages.

### Debug Mode

Enable debug logging by setting `userFriendlyErrors: false`:

```typescript
const result = await ScoreService.adjustScore(input, {
  userFriendlyErrors: false, // Shows technical error messages
});
```

## Summary

Your `app-provider.tsx` now uses an enterprise-grade score adjustment system that:

✅ Automatically handles authentication and token refresh  
✅ Provides comprehensive error handling and user feedback  
✅ Includes input validation and security features  
✅ Supports retry logic and request tracking  
✅ Maintains backward compatibility  
✅ Offers enhanced features through the optional enhanced provider

The integration is complete and your application now benefits from robust, production-ready score management with seamless authentication handling.
