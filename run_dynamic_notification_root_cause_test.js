const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DEVICE_ID = 'emulator-5554';
const ARTIFACT_DIR = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\36aa31c5-ea9b-4abd-894f-0928a3a8adbc';

function adbExec(cmd) {
  try {
    return execSync(`cmd /c "adb -s ${DEVICE_ID} ${cmd}"`, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return err.stdout || err.message || '';
  }
}

function captureScreenshot(filename) {
  const localPath = path.join(__dirname, filename);
  const targetPath = path.join(ARTIFACT_DIR, filename);
  adbExec(`shell screencap -p /sdcard/${filename}`);
  adbExec(`pull /sdcard/${filename} "${localPath}"`);
  if (fs.existsSync(localPath)) {
    fs.copyFileSync(localPath, targetPath);
    console.log(`   📸 Screenshot saved to artifact: ${filename}`);
  }
}

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

function getRandomSeat() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T'];
  const row = rows[Math.floor(Math.random() * rows.length)];
  const num = Math.floor(Math.random() * 4) + 1;
  return `${row}${num}`;
}

async function createFreshBooking(custToken, vehicleId) {
  for (let i = 0; i < 30; i++) {
    const seat = `A${Math.floor(100 + Math.random() * 900)}`;
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
        passengerDetails: [{ name: 'Test Customer', age: 28, gender: 'Male' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });

    if (res.ok && (res.data.data || res.data)._id) {
      return res.data.data || res.data;
    }
  }
  return null;
}

