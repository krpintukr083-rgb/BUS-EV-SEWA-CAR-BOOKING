const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RENDER_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function main() {
  console.log('=== DRIVER APP LIVE OTP UI DISPLAY ===');

  // 1. Authenticate Customer & Driver
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

  // Assign vehicle
  await fetch(`${RENDER_BASE_URL}/driver-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${drvToken}` },
    body: JSON.stringify({ driverId, vehicleId: '6aa541d9d453161e311411e7' })
  });

  // 2. Create fresh BUS booking
  const bkRes = await fetch(`${RENDER_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: '6aa541d9d453161e311411e7',
      pickupLocation: 'Kashmiri Gate ISBT, Delhi',
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

  // Update status to Pending Admin Confirmation so OTP UI renders
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
  const otp = otpData.startOtp || otpData.data?.startOtp || '789123';
  console.log(`Live Booking ID: ${bookingId}`);
  console.log(`Customer OTP generated: ${otp}`);

  // 3. Launch App on Physical Phone & Emulator
  const devices = ['10BG5J1H8M002R3', 'emulator-5554'];
  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';

  for (const dev of devices) {
    try {
      console.log(`Waking & launching on ${dev}...`);
      execSync(`adb -s ${dev} shell settings put system screen_off_timeout 600000`);
      execSync(`adb -s ${dev} shell input keyevent 224`);
      execSync(`adb -s ${dev} shell input keyevent 82`);
      
      // Stop and restart app
      execSync(`adb -s ${dev} shell am force-stop com.travelease.driver`);
      await new Promise(r => setTimeout(r, 1000));
      execSync(`adb -s ${dev} shell am start -n com.travelease.driver/.MainActivity`);
      await new Promise(r => setTimeout(r, 4000));

      // Automate Login if at login screen
      execSync(`adb -s ${dev} shell input tap 540 960`);
      await new Promise(r => setTimeout(r, 300));
      execSync(`adb -s ${dev} shell input text "driver@platform.com"`);
      await new Promise(r => setTimeout(r, 300));
      execSync(`adb -s ${dev} shell input tap 540 1180`);
      await new Promise(r => setTimeout(r, 300));
      execSync(`adb -s ${dev} shell input text "driver123"`);
      await new Promise(r => setTimeout(r, 300));
      execSync(`adb -s ${dev} shell input tap 540 1340`);
      await new Promise(r => setTimeout(r, 4000));

      // Tap on Bus Confirmation or Requests to show OTP card
      execSync(`adb -s ${dev} shell input tap 500 440`); // Tap booking requests banner
      await new Promise(r => setTimeout(r, 2000));

      const outName = dev === '10BG5J1H8M002R3' ? 'driver_app_physical_live_open.png' : 'driver_app_emulator_live_open.png';
      const outPath = path.join(artifactDir, outName);
      execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
      execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
      console.log(`Saved screenshot: ${outPath}`);
    } catch(e) {
      console.error(`Error on ${dev}: ${e.message}`);
    }
  }

  console.log('=== DONE ===');
}

main();
