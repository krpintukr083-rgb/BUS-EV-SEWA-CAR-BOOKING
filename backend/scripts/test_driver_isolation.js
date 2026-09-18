require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('=== DRIVER DATA ISOLATION & MULTI-DRIVER VERIFICATION ===');

  // 1. Rajesh Sharma Login
  const rajeshLogin = await request(app).post('/api/auth/login').send({
    identifier: 'driver@platform.com',
    password: 'driver123',
    role: 'driver'
  });
  if (rajeshLogin.status !== 200) {
    throw new Error(`Rajesh login failed: ${JSON.stringify(rajeshLogin.body)}`);
  }
  const rajeshToken = rajeshLogin.body.token;
  const rajeshUser = rajeshLogin.body.user;

  // 2. Suresh Verma Login
  const sureshLogin = await request(app).post('/api/auth/login').send({
    identifier: 'suresh.driver@platform.com',
    password: 'driver123',
    role: 'driver'
  });
  if (sureshLogin.status !== 200) {
    throw new Error(`Suresh login failed: ${JSON.stringify(sureshLogin.body)}`);
  }
  const sureshToken = sureshLogin.body.token;
  const sureshUser = sureshLogin.body.user;

  // 3. Fetch Rajesh Dashboard
  const rajeshDash = await request(app)
    .get('/api/driver/dashboard')
    .set('Authorization', `Bearer ${rajeshToken}`);

  // 4. Fetch Suresh Dashboard
  const sureshDash = await request(app)
    .get('/api/driver/dashboard')
    .set('Authorization', `Bearer ${sureshToken}`);

  console.log('\n--- Rajesh Sharma Details ---');
  console.log('User Name:', rajeshUser.name);
  console.log('User Email:', rajeshUser.email);
  console.log('User Phone:', rajeshUser.phone);
  console.log('Assigned Vehicle:', rajeshDash.body.data?.assignedVehicle?.vehicleName, `(${rajeshDash.body.data?.assignedVehicle?.vehicleNumber})`);
  console.log('Vehicle Type:', rajeshDash.body.data?.assignedVehicle?.vehicleType);

  console.log('\n--- Suresh Verma Details ---');
  console.log('User Name:', sureshUser.name);
  console.log('User Email:', sureshUser.email);
  console.log('User Phone:', sureshUser.phone);
  console.log('Assigned Vehicle:', sureshDash.body.data?.assignedVehicle?.vehicleName, `(${sureshDash.body.data?.assignedVehicle?.vehicleNumber})`);
  console.log('Vehicle Type:', sureshDash.body.data?.assignedVehicle?.vehicleType);

  // Isolation Assertion
  const rajeshVehicleNum = rajeshDash.body.data?.assignedVehicle?.vehicleNumber;
  const sureshVehicleNum = sureshDash.body.data?.assignedVehicle?.vehicleNumber;

  if (rajeshVehicleNum === sureshVehicleNum) {
    throw new Error('Isolation Violation: Rajesh and Suresh received the same vehicle!');
  }

  console.log('\n✅ Data Isolation Verified: Rajesh received vehicle [' + rajeshVehicleNum + '] and Suresh received vehicle [' + sureshVehicleNum + '].');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Data Isolation Failure:', e.message);
  process.exit(1);
});
