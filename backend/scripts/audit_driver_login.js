require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- AUDITING LOCAL/MONGODB BACKEND AUTH PIPELINE ---');

  const accounts = [
    { label: '1. Rajesh Sharma Email', identifier: 'driver@platform.com', pass: 'driver123', expectedStatus: 200 },
    { label: '1. Rajesh Sharma Mobile +91', identifier: '+919876543210', pass: 'driver123', expectedStatus: 200 },
    { label: '1. Rajesh Sharma Mobile 10digit', identifier: '9876543210', pass: 'driver123', expectedStatus: 200 },
    { label: '2. Suresh Verma Email', identifier: 'suresh.driver@platform.com', pass: 'driver123', expectedStatus: 200 },
    { label: '2. Suresh Verma Mobile +91', identifier: '+919811223344', pass: 'driver123', expectedStatus: 200 },
    { label: '2. Suresh Verma Mobile 10digit', identifier: '9811223344', pass: 'driver123', expectedStatus: 200 },
    { label: '3. Manoj Kumar (Inactive) Email', identifier: 'manoj.driver@platform.com', pass: 'driver123', expectedStatus: 200 },
    { label: '3. Manoj Kumar (Inactive) Mobile', identifier: '+919822334455', pass: 'driver123', expectedStatus: 200 },
    { label: '4. Amit Yadav (Blocked) Email', identifier: 'amit.driver@platform.com', pass: 'driver123', expectedStatus: 403 },
    { label: '4. Amit Yadav (Blocked) Mobile', identifier: '+919833445566', pass: 'driver123', expectedStatus: 403 },
    { label: '5. Test Driver A Email', identifier: 'driver_alpha@test.com', pass: 'driver123', expectedStatus: 200 },
    { label: '5. Test Driver A Mobile', identifier: '9899003344', pass: 'driver123', expectedStatus: 200 },
    { label: '6. Test Driver B Email', identifier: 'driver_beta@test.com', pass: 'driver123', expectedStatus: 200 },
    { label: '6. Test Driver B Mobile', identifier: '9899005566', pass: 'driver123', expectedStatus: 200 },
    { label: 'Wrong Password Test', identifier: 'driver@platform.com', pass: 'wrongpass', expectedStatus: 401 }
  ];

  let passed = 0;
  for (const acc of accounts) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: acc.identifier,
        password: acc.pass,
        role: 'driver'
      });

    const isMatch = res.status === acc.expectedStatus;
    if (isMatch) {
      passed++;
      console.log(`✅ [PASS] ${acc.label} (${acc.identifier}): HTTP ${res.status} - User: ${res.body.user?.name || 'N/A'}, Driver: ${res.body.user?.driverInfo?.name || 'N/A'}, Vehicle: ${res.body.user?.driverInfo?.assignedVehicle?.vehicleNumber || 'N/A'}`);
    } else {
      console.log(`❌ [FAIL] ${acc.label} (${acc.identifier}): Expected ${acc.expectedStatus}, got ${res.status} - ${JSON.stringify(res.body)}`);
    }
  }

  console.log(`\nResults: ${passed} / ${accounts.length} tests passed.`);
  await mongoose.connection.close();
  process.exit(passed === accounts.length ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
