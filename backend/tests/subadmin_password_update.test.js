const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('Sub-Admin password update', () => {
  let superAdmin;
  let subAdmin;
  let superAdminToken;

  beforeAll(async () => {
    await connectTestDB();
    const suffix = Date.now();
    superAdmin = await User.create({
      name: 'Password Update Super Admin',
      email: `password-update-admin-${suffix}@example.com`,
      phone: `+1555${String(suffix).slice(-7)}`,
      password: 'SuperAdminPass123',
      role: 'admin',
      status: 'Active'
    });
    subAdmin = await User.create({
      name: 'Password Update Sub Admin',
      email: `password-update-subadmin-${suffix}@example.com`,
      phone: `+1666${String(suffix).slice(-7)}`,
      password: 'OriginalPass123',
      role: 'sub_admin',
      status: 'Active'
    });
    superAdminToken = jwt.sign(
      { id: superAdmin._id, role: 'admin' },
      jwtConfig.secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (subAdmin) await User.findByIdAndDelete(subAdmin._id);
    if (superAdmin) await User.findByIdAndDelete(superAdmin._id);
    await closeTestDB();
  });

  const login = (password) => request(app)
    .post('/api/auth/login')
    .send({
      identifier: subAdmin.email,
      password,
      role: 'admin'
    });

  test('empty password leaves the existing password unchanged', async () => {
    const existingPasswordHash = (await User.findById(subAdmin._id).select('+password')).password;
    const response = await request(app)
      .patch(`/api/admin/subadmins/${subAdmin._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Password Update Sub Admin', password: '' });

    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('password');
    const updatedSubAdmin = await User.findById(subAdmin._id).select('+password');
    expect(updatedSubAdmin.password).toBe(existingPasswordHash);
    expect((await login('OriginalPass123')).status).toBe(200);
  });

  test('new password is hashed and replaces the old login password', async () => {
    const newPassword = 'ReplacementPass456';
    const response = await request(app)
      .patch(`/api/admin/subadmins/${subAdmin._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ password: newPassword });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('password');
    expect(response.body.data).not.toHaveProperty('password');

    const updatedSubAdmin = await User.findById(subAdmin._id).select('+password');
    expect(updatedSubAdmin.password).not.toBe(newPassword);
    expect(await updatedSubAdmin.matchPassword(newPassword)).toBe(true);
    expect(await updatedSubAdmin.matchPassword('OriginalPass123')).toBe(false);
    expect((await login('OriginalPass123')).status).toBe(401);
    expect((await login(newPassword)).status).toBe(200);
  });

  test('rejects a non-empty password shorter than the existing minimum', async () => {
    const existingPasswordHash = (await User.findById(subAdmin._id).select('+password')).password;
    const response = await request(app)
      .patch(`/api/admin/subadmins/${subAdmin._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ password: 'short' });

    expect(response.status).toBe(400);
    expect((await User.findById(subAdmin._id).select('+password')).password).toBe(existingPasswordHash);
  });
});
