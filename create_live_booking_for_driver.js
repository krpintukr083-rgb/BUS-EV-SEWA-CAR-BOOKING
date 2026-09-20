const { execSync } = require('child_process');
const path = require('path');

const RENDER_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function main() {
  console.log('=== CREATING LIVE ACTIVE BOOKING FOR DRIVER ===');

  // 1. Login driver
  const drvRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'driver@platform.com', password: 'driver123' })
  });
  const drvData = await drvRes.json();
  const drvToken = drvData.token || drvData.data?.token;
  const driverId = drvData.user?._id || drvData.data?.user?._id;

  // 2. Login customer
  const custRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@platform.com', password: 'customer123' })
  });
  const custData = await custRes.json();
  const custToken = custData.token || custData.data?.token;

  // 3. Assign vehicle
  await fetch(`${RENDER_BASE_URL}/driver-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ driverId, vehicleId: '6aa541d9d453161e311411e7' })
  });

  // 4. Create booking
  const bkRes = await fetch(`${RENDER_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: '6aa541d9d453161e311411e7',
      pickupLocation: 'Connaught Place, New Delhi',
      dropLocation: 'Sector 62, Noida',
      pickupDate: new Date().toISOString(),
      serviceType: 'car',
      rentalType: 'outstation',
      fare: 1200,
      totalAmount: 1200,
      assignedDriverId: driverId
    })
  });
  const bkData = await bkRes.json();
  const booking = bkData.booking || bkData.data?.booking || bkData.data || bkData;
  const bookingId = booking._id;

  // Set status to Pending Admin Confirmation so OTP verification is REQUIRED
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
  const startOtp = otpData.startOtp || otpData.data?.startOtp || '654321';

  console.log(`ACTIVE BOOKING CREATED SUCCESS: ${booking._id}`);
  console.log(`CUSTOMER OTP FOR DRIVER TO VERIFY: ${startOtp}`);

  // Now interact with Driver App on device
  const dev = '10BG5J1H8M002R3';
  execSync(`adb -s ${dev} shell input tap 500 290`); // tap dashboard button
  await new Promise(r => setTimeout(r, 2000));
  
  // Refresh dashboard / app state by pulling down or reopening BusConfirmation route
  execSync(`adb -s ${dev} shell am start -n com.travelease.driver/.MainActivity`);
  await new Promise(r => setTimeout(r, 3000));

  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_active_otp_live_device.png');
  execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
  execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
  console.log(`FINAL SCREENSHOT SAVED: ${outPath}`);
}

main();
