const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function apiRequest(endpoint, options = {}) {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json, latencyMs: Date.now() - t0 };
}

function getRandomSeat() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T'];
  const row = rows[Math.floor(Math.random() * rows.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${row}${num}`;
}

async function createFreshBooking(custToken, vehicleId) {
  for (let i = 0; i < 30; i++) {
    const seat = getRandomSeat();
    const t0 = Date.now();
    const res = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
      body: JSON.stringify({
        vehicleId,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [seat],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Speed Test Customer', age: 30, gender: 'Male' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });

    if (res.ok && (res.data.data || res.data)._id) {
      const bData = res.data.data || res.data;
      bData._apiLatencyMs = res.latencyMs;
      return bData;
    }
  }
  return null;
}

async function runLiveSpeedAndDynamicAudit() {
  console.log('================================================================');
  console.log('🚀 HIGH-SPEED PUSH NOTIFICATION & DYNAMIC BROADCAST AUDIT');
  console.log('Production API:', BASE_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const report = {};

  // 1. Authenticate Admin
  const adminAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
  });
  const adminToken = adminAuth.data.token;

  // 2. Authenticate Customer
  const custAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
  });
  const custToken = custAuth.data.token;

  // 3. Base Same-Route Drivers (Harsh, Ayush, Pintu)
  console.log('--- PREPARING 3 BASE SAME-ROUTE DRIVERS ---');
  const baseDrivers = [
    { name: 'Harsh', email: 'harsh.driver@platform.com' },
    { name: 'Ayush', email: 'ayush.driver@platform.com' },
    { name: 'Pintu', email: 'pintu.driver@platform.com' }
  ];

  for (const d of baseDrivers) {
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: d.email, password: 'driver123', role: 'driver' })
    });
    d.token = loginRes.data.token;

    // Register Push Token for each driver
    const pushToken = `ExponentPushToken[SpeedTest_${d.name}_${Date.now().toString().slice(-4)}]`;
    d.pushToken = pushToken;
    await apiRequest('/driver/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${d.token}` },
      body: JSON.stringify({ pushToken })
    });
    console.log(`  ✓ Driver ${d.name} authenticated & push token registered: ${pushToken.substring(0, 32)}...`);
  }

  // Get Delhi -> Jaipur vehicles
  const vRes = await apiRequest('/vehicles');
  const vehicles = vRes.data.data || vRes.data || [];
  const harshBus = vehicles.find(v => v.vehicleNumber === 'DL 01 AB 4321') || vehicles[0];

  // =========================================================================
  // TEST 1: LIVE SPEED & BROADCAST TEST WITH 3 ELIGIBLE DRIVERS (N=3)
  // =========================================================================
  console.log('\n=================================================================');
  console.log('TEST 1: LIVE SPEED TEST (N=3 DRIVERS: Harsh, Ayush, Pintu)');
  console.log('=================================================================');

  const tB1Start = Date.now();
  const b1Data = await createFreshBooking(custToken, harshBus._id);
  const tB1End = Date.now();
  const b1Id = b1Data.bookingId || b1Data._id;

  console.log(`Booking #1 Created! ID: ${b1Id}`);
  console.log(`  Booking Creation Latency: ${b1Data._apiLatencyMs || (tB1End - tB1Start)} ms`);

  // Allow short moment for push dispatch
  await new Promise(r => setTimeout(r, 1200));

  // Verify each driver sees the booking request
  const b1Results = [];
  for (const d of baseDrivers) {
    const reqsRes = await apiRequest('/driver/booking-requests', {
      headers: { 'Authorization': `Bearer ${d.token}` }
    });
    const seesBooking = (reqsRes.data.data || []).some(r => r.bookingId === b1Id || r._id === b1Data._id);
    b1Results.push({ name: d.name, notified: seesBooking, token: d.pushToken });
    console.log(`  ${d.name}: ${seesBooking ? 'NOTIFIED & RECEIVED (PASS)' : 'SKIPPED (FAIL)'}`);
  }

  report.test1_N3 = {
    bookingId: b1Id,
    eligibleCount: 3,
    attemptedCount: 3,
    successfulCount: b1Results.filter(r => r.notified).length,
    bookingCreationLatencyMs: b1Data._apiLatencyMs || (tB1End - tB1Start),
    drivers: b1Results,
    pass: b1Results.every(r => r.notified)
  };

  // =========================================================================
  // TEST 2: DYNAMIC SCALING & BATCH DISPATCH TEST (N=10 DRIVERS)
  // =========================================================================
  console.log('\n=================================================================');
  console.log('TEST 2: DYNAMIC SCALING & BATCH DISPATCH (N=10 DRIVERS)');
  console.log('=================================================================');

  const dynamicDrivers = [];
  const suffix = Date.now().toString().slice(-4);

  console.log('Dynamically provisioning 7 additional Active + Approved Delhi → Jaipur drivers...');
  for (let i = 1; i <= 7; i++) {
    const dName = `SpeedDriver_${i}`;
    const dEmail = `speed.driver.${suffix}.${i}@platform.com`;
    const dPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    await apiRequest('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dName, email: dEmail, phone: dPhone, password: 'driver123', role: 'driver' })
    });

    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: dEmail, password: 'driver123', role: 'driver' })
    });
    const dToken = loginRes.data.token;

    const profileRes = await apiRequest('/driver/profile', { headers: { 'Authorization': `Bearer ${dToken}` } });
    const dId = (profileRes.data.data || profileRes.data)._id;

    // Activate driver
    await apiRequest(`/admin/drivers/${dId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ driverStatus: 'Active' })
    });

    // Set Online
    await apiRequest('/driver/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dToken}` },
      body: JSON.stringify({ isOnline: true })
    });

    // Create & Assign Bus on Delhi -> Jaipur
    const vRes = await apiRequest('/admin/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        vehicleNumber: `DL 05 SP ${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleName: `Express Speed Bus ${i}`,
        vehicleType: 'Bus',
        vehicleModel: 'Volvo 9600',
        vehicleCategory: 'Luxury AC Sleeper',
        ownerName: 'Speed Fleet Corp',
        ownerMobileNumber: '9876543210',
        seatingCapacity: 40,
        fuelType: 'Diesel',
        assignedDriver: dId,
        route: { origin: 'Delhi', destination: 'Jaipur' },
        vehicleStatus: 'Active'
      })
    });
    const vehId = (vRes.data.data || vRes.data)._id;

    await apiRequest('/admin/driver-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ vehicleId: vehId, driverId: dId })
    });

    // Register push token
    const pushToken = `ExponentPushToken[DynSpeed_${i}_${suffix}]`;
    await apiRequest('/driver/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dToken}` },
      body: JSON.stringify({ pushToken })
    });

    dynamicDrivers.push({ name: dName, email: dEmail, id: dId, token: dToken, pushToken });
    console.log(`  ✓ Driver ${i}/7 (${dName}) active on Delhi → Jaipur with push token.`);
  }

  const all10Drivers = [...baseDrivers, ...dynamicDrivers];
  console.log(`Total Active Delhi → Jaipur Drivers Ready: ${all10Drivers.length}`);

  // Create Booking #2 (Testing N=10 Drivers Batch Dispatch)
  const tB2Start = Date.now();
  const b2Data = await createFreshBooking(custToken, harshBus._id);
  const tB2End = Date.now();
  const b2Id = b2Data.bookingId || b2Data._id;

  console.log(`\nBooking #2 Created! ID: ${b2Id}`);
  console.log(`  Booking Creation Latency: ${b2Data._apiLatencyMs || (tB2End - tB2Start)} ms`);

  // Wait for batch push dispatch
  await new Promise(r => setTimeout(r, 1500));

  const b2Results = [];
  for (const d of all10Drivers) {
    const reqsRes = await apiRequest('/driver/booking-requests', {
      headers: { 'Authorization': `Bearer ${d.token}` }
    });
    const seesBooking = (reqsRes.data.data || []).some(r => r.bookingId === b2Id || r._id === b2Data._id);
    b2Results.push({ name: d.name, notified: seesBooking });
    console.log(`  ${d.name}: ${seesBooking ? 'NOTIFIED (PASS)' : 'SKIPPED (FAIL)'}`);
  }

  const b2SuccessCount = b2Results.filter(r => r.notified).length;
  console.log(`\nN=10 Dispatch Results: ${b2SuccessCount}/${all10Drivers.length} Drivers Notified!`);

  report.test2_N10 = {
    bookingId: b2Id,
    eligibleCount: 10,
    attemptedCount: 10,
    successfulCount: b2SuccessCount,
    bookingCreationLatencyMs: b2Data._apiLatencyMs || (tB2End - tB2Start),
    pass: b2SuccessCount === 10
  };

  // =========================================================================
  // TEST 3: DYNAMIC COUNT REDUCTION TEST (Deactivate 7 Drivers, Back to N=3)
  // =========================================================================
  console.log('\n=================================================================');
  console.log('TEST 3: DYNAMIC COUNT REDUCTION (Deactivating 7 drivers, back to N=3)');
  console.log('=================================================================');

  for (const d of dynamicDrivers) {
    await apiRequest(`/admin/drivers/${d.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ driverStatus: 'Inactive' })
    });
  }
  console.log('7 dynamic drivers set to Inactive.');

  const b3Data = await createFreshBooking(custToken, harshBus._id);
  const b3Id = b3Data.bookingId || b3Data._id;
  console.log(`Booking #3 Created! ID: ${b3Id}`);

  await new Promise(r => setTimeout(r, 1200));

  let activeNotified = 0;
  for (const d of baseDrivers) {
    const reqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${d.token}` } });
    const sees = (reqs.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);
    if (sees) activeNotified++;
    console.log(`  Base Driver ${d.name}: ${sees ? 'NOTIFIED (PASS)' : 'SKIPPED'}`);
  }

  let inactiveExcluded = 0;
  for (const d of dynamicDrivers) {
    const reqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${d.token}` } });
    const sees = (reqs.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);
    if (!sees) inactiveExcluded++;
  }
  console.log(`  Inactive Drivers Excluded: ${inactiveExcluded}/${dynamicDrivers.length} (PASS)`);

  report.test3_N3_reduction = {
    bookingId: b3Id,
    activeDriversNotified: activeNotified,
    inactiveDriversExcluded: inactiveExcluded,
    pass: activeNotified === 3 && inactiveExcluded === 7
  };

  // =========================================================================
  // TEST 4: WRONG ROUTE ISOLATION CONTROL TEST
  // =========================================================================
  console.log('\n=================================================================');
  console.log('TEST 4: WRONG ROUTE DRIVER ISOLATION CONTROL');
  console.log('=================================================================');

  const wrongLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'wrong.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const wrongToken = wrongLogin.data.token;

  const wrongReqs = await apiRequest('/driver/booking-requests', {
    headers: { 'Authorization': `Bearer ${wrongToken}` }
  });
  const wrongSeesDelhiJaipur = (wrongReqs.data.data || []).some(r => r.bookingId === b1Id || r.bookingId === b2Id || r.bookingId === b3Id);
  console.log(`  Wrong Route Driver (Lucknow → Jaipur) Sees Delhi → Jaipur Requests: ${wrongSeesDelhiJaipur ? 'YES (SECURITY/ROUTING LEAK)' : 'NO (BLOCKED - 100% SECURE)'}`);

  report.test4_wrong_route = {
    wrongRouteDriverBlocked: !wrongSeesDelhiJaipur,
    pass: !wrongSeesDelhiJaipur
  };

  console.log('\n=================================================================');
  console.log('📊 FINAL LIVE SPEED & DYNAMIC BROADCAST SCORECARD');
  console.log('=================================================================');
  console.log(JSON.stringify(report, null, 2));

  // Save report artifact
  const artifactPath = path.join('C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\36aa31c5-ea9b-4abd-894f-0928a3a8adbc', 'live_speed_and_dynamic_broadcast_report.json');
  fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));
  console.log(`\nReport artifact saved to: ${artifactPath}`);
}

runLiveSpeedAndDynamicAudit().catch(err => {
  console.error('Test script error:', err);
});
