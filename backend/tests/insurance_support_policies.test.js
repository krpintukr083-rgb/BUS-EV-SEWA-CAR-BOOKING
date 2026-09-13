const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Insurance = require('../src/models/Insurance');
const Support = require('../src/models/Support');
const Policy = require('../src/models/Policy');
const Notification = require('../src/models/Notification');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('6. Insurance, Support, Notifications & Policies API Tests', () => {
  let customerUser;
  let customerToken;
  let sampleBooking;

  beforeAll(async () => {
    customerUser = await User.findOne({ role: 'customer', status: 'Active' });
    customerToken = jwt.sign({ id: customerUser._id, role: customerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    sampleBooking = await Booking.findOne({ 'customer.email': customerUser.email });
    if (!sampleBooking) {
      sampleBooking = await Booking.findOne();
    }
  });

  // Insurance Tests
  test('GET /api/insurance/:bookingId - Retrieve insurance details with statutory ₹5,00,000 disclaimer', async () => {
    if (sampleBooking) {
      const res = await request(app)
        .get(`/api/insurance/${sampleBooking.bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.disclaimer).toMatch(/Coverage up to ₹5,00,000/);
      expect(res.body.data.policyNumber).toBeDefined();
    }
  });

  // Support Tests
  test('POST /api/support - Submit a customer support ticket and persist in MongoDB', async () => {
    const res = await request(app)
      .post('/api/support')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        supportIssue: 'Assistance with boarding location',
        bookingId: sampleBooking ? sampleBooking.bookingId : 'BK-DEMO-001',
        message: 'Where is the exact bus platform at the ISBT station?'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketId).toBeDefined();
    expect(res.body.data.status).toBe('Open');

    // Verify MongoDB state
    const ticketInDb = await Support.findOne({ ticketId: res.body.data.ticketId });
    expect(ticketInDb).toBeDefined();
    expect(ticketInDb.requesterName).toBe(customerUser.name);
  });

  test('GET /api/support - Retrieve support tickets and helpline details for customer', async () => {
    const res = await request(app)
      .get('/api/support')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.helplineNumber).toBeDefined();
    expect(Array.isArray(res.body.data.tickets)).toBe(true);
  });

  // Notifications Tests
  test('GET /api/notifications - Retrieve notifications from MongoDB', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Policies Tests
  test('GET /api/policies - Retrieve all legal and platform policies from MongoDB', async () => {
    const res = await request(app).get('/api/policies');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/policies/terms_and_conditions - Retrieve specific policy by type', async () => {
    const res = await request(app).get('/api/policies/terms_and_conditions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBeDefined();
    expect(res.body.data.content).toBeDefined();
  });
});
