const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { connectTestDB, closeTestDB } = require('./setup');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');

describe('Driver vehicle image upload', () => {
  const email = 'driver.vehicle-images.integration@test.com';
  const phone = '9800000099';
  const vehicleNumber = 'TEST-VEHICLE-IMAGES-01';
  const frontPath = path.join(os.tmpdir(), 'driver-vehicle-front.png');
  const backPath = path.join(os.tmpdir(), 'driver-vehicle-back.png');
  let user;
  let driver;
  let vehicle;

  beforeAll(async () => {
    await connectTestDB();
    await User.deleteMany({ email });
    await Driver.deleteMany({ name: 'Vehicle Images Integration Driver' });
    await Vehicle.deleteMany({ vehicleNumber });

    user = await User.create({
      name: 'Vehicle Images Integration Driver',
      email,
      phone,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });

    driver = await Driver.create({
      user: user._id,
      name: user.name,
      mobileNumber: phone,
      drivingLicenceNumber: 'DL-VEHICLE-IMAGES-01',
      driverStatus: 'Active',
      requiredDocumentsStatus: 'Approved'
    });

    vehicle = await Vehicle.create({
      vehicleNumber,
      vehicleType: 'Bus',
      vehicleCategory: 'Integration Test Bus',
      vehicleModel: 'Integration Test Model',
      vehicleName: 'Integration Test Vehicle',
      ownerName: 'Integration Test Owner',
      ownerMobileNumber: phone,
      assignedDriver: driver._id,
      vehicleStatus: 'Active'
    });

    driver.assignedVehicle = vehicle._id;
    await driver.save();

    fs.writeFileSync(frontPath, Buffer.from('front-image'));
    fs.writeFileSync(backPath, Buffer.from('back-image'));
  });

  afterAll(async () => {
    [frontPath, backPath].forEach(filePath => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    if (vehicle) await Vehicle.findByIdAndDelete(vehicle._id);
    if (driver) await Driver.findByIdAndDelete(driver._id);
    if (user) await User.findByIdAndDelete(user._id);
    await closeTestDB();
  });

  it('stores front and back images in order and exposes them to admins', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: email, password: 'DriverPassword123!', role: 'driver' });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    const token = login.body.token;

    const upload = await request(app)
      .post('/api/driver/vehicle-images')
      .set('Authorization', `Bearer ${token}`)
      .attach('vehicleImages', frontPath, { filename: 'vehicle-front.png', contentType: 'image/png' })
      .attach('vehicleImages', backPath, { filename: 'vehicle-back.png', contentType: 'image/png' });

    expect(upload.status).toBe(200);
    expect(upload.body.success).toBe(true);
    expect(upload.body.data.frontImage).toMatch(/^\/uploads\/.+\.png$/);
    expect(upload.body.data.backImage).toMatch(/^\/uploads\/.+\.png$/);
    expect(upload.body.data.vehicleImages.slice(0, 2)).toEqual([
      upload.body.data.frontImage,
      upload.body.data.backImage
    ]);

    const savedVehicle = await Vehicle.findById(vehicle._id).lean();
    expect(savedVehicle.vehicleImages.slice(0, 2)).toEqual([
      upload.body.data.frontImage,
      upload.body.data.backImage
    ]);

    const frontResponse = await request(app).get(upload.body.data.frontImage);
    const backResponse = await request(app).get(upload.body.data.backImage);
    expect(frontResponse.status).toBe(200);
    expect(backResponse.status).toBe(200);

    const admin = await User.create({
      name: 'Vehicle Images Integration Admin',
      email: 'vehicle.images.integration.admin@test.com',
      phone: '9800000098',
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'Active'
    });

    try {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: admin.email,
          password: 'AdminPassword123!',
          role: 'admin'
        });

      const drivers = await request(app)
        .get('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminLogin.body.token}`);

      expect(drivers.status).toBe(200);
      const listedDriver = drivers.body.data.find(item => item._id === driver._id.toString());
      expect(listedDriver.assignedVehicle.vehicleImages.slice(0, 2)).toEqual([
        upload.body.data.frontImage,
        upload.body.data.backImage
      ]);
    } finally {
      await User.findByIdAndDelete(admin._id);
    }
  });
});
