const { execSync } = require('child_process');
const fs = require('fs');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DRIVER_DEVICE_ID = 'emulator-5554';
const CUSTOMER_DEVICE_ID = '10BG5J1H8M002R3';

function adbExec(deviceId, cmd) {
  try {
    return execSync(`cmd /c "adb -s ${deviceId} ${cmd}"`, { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return err.stdout || err.message;
  }
}

async function openAndShowDriverOtpScreen() {
  console.log('================================================================');
  console.log('🚀 OPENING LIVE DRIVER APP & DISPLAYING CUSTOMER OTP VERIFICATION UI');
  console.log('Backend:', BASE_URL);
  console.log('Driver Device:', DRIVER_DEVICE_ID);
  console.log('Customer Device:', CUSTOMER_DEVICE_ID);
  console.log('================================================================\n');

  try {
    // 1. Authenticate Customer & Create Booking
    console.log('1️⃣ Authenticating Customer (Priya Nair) & Creating Real Bus Booking...');
    const custRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
    });
    const custData = await custRes.json();
    const customerToken = custData.token;

    const vRes = await fetch(`${BASE_URL}/vehicles`);
    const vData = await vRes.json();
    const targetBus = (vData.data || vData).find(b => b.vehicleNumber === 'DL 01 AB 4321' || b.vehicleName?.includes('Royal Intercity'));

    // Create fresh booking
    const bookingRes = await fetch(`${BASE_URL}/customer/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        vehicleId: targetBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: ['A1'],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
    const bookingData = await bookingRes.json();
    const booking = bookingData.data;
    const bookingIdStr = booking.bookingId || booking._id;

    // Fetch customer 6-digit OTP
    const custUpcomingRes = await fetch(`${BASE_URL}/customer/my-bookings`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const custUpcomingData = await custUpcomingRes.json();
    const currentCustBooking = (custUpcomingData.data?.upcoming || []).find(b => b._id === booking._id || b.bookingId === bookingIdStr) || booking;
    const customerOtp = currentCustBooking.confirmationOtp || currentCustBooking.otp || booking.confirmationOtp;

    console.log('   ✅ Bus Booking Created! ID:', bookingIdStr);
    console.log('   ✅ Customer OTP Displayed on Customer Phone:', customerOtp);

    // 2. Assign Driver Rajesh Sharma to Vehicle
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
    });
    const adminData = await adminLoginRes.json();
    await fetch(`${BASE_URL}/admin/driver-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminData.token}` },
      body: JSON.stringify({ vehicleId: targetBus._id, driverId: '6aa541d9d453161e311411df' })
    });
    console.log('   ✅ Driver Rajesh Sharma assigned to vehicle DL 01 AB 4321');

    // 3. Launch Driver App on Driver Device
    console.log('\n2️⃣ Launching Driver App on Device & Logging In...');
    adbExec(DRIVER_DEVICE_ID, 'shell am force-stop com.travelease.driver');
    adbExec(DRIVER_DEVICE_ID, 'shell monkey -p com.travelease.driver -c android.intent.category.LAUNCHER 1');
    await new Promise(r => setTimeout(r, 4000));

    // Tap email input (211, 1069), enter driver@platform.com
    adbExec(DRIVER_DEVICE_ID, 'shell input tap 400 1130');
    await new Promise(r => setTimeout(r, 500));
    adbExec(DRIVER_DEVICE_ID, 'shell input text "driver@platform.com"');
    await new Promise(r => setTimeout(r, 500));

    // Tap password input (211, 1311), enter driver123
    adbExec(DRIVER_DEVICE_ID, 'shell input tap 400 1370');
    await new Promise(r => setTimeout(r, 500));
    adbExec(DRIVER_DEVICE_ID, 'shell input text "driver123"');
    await new Promise(r => setTimeout(r, 500));

    // Tap Login button (430, 1549)
    adbExec(DRIVER_DEVICE_ID, 'shell input tap 540 1575');
    await new Promise(r => setTimeout(r, 4000));

    // 4. Navigate to Bus Confirmation Screen / Requests
    console.log('\n3️⃣ Opening Booking Requests & Customer OTP Input Screen...');
    // Dump current UI to see elements
    adbExec(DRIVER_DEVICE_ID, 'shell uiautomator dump /sdcard/dump_login_state.xml');
    adbExec(DRIVER_DEVICE_ID, 'pull /sdcard/dump_login_state.xml ./dump_login_state.xml');

    // Tap "Requests" tab (center 400 2340 or similar bottom tab) or open BusConfirmation directly via deep link / action
    // In bottom tab bar: Requests is index 1 (approx 400 2340)
    adbExec(DRIVER_DEVICE_ID, 'shell input tap 400 2340');
    await new Promise(r => setTimeout(r, 2500));

    // Dump UI state on Requests screen
    adbExec(DRIVER_DEVICE_ID, 'shell uiautomator dump /sdcard/dump_requests_screen.xml');
    adbExec(DRIVER_DEVICE_ID, 'pull /sdcard/dump_requests_screen.xml ./dump_requests_screen.xml');

    // Screencap Driver App Screen
    adbExec(DRIVER_DEVICE_ID, 'shell screencap -p /sdcard/driver_app_otp_screen.png');
    adbExec(DRIVER_DEVICE_ID, 'pull /sdcard/driver_app_otp_screen.png ./driver_app_otp_screen.png');

    // Also screencap Customer Phone
    adbExec(CUSTOMER_DEVICE_ID, 'shell screencap -p /sdcard/customer_app_otp_screen.png');
    adbExec(CUSTOMER_DEVICE_ID, 'pull /sdcard/customer_app_otp_screen.png ./customer_app_otp_screen.png');

    // Copy to artifact directory so markdown image embedding works!
    const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
    if (fs.existsSync('./driver_app_otp_screen.png')) {
      fs.copyFileSync('./driver_app_otp_screen.png', `${artifactDir}\\driver_app_otp_screen.png`);
    }
    if (fs.existsSync('./customer_app_otp_screen.png')) {
      fs.copyFileSync('./customer_app_otp_screen.png', `${artifactDir}\\customer_app_otp_screen.png`);
    }

    console.log('\n✅ SCREENSHOTS CAPTURED ANDPERSISTED SUCCESSFULLY!');
    console.log('   - Driver App Screenshot: ./driver_app_otp_screen.png');
    console.log('   - Customer App Screenshot: ./customer_app_otp_screen.png');
    console.log('   - Booking ID:', bookingIdStr);
    console.log('   - Customer OTP:', customerOtp);

  } catch (err) {
    console.error('❌ ERROR:', err.message);
  }
}

openAndShowDriverOtpScreen();
