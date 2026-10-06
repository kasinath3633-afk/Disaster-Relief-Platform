// Day 17 Integration Verification Script
// Tests the exact real API interactions used by the frontend against the live backend

const BACKEND_URL = "http://127.0.0.1:8000";

async function runTests() {
  console.log("=== DAY 17 VERIFICATION: FRONTEND AUTH & API CLIENT ===");

  // 1. Health check
  const healthRes = await fetch(`${BACKEND_URL}/health`);
  const healthData = await healthRes.json();
  console.log("1. Backend Health Check:", healthData);
  if (healthData.api !== "ok" || healthData.database !== "ok") {
    throw new Error("Health check failed");
  }

  // 2. Test Invalid Login
  console.log("\n2. Testing Invalid Login Handling...");
  const invalidRes = await fetch(`${BACKEND_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nonexistent_officer@emergency.gov",
      password: "WrongPassword999!"
    }),
  });
  console.log("   Invalid login status code:", invalidRes.status);
  const invalidData = await invalidRes.json();
  console.log("   Invalid login error detail:", invalidData.detail);
  if (invalidRes.status !== 401) {
    throw new Error(`Expected 401, got ${invalidRes.status}`);
  }

  // 3. Test Valid Login with Real Backend User
  console.log("\n3. Testing Valid Login with Real Backend User...");
  const loginRes = await fetch(`${BACKEND_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "coordinator_e2e_final@emergency.gov",
      password: "EmergencySecurePassword123!"
    }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }
  const tokenData = await loginRes.json();
  console.log("   Login successful! Token Type:", tokenData.token_type);
  console.log("   Access Token prefix:", tokenData.access_token.substring(0, 25) + "...");

  const token = tokenData.access_token;
  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // 4. Test Protected Endpoint /test-auth
  console.log("\n4. Testing /test-auth with Bearer Token...");
  const authCheckRes = await fetch(`${BACKEND_URL}/test-auth`, {
    headers: authHeaders
  });
  if (!authCheckRes.ok) {
    throw new Error(`Auth check failed with status ${authCheckRes.status}`);
  }
  const userMetadata = await authCheckRes.json();
  console.log("   Authenticated user metadata:", userMetadata);

  // 5. Test Accessing Protected Domain Data (GET /disasters)
  console.log("\n5. Testing Protected Domain Endpoint (GET /disasters)...");
  const disastersRes = await fetch(`${BACKEND_URL}/disasters`, {
    headers: authHeaders
  });
  if (!disastersRes.ok) {
    throw new Error(`Failed to fetch disasters: ${disastersRes.status}`);
  }
  const disasters = await disastersRes.json();
  console.log(`   Fetched ${disasters.length} disasters from database.`);
  if (disasters.length > 0) {
    console.log("   Latest disaster:", {
      id: disasters[0].id,
      name: disasters[0].name,
      severity: disasters[0].severity,
      location: [disasters[0].latitude, disasters[0].longitude]
    });
  }

  // 6. Test Unauthenticated Access to Protected Endpoint
  console.log("\n6. Testing Unauthenticated Access Rejection...");
  const unauthRes = await fetch(`${BACKEND_URL}/disasters`);
  console.log("   Unauthenticated request status:", unauthRes.status);
  if (unauthRes.status !== 401 && unauthRes.status !== 403) {
    throw new Error(`Expected 401 or 403, got ${unauthRes.status}`);
  }

  console.log("\n>>> ALL DAY 17 VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
