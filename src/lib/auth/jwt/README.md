# Token Refresh System Architecture

This document describes the refactored, scalable token refresh system that follows best practices for separation of concerns, maintainability, and performance.

## Architecture Overview

The system is now split into three independent layers:

1. **Core Business Logic** (`TokenRefreshService`) - Framework-agnostic
2. **HTTP Adapter** (`RefreshApiAdapter`) - Next.js specific HTTP handling
3. **API Routes** - Thin controllers that use the adapters

## Components

### 1. TokenRefreshService (Core Business Logic)

**File**: `src/lib/auth/jwt/refreshTokenService.ts`

**Purpose**: Pure business logic for token operations, completely framework-agnostic.

**Key Features**:

- ✅ Framework independent
- ✅ Easily testable
- ✅ Type-safe with comprehensive error codes
- ✅ No side effects (HTTP responses, cookies, etc.)
- ✅ Reusable across different contexts

**Main Methods**:

```typescript
// Refresh an access token
TokenRefreshService.refreshAccessToken({ refreshToken: string })

// Validate token without side effects
TokenRefreshService.validateRefreshToken(refreshToken: string)
```

### 2. RefreshApiAdapter (HTTP Layer)

**File**: `src/lib/auth/jwt/refreshApiAdapter.ts`

**Purpose**: Handles Next.js specific HTTP concerns like cookies, responses, and redirects.

**Key Features**:

- ✅ Configurable cookie settings
- ✅ Support for both API and middleware use cases
- ✅ Proper error handling with HTTP status codes
- ✅ Automatic cookie cleanup on failure
- ✅ Customizable redirect URLs

**Main Methods**:

```typescript
// For API routes (JSON responses)
RefreshApiAdapter.handleApiRefresh(request, options);

// For middleware (redirect responses)
RefreshApiAdapter.handleMiddlewareRefresh(request, options);

// Quick validation
RefreshApiAdapter.validateRefreshToken(request);
```

### 3. API Routes (Controllers)

**File**: `src/app/api/auth/refresh/route.ts`

**Purpose**: Thin controllers that configure and delegate to the adapters.

**Endpoints**:

- `POST /api/auth/refresh` - For AJAX calls (returns JSON)
- `GET /api/auth/refresh` - For redirects (returns redirect response)

## Usage Patterns

### 1. Standard API Usage (Recommended)

Your existing `fetchWithAuth.ts` works perfectly with this:

```typescript
// Client calls POST /api/auth/refresh on 401
const refreshRes = await fetch("/api/auth/refresh", {
  method: "POST",
  credentials: "include",
});

if (refreshRes.ok) {
  // New access token is set as cookie automatically
  // Retry original request
}
```

### 2. Custom Configuration

```typescript
// Custom API endpoint with different settings
export async function POST(request: NextRequest) {
  return RefreshApiAdapter.handleApiRefresh(request, {
    accessTokenCookie: {
      maxAge: 60 * 30, // 30 minutes
      sameSite: "strict",
      path: "/api",
    },
    clearTokensOnFailure: false,
  });
}
```

### 3. Background Jobs / CLI Scripts

```typescript
// Use core service without HTTP concerns
const result = await TokenRefreshService.refreshAccessToken({
  refreshToken: userRefreshToken,
});

if (result.success) {
  // Save new token to database
  await saveTokenToDatabase(userId, result.accessToken);
}
```

### 4. Testing

```typescript
// Easy to unit test
const mockService = {
  refreshAccessToken: async () => ({
    success: true,
    accessToken: "test_token",
  }),
};
```

## Benefits of This Architecture

### 🚀 Performance

- **Stateless**: No server-side session storage needed
- **Cacheable**: Business logic can be cached/memoized
- **Efficient**: Single responsibility per component

### 🔒 Security

- **Proper cookie handling**: Secure, HttpOnly, SameSite configured
- **Token cleanup**: Automatic cleanup of invalid tokens
- **Error isolation**: Different error types handled appropriately

### 🛠 Maintainability

- **Single Responsibility**: Each component has one clear purpose
- **Dependency Injection**: Easy to swap implementations
- **Configuration**: Highly configurable without code changes

### 📈 Scalability

- **Framework Agnostic**: Core logic can be reused in other frameworks
- **Horizontal Scaling**: Stateless design scales horizontally
- **Microservices Ready**: Can be extracted to separate service

### 🧪 Testability

- **Unit Testable**: Business logic is pure and testable
- **Mockable**: Clean interfaces for mocking
- **Integration Testable**: HTTP layer can be tested separately

## Migration Guide

### From Old Implementation

1. **Replace direct calls** to `handleTokenRefresh` with `RefreshApiAdapter.handleApiRefresh`
2. **Remove recursive logic** from `requireAuth` - let client handle refreshes
3. **Update API routes** to use the new thin controller pattern
4. **Configure options** instead of hardcoding values

### Error Handling

The new system provides detailed error codes:

```typescript
interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  errorCode?:
    | "MISSING_TOKEN"
    | "INVALID_TOKEN"
    | "EXPIRED_TOKEN"
    | "UNKNOWN_ERROR";
}
```

This allows for more sophisticated error handling and better user experience.

## Configuration Options

### Cookie Configuration

```typescript
accessTokenCookie: {
    name: 'access_token',
    maxAge: 60 * 15, // 15 minutes
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
}
```

### Behavior Configuration

```typescript
clearTokensOnFailure: true,  // Clear invalid tokens
redirectUrls: {
    onSuccess: '/',
    onFailure: '/login'
}
```

## Best Practices

1. **Use POST for refreshes**: State-changing operations should use POST
2. **Configure security settings**: Always set secure cookies in production
3. **Handle all error codes**: Provide appropriate user feedback for each error type
4. **Monitor token usage**: Log refresh attempts for security monitoring
5. **Test thoroughly**: Unit test business logic, integration test HTTP layer

## Future Enhancements

This architecture makes it easy to add:

- **Rate limiting**: Add to the HTTP adapter
- **Token blacklisting**: Add to the business logic layer
- **Analytics**: Inject logging into any layer
- **Different storage backends**: Swap out cookie handling
- **Microservice extraction**: Move business logic to separate service
