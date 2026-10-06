// Day 18 Integration Verification Script
// Tests all Day 18 APIs (Dashboard, GIS, Weather, Dijkstra, A*, Dynamic Edge Blocking) against live backend

const BACKEND_URL = "http://127.0.0.1:8000";

async function runDay18Tests() {
  console.log("=== DAY 18 VERIFICATION: DASHBOARD + GIS + ROUTING ===");

  // 1. Authenticate
  const loginRes = await fetch(`${BACKEND_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "coordinator_e2e_final@emergency.gov",
      password: "EmergencySecurePassword123!",
    }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const { access_token } = await loginRes.json();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${access_token}`,
  };
  console.log("1. Authenticated successfully. Bearer token ready.");

  // 2. Disasters List & Selection
  const disastersRes = await fetch(`${BACKEND_URL}/disasters`, { headers });
  const disasters = await disastersRes.json();
  if (!disasters || disasters.length === 0) throw new Error("No disasters found in DB");
  const disaster = disasters[0];
  console.log(`2. Disaster Selected: #${disaster.id} - ${disaster.name} (Severity: ${disaster.severity}/10)`);

  // 3. Central Dashboard API
  console.log(`\n3. Calling GET /dashboard/${disaster.id}...`);
  const dashRes = await fetch(`${BACKEND_URL}/dashboard/${disaster.id}`, { headers });
  if (!dashRes.ok) throw new Error(`Dashboard retrieval failed: ${dashRes.status}`);
  const dash = await dashRes.json();
  console.log("   Dashboard Response Overview:");
  console.log("   - Overall Response Status:", dash.overall_response_status);
  console.log("   - Affected Population:", dash.affected_population);
  console.log("   - Impact Score & Level:", dash.impact_score, dash.impact_level);
  console.log("   - Shelter Metrics:", dash.shelter_metrics);
  console.log("   - Warehouse Metrics:", dash.warehouse_metrics);
  console.log("   - Road Network Corridors:", dash.road_network);
  console.log("   - Active Warnings Count:", dash.warnings?.length || 0);

  if (!["CRITICAL_ACTION_REQUIRED", "ELEVATED_RESPONSE", "NORMAL_MONITORING"].includes(dash.overall_response_status)) {
    throw new Error(`Unexpected response status: ${dash.overall_response_status}`);
  }

  // 4. GIS Spatial Endpoints
  console.log("\n4. Testing GIS Endpoints...");
  // 4a. Nearby Shelters
  const sheltersRes = await fetch(
    `${BACKEND_URL}/gis/shelters/nearby?latitude=${disaster.latitude}&longitude=${disaster.longitude}&radius_km=50&limit=10`,
    { headers }
  );
  const shelters = await sheltersRes.json();
  console.log(`   Nearby shelters discovered: ${shelters.length}`);

  // 4b. Nearby Warehouses
  const whRes = await fetch(
    `${BACKEND_URL}/gis/warehouses/nearby?latitude=${disaster.latitude}&longitude=${disaster.longitude}&radius_km=100&limit=10`,
    { headers }
  );
  const warehouses = await whRes.json();
  console.log(`   Nearby warehouses discovered: ${warehouses.length}`);

  // 4c. Affected Population GeoJSON
  const popRes = await fetch(
    `${BACKEND_URL}/gis/population/affected?disaster_id=${disaster.id}`,
    { headers }
  );
  if (popRes.ok) {
    const popData = await popRes.json();
    console.log(`   Affected Population GeoJSON points: ${popData.point_count}`);
    console.log(`   GeoJSON feature count: ${popData.geojson?.features?.length || 0}`);
  } else {
    console.log("   (Population spatial returned 404 or empty for this entity, handled gracefully)");
  }

  // 5. External Weather API
  console.log("\n5. Testing External Weather API...");
  const weatherRes = await fetch(
    `${BACKEND_URL}/external/weather?latitude=${disaster.latitude}&longitude=${disaster.longitude}`,
    { headers }
  );
  if (!weatherRes.ok) throw new Error(`Weather API failed: ${weatherRes.status}`);
  const weather = await weatherRes.json();
  console.log("   Weather condition:", weather.weather_condition);
  console.log("   Temperature:", weather.temperature_c, "°C");
  console.log("   Weather risk score:", weather.weather_risk);
  console.log("   Telemetry provider source:", weather.source);

  // 6. Routing Network & Algorithms
  console.log("\n6. Testing Routing Graph & Pathfinding Algorithms...");
  let nodesRes = await fetch(`${BACKEND_URL}/routing/nodes`, { headers });
  let nodes = await nodesRes.json();
  let edgesRes = await fetch(`${BACKEND_URL}/routing/edges`, { headers });
  let edges = await edgesRes.json();

  if (nodes.length === 0) {
    console.log("   Graph is empty, seeding sample road network...");
    const seedRes = await fetch(`${BACKEND_URL}/routing/seed-network`, {
      method: "POST",
      headers,
    });
    if (!seedRes.ok) throw new Error("Failed to seed road network");
    nodes = await (await fetch(`${BACKEND_URL}/routing/nodes`, { headers })).json();
    edges = await (await fetch(`${BACKEND_URL}/routing/edges`, { headers })).json();
  }
  console.log(`   Active Graph Topology: ${nodes.length} nodes, ${edges.length} edges.`);

  // 6a. Test Dijkstra (Safest path)
  const originNode = nodes[0];
  const destNode = nodes[nodes.length - 1];
  console.log(`   Testing Dijkstra Safest Route from Node #${originNode.id} to Node #${destNode.id}...`);
  const dijkstraRes = await fetch(`${BACKEND_URL}/routing/calculate-route`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      origin_node_id: originNode.id,
      destination_node_id: destNode.id,
      prefer_safe: true,
      algorithm: "dijkstra",
    }),
  });
  if (!dijkstraRes.ok) throw new Error(`Dijkstra route failed: ${dijkstraRes.status}`);
  const dijkstraRoute = await dijkstraRes.json();
  console.log("   Dijkstra Route Distance:", dijkstraRoute.distance_km, "km");
  console.log("   Dijkstra Travel Time:", dijkstraRoute.travel_time_minutes, "mins");
  console.log("   Dijkstra Risk Score:", dijkstraRoute.risk_score);
  console.log("   Dijkstra Path Sequence:", dijkstraRoute.path_node_ids.join(" -> "));
  console.log("   Explanation:", dijkstraRoute.explanation);

  // 6b. Test A* (Fastest/Shortest)
  console.log(`\n   Testing A* Shortest Route from Node #${originNode.id} to Node #${destNode.id}...`);
  const astarRes = await fetch(`${BACKEND_URL}/routing/calculate-route`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      origin_node_id: originNode.id,
      destination_node_id: destNode.id,
      prefer_safe: false,
      algorithm: "astar",
    }),
  });
  if (!astarRes.ok) throw new Error(`A* route failed: ${astarRes.status}`);
  const astarRoute = await astarRes.json();
  console.log("   A* Route Distance:", astarRoute.distance_km, "km");
  console.log("   A* Travel Time:", astarRoute.travel_time_minutes, "mins");
  console.log("   A* Algorithm Used:", astarRoute.algorithm_used);

  // 7. Dynamic Road Blockage & Reroute Verification
  console.log("\n7. Testing Dynamic Road Blockage (PUT /routing/edges/{id}/block)...");
  const testEdge = edges[0];
  const originalBlockedStatus = testEdge.is_blocked;
  console.log(`   Edge #${testEdge.id} initial blocked status: ${originalBlockedStatus}`);

  // Block the edge
  const blockRes = await fetch(`${BACKEND_URL}/routing/edges/${testEdge.id}/block`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ is_blocked: !originalBlockedStatus }),
  });
  if (!blockRes.ok) throw new Error(`Failed to update edge blockage: ${blockRes.status}`);
  const updatedEdge = await blockRes.json();
  console.log(`   Edge #${testEdge.id} toggled blocked status: ${updatedEdge.is_blocked}`);

  // Restore the edge
  await fetch(`${BACKEND_URL}/routing/edges/${testEdge.id}/block`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ is_blocked: originalBlockedStatus }),
  });
  console.log(`   Edge #${testEdge.id} restored to: ${originalBlockedStatus}`);

  console.log("\n>>> ALL DAY 18 INTEGRATION CHECKS PASSED WITH FLYING COLORS! <<<");
}

runDay18Tests().catch((err) => {
  console.error("Day 18 Verification Error:", err);
  process.exit(1);
});
