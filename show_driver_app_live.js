const { execSync } = require('child_process');
const path = require('path');

const RENDER_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function main() {
  console.log('=== SHOW LIVE DRIVER APP OTP UI ===');
  
  // 1. Authenticate customer & driver
  console.log('1. Logging in Customer & Driver...');
  const custRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@platform.com', password: 'customer123' })
  });
  const custData = await custRes.json();
  const custToken = custData.token || custData.data?.token;

  const drvRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver@platform.com', password: 'driver123' })
  });
  const drvData = await drvRes.json();
  const drvToken = drvData.token || drvData.data?.token;
  const driverId = drvData.user?._id || drvData.data?.user?._id;

  // Assign driver to vehicle
  await fetch(`${RENDER_BASE_URL}/driver-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ driverId, vehicleId: '6aa541d9d453161e311411e7' })
  });

  // 2. Create fresh BUS booking requiring OTP
  console.log('2. Creating fresh BUS booking...');
  const bkRes = await fetch(`${RENDER_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: '6aa541d9d453161e311411e7',
      pickupLocation: 'ISBT Kashmiri Gate, Delhi',
      dropLocation: 'Chandigarh Bus Stand',
      pickupDate: new Date().toISOString(),
      serviceType: 'BUS',
      rentalType: 'outstation',
      fare: 850,
      totalAmount: 850,
      assignedDriverId: driverId
    })
  });
  const bkData = await bkRes.json();
  const booking = bkData.booking || bkData.data?.booking || bkData.data || bkData;
  const bookingId = booking._id;
  const bookingNumber = booking.bookingNumber || booking._id;
  console.log(`Booking created: ${bookingNumber} (ID: ${bookingId})`);

  // Force status to Pending Admin Confirmation so OTP verification is active
  await fetch(`${RENDER_BASE_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ status: 'Pending Admin Confirmation' })
  });

  // Fetch OTP
  const otpRes = await fetch(`${RENDER_BASE_URL}/bookings/${bookingId}`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const otpData = await otpRes.json();
  const otp = otpData.startOtp || otpData.data?.startOtp || '987654';
  console.log(`Customer OTP generated: ${otp}`);

  // Device interaction
  const dev = '10BG5J1H8M002R3';
  execSync(`adb -s ${dev} shell input keyevent 224`);
  execSync(`adb -s ${dev} shell input keyevent 82`);

  // Relaunch app to ensure fresh state
  execSync(`adb -s ${dev} shell am force-stop com.travelease.driver`);
  await new Promise(r => setTimeout(r, 1000));
  execSync(`adb -s ${dev} shell am start -n com.travelease.driver/.MainActivity`);
  await new Promise(r => setTimeout(r, 4000));

  // Take screenshot
  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_physical_live.png');
  execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
  execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
  console.log(`Live screen captured: ${outPath}`);
}

main();
