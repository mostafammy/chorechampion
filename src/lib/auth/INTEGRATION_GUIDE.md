# Enhanced fetchWithAuth - Enterprise Integration Guide

This document explains how the enhanced `fetchWithAuth` integrates with the enterprise refresh token system (`TokenRefreshService` and `RefreshApiAdapter`) to provide a complete, production-ready authentication solution.

## 🏗️ Architecture Overview

The new `fetchWithAuth` integrates seamlessly with our enterprise authentication architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   fetchWithAuth │───▶│ RefreshApiAdapter│───▶│ TokenRefreshService │
│   (Client-side) │    │  (HTTP Layer)    │    │  (Business Logic)   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
        │                        │                         │
        │                        ▼                         ▼
        │               ┌──────────────────┐    ┌─────────────────┐
        └──────────────▶│ /api/auth/refresh│───▶│     JWT Utils   │
                        │   (API Route)    │    │  (Token Logic)  │
                        └──────────────────┘    └─────────────────┘
```

## 🔧 Key Integration Features

### 1. **Structured Error Handling**

The enhanced `fetchWithAuth` now receives detailed error information from `RefreshApiAdapter`:

```typescript
// Before (basic)
if (!refreshResponse.ok) {
  return false; // Simple boolean
}

// After (enterprise)
const refreshResult = await attemptTokenRefreshWithNewSystem();
if (!refreshResult.success) {
  console.log(`Refresh failed: ${refreshResult.errorCode}`);
  // Handle specific error types: MISSING_TOKEN, INVALID_TOKEN, EXPIRED_TOKEN
}
```

### 2. **Enhanced Error Classes**

New error classes provide richer context:

```typescript
export class SessionExpiredError extends AuthenticationError {
  constructor(correlationId?: string, errorCode?: string, retryCount?: number);
}

export class RefreshTokenError extends AuthenticationError {
  // Specific to refresh token failures
}
```

### 3. **Advanced Configuration Options**

```typescript
interface FetchWithAuthOptions {
  onRefreshError?: (error: RefreshErrorDetails) => void;
  customRefreshFunction?: () => Promise<TokenRefreshResult>;
  // ... other options
}
```

## 🚀 Usage Patterns

### Basic Usage (Fully Backward Compatible)

```typescript
// Works exactly as before, but with enhanced error handling
const response = await fetchWithAuth("/api/tasks");
```

### Advanced Usage with Error Handling

```typescript
const response = await fetchWithAuth("/api/sensitive-data", {
  maxRetries: 3,
  onRefreshError: (error) => {
    switch (error.errorCode) {
      case "MISSING_TOKEN":
        redirectToLogin();
        break;
      case "INVALID_TOKEN":
        showSecurityAlert();
        break;
      case "EXPIRED_TOKEN":
        showSessionExpiredMessage();
        break;
    }
  },
  onSessionExpired: (errorCode) => {
    analytics.track("session_expired", { errorCode });
  },
});
```

### Custom Refresh Logic

```typescript
const response = await fetchWithAuthAdvanced("/api/data", {
  customRefreshFunction: async () => {
    // Direct integration with TokenRefreshService
    const refreshToken = getRefreshTokenFromCustomStorage();
    return TokenRefreshService.refreshAccessToken({ refreshToken });
  },
});
```

### Environment-Specific Configuration

```typescript
const apiClient = createAuthenticatedFetcher({
  environment: "production",
  refreshEndpoint: "/api/auth/refresh",
  maxRetries: 3,
  enableLogging: true,
});

