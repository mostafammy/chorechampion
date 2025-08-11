# 🔍 Authentication Error Handling System - Complete Flow Documentation

## 📋 **Overview**

You asked about where the logic is that handles error types like `"logout_required"` from the token-status endpoint. Here's the complete authentication flow showing exactly where each status is handled and what actions are taken.

---

## 🏗️ **Complete Authentication Flow Architecture**

### **📍 1. Token Status Check → Error Handling → Actions**

```typescript
Token Status Endpoint (/api/auth/token-status)
    ↓ Returns status
TokenManager.checkTokenStatus()
    ↓ Processes status
TokenManager.ensureAuthenticated()
    ↓ Decides action
useAuthenticationGuard Hook
    ↓ Updates UI state
Frontend Components (redirect/logout)
```

---

## 🔄 **Status Handling Logic Locations**

### **1️⃣ TokenManager.checkTokenStatus() - Primary Status Detection**

**File**: `src/hooks/useAuthenticationGuard.ts` (lines 43-72)

```typescript
static async checkTokenStatus(): Promise<TokenStatus> {
  try {
    const response = await fetch("/api/auth/token-status", {
      method: "GET",
      credentials: "include",
      headers: { "Cache-Control": "no-cache" },
    });

    if (response.ok) {
      const data = await response.json();
      return data.status as TokenStatus; // ✅ RETURNS: "valid" | "needs_refresh" | "logout_required"
    }

    // If API call failed but might have refresh token
    if (response.status === 401) {
      return "needs_refresh"; // ✅ Graceful degradation
    }

    return "logout_required"; // ✅ Fallback to logout
  } catch (error) {
    return "needs_refresh"; // ✅ On network errors, try refresh first
  }
}
```

### **2️⃣ TokenManager.ensureAuthenticated() - Action Decision Logic**

**File**: `src/hooks/useAuthenticationGuard.ts` (lines 143-179)

```typescript
static async ensureAuthenticated(): Promise<AuthResult> {
  const status = await this.checkTokenStatus();

  if (status === "valid") {
    return "authenticated"; // ✅ ACTION: Continue with request
  }

  if (status === "needs_refresh") {
    const refreshResult = await this.refreshAccessToken();

    if (refreshResult === "success") {
      return "authenticated"; // ✅ ACTION: Token refreshed, continue
    }

    if (refreshResult === "logout_required") {
      return "logout_required"; // ✅ ACTION: Force logout
    }

    // Retry logic with fallback
    const retryResult = await this.refreshAccessToken();
    return retryResult === "success" ? "authenticated" : "logout_required";
  }

  return "logout_required"; // ✅ ACTION: Force logout
}
```

### **3️⃣ useAuthenticationGuard Hook - UI State Management**

**File**: `src/hooks/useAuthenticationGuard.ts` (lines 184-300)

```typescript
export function useAuthenticationGuard(): AuthGuardResult {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const router = useRouter();

  const checkAuthentication = useCallback(async () => {
    const result = await TokenManager.ensureAuthenticated();

    if (result === "authenticated") {
      setAuthStatus("authenticated"); // ✅ ACTION: Show authenticated UI
    } else {
      setAuthStatus("unauthenticated"); // ✅ ACTION: Show login UI
      // 🚨 REDIRECT LOGIC (currently disabled for dev)
      if (false && !IS_DEV) {
        router.push("/login"); // ✅ ACTION: Redirect to login
      }
    }
  }, [router]);

  // Background monitoring for token expiry
  const startBackgroundMonitoring = useCallback(() => {
    setInterval(async () => {
      const status = await TokenManager.checkTokenStatus();

      if (status === "needs_refresh") {
        await refreshToken(); // ✅ ACTION: Auto-refresh token
      } else if (status === "logout_required") {
        setAuthStatus("unauthenticated"); // ✅ ACTION: Force logout
        // router.push("/login"); // ✅ ACTION: Redirect (disabled in dev)
      }
    }, 60000); // Every minute
  }, []);
}
```

### **4️⃣ fetchWithAuth - API Request Error Handling**

**File**: `src/lib/auth/fetchWithAuth.ts` (lines 357-361)

```typescript
function defaultSessionExpiredHandler(): void {
  // Only redirect in browser environment
  if (typeof window !== "undefined") {
    window.location.href = "/login"; // ✅ ACTION: Hard redirect to login
  }
}
```

---

## 🚨 **Missing Piece: Centralized Logout Function**

**ISSUE IDENTIFIED**: You have status detection and UI state management, but you're **missing a centralized logout function** that actually calls the logout endpoint and clears cookies.

Let me create this missing piece:

---

## 🛠️ **Enhanced Authentication System with Logout**

### **Authentication Manager (Enhanced)**

**Location**: Will enhance `useAuthenticationGuard.ts`

