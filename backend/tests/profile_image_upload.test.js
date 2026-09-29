const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const UploadedFile = require('../src/models/UploadedFile');
const jwtConfig = require('../src/config/jwt');

describe('Authenticated profile image uploads', () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const uploadedFilenames = [];
  let customer;
  let driverUser;
  let driver;
  let customerToken;
  let driverToken;

  beforeAll(async () => {
    await connectTestDB();
    customer = await User.create({
      name: 'Profile Image Customer',
      email: `profile-image-customer-${suffix}@test.com`,
      phone: `985${suffix.slice(-7)}`,
      password: 'CustomerPassword123!',
      role: 'customer',
      status: 'Active'
    });
    driverUser = await User.create({
      name: 'Profile Image Driver',
      email: `profile-image-driver-${suffix}@test.com`,
      phone: `986${suffix.slice(-7)}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-PROFILE-${suffix}`,
      driverStatus: 'Active'
    });
    customerToken = jwt.sign({ id: customer._id }, jwtConfig.secret, { expiresIn: '1h' });
    driverToken = jwt.sign({ id: driverUser._id }, jwtConfig.secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (driver) await Driver.findByIdAndDelete(driver._id);
    if (customer) await User.findByIdAndDelete(customer._id);
    if (driverUser) await User.findByIdAndDelete(driverUser._id);
    if (uploadedFilenames.length) {
      await UploadedFile.deleteMany({ filename: { $in: uploadedFilenames } });
      uploadedFilenames.forEach(filename => {
        const filePath = path.resolve(__dirname, '../uploads', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    await closeTestDB();
  });

  it('lets a customer update and reload only their own profile photo', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=',
      'base64'
    );
    const uploadResponse = await request(app)
      .put('/api/customer/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('profilePhoto', png, { filename: 'customer-profile.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.data.profilePhoto).toMatch(/^\/uploads\/.*\.png$/);
    uploadedFilenames.push(uploadResponse.body.data.profilePhoto.split('/').pop());

    const profileResponse = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.profilePhoto).toBe(uploadResponse.body.data.profilePhoto);
    const sessionResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(sessionResponse.body.user.profilePhoto).toBe(uploadResponse.body.data.profilePhoto);

    const driverAccess = await request(app)
      .put('/api/customer/profile')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ profilePhoto: '/uploads/not-owned.png' });
    expect(driverAccess.status).toBe(403);
  });

  it('lets a driver update their own profile photo and keeps driver fields in sync', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=',
      'base64'
    );
    const uploadResponse = await request(app)
      .put('/api/driver/profile')
      .set('Authorization', `Bearer ${driverToken}`)
      .attach('profilePhoto', png, { filename: 'driver-profile.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.data.profilePhoto).toMatch(/^\/uploads\/.*\.png$/);
    expect(uploadResponse.body.data.driverPhoto).toBe(uploadResponse.body.data.profilePhoto);
    uploadedFilenames.push(uploadResponse.body.data.profilePhoto.split('/').pop());

    const profileResponse = await request(app)
      .get('/api/driver/profile')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.profilePhoto).toBe(uploadResponse.body.data.profilePhoto);
    const sessionResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(sessionResponse.body.user.profilePhoto).toBe(uploadResponse.body.data.profilePhoto);

    const customerAccess = await request(app)
      .put('/api/driver/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ profilePhoto: '/uploads/not-owned.png' });
    expect(customerAccess.status).toBe(403);
  });

  it('rejects invalid image data and images larger than the existing 10MB upload limit', async () => {
    const invalidImage = await request(app)
      .put('/api/customer/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('profilePhoto', Buffer.from('not an image'), { filename: 'invalid.png', contentType: 'image/png' });
    expect(invalidImage.status).toBe(400);
    expect(invalidImage.body.message).toMatch(/not a valid/i);

    const oversizedImage = await request(app)
      .put('/api/customer/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('profilePhoto', Buffer.alloc(10 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' });
    expect(oversizedImage.status).toBe(400);
    expect(oversizedImage.body.message).toMatch(/10MB or smaller/i);
  });
});