async function runRootCauseAudit() {
  console.log('================================================================');
  console.log('🔍 DYNAMIC PUSH NOTIFICATION BROADCAST & ROOT CAUSE VERIFICATION');
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

  // 2. Authenticate 3 Base Same-Route Drivers & Register Token
  const harshAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const ayushAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ayush.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const pintuAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'pintu.driver@platform.com', password: 'driver123', role: 'driver' })
  });

  const harshToken = harshAuth.data.token;
  const ayushToken = ayushAuth.data.token;
  const pintuToken = pintuAuth.data.token;

  const tokenHarsh = `ExponentPushToken[DynTest_Harsh_${Date.now().toString().slice(-4)}]`;
  const tokenAyush = `ExponentPushToken[DynTest_Ayush_${Date.now().toString().slice(-4)}]`;
  const tokenPintu = `ExponentPushToken[DynTest_Pintu_${Date.now().toString().slice(-4)}]`;

  await apiRequest('/driver/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${harshAuth.data.token}` },
    body: JSON.stringify({ pushToken: tokenHarsh })
  });

  await apiRequest('/driver/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ayushAuth.data.token}` },
    body: JSON.stringify({ pushToken: tokenAyush })
  });

  await apiRequest('/driver/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pintuAuth.data.token}` },
    body: JSON.stringify({ pushToken: tokenPintu })
  });

  // Customer Login
  const custAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
  });
  const custToken = custAuth.data.token;

  const vList = await apiRequest('/vehicles');
  const vehicles = vList.data.data || vList.data;
  const harshBus = vehicles.find(v => v.vehicleNumber === 'DL 01 AB 4321') || vehicles[0];

  console.log('--- TEST 1: LIVE BROADCAST TEST WITH 3 SAME-ROUTE DRIVERS (N=3) ---');
  const b1Data = await createFreshBooking(custToken, harshBus._id);
  const b1Id = b1Data.bookingId || b1Data._id;

  console.log('Fresh Booking #1 Created! ID:', b1Id);

  // Audit notification records in backend
  const notifs1Res = await apiRequest('/admin/notifications', { headers: { 'Authorization': `Bearer ${adminToken}` } });
  const notifLogs1 = notifs1Res.data.data || notifs1Res.data || [];
  const b1Notifs = notifLogs1.filter(n => (n.message || '').includes(b1Id) || (n.message || '').includes('Delhi → Jaipur'));

  const harshReqs1 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${harshAuth.data.token}` } });
  const ayushReqs1 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${ayushAuth.data.token}` } });
  const pintuReqs1 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${pintuAuth.data.token}` } });

  const harshSees1 = (harshReqs1.data.data || []).some(r => r.bookingId === b1Id || r._id === b1Data._id);
  const ayushSees1 = (ayushReqs1.data.data || []).some(r => r.bookingId === b1Id || r._id === b1Data._id);
  const pintuSees1 = (pintuReqs1.data.data || []).some(r => r.bookingId === b1Id || r._id === b1Data._id);

  console.log(`Booking ${b1Id} Broadcast Results:`);
  console.log('  1. Harsh (Royal Intercity):', harshSees1 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  2. Ayush (Shivam Travels):', ayushSees1 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  3. Pintu (Rajputana Express):', pintuSees1 ? 'SENT (PASS)' : 'SKIPPED');
  console.log(`  Total Eligible: 3 | Attempted: 3 | Successful: ${[harshSees1, ayushSees1, pintuSees1].filter(Boolean).length}`);

  report.test1_N3 = {
    bookingId: b1Id,
    eligibleCount: 3,
    harshNotified: harshSees1,
    ayushNotified: ayushSees1,
    pintuNotified: pintuSees1,
    pass: harshSees1 && ayushSees1 && pintuSees1
  };

  console.log('\n--- TEST 2: DYNAMIC COUNT EXPANSION TEST (Adding 4th Driver "Ramesh", N=4) ---');
  // Register 4th driver Ramesh
  const rameshEmail = `ramesh.driver.${Date.now().toString().slice(-4)}@platform.com`;
  await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Driver',
      email: rameshEmail,
      phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'driver123',
      role: 'driver'
    })
  });

  const rameshAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: rameshEmail, password: 'driver123', role: 'driver' })
  });

  const rameshToken = rameshAuth.data.token;
  const rameshProfile = await apiRequest('/driver/profile', { headers: { 'Authorization': `Bearer ${rameshToken}` } });
  const rameshDriverDoc = rameshProfile.data?.data || rameshProfile.data;
  const rameshDriverId = rameshDriverDoc._id;

  console.log('DEBUG Ramesh driverId:', rameshDriverId);
  const statusRes = await apiRequest(`/admin/drivers/${rameshDriverId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ driverStatus: 'Active' })
  });
  console.log('DEBUG Ramesh status patch res:', JSON.stringify(statusRes.data));

  // Set Ramesh ONLINE
  const onlineRes = await apiRequest('/driver/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rameshToken}` },
    body: JSON.stringify({ isOnline: true })
  });
  console.log('DEBUG Ramesh online status res:', JSON.stringify(onlineRes.data));

  // Create vehicle for Ramesh on Delhi -> Jaipur
  const rameshVehicleRes = await apiRequest('/admin/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      vehicleNumber: `DL 04 GH ${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleName: 'Metro Travels Deluxe',
      vehicleType: 'Bus',
      vehicleModel: 'Volvo 9600',
      vehicleCategory: 'Luxury AC Sleeper',
      ownerName: 'Metro Travels Pvt Ltd',
      ownerMobileNumber: '9876543210',
      seatingCapacity: 40,
      fuelType: 'Diesel',
      assignedDriver: rameshDriverId,
      route: { origin: 'Delhi', destination: 'Jaipur' },
      vehicleStatus: 'Active'
    })
  });
  const rameshVehicleId = rameshVehicleRes.data?.data?._id || rameshVehicleRes.data?._id;
  console.log('DEBUG Ramesh vehicleId:', rameshVehicleId, 'Res:', JSON.stringify(rameshVehicleRes.data));

  const assignRes = await apiRequest('/admin/driver-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ vehicleId: rameshVehicleId, driverId: rameshDriverId })
  });
  console.log('DEBUG Ramesh assignment res:', JSON.stringify(assignRes.data));

  const rameshAuditProfile = await apiRequest('/driver/profile', { headers: { 'Authorization': `Bearer ${rameshToken}` } });
  console.log('AUDIT Ramesh Profile:', JSON.stringify(rameshAuditProfile.data));
  const tokenRamesh = `ExponentPushToken[DynTest_Ramesh_${Date.now().toString().slice(-4)}]`;
  await apiRequest('/driver/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rameshToken}` },
    body: JSON.stringify({ pushToken: tokenRamesh })
  });

  console.log('Ramesh Driver Created, Approved, Assigned to Bus (Delhi -> Jaipur) & Token Registered!');

  // Create Booking #2
  const b2Data = await createFreshBooking(custToken, harshBus._id);
  const b2Id = b2Data.bookingId || b2Data._id;

  console.log(`Fresh Booking #2 Created! ID: ${b2Id} (Expecting N=4 Drivers Notified)`);

  const harshReqs2 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${harshToken}` } });
  const ayushReqs2 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${ayushToken}` } });
  const pintuReqs2 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${pintuToken}` } });
  const rameshReqs2 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${rameshToken}` } });
  console.log('DEBUG Ramesh reqs:', JSON.stringify(rameshReqs2.data));

  const harshSees2 = (harshReqs2.data.data || []).some(r => r.bookingId === b2Id || r._id === b2Data._id);
  const ayushSees2 = (ayushReqs2.data.data || []).some(r => r.bookingId === b2Id || r._id === b2Data._id);
  const pintuSees2 = (pintuReqs2.data.data || []).some(r => r.bookingId === b2Id || r._id === b2Data._id);
  const rameshSees2 = (rameshReqs2.data.data || []).some(r => r.bookingId === b2Id || r._id === b2Data._id);

  console.log(`Booking ${b2Id} N=4 Dynamic Broadcast Results:`);
  console.log('  1. Harsh (Royal Intercity):', harshSees2 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  2. Ayush (Shivam Travels):', ayushSees2 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  3. Pintu (Rajputana Express):', pintuSees2 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  4. Ramesh (Metro Travels):', rameshSees2 ? 'SENT (PASS)' : 'SKIPPED');
  console.log(`  Total Eligible: 4 | Attempted: 4 | Successful: ${[harshSees2, ayushSees2, pintuSees2, rameshSees2].filter(Boolean).length}`);

  report.test2_N4 = {
    bookingId: b2Id,
    eligibleCount: 4,
    harshNotified: harshSees2,
    ayushNotified: ayushSees2,
    pintuNotified: pintuSees2,
    rameshNotified: rameshSees2,
    pass: harshSees2 && ayushSees2 && pintuSees2 && rameshSees2
  };

  console.log('\n--- TEST 3: DYNAMIC COUNT REDUCTION TEST (Deactivating Ramesh, Back to N=3) ---');
  await apiRequest(`/admin/drivers/${rameshDriverId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ driverStatus: 'Inactive' })
  });

  const b3Data = await createFreshBooking(custToken, harshBus._id);
  const b3Id = b3Data.bookingId || b3Data._id;

  const harshReqs3 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${harshToken}` } });
  const ayushReqs3 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${ayushToken}` } });
  const pintuReqs3 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${pintuToken}` } });
  const rameshReqs3 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${rameshToken}` } });

  const harshSees3 = (harshReqs3.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);
  const ayushSees3 = (ayushReqs3.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);
  const pintuSees3 = (pintuReqs3.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);
  const rameshSees3 = (rameshReqs3.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);

  console.log(`Booking ${b3Id} N=3 Post-Deactivation Broadcast Results:`);
  console.log('  1. Harsh (Royal Intercity):', harshSees3 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  2. Ayush (Shivam Travels):', ayushSees3 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  3. Pintu (Rajputana Express):', pintuSees3 ? 'SENT (PASS)' : 'SKIPPED');
  console.log('  4. Ramesh (Inactive Driver):', rameshSees3 ? 'RECEIVED (FAIL)' : 'SKIPPED (CORRECT - PASS)');

  report.test3_N3_deactivation = {
    bookingId: b3Id,
    eligibleCount: 3,
    rameshExcluded: !rameshSees3,
    pass: harshSees3 && ayushSees3 && pintuSees3 && !rameshSees3
  };

  console.log('\n--- TEST 4: WRONG ROUTE DRIVER ISOLATION CONTROL ---');
  const wrongAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'wrong.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const wrongToken = wrongAuth.data.token;
  const wrongReqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${wrongToken}` } });
  const wrongSeesB3 = (wrongReqs.data.data || []).some(r => r.bookingId === b3Id || r._id === b3Data._id);

  console.log('  Wrong Route Driver (Lucknow -> Jaipur) Sees Delhi -> Jaipur Request:', wrongSeesB3 ? 'YES (FAIL)' : 'NO (BLOCKED - PASS)');

  report.test4_wrong_route = {
    wrongRouteDriverBlocked: !wrongSeesB3,
    pass: !wrongSeesB3
  };

  console.log('\n================================================================');
  console.log('📊 FINAL DYNAMIC AUDIT SCORECARD');
  console.log('================================================================');
  console.log(JSON.stringify(report, null, 2));

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'root_cause_dynamic_audit.json'), JSON.stringify(report, null, 2));
}

runRootCauseAudit();
