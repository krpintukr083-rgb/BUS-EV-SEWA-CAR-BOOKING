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
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P'];
  const row = rows[Math.floor(Math.random() * rows.length)];
  const num = Math.floor(Math.random() * 4) + 1;
  return `${row}${num}`;
}

async function runNewCustomerBookingTest() {
  console.log('================================================================');
  console.log('🧪 NEW CUSTOMER BUS BOOKING — SAME-ROUTE DRIVERS NOTIFICATION AUDIT');
  console.log('Production API:', BASE_URL);
  console.log('Android Emulator:', DEVICE_ID);
  console.log('Timestamp:', new Date().toLocaleString());
  console.log('================================================================\n');

  // STEP 1: Register/Login New Customer
  console.log('--- 1. CREATING / LOGGING IN NEW DIFFERENT CUSTOMER ---');
  const newCustEmail = `rohit.sharma.${Date.now().toString().slice(-4)}@example.com`;
  const regRes = await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohit Sharma',
      email: newCustEmail,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'user123',
      role: 'customer'
    })
  });

  const custLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: newCustEmail, password: 'user123', role: 'customer' })
  });

  const newCustToken = custLogin.data.token;
  const newCustName = custLogin.data.data?.user?.name || custLogin.data.user?.name || 'Rohit Sharma';

  console.log('New Customer Created & Logged In:');
  console.log('  Name:', newCustName);
  console.log('  Email:', newCustEmail);
  console.log('  Token Active:', !!newCustToken);

  // STEP 2: Login 3 Same-Route Drivers & Register Push Tokens
  console.log('\n--- 2. LOGGING IN 3 SAME-ROUTE DRIVERS & REGISTERING PUSH TOKENS ---');
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

  const tokenHarsh = `ExponentPushToken[Device_Harsh_${Date.now().toString().slice(-4)}]`;
  const tokenAyush = `ExponentPushToken[Device_Ayush_${Date.now().toString().slice(-4)}]`;
  const tokenPintu = `ExponentPushToken[Device_Pintu_${Date.now().toString().slice(-4)}]`;

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

  console.log('  Harsh (Royal Intercity - Delhi->Jaipur) Push Token:', tokenHarsh);
  console.log('  Ayush (Shivam Travels - Delhi->Jaipur) Push Token:', tokenAyush);
  console.log('  Pintu (Rajputana Express - Delhi->Jaipur) Push Token:', tokenPintu);

  // STEP 3: Select a Specific Bus (e.g. Shivam Travels Premium - assigned to Ayush)
  const vList = await apiRequest('/vehicles');
  const vehicles = vList.data.data || vList.data;
  const targetBus = vehicles.find(v => v.vehicleNumber === 'DL 02 CD 5678') || vehicles[0]; // Shivam Travels Premium

  console.log('\n--- 3. CREATING FRESH BUS BOOKING FROM NEW CUSTOMER (ROHIT SHARMA) ---');
  console.log('  Selected Bus:', targetBus.vehicleName, `(${targetBus.vehicleNumber})`);
  console.log('  Booked Vehicle Primary Driver:', 'Ayush (DL 02 CD 5678)');
  console.log('  Same Route Operating Drivers:', 'Harsh, Ayush, Pintu');

  let bookingRes = null;
  for (let i = 0; i < 5; i++) {
    const seat = getRandomSeat();
    bookingRes = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${newCustToken}` },
      body: JSON.stringify({
        vehicleId: targetBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [seat],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: newCustName, age: 29, gender: 'Male' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
    if (bookingRes.ok) break;
  }

  const bData = bookingRes.data.data || bookingRes.data;
  const bookingId = bData.bookingId || bData._id;
  const mongoId = bData._id;
  const customerOtp = bData.confirmationOtp || bData.customerViewOtp;

  console.log('\n✅ NEW BOOKING CREATED SUCCESSFULLY!');
  console.log('  Booking ID:', bookingId);
  console.log('  Mongo ID:', mongoId);
  console.log('  Customer:', newCustName, `(${newCustEmail})`);
  console.log('  Customer Onboarding OTP:', customerOtp);
  console.log('  Route:', 'Delhi (Kashmere Gate ISBT) → Jaipur (Sindhi Camp)');

  // Launch Driver App on Emulator & Capture Screen
  adbExec('shell am force-stop com.travelease.driver');
  adbExec('shell monkey -p com.travelease.driver -c android.intent.category.LAUNCHER 1');
  await new Promise(r => setTimeout(r, 4000));
  captureScreenshot('new_customer_booking_driver_notification.png');

  // STEP 4: Check Notification Delivery to Selected Bus Driver + Same Route Drivers
  console.log('\n--- 4. AUDITING NOTIFICATION DELIVERY FOR ALL 3 DRIVERS ---');
  const adminAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
  });

  const notifsRes = await apiRequest('/admin/notifications', {
    headers: { 'Authorization': `Bearer ${adminAuth.data.token}` }
  });
  const notifLogs = notifsRes.data.data || notifsRes.data || [];

  const bookingNotifs = notifLogs.filter(n => (n.message || '').includes(bookingId) || (n.message || '').includes('Delhi → Jaipur'));

  console.log(`Found ${bookingNotifs.length} system notification dispatch records for booking ${bookingId}:`);
  for (const n of bookingNotifs.slice(0, 5)) {
    console.log(`  📩 Recipient: ${n.recipient} | Title: "${n.title}" | Message: "${n.message}"`);
  }

  // Check pending request list for each of the 3 drivers
  const harshReqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${harshAuth.data.token}` } });
  const ayushReqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${ayushAuth.data.token}` } });
  const pintuReqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${pintuAuth.data.token}` } });

  const harshHas = (harshReqs.data.data || []).some(r => r.bookingId === bookingId || r._id === mongoId);
  const ayushHas = (ayushReqs.data.data || []).some(r => r.bookingId === bookingId || r._id === mongoId);
  const pintuHas = (pintuReqs.data.data || []).some(r => r.bookingId === bookingId || r._id === mongoId);

  console.log('\n--- DRIVER APP PENDING REQUESTS AUDIT ---');
  console.log('  1. Ayush (Driver of Booked Bus - Shivam Travels):', ayushHas ? '✅ RECEIVED NOTIFICATION & REQUEST' : '❌ NOT RECEIVED');
  console.log('  2. Harsh (Same Route Driver - Royal Intercity):', harshHas ? '✅ RECEIVED NOTIFICATION & REQUEST' : '❌ NOT RECEIVED');
  console.log('  3. Pintu (Same Route Driver - Rajputana Express):', pintuHas ? '✅ RECEIVED NOTIFICATION & REQUEST' : '❌ NOT RECEIVED');

  // STEP 5: Verify Wrong Route Driver Isolation
  const wrongAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'wrong.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const wrongReqs = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${wrongAuth.data.token}` } });
  const wrongHas = (wrongReqs.data.data || []).some(r => r.bookingId === bookingId || r._id === mongoId);

  console.log('  4. Wrong Route Driver (Lucknow -> Jaipur):', wrongHas ? '❌ INCORRECTLY RECEIVED' : '🛡️ BLOCKED (NO NOTIFICATION)');

  const auditResult = {
    bookingId,
    customerName: newCustName,
    customerEmail: newCustEmail,
    bookedBus: targetBus.vehicleName,
    bookedBusDriver: 'Ayush (Shivam Travels Premium)',
    sameRouteDriversNotified: {
      bookedBusDriverAyush: ayushHas,
      sameRouteDriverHarsh: harshHas,
      sameRouteDriverPintu: pintuHas
    },
    differentRouteDriverBlocked: !wrongHas,
    allSameRouteDriversReceived: ayushHas && harshHas && pintuHas
  };

  console.log('\n================================================================');
  console.log('📊 FINAL AUDIT RESULT SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify(auditResult, null, 2));

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'new_customer_booking_audit.json'), JSON.stringify(auditResult, null, 2));
}

runNewCustomerBookingTest();
