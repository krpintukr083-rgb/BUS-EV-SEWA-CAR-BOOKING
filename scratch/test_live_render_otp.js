const path = require('path');
const backendDir = path.resolve(__dirname, '../backend');
const axios = require(path.join(backendDir, 'node_modules/axios'));

async function testLiveRenderBackend() {
  console.log('====================================================');
  console.log('--- TESTING LIVE RENDER BACKEND OTP ENDPOINTS ---');
  console.log('====================================================');

  const testPhone = '9841234567';

  const urlsToTest = [
    'https://bus-ev-sewa-car-booking.onrender.com/api',
    'https://transport-booking-backend.onrender.com/api'
  ];

  for (const baseUrl of urlsToTest) {
    console.log(`\nTesting Base URL: ${baseUrl}`);
    try {
      const healthRes = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
      console.log(`[HEALTH] Status: ${healthRes.status}, Data:`, healthRes.data);
    } catch (e) {
      console.log(`[HEALTH] Failed:`, e.response?.status || e.message);
    }

    try {
      console.log(`[SEND OTP] Dispatching POST ${baseUrl}/auth/send-otp with phone: ${testPhone}...`);
      const sendRes = await axios.post(`${baseUrl}/auth/send-otp`, { phone: testPhone }, { timeout: 15000 });
      console.log(`[SEND OTP SUCCESS] Status: ${sendRes.status}`);
      console.log(`[SEND OTP RESPONSE]:`, sendRes.data);
    } catch (e) {
      console.log(`[SEND OTP ERROR] Status:`, e.response?.status || 'NO RESPONSE');
      console.log(`[SEND OTP ERROR DATA]:`, e.response?.data || e.message);
    }
  }
}

testLiveRenderBackend();
