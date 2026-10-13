const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

jest.setTimeout(30000);

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Customer Booking Access & Identity Resolution', () => {
  let customerUser;
  let driverUser;
  let customerToken;
  let driverToken;
  let customerBookingId;

  beforeAll(async () => {
    // Customer
    customerUser = await User.create({
      name: 'Yatra Test Customer',
      email: `cust_${Date.now()}@autotest.com`,
      phone: `+97798${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    customerToken = jwt.sign({ id: customerUser._id, role: customerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    // Driver
    driverUser = await User.create({
      name: 'Yatra Test Driver',
      email: `driver_${Date.now()}@autotest.com`,
      phone: `+97797${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });
    driverToken = jwt.sign({ id: driverUser._id, role: driverUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    // Create a customer booking for customerUser
    const cBooking = await Booking.create({
      bookingId: `BK-TEST-${Date.now().toString().slice(-4)}`,
      bookingMode: 'SCHEDULE',
      user: customerUser._id,
      customer: {
        name: customerUser.name,
        phone: customerUser.phone,
        email: customerUser.email
      },
      serviceType: 'Bus',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Pokhara',
      fare: 1200,
      originalFare: 1200,
      finalFare: 1200,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      travelDate: new Date()
    });
    customerBookingId = cBooking.bookingId;

    // Create a booking where driverUser booked as passenger
    await Booking.create({
      bookingId: `BK-DRV-${Date.now().toString().slice(-4)}`,
      bookingMode: 'INSTANT',
      user: driverUser._id,
      customer: {
        name: driverUser.name,
        phone: driverUser.phone,
        email: driverUser.email
      },
      serviceType: 'Car',
      pickupLocation: 'Biratnagar',
      dropLocation: 'Dharan',
      fare: 800,
      originalFare: 800,
      finalFare: 800,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Confirmed',
      travelDate: new Date()
    });
  });

  test('GET /api/bookings - Customer retrieves their own bookings with correct categories', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.all)).toBe(true);
    expect(res.body.data.all.length).toBeGreaterThan(0);
    expect(res.body.data.all.some(b => b.bookingId === customerBookingId)).toBe(true);
    expect(Array.isArray(res.body.data.upcoming)).toBe(true);
    expect(Array.isArray(res.body.data.completed)).toBe(true);
  });

  test('GET /api/bookings - Driver user who booked as passenger can view their own booking without 403', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.all)).toBe(true);
    expect(res.body.data.all.length).toBe(1);
    expect(res.body.data.all[0].serviceType).toBe('Car');
  });

  test('GET /api/bookings - Cross-customer isolation: Driver user never sees another customer booking', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    const driverBookingIds = res.body.data.all.map(b => b.bookingId);
    expect(driverBookingIds).not.toContain(customerBookingId);
  });
});
