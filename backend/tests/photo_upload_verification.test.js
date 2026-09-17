const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const { connectTestDB, closeTestDB } = require('./setup');

const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

describe('Super Admin Photo Upload & Management Integration Tests', () => {
  let adminToken = '';
  let testDriverId = '';
  let testVehicleId = '';
  const testJpgPath = path.join(__dirname, 'test_sample.jpg');
  const testPngPath = path.join(__dirname, 'test_sample.png');
  const testLargePath = path.join(__dirname, 'test_large.jpg');
  const testTxtPath = path.join(__dirname, 'test_invalid.txt');

  beforeAll(async () => {
    await connectTestDB();

    // Create test image files
    fs.writeFileSync(testJpgPath, Buffer.alloc(1024, 0xff)); // 1KB valid dummy JPG
    fs.writeFileSync(testPngPath, Buffer.alloc(2048, 0x89)); // 2KB valid dummy PNG
    fs.writeFileSync(testLargePath, Buffer.alloc(3 * 1024 * 1024, 0xaa)); // 3MB file (exceeds 2MB limit)
    fs.writeFileSync(testTxtPath, 'Invalid non-image file content');

    // Find existing admin or create
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Super Admin',
        email: 'admin_photo_test@travelease.com',
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'AdminPassword123',
        role: 'admin',
        status: 'Active'
      });
    }

    adminToken = jwt.sign({ id: admin._id, role: 'admin' }, jwtConfig.secret, {
      expiresIn: '1d'
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup created test files
    [testJpgPath, testPngPath, testLargePath, testTxtPath].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    // Cleanup created test database records
    if (testDriverId) {
      await Driver.findByIdAndDelete(testDriverId);
    }
    if (testVehicleId) {
      await Vehicle.findByIdAndDelete(testVehicleId);
    }
    await User.deleteMany({ email: { $in: ['test_photo_driver@test.com', 'test_photo_driver_updated@test.com'] } });
    await closeTestDB();
  }, 30000);

  // ============================================================
  // 1. DRIVER PHOTO TESTS
  // ============================================================
  describe('1. Driver Photo Upload & Management', () => {
    it('should reject invalid file type for driver photo upload', async () => {
      const res = await request(app)
        .post('/api/admin/upload/driver-photo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('driverPhoto', testTxtPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject file exceeding 2MB for driver photo upload', async () => {
      const res = await request(app)
        .post('/api/admin/upload/driver-photo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('driverPhoto', testLargePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/limit|exceed|2MB/i);
    });

    it('should successfully upload valid JPG driver photo and return image URL', async () => {
      const res = await request(app)
        .post('/api/admin/upload/driver-photo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('driverPhoto', testJpgPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toMatch(/\/uploads\/.+\.jpg$/i);
    });

    it('should create new driver with uploaded photo and save driverPhoto in MongoDB', async () => {
      const uniquePhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
      const res = await request(app)
        .post('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Vikram Test Driver')
        .field('mobileNumber', uniquePhone)
        .field('email', 'test_photo_driver@test.com')
        .field('password', 'Driver@123')
        .field('drivingLicenceNumber', `DL-TEST-${Date.now()}`)
        .attach('driverPhoto', testJpgPath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driverPhoto).toBeDefined();
      expect(res.body.data.driverPhoto).toMatch(/\/uploads\//);
      testDriverId = res.body.data._id;

      // Verify in DB
      const dbDriver = await Driver.findById(testDriverId);
      expect(dbDriver).toBeDefined();
      expect(dbDriver.driverPhoto).toBe(res.body.data.driverPhoto);
      expect(dbDriver.profilePhoto).toBe(res.body.data.driverPhoto);
    });

    it('should return driverPhoto in Driver Management listing', async () => {
      const res = await request(app)
        .get('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find(d => d._id.toString() === testDriverId.toString());
      expect(found).toBeDefined();
      expect(found.driverPhoto).toMatch(/\/uploads\//);
    });

    it('should allow editing/replacing driver photo', async () => {
      const res = await request(app)
        .put(`/api/admin/drivers/${testDriverId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Vikram Updated Driver')
        .attach('driverPhoto', testPngPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driverPhoto).toMatch(/\.png$/i);

      // Verify in DB
      const dbDriver = await Driver.findById(testDriverId);
      expect(dbDriver.name).toBe('Vikram Updated Driver');
      expect(dbDriver.driverPhoto).toMatch(/\.png$/i);
    });
  });

  // ============================================================
  // 2. VEHICLE PHOTOS TESTS
  // ============================================================
  describe('2. Vehicle Photos Upload & Management', () => {
    it('should reject invalid file type for vehicle images upload', async () => {
      const res = await request(app)
        .post('/api/admin/upload/vehicle-images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('vehicleImages', testTxtPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject any vehicle image exceeding 2MB', async () => {
      const res = await request(app)
        .post('/api/admin/upload/vehicle-images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('vehicleImages', testLargePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully upload multiple vehicle images (up to 5)', async () => {
      const res = await request(app)
        .post('/api/admin/upload/vehicle-images')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('vehicleImages', testJpgPath)
        .attach('vehicleImages', testPngPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.urls).toHaveLength(2);
      expect(res.body.urls[0]).toMatch(/\/uploads\//);
      expect(res.body.urls[1]).toMatch(/\/uploads\//);
    });

    it('should create new vehicle with multiple photos, treating first as primary', async () => {
      const uniqueReg = `DL01TEST${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await request(app)
        .post('/api/admin/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vehicleNumber', uniqueReg)
        .field('vehicleType', 'EV-Sewa')
        .field('vehicleCategory', 'Electric Shuttle 12-Seater')
        .field('vehicleModel', 'Tata Winger EV Prime')
        .field('vehicleName', 'Eco Transit Shuttle')
        .field('seatingCapacity', 12)
        .field('ownerName', 'Fleet Logistics Ltd')
        .field('ownerMobileNumber', '+919811122334')
        .field('fareRate', 350)
        .field('rcNumber', `RC-${uniqueReg}`)
        .field('insurancePolicyNumber', `INS-${uniqueReg}`)
        .field('insuranceExpiryDetails', '2027-01-01')
        .field('fitnessDetails', 'Certified')
        .attach('vehicleImages', testJpgPath)
        .attach('vehicleImages', testPngPath);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicleImages).toHaveLength(2);
      testVehicleId = res.body.data._id;

      // Verify in MongoDB
      const dbVehicle = await Vehicle.findById(testVehicleId);
      expect(dbVehicle).toBeDefined();
      expect(dbVehicle.vehicleImages).toHaveLength(2);
      expect(dbVehicle.vehicleImages[0]).toMatch(/\/uploads\/.+\.jpg$/i); // Primary image
      expect(dbVehicle.vehicleImages[1]).toMatch(/\/uploads\/.+\.png$/i);
    });

    it('should return vehicle with primary image in Vehicle Management listing', async () => {
      const res = await request(app)
        .get('/api/admin/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find(v => v._id.toString() === testVehicleId.toString());
      expect(found).toBeDefined();
      expect(found.vehicleImages).toHaveLength(2);
      expect(found.vehicleImages[0]).toMatch(/\/uploads\//);
    });

    it('should allow updating/replacing vehicle photos', async () => {
      const res = await request(app)
        .put(`/api/admin/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vehicleImages: [
            '/uploads/custom-photo-1.jpg',
            '/uploads/custom-photo-2.jpg',
            '/uploads/custom-photo-3.jpg'
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicleImages).toHaveLength(3);

      // Verify in DB
      const dbVehicle = await Vehicle.findById(testVehicleId);
      expect(dbVehicle.vehicleImages).toHaveLength(3);
      expect(dbVehicle.vehicleImages[0]).toBe('/uploads/custom-photo-1.jpg');
    });
  });
});
