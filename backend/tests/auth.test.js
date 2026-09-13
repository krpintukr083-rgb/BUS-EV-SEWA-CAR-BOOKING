const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  // Clean up any test users created during testing
  await User.deleteMany({ email: { $regex: /@autotest\.com$/ } });
  await closeTestDB();
});

describe('1. Authentication API Tests', () => {
  const testEmail = `cust_${Date.now()}@autotest.com`;
  const testPhone = `+9199${Date.now().toString().slice(-8)}`;
  let authToken = '';

  test('POST /api/auth/register - Successfully register new customer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Automated Test User',
        email: testEmail,
        phone: testPhone,
        password: 'Password@123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    authToken = res.body.token;
  });

  test('POST /api/auth/login - Successfully login with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testEmail,
        password: 'Password@123',
        role: 'customer'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Automated Test User');
  });

  test('POST /api/auth/login - Successfully login with mobile number', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testPhone,
        password: 'Password@123',
        role: 'customer'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login - Reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testEmail,
        password: 'WrongPassword999',
        role: 'customer'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Retrieve current customer profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
  });

  test('GET /api/customer/profile - Retrieve customer profile endpoint', async () => {
    const res = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('customer');
  });

  test('PUT /api/customer/profile - Update customer profile details', async () => {
    const res = await request(app)
      .put('/api/customer/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Automated Test User Updated'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Automated Test User Updated');
  });

  test('GET /api/auth/me - Reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