// Use convenience methods
const tasks = await apiClient.get("/api/tasks");
const newTask = await apiClient.post("/api/tasks", taskData);
```

## 🔄 Integration Flow

### 1. **Initial Request**

```typescript
const response = await fetchWithAuth("/api/protected-endpoint");
```

### 2. **401 Detected → Refresh Attempt**

```typescript
// fetchWithAuth calls our enterprise refresh system
const refreshResult = await attemptTokenRefreshWithNewSystem(
  "/api/auth/refresh", // → RefreshApiAdapter.handleApiRefresh()
  correlationId, // → TokenRefreshService.refreshAccessToken()
  retryCount // → JWT validation & new token generation
);
```

### 3. **Structured Response Processing**

```typescript
if (refreshResult.success) {
  // New access token set via cookie by RefreshApiAdapter
  // Retry original request automatically
} else {
  // Handle specific error codes from TokenRefreshService
  switch (refreshResult.errorCode) {
    case "MISSING_TOKEN": /* handle */
    case "INVALID_TOKEN": /* handle */
    case "EXPIRED_TOKEN": /* handle */
  }
}
```

## 📊 Error Code Mapping

| Error Code             | Source              | Meaning                            | Client Action                   |
| ---------------------- | ------------------- | ---------------------------------- | ------------------------------- |
| `MISSING_TOKEN`        | TokenRefreshService | No refresh token provided          | Redirect to login               |
| `INVALID_TOKEN`        | TokenRefreshService | Refresh token is malformed/invalid | Clear tokens, redirect to login |
| `EXPIRED_TOKEN`        | TokenRefreshService | Refresh token has expired          | Show session expired message    |
| `UNKNOWN_ERROR`        | TokenRefreshService | Unexpected error during refresh    | Retry or show error message     |
| `MAX_RETRIES_EXCEEDED` | fetchWithAuth       | Exhausted all retry attempts       | Handle as session expired       |

## 🛠️ Configuration Options

### Cookie Configuration

The `RefreshApiAdapter` handles cookie settings:

```typescript
// Configured in /api/auth/refresh/route.ts
{
  accessTokenCookie: {
    name: 'access_token',
    maxAge: 60 * 15, // 15 minutes
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}
```

### Retry Strategy

```typescript
const response = await fetchWithAuth("/api/data", {
  maxRetries: 3, // Try refresh up to 3 times
  enableRefresh: true, // Enable automatic refresh
});
```

### Custom Error Handling

```typescript
const response = await fetchWithAuth("/api/data", {
  onRefreshError: (error) => {
    // Custom logic for refresh failures
    logToAnalytics("refresh_failed", error);
  },
  onSessionExpired: (errorCode) => {
    // Custom session expiry handling
    showCustomExpiredModal(errorCode);
  },
});
```

## 🧪 Testing Integration

### Unit Testing with Mock Services

```typescript
// Mock the refresh system
jest.mock("./jwt/refreshTokenService", () => ({
  TokenRefreshService: {
    refreshAccessToken: jest.fn().mockResolvedValue({
      success: true,
      accessToken: "new_token",
    }),
  },
}));

// Test fetchWithAuth behavior
const response = await fetchWithAuth("/api/test");
expect(TokenRefreshService.refreshAccessToken).toHaveBeenCalled();
```

### Integration Testing

```typescript
// Test with real refresh endpoint
const response = await fetchWithAuth("/api/protected", {
  refreshEndpoint: "/api/auth/refresh", // Real endpoint
  correlationId: "test-integration-123",
});
```

## 🔒 Security Considerations

### 1. **Token Storage**

- Access tokens: HTTP-only cookies (handled by RefreshApiAdapter)
- Refresh tokens: HTTP-only cookies (handled by RefreshApiAdapter)
- No tokens stored in localStorage or sessionStorage

### 2. **Error Information**

- Detailed error codes help with debugging
- Correlation IDs enable request tracking
- Structured logging for security monitoring

### 3. **Retry Logic**

- Configurable retry limits prevent infinite loops
- Exponential backoff can be added for production
- Circuit breaker pattern can be implemented

## 🚀 Performance Optimizations

### 1. **Request Correlation**

```typescript
const correlationId = `batch-${Date.now()}`;
const [tasks, users] = await Promise.all([
  fetchWithAuth("/api/tasks", { correlationId: `${correlationId}-tasks` }),
  fetchWithAuth("/api/users", { correlationId: `${correlationId}-users` }),
]);
```

### 2. **Batched Operations**

```typescript
const apiClient = createAuthenticatedFetcher({ environment: "production" });

// All requests share the same configuration and connection pool
const results = await Promise.all([
  apiClient.get("/api/tasks"),
  apiClient.get("/api/projects"),
  apiClient.get("/api/settings"),
]);
```

### 3. **Conditional Refresh**

```typescript
// Only refresh if we haven't recently refreshed
const response = await fetchWithAuth("/api/data", {
  customRefreshFunction: async () => {
    const lastRefresh = getLastRefreshTime();
    if (Date.now() - lastRefresh < 30000) {
      // 30 seconds
      return {
        success: false,
        error: "Recent refresh",
        errorCode: "RATE_LIMITED",
      };
    }
    return TokenRefreshService.refreshAccessToken({ refreshToken });
  },
});
```

## 📈 Monitoring and Analytics

### Request Tracking

```typescript
const response = await fetchWithAuth("/api/important-action", {
  correlationId: "user-action-123",
  onRefreshError: (error) => {
    analytics.track("auth_refresh_failed", {
      errorCode: error.errorCode,
      correlationId: error.correlationId,
      retryCount: error.retryCount,
    });
  },
});
```

### Performance Monitoring

```typescript
const startTime = Date.now();
const response = await fetchWithAuth("/api/data");
const duration = Date.now() - startTime;

console.log("Request completed", {
  duration,
  status: response.status,
  correlationId: response.headers.get("X-Correlation-ID"),
});
```

## 🔄 Migration Guide

### From Basic fetchWithAuth

```typescript
// Before
const response = await fetchWithAuth("/api/data");

// After (same code works, but with enhanced error handling)
const response = await fetchWithAuth("/api/data");
```

### Add Error Handling

```typescript
// Before
try {
  const response = await fetchWithAuth("/api/data");
} catch (error) {
  console.error("Request failed:", error);
}

// After
try {
  const response = await fetchWithAuth("/api/data", {
    onRefreshError: (error) => {
      console.log(`Refresh failed: ${error.errorCode}`);
    },
  });
} catch (error) {
  if (error instanceof SessionExpiredError) {
    console.log(
      `Session expired: ${error.errorCode} (retry: ${error.retryCount})`
    );
  }
}
```

### Use Environment Configuration

```typescript
// Before
const response = await fetchWithAuth("/api/data");

// After
const apiClient = createAuthenticatedFetcher({
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
});
const response = await apiClient.get("/api/data");
```

This integration provides a seamless upgrade path while adding enterprise-grade capabilities for error handling, monitoring, and configuration management.
