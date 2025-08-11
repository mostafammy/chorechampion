/\*\*

- Comprehensive Cookie Debugging Guide
-
- This guide helps you identify and fix access token cookie issues
  \*/

## 🔍 Step-by-Step Debugging Process

### Step 1: Check Current State

Open your browser console and run:

```javascript
// Import the debug functions
import("/lib/auth/debug-cookies.js").then((debug) => {
  debug.runCompleteDebug();
});
```

### Step 2: Test the Debug Endpoint

Navigate to: `http://localhost:3000/api/debug/refresh`

Or run in console:

```javascript
fetch("/api/debug/refresh", {
  method: "POST",
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

### Step 3: Check Browser DevTools

1. **Network Tab:**

   - Look for POST request to `/api/auth/refresh`
   - Check Response Headers for `Set-Cookie`
   - Verify response status is 200

2. **Application Tab > Cookies:**

   - Look for `access_token` cookie
   - Check if `debug_token_set` appears (this proves cookie setting works)
   - Verify cookie attributes (HttpOnly, Secure, SameSite, Path)

3. **Console Tab:**
   - Look for RefreshApiAdapter logs
   - Check for any error messages

### Step 4: Common Issues & Solutions

#### Issue 1: HttpOnly Cookies Are Invisible in document.cookie

**Symptoms:** fetchWithAuth works, but you can't see access_token in document.cookie
**Solution:** This is CORRECT behavior! HttpOnly cookies are hidden from JavaScript for security.

**Test:** Look for `debug_token_set` cookie instead (it's NOT HttpOnly):

```javascript
document.cookie.includes("debug_token_set=true");
```

#### Issue 2: Secure Cookie in Development

**Symptoms:** Cookies not set in localhost development
**Solution:** Check if secure is set to false in development

**Fix in `/app/api/auth/refresh/route.ts`:**

```typescript
export async function POST(request: NextRequest) {
  return RefreshApiAdapter.handleApiRefresh(request, {
    accessTokenCookie: {
      maxAge: 60 * 15,
      secure: false, // Set to false for localhost development
      httpOnly: true,
      sameSite: "lax",
    },
  });
}
```

#### Issue 3: Wrong Domain/Path

**Symptoms:** Cookies set but not sent with requests
**Solution:** Verify domain and path settings

**Fix:**

```typescript
accessTokenCookie: {
  path: "/",        // Should be "/" for all routes
  domain: undefined, // Should be undefined for localhost
}
```

#### Issue 4: SameSite Issues

**Symptoms:** Cookies not sent in cross-origin requests
**Solution:** Adjust SameSite setting

**For localhost development:**

```typescript
accessTokenCookie: {
  sameSite: "lax", // or "none" for cross-origin
}
```

#### Issue 5: Cookie Not Being Used by fetch

**Symptoms:** Access token cookie exists but fetch doesn't send it
**Solution:** Ensure credentials: "include" is set

**Check in your API calls:**

```typescript
fetch("/api/endpoint", {
  credentials: "include", // Essential!
  // ... other options
});
```

### Step 5: Manual Verification

**Test cookie setting manually:**

```javascript
// Set a test cookie
document.cookie = "test_cookie=working; path=/; max-age=300";

// Check if it appears
document.cookie.includes("test_cookie=working");

// If this fails, you have browser/domain issues
```

**Test fetch with credentials:**

```javascript
fetch("/api/debug/refresh", {
  method: "GET",
  credentials: "include",
})
  .then((r) => r.json())
  .then((data) => {
    console.log("Server sees these cookies:", data.cookies);
  });
```

### Step 6: Environment-Specific Fixes

#### Development (localhost)

```typescript
// In route.ts
accessTokenCookie: {
  secure: false,     // Must be false for HTTP
  sameSite: "lax",   // Relaxed for development
  domain: undefined, // Let browser set automatically
}
```

#### Production (HTTPS)

```typescript
// In route.ts
accessTokenCookie: {
  secure: true,      // Required for HTTPS
  sameSite: "strict", // Strict for security
  domain: ".yourdomain.com", // Set your domain
}
```

### Step 7: Quick Fixes

**If cookies aren't being set at all:**

1. Check server logs for RefreshApiAdapter messages
2. Verify JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are set
3. Ensure you have a valid refresh_token cookie

**If cookies are set but not visible:**

1. Check Application > Cookies in DevTools (NOT document.cookie)
2. Look for `debug_token_set` cookie to verify setting works
3. Remember: HttpOnly cookies are invisible to JavaScript (by design)

**If cookies are visible but not sent with requests:**

1. Add `credentials: 'include'` to all fetch calls
2. Check domain/path/SameSite settings
3. Verify CORS settings allow credentials

### Step 8: Success Verification

Your system is working correctly if:

- ✅ `/api/debug/refresh` returns success: true
- ✅ `debug_token_set` cookie appears in document.cookie
- ✅ `access_token` cookie appears in DevTools > Application > Cookies
- ✅ fetchWithAuth successfully retries after 401 errors
- ✅ Score adjustments work even when access token is expired

**Remember:** You should NOT see `access_token` in `document.cookie` - that would be a security vulnerability!
