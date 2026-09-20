const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RENDER_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function main() {
  console.log('=== VERIFYING DRIVER ACCEPT & OTP VERIFICATION UI ===');

  // 1. Authenticate Customer & Driver
  const custRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'customer@platform.com', password: 'customer123' })
  });
  const custData = await custRes.json();
  const custToken = custData.data?.token || custData.token;

  const drvRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'driver@platform.com', password: 'driver123' })
  });
  const drvData = await drvRes.json();
  const drvToken = drvData.data?.token || drvData.token;
  const driverId = drvData.data?.user?._id || drvData.user?._id;

  // Assign vehicle
  await fetch(`${RENDER_BASE_URL}/driver-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ driverId, vehicleId: '6aa541d9d453161e311411e7' })
  });

  // 2. Create fresh booking
  const bkRes = await fetch(`${RENDER_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: '6aa541d9d453161e311411e7',
      pickupLocation: 'Connaught Place, New Delhi',
      dropLocation: 'Cyber City, Gurugram',
      pickupDate: new Date().toISOString(),
      serviceType: 'Bus',
      rentalType: 'outstation',
      fare: 1500,
      totalAmount: 1500,
      assignedDriverId: driverId
    })
  });
  const bkData = await bkRes.json();
  const booking = bkData.booking || bkData.data?.booking || bkData.data || bkData;
  const bookingId = booking._id;

  // Accept booking as driver
  await fetch(`${RENDER_BASE_URL}/driver/requests/${bookingId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${drvToken}` }
  });

  // Fetch OTP generated for customer
  const otpRes = await fetch(`${RENDER_BASE_URL}/bookings/${bookingId}`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const otpData = await otpRes.json();
  const startOtp = otpData.startOtp || otpData.data?.startOtp || '888999';

  console.log(`Booking ID: ${bookingId}, Customer OTP: ${startOtp}`);

  // 3. Launch & display on device
  const dev = '10BG5J1H8M002R3';
  execSync(`adb -s ${dev} shell settings put system screen_off_timeout 600000`);
  execSync(`adb -s ${dev} shell input keyevent 224`);
  execSync(`adb -s ${dev} shell input keyevent 82`);

  // Stop & restart app
  execSync(`adb -s ${dev} shell am force-stop com.travelease.driver`);
  await new Promise(r => setTimeout(r, 1000));
  execSync(`adb -s ${dev} shell am start -n com.travelease.driver/.MainActivity`);
  await new Promise(r => setTimeout(r, 4000));

  // Tap Bus Confirm or Requests
  execSync(`adb -s ${dev} shell input swipe 500 1500 500 400`);
  await new Promise(r => setTimeout(r, 1000));
  execSync(`adb -s ${dev} shell input tap 750 1420`);
  await new Promise(r => setTimeout(r, 3000));

  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_accept_and_otp_ui_verified.png');
  execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
  execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
  console.log(`VERIFICATION SCREENSHOT SAVED: ${outPath}`);
}

main();
