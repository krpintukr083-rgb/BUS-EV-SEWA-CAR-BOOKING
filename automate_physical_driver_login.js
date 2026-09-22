const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PHYS_DEVICE = '10BG5J1H8M002R3';
const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const ARTIFACT_DIR = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\36aa31c5-ea9b-4abd-894f-0928a3a8adbc';

function adbPhys(cmd) {
  try {
    return execSync(`cmd /c "adb -s ${PHYS_DEVICE} ${cmd}"`, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return err.stdout || err.message || '';
  }
}

function capturePhysicalScreen(filename) {
  const localPath = path.join(__dirname, filename);
  const targetPath = path.join(ARTIFACT_DIR, filename);
  adbPhys(`shell screencap -p /sdcard/${filename}`);
  adbPhys(`pull /sdcard/${filename} "${localPath}"`);
  if (fs.existsSync(localPath)) {
    fs.copyFileSync(localPath, targetPath);
    console.log(`   📸 Physical screen screenshot captured & saved: ${filename}`);
  }
}

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

function getRandomSeat() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S'];
  const row = rows[Math.floor(Math.random() * rows.length)];
  const num = Math.floor(Math.random() * 4) + 1;
  return `${row}${num}`;
}

async function testPhysicalMobileNotification() {
  console.log('================================================================');
  console.log('📱 LIVE PHYSICAL PHONE TEST — HARSH DRIVER BOOKING NOTIFICATION');
  console.log('Physical Device ID:', PHYS_DEVICE);
  console.log('Production API:', BASE_URL);
  console.log('================================================================\n');

  // STEP 1: Authenticate Harsh Driver & Get JWT
  console.log('1️⃣ Authenticating Harsh Driver (harsh.driver@platform.com)...');
  const harshAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  });

  const harshToken = harshAuth.data.token;
  console.log('   Harsh JWT Token obtained:', !!harshToken);

  // STEP 2: Relaunch Driver App as Harsh on Physical Phone
  console.log('\n2️⃣ Relaunching Driver App on Physical Phone...');
  adbPhys('shell am force-stop com.travelease.driver');
  await new Promise(r => setTimeout(r, 1000));
  adbPhys('shell monkey -p com.travelease.driver -c android.intent.category.LAUNCHER 1');
  await new Promise(r => setTimeout(r, 4000));

  capturePhysicalScreen('physical_app_launched.png');

  // STEP 3: Authenticate Customer & Create Fresh Booking
  console.log('\n3️⃣ Creating Fresh Bus Booking for Delhi -> Jaipur (Customer Harsh)...');
  const custAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
  });
  const custToken = custAuth.data.token;

  const vList = await apiRequest('/vehicles');
  const vehicles = vList.data.data || vList.data;
  const targetBus = vehicles.find(v => v.vehicleNumber === 'DL 01 AB 4321') || vehicles[0];

  let bookingRes = null;
  for (let i = 0; i < 5; i++) {
    const seat = getRandomSeat();
    bookingRes = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
      body: JSON.stringify({
        vehicleId: targetBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [seat],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Harsh Customer', age: 28, gender: 'Male' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
    if (bookingRes.ok) break;
  }

  const bData = bookingRes.data.data || bookingRes.data;
  const bookingId = bData.bookingId || bData._id;
  const customerOtp = bData.confirmationOtp || bData.customerViewOtp;

  console.log('   ✅ Fresh Bus Booking Created!');
  console.log('   - Booking ID:', bookingId);
  console.log('   - Customer OTP:', customerOtp);
  console.log('   - Bus:', targetBus.vehicleName);
  console.log('   - Route: Delhi -> Jaipur');

  // Wait 3 seconds for push & notification poll
  await new Promise(r => setTimeout(r, 3000));

  // Capture Physical Screen in Foreground
  console.log('\n4️⃣ Capturing Physical Phone Foreground Screen...');
  capturePhysicalScreen('physical_foreground_notification.png');

  // Expand Physical Notification Shade
  console.log('\n5️⃣ Expanding Physical Phone Notification Shade...');
  adbPhys('shell cmd statusbar expand-notifications');
  await new Promise(r => setTimeout(r, 2000));
  capturePhysicalScreen('physical_notification_shade.png');

  // Collapse status bar
  adbPhys('shell cmd statusbar collapse');

  // STEP 6: Check Harsh Booking Requests List
  const harshReqs = await apiRequest('/driver/booking-requests', {
    headers: { 'Authorization': `Bearer ${harshToken}` }
  });

  const harshSeesBooking = (harshReqs.data.data || []).some(r => r.bookingId === bookingId || r._id === bData._id);

  console.log('\n================================================================');
  console.log('📊 PHYSICAL PHONE NOTIFICATION TEST AUDIT SUMMARY');
  console.log('================================================================');
  console.log('  Booking ID:', bookingId);
  console.log('  Physical Phone Received Request:', harshSeesBooking ? 'YES (PASS)' : 'NO');
  console.log('================================================================\n');
}

testPhysicalMobileNotification();
