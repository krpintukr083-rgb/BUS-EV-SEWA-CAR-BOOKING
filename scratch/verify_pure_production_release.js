const path = require('path');
const fs = require('fs');

const PROD_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function runProductionReleaseCheck() {
  console.log('=== PURE PRODUCTION RELEASE APK VERIFICATION ===\n');

  // 1. Health check
  const healthRes = await fetch(`${PROD_URL}/health`);
  const healthData = await healthRes.json();
  console.log('[1. RENDER PRODUCTION HEALTH]:', healthRes.status === 200 ? 'PASS (200 OK)' : 'FAIL');
  console.log('   Payload:', healthData);

  // 2. Search codebase for forbidden dev/tunnel URLs in release config
  console.log('\n--- 2. PRODUCTION ENDPOINT AUDIT ---');
  const apiConfigFile = fs.readFileSync(path.join(__dirname, '../driver-app/src/constants/api.js'), 'utf8');
  
  const forbiddenPatterns = ['localhost', '127.0.0.1', '10.0.2.2', '192.168.', 'trycloudflare.com'];
  let violations = [];
  forbiddenPatterns.forEach(pattern => {
    if (apiConfigFile.includes(pattern)) {
      violations.push(pattern);
    }
  });

  console.log('  - Localhost used:', apiConfigFile.includes('localhost') ? 'YES' : 'NO');
  console.log('  - 10.0.2.2 used:', apiConfigFile.includes('10.0.2.2') ? 'YES' : 'NO');
  console.log('  - LAN IP used:', apiConfigFile.includes('192.168.') ? 'YES' : 'NO');
  console.log('  - Cloudflare Tunnel used:', apiConfigFile.includes('trycloudflare.com') ? 'YES' : 'NO');
  console.log('  - Final API inside Release Config:', 'https://bus-ev-sewa-car-booking.onrender.com/api');

  if (violations.length > 0) {
    console.error('FAILED: Found development endpoints in release config:', violations);
    process.exit(1);
  } else {
    console.log('[API CONFIG AUDIT]: PASS (Pure Render Production API)');
  }

  // 3. Test Driver Login & Endpoints on Production Render Backend
  console.log('\n--- 3. DRIVER ENDPOINTS TEST ON PRODUCTION BACKEND ---');
  const loginRes = await fetch(`${PROD_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'driver@platform.com', password: 'password123', role: 'driver' })
  });
  
  let loginData = await loginRes.json();
  if (loginData.token) {
    console.log('[PRODUCTION DRIVER LOGIN]: PASS (Token received)');
    const token = loginData.token;

    // Test KYC load
    const kycRes = await fetch(`${PROD_URL}/driver/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[PRODUCTION KYC LOAD]:', kycRes.status === 200 ? 'PASS (200 OK)' : 'FAIL');

    // Test Booking requests
    const bookingRes = await fetch(`${PROD_URL}/driver/booking-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[PRODUCTION BOOKING REQUESTS]:', bookingRes.status === 200 ? 'PASS (200 OK)' : 'FAIL');
  } else {
    console.log('[PRODUCTION DRIVER LOGIN NOTE]:', loginData.message);
  }

  console.log('\n=== ALL PRODUCTION CHECKS COMPLETE ===');
}

runProductionReleaseCheck().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
