const path = require('path');
const backendDir = path.resolve(__dirname, '../backend');
const axios = require(path.join(backendDir, 'node_modules/axios'));

async function testLiveAakashSms() {
  console.log('====================================================');
  console.log('--- TESTING REAL AAKASHSMS DISPATCH VIA RENDER BACKEND ---');
  console.log('====================================================');

  const testPhone = '9841234567'; // Valid 10-digit mobile number format

  try {
    console.log(`Sending POST https://bus-ev-sewa-car-booking.onrender.com/api/auth/send-otp for phone ${testPhone}...`);
    const res = await axios.post('https://bus-ev-sewa-car-booking.onrender.com/api/auth/send-otp', {
      phone: testPhone
    }, {
      timeout: 15000
    });

    console.log('\n--- LIVE RENDER BACKEND RESPONSE ---');
    console.log('HTTP Status:', res.status);
    console.log('Response Body:', res.data);
  } catch (err) {
    console.error('\n--- LIVE RENDER BACKEND ERROR ---');
    console.error('HTTP Status:', err.response?.status);
    console.error('Response Data:', err.response?.data || err.message);
  }
}

testLiveAakashSms();
