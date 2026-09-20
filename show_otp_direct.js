const { execSync } = require('child_process');
const path = require('path');

const RENDER_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function main() {
  console.log('=== CREATING & OPENING OTP VERIFICATION SCREEN ===');

  // Login driver
  const drvRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver@platform.com', password: 'driver123' })
  });
  const drvData = await drvRes.json();
  const drvToken = drvData.token || drvData.data?.token;
  const driverId = drvData.user?._id || drvData.data?.user?._id;

  // Login customer
  const custRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@platform.com', password: 'customer123' })
  });
  const custData = await custRes.json();
  const custToken = custData.token || custData.data?.token;

  // Assign vehicle
  await fetch(`${RENDER_BASE_URL}/driver-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ driverId, vehicleId: '6aa541d9d453161e311411e7' })
  });

  // Create booking with serviceType BUS (so it triggers BusConfirmation list)
  const bkRes = await fetch(`${RENDER_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: '6aa541d9d453161e311411e7',
      pickupLocation: 'ISBT Kashmiri Gate, Delhi',
      dropLocation: 'Chandigarh Bus Stand, Sector 17',
      pickupDate: new Date().toISOString(),
      serviceType: 'BUS',
      rentalType: 'outstation',
      fare: 1200,
      totalAmount: 1200,
      assignedDriverId: driverId
    })
  });
  const bkData = await bkRes.json();
  const booking = bkData.booking || bkData.data?.booking || bkData.data || bkData;
  const bookingId = booking._id;

  // Set status to Pending Admin Confirmation
  await fetch(`${RENDER_BASE_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ status: 'Pending Admin Confirmation' })
  });

  // Get OTP
  const otpRes = await fetch(`${RENDER_BASE_URL}/bookings/${bookingId}`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const otpData = await otpRes.json();
  const otp = otpData.startOtp || otpData.data?.startOtp || '123456';
  console.log(`Booking created: ${bookingId}, Customer OTP: ${otp}`);

  // Now interact with physical phone & emulator
  const dev = '10BG5J1H8M002R3';
  execSync(`adb -s ${dev} shell settings put system screen_off_timeout 600000`);
  execSync(`adb -s ${dev} shell input keyevent 224`);
  execSync(`adb -s ${dev} shell input keyevent 82`);

  // Scroll down on dashboard to reveal Quick Operations grid
  execSync(`adb -s ${dev} shell input swipe 500 1600 500 400`);
  await new Promise(r => setTimeout(r, 1000));

  // Tap "Bus Confirm" button in grid (2nd menu item in Quick Operations grid)
  execSync(`adb -s ${dev} shell input tap 750 1150`);
  await new Promise(r => setTimeout(r, 3000));

  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_otp_input_card_live.png');
  execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
  execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
  console.log(`LIVE OTP SCREENSHOT CAPTURED: ${outPath}`);
}

main();
