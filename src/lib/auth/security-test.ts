/**
 * Security Test for AdjustScore API
 *
 * This test verifies that the AdjustScore API properly requires authentication
 * and cannot be called without valid tokens.
 */

// Test scenarios to verify security
const SECURITY_TESTS = [
  {
    name: "No Authentication Headers",
    description: "Request without any authentication tokens should fail",
    expectedStatus: 401,
    expectedError: "AUTHENTICATION_REQUIRED",
  },
  {
    name: "Invalid Access Token",
    description: "Request with invalid access token should fail",
    expectedStatus: 401,
    expectedError: "AUTHENTICATION_REQUIRED",
  },
  {
    name: "Expired Access Token",
    description: "Request with expired access token should fail",
    expectedStatus: 401,
    expectedError: "AUTHENTICATION_REQUIRED",
  },
  {
    name: "Valid Authentication",
    description: "Request with valid access token should succeed",
    expectedStatus: 200,
    expectedSuccess: true,
  },
];

/**
 * Manual security test - run this in browser console
 */
export async function testAdjustScoreSecurityManually() {
  console.log("🔒 Testing AdjustScore API Security...\n");

  // Test 1: No authentication
  console.log("1️⃣ Testing without authentication...");
  try {
    const response1 = await fetch("/api/AdjustScore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "test-user",
        delta: 50,
        source: "manual",
      }),
      // Deliberately NOT including credentials
    });

    const data1 = await response1.json();
    console.log("Response without auth:", {
      status: response1.status,
      data: data1,
    });

    if (response1.status === 401) {
      console.log("✅ PASS: Correctly rejected unauthenticated request");
    } else {
      console.error("❌ FAIL: Should have rejected unauthenticated request!");
    }
  } catch (error) {
    console.log("Request failed (expected):", error);
  }

  console.log("\n");

  // Test 2: With authentication (should work if user is logged in)
  console.log("2️⃣ Testing with authentication...");
  try {
    const response2 = await fetch("/api/AdjustScore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "test-user",
        delta: 1, // Small test adjustment
        source: "manual",
        reason: "Security test",
      }),
      credentials: "include", // Include authentication cookies
    });

    const data2 = await response2.json();
    console.log("Response with auth:", {
      status: response2.status,
      data: data2,
    });

    if (response2.status === 200 && data2.success) {
      console.log("✅ PASS: Correctly accepted authenticated request");
    } else if (response2.status === 401) {
      console.log("⚠️ INFO: Authentication required (user not logged in)");
    } else {
      console.error("❌ FAIL: Unexpected response for authenticated request");
    }
  } catch (error) {
    console.error("Error testing authenticated request:", error);
  }

  console.log("\n🔒 Security test completed!");
}

/**
 * Check current authentication status
 */
export function checkAuthenticationStatus() {
  console.log("🔍 Checking current authentication status...\n");

  // Check cookies
  const cookies = document.cookie.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);

  console.log("Cookies found:", {
    hasRefreshToken: !!cookies.refresh_token,
    hasAccessToken: !!cookies.access_token,
    hasDebugToken: !!cookies.debug_token_set,
  });

  // Check if we can access a protected endpoint
  fetch("/api/debug/refresh", {
    method: "GET",
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => {
      console.log("Debug endpoint response:", data);
      console.log(
        "Authentication status:",
        data.hasAccessToken ? "✅ Authenticated" : "❌ Not authenticated"
      );
    })
    .catch((error) => {
      console.error("Failed to check auth status:", error);
    });
}

/**
 * Instructions for manual testing
 */
console.log(`
🔒 AdjustScore Security Testing Instructions:

1. Open browser console
2. Run: checkAuthenticationStatus()
3. Run: testAdjustScoreSecurityManually()

Expected Results:
- ❌ Requests without authentication should fail with 401
- ✅ Requests with valid authentication should succeed  
- ⚠️ If not logged in, all requests should fail with 401

To test properly:
1. First test while logged out (should see all 401s)
2. Then login and test again (should see 200s for authenticated requests)

Quick test commands:
checkAuthenticationStatus()
testAdjustScoreSecurityManually()
`);

// Export functions for use in console
if (typeof window !== "undefined") {
  (window as any).testAdjustScoreSecurityManually =
    testAdjustScoreSecurityManually;
  (window as any).checkAuthenticationStatus = checkAuthenticationStatus;
}