```typescript
class TokenManager {
  // ... existing methods ...

  /**
   * 🚨 NEW: Centralized logout function
   * Calls logout endpoint and clears authentication state
   */
  static async performLogout(): Promise<void> {
    try {
      console.log("[TokenManager] Performing logout...");

      // Call logout endpoint to clear cookies and blacklist tokens
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      console.log("[TokenManager] Logout endpoint called successfully");
    } catch (error) {
      console.error("[TokenManager] Logout endpoint failed:", error);
      // Continue with logout even if endpoint fails
    }

    // Reset internal state
    this.refreshInProgress = false;
    this.refreshPromise = null;
    this.lastRefreshAttempt = 0;

    console.log("[TokenManager] Logout completed");
  }

  /**
   * 🔄 ENHANCED: Handle logout_required status with actual logout
   */
  static async handleLogoutRequired(): Promise<void> {
    console.log("[TokenManager] Logout required - performing logout...");

    // Call logout endpoint
    await this.performLogout();

    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login?message=session-expired";
    }
  }
}
```

### **Enhanced Hook with Logout Actions**

```typescript
export function useAuthenticationGuard(): AuthGuardResult {
  // ... existing state ...

  /**
   * 🚨 NEW: Manual logout function
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthStatus("checking");
      await TokenManager.performLogout();
      setAuthStatus("unauthenticated");
      router.push("/login?message=logged-out");
    } catch (error) {
      console.error("[useAuthenticationGuard] Logout failed:", error);
      // Force logout even on error
      setAuthStatus("unauthenticated");
      router.push("/login?message=logout-error");
    }
  }, [router]);

  // ENHANCED: Updated authentication check with logout action
  const checkAuthentication = useCallback(async () => {
    const result = await TokenManager.ensureAuthenticated();

    if (result === "authenticated") {
      setAuthStatus("authenticated");
    } else {
      // ✅ FIXED: Actually perform logout instead of just setting state
      await TokenManager.handleLogoutRequired();
      setAuthStatus("unauthenticated");
    }
  }, []);

  return {
    authStatus,
    isRefreshing,
    checkAuthentication,
    refreshToken,
    logout, // 🚨 NEW: Export logout function
    isAuthenticated: authStatus === "authenticated",
    isLoading: authStatus === "checking" || isRefreshing,
  };
}
```

---

## 🎯 **Complete Error Handling Flow**

### **Scenario 1: Token Status = "logout_required"**

```
1. Token Status Endpoint → Returns "logout_required"
2. TokenManager.checkTokenStatus() → Returns "logout_required"
3. TokenManager.ensureAuthenticated() → Returns "logout_required"
4. useAuthenticationGuard → Calls TokenManager.handleLogoutRequired()
5. TokenManager.handleLogoutRequired() → Calls logout endpoint
6. Frontend → Redirects to /login
```

### **Scenario 2: Token Status = "needs_refresh"**

```
1. Token Status Endpoint → Returns "needs_refresh"
2. TokenManager.checkTokenStatus() → Returns "needs_refresh"
3. TokenManager.ensureAuthenticated() → Attempts refresh
4. If refresh succeeds → Returns "authenticated"
5. If refresh fails → Calls handleLogoutRequired()
```

### **Scenario 3: Token Status = "valid"**

```
1. Token Status Endpoint → Returns "valid"
2. TokenManager.checkTokenStatus() → Returns "valid"
3. TokenManager.ensureAuthenticated() → Returns "authenticated"
4. Application → Continues normally
```

---

## 📍 **Current Status & Required Actions**

### **✅ What You Have:**

- ✅ Token status detection (`/api/auth/token-status`)
- ✅ Status processing logic (`TokenManager.checkTokenStatus`)
- ✅ Decision making logic (`TokenManager.ensureAuthenticated`)
- ✅ UI state management (`useAuthenticationGuard`)
- ✅ Logout endpoint (`/api/auth/logout`)

### **🚨 What's Missing:**

- ❌ **Centralized logout function** that actually calls the logout endpoint
- ❌ **Active logout execution** when `logout_required` status is detected
- ❌ **Proper redirect logic** (currently disabled in development)

### **🛠️ Required Fixes:**

1. **Add `TokenManager.performLogout()`** method
2. **Add `TokenManager.handleLogoutRequired()`** method
3. **Enhance `useAuthenticationGuard`** to actually perform logout
4. **Enable redirect logic** for production
5. **Export logout function** for manual logout buttons

---

## 🚀 **Implementation Priority**

**High Priority:**

1. Implement `TokenManager.performLogout()`
2. Update `useAuthenticationGuard` to call logout endpoint
3. Enable redirect logic for `logout_required` status

**Medium Priority:** 4. Add manual logout function to hook exports 5. Update components to use centralized logout

**Low Priority:** 6. Add logout confirmation dialogs 7. Add logout success/error messaging

**The missing piece is the bridge between status detection and actual logout execution!** 🎯
