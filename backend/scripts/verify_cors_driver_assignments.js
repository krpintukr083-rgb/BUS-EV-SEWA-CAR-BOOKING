const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const User = require('../src/models/User');

async function testCorsAndDriverAssignments() {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = await User.findOne({ role: 'admin' });
  const driverUser = await User.findOne({ role: 'driver' });
  const customer = await User.findOne({ role: 'customer' });

  const adminToken = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: customer._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const vercelOrigin = 'https://bus-ev-sewa-car-booking-5ctefa5m0-krpintukr083-rgb.vercel.app';

  console.log('========================================================');
  console.log('VERIFYING CORS & DRIVER ASSIGNMENTS ENDPOINT LOCALLY');
  console.log('========================================================');

  // 1. Test OPTIONS Preflight
  console.log('\n1. Testing OPTIONS Preflight:');
  const optRes = await request(app)
    .options('/api/admin/driver-assignments')
    .set('Origin', vercelOrigin)
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

  console.log('Status Code:', optRes.status);
  console.log('Access-Control-Allow-Origin:', optRes.headers['access-control-allow-origin']);
  console.log('Access-Control-Allow-Credentials:', optRes.headers['access-control-allow-credentials']);
  console.log('Access-Control-Allow-Methods:', optRes.headers['access-control-allow-methods']);
  console.log('Access-Control-Allow-Headers:', optRes.headers['access-control-allow-headers']);
  
  const optPass = optRes.status === 204 && optRes.headers['access-control-allow-origin'] === vercelOrigin;
  console.log('OPTIONS Preflight Test:', optPass ? 'PASS ✅' : 'FAIL ❌');

  // 2. Test GET with Admin JWT
  console.log('\n2. Testing GET with Admin JWT:');
  const getAdminRes = await request(app)
    .get('/api/admin/driver-assignments')
    .set('Origin', vercelOrigin)
    .set('Authorization', `Bearer ${adminToken}`);

  console.log('Status Code:', getAdminRes.status);
  console.log('Access-Control-Allow-Origin:', getAdminRes.headers['access-control-allow-origin']);
  console.log('Success:', getAdminRes.body.success);
  console.log('Assignments count:', getAdminRes.body.data?.assignments?.length);
  console.log('Available drivers count:', getAdminRes.body.data?.availableDrivers?.length);

  const getAdminPass = getAdminRes.status === 200 &&
    getAdminRes.headers['access-control-allow-origin'] === vercelOrigin &&
    getAdminRes.body.success === true;
  console.log('Admin GET Test:', getAdminPass ? 'PASS ✅' : 'FAIL ❌');

  // 3. Test GET with Driver JWT (Should be 403 Forbidden)
  console.log('\n3. Testing GET with Driver JWT:');
  const getDriverRes = await request(app)
    .get('/api/admin/driver-assignments')
    .set('Origin', vercelOrigin)
    .set('Authorization', `Bearer ${driverToken}`);

  console.log('Status Code:', getDriverRes.status);
  console.log('Access-Control-Allow-Origin:', getDriverRes.headers['access-control-allow-origin']);
  const driverPass = getDriverRes.status === 403 && getDriverRes.headers['access-control-allow-origin'] === vercelOrigin;
  console.log('Driver 403 Test:', driverPass ? 'PASS ✅' : 'FAIL ❌');

  // 4. Test GET with Customer JWT (Should be 403 Forbidden)
  console.log('\n4. Testing GET with Customer JWT:');
  const getCustRes = await request(app)
    .get('/api/admin/driver-assignments')
    .set('Origin', vercelOrigin)
    .set('Authorization', `Bearer ${customerToken}`);

  console.log('Status Code:', getCustRes.status);
  console.log('Access-Control-Allow-Origin:', getCustRes.headers['access-control-allow-origin']);
  const custPass = getCustRes.status === 403 && getCustRes.headers['access-control-allow-origin'] === vercelOrigin;
  console.log('Customer 403 Test:', custPass ? 'PASS ✅' : 'FAIL ❌');

  // 5. Test GET with No JWT (Should be 401 Unauthorized)
  console.log('\n5. Testing GET with No JWT:');
  const getNoAuthRes = await request(app)
    .get('/api/admin/driver-assignments')
    .set('Origin', vercelOrigin);

  console.log('Status Code:', getNoAuthRes.status);
  console.log('Access-Control-Allow-Origin:', getNoAuthRes.headers['access-control-allow-origin']);
  const noAuthPass = getNoAuthRes.status === 401 && getNoAuthRes.headers['access-control-allow-origin'] === vercelOrigin;
  console.log('No Auth 401 Test:', noAuthPass ? 'PASS ✅' : 'FAIL ❌');

  await mongoose.disconnect();
}

testCorsAndDriverAssignments().catch(err => {
  console.error(err);
  process.exit(1);
});
