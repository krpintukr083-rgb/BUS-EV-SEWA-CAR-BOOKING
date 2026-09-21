const request = require('supertest');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Driver = require('../src/models/Driver');
const User = require('../src/models/User');
const { connectTestDB, closeTestDB } = require('./setup');

describe('Vehicle Registration KYC 4-Field Form Suite', () => {
  let driverToken;
  let adminToken;
  let driverId;
  let testUser;
  let testAdmin;
  let testDriver;

  beforeAll(async () => {
    await connectTestDB();
    const jwtSecret = process.env.JWT_SECRET || 'secret_key';

    const uniquePhone = `980${Math.floor(1000000 + Math.random() * 9000000)}`;
    testUser = await User.create({
      name: 'RC Test Driver',
      email: `rctest_${Date.now()}@example.com`,
      phone: uniquePhone,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });

    testDriver = await Driver.create({
      user: testUser._id,
      name: 'RC Test Driver',
      mobileNumber: uniquePhone,
      drivingLicenceNumber: 'DL-TEST-999',
      rcNumber: 'RC-INIT-001',
      vehicleNumber: 'DL 01 IN 0001',
      rcExpiry: '2028-06-30',
      rcStatus: 'Approved'
    });

    driverId = testDriver._id;

    driverToken = jwt.sign(
      { id: testUser._id, role: 'driver', driverId: testDriver._id },
      jwtSecret,
      { expiresIn: '1d' }
    );

    testAdmin = await User.create({
      name: 'RC Admin',
      email: `rcadmin_${Date.now()}@example.com`,
      phone: `981${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'Active'
    });

    adminToken = jwt.sign(
      { id: testAdmin._id, role: 'admin' },
      jwtSecret,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    if (testDriver) await Driver.findByIdAndDelete(testDriver._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    if (testAdmin) await User.findByIdAndDelete(testAdmin._id);
    await closeTestDB();
  });

  test('1. Validation: Vehicle Registration fails if vehicleNumber is missing', async () => {
    const dummyFilePath = path.join(__dirname, 'temp_rc_test.jpg');
    fs.writeFileSync(dummyFilePath, 'dummy image content');

    const res = await request(app)
      .post('/api/driver/documents')
      .set('Authorization', `Bearer ${driverToken}`)
      .field('docType', 'vehicleRegistration')
      .field('documentNumber', 'RC-2026-987654')
      .field('expiryDate', '2029-06-30')
      .attach('document', dummyFilePath);

    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Vehicle Number is required');
  });

  test('2. Successful RC Submission: Saves rcNumber and vehicleNumber independently', async () => {
    const dummyFilePath = path.join(__dirname, 'temp_rc_test.jpg');
    fs.writeFileSync(dummyFilePath, 'dummy image content');

    const res = await request(app)
      .post('/api/driver/documents')
      .set('Authorization', `Bearer ${driverToken}`)
      .field('docType', 'vehicleRegistration')
      .field('documentNumber', 'RC-2026-987654')
      .field('vehicleNumber', 'DL 04 EV 9820')
      .field('expiryDate', '2029-06-30')
      .attach('document', dummyFilePath);

    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedDriver = await Driver.findById(driverId);
    expect(updatedDriver.rcNumber).toBe('RC-2026-987654');
    expect(updatedDriver.vehicleNumber).toBe('DL 04 EV 9820');
    expect(updatedDriver.rcExpiry).toBe('2029-06-30');
    expect(updatedDriver.rcStatus).toBe('Pending Verification');
  });

  test('3. Driver GET Documents API: Returns both rcNumber and vehicleNumber', async () => {
    const res = await request(app)
      .get('/api/driver/documents')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rcDoc = res.body.data.documents.vehicleRc || res.body.data.documents.rc;
    expect(rcDoc).toBeDefined();
    expect(rcDoc.rcNumber).toBe('RC-2026-987654');
    expect(rcDoc.vehicleNumber).toBe('DL 04 EV 9820');
    expect(rcDoc.expiryDate).toBe('2029-06-30');
  });

  test('4. Admin GET Drivers API: Returns canonical rcNumber and vehicleNumber', async () => {
    const res = await request(app)
      .get('/api/admin/drivers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const target = res.body.data.find((d) => d._id.toString() === driverId.toString());
    expect(target).toBeDefined();
    expect(target.rcNumber).toBe('RC-2026-987654');
    expect(target.vehicleNumber).toBe('DL 04 EV 9820');
    expect(target.rcExpiry).toBe('2029-06-30');
  });

  test('5. Admin Approve RC Document: Updates rcStatus to Approved', async () => {
    const res = await request(app)
      .put(`/api/admin/drivers/${driverId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ docType: 'rc', status: 'Approved' });

    expect(res.status).toBe(200);
    const updatedDriver = await Driver.findById(driverId);
    expect(updatedDriver.rcStatus).toBe('Approved');
  });

  test('6. Driver Re-upload after approval: Resets rcStatus to Pending Verification', async () => {
    const dummyFilePath = path.join(__dirname, 'temp_rc_test.jpg');
    fs.writeFileSync(dummyFilePath, 'dummy image content');

    const res = await request(app)
      .post('/api/driver/documents')
      .set('Authorization', `Bearer ${driverToken}`)
      .field('docType', 'vehicleRegistration')
      .field('documentNumber', 'RC-2026-987654')
      .field('vehicleNumber', 'DL 04 EV 9820')
      .field('expiryDate', '2029-06-30')
      .attach('document', dummyFilePath);

    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);

    expect(res.status).toBe(200);
    const updatedDriver = await Driver.findById(driverId);
    expect(updatedDriver.rcStatus).toBe('Pending Verification');
  });
});
