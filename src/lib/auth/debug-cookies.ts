/**
 * Debug utility for access token cookie issues
 *
 * This file helps diagnose why access tokens aren't being stored in browser cookies
 */

// 1. Check if you have refresh token in browser
export function debugCookieIssues() {
  console.log("=== Cookie Debug Information ===");

  if (typeof document === "undefined") {
    console.log("Running on server - no document available");
    return;
  }

  const allCookies = document.cookie;
  console.log("All cookies:", allCookies);

  const cookies = allCookies.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    acc[name] = decodeURIComponent(value || "");
    return acc;
  }, {} as Record<string, string>);

  console.log("Parsed cookies:", cookies);
  console.log("Refresh token present:", !!cookies.refresh_token);
  console.log("Access token present:", !!cookies.access_token);

  return cookies;
}

// 2. Test refresh endpoint manually
export async function testRefreshEndpoint() {
  console.log("=== Testing Refresh Endpoint ===");

  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Refresh response status:", response.status);
    console.log(
      "Refresh response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseData = await response.json();
    console.log("Refresh response data:", responseData);

    // Check if Set-Cookie header is present
    const setCookieHeader = response.headers.get("set-cookie");
    console.log("Set-Cookie header:", setCookieHeader);

    return { response, data: responseData };
  } catch (error) {
    console.error("Error testing refresh endpoint:", error);
    throw error;
  }
}

// 3. Test fetchWithAuth with detailed logging
export async function testFetchWithAuthDebug() {
  console.log("=== Testing fetchWithAuth ===");

  try {
    // Import dynamically to avoid issues
    const { fetchWithAuth } = await import("./fetchWithAuth");

    const response = await fetchWithAuth("/api/test-endpoint", {
      method: "GET",
      enableRefresh: true,
      maxRetries: 1,
      correlationId: "debug-test",
      onRefreshError: (error) => {
        console.log("Refresh error details:", error);
      },
      onSessionExpired: (errorCode) => {
        console.log("Session expired with code:", errorCode);
      },
    });

    console.log("fetchWithAuth response:", response.status);
    return response;
  } catch (error) {
    console.error("fetchWithAuth test error:", error);
    throw error;
  }
}

// 4. Check browser network tab helper
export function logNetworkDebuggingTips() {
  console.log(`
=== Network Debugging Tips ===

1. Open browser DevTools (F12)
2. Go to Network tab
3. Clear the network log
4. Call debugCookieIssues() to see current cookies
5. Call testRefreshEndpoint() to test refresh
6. Look for:
   - POST request to /api/auth/refresh
   - Response headers containing "Set-Cookie"
   - Response status should be 200
   - Check if access_token cookie appears in Application > Cookies

Common Issues:
- Secure cookies require HTTPS in production
- HttpOnly cookies won't show in document.cookie
- SameSite issues in cross-origin scenarios
- Path restrictions on cookies
- Domain restrictions on cookies
  `);
}

// 5. Environment check
export function checkEnvironmentConfig() {
  console.log("=== Environment Configuration ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("NEXT_PUBLIC_VERCEL_URL:", process.env.NEXT_PUBLIC_VERCEL_URL);
  console.log(
    "Current URL:",
    typeof window !== "undefined" ? window.location.href : "Server-side"
  );
  console.log(
    "Is HTTPS:",
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : "Unknown"
  );

  const isProduction = process.env.NODE_ENV === "production";
  const isHTTPS =
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : false;

  console.log("Cookie secure setting should be:", isProduction);
  console.log("Current protocol supports secure cookies:", isHTTPS);

  if (isProduction && !isHTTPS) {
    console.warn(
      "⚠️ Production environment but not using HTTPS - secure cookies will fail!"
    );
  }
}

// 6. Complete diagnostic
export async function runCompleteDebug() {
  console.log("🔍 Running complete cookie debug...\n");

  // Check environment
  checkEnvironmentConfig();
  console.log("\n");

  // Check current cookies
  debugCookieIssues();
  console.log("\n");

  // Test refresh endpoint
  try {
    await testRefreshEndpoint();
  } catch (error) {
    console.error("Refresh test failed:", error);
  }
  console.log("\n");

  // Show network debugging tips
  logNetworkDebuggingTips();
}

// Usage instructions
console.log(`
To debug cookie issues, run in browser console:

// Quick check
debugCookieIssues()

// Test refresh endpoint
await testRefreshEndpoint()

// Complete diagnostic
await runCompleteDebug()

// Network debugging tips
logNetworkDebuggingTips()
`);
