const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const adminRoutes = require('../src/routes/adminRoutes');
const driverRoutes = require('../src/routes/driverRoutes');
const { protect, authorize } = require('../src/middleware/auth');
const express = require('express');
const request = require('supertest');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);

async function runSecurityTests() {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = await User.findOne({ role: 'admin' });
  const driverUser = await User.findOne({ role: 'driver' });
  const driver = await Driver.findOne({ user: driverUser._id });
  const customer = await User.findOne({ role: 'customer' });

  const adminToken = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: customer._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidtoken.xyz';

  console.log('--- PHASE 9: SECURITY & RBAC REGRESSION TEST ---');

  // 1. Admin access admin dashboard
  const r1 = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
  console.log(`1. Admin -> /api/admin/dashboard: Status ${r1.status} (Expected 200) -> ${r1.status === 200 ? 'PASS' : 'FAIL'}`);

  // 2. Driver access driver dashboard
  const r2 = await request(app).get('/api/driver/dashboard').set('Authorization', `Bearer ${driverToken}`);
  console.log(`2. Driver -> /api/driver/dashboard: Status ${r2.status} (Expected 200) -> ${r2.status === 200 ? 'PASS' : 'FAIL'}`);

  // 3. Driver access admin dashboard
  const r3 = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${driverToken}`);
  console.log(`3. Driver -> /api/admin/dashboard: Status ${r3.status} (Expected 403) -> ${r3.status === 403 ? 'PASS' : 'FAIL'}`);

  // 4. Customer access admin dashboard
  const r4 = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${customerToken}`);
  console.log(`4. Customer -> /api/admin/dashboard: Status ${r4.status} (Expected 403) -> ${r4.status === 403 ? 'PASS' : 'FAIL'}`);

  // 5. Customer access driver dashboard
  const r5 = await request(app).get('/api/driver/dashboard').set('Authorization', `Bearer ${customerToken}`);
  console.log(`5. Customer -> /api/driver/dashboard: Status ${r5.status} (Expected 403) -> ${r5.status === 403 ? 'PASS' : 'FAIL'}`);

  // 6. Guest (No Token) -> Admin Dashboard
  const r6 = await request(app).get('/api/admin/dashboard');
  console.log(`6. Guest -> /api/admin/dashboard: Status ${r6.status} (Expected 401) -> ${r6.status === 401 ? 'PASS' : 'FAIL'}`);

  // 7. Guest (No Token) -> Driver Dashboard
  const r7 = await request(app).get('/api/driver/dashboard');
  console.log(`7. Guest -> /api/driver/dashboard: Status ${r7.status} (Expected 401) -> ${r7.status === 401 ? 'PASS' : 'FAIL'}`);

  // 8. Invalid JWT -> Admin Dashboard
  const r8 = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${invalidToken}`);
  console.log(`8. Invalid JWT -> /api/admin/dashboard: Status ${r8.status} (Expected 401) -> ${r8.status === 401 ? 'PASS' : 'FAIL'}`);

  await mongoose.disconnect();
}

runSecurityTests().catch(err => {
  console.error(err);
  process.exit(1);
});
