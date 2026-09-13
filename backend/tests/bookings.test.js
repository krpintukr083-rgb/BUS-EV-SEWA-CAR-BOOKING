const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const ServiceControl = require('../src/models/ServiceControl');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('3. Booking API & Validation Tests', () => {
  let customerUser;
  let otherCustomerUser;
  let customerToken;
  let otherCustomerToken;
  let activeBus;
  let activeEv;
  let activeCar;
  let inactiveVehicle;
  let createdBookingId = '';

  beforeAll(async () => {
    // Find or create test customer
    customerUser = await User.findOne({ role: 'customer', status: 'Active' });
    if (!customerUser) {
      customerUser = await User.create({
        name: 'Booking Tester',
        email: `tester_${Date.now()}@autotest.com`,
        phone: `+9198${Date.now().toString().slice(-8)}`,
        password: 'password123',
        role: 'customer',
        status: 'Active'
      });
    }
    customerToken = jwt.sign({ id: customerUser._id, role: customerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    // Another customer for unauthorized check
    otherCustomerUser = await User.create({
      name: 'Other Customer',
      email: `other_${Date.now()}@autotest.com`,
      phone: `+9197${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    otherCustomerToken = jwt.sign({ id: otherCustomerUser._id, role: otherCustomerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    // Get vehicles
    activeBus = await Vehicle.findOne({ vehicleType: 'Bus', vehicleStatus: 'Active' });
    activeEv = await Vehicle.findOne({ vehicleType: 'EV-Sewa', vehicleStatus: 'Active' });
    activeCar = await Vehicle.findOne({ vehicleType: 'Car', vehicleStatus: 'Active' });

    // Create inactive vehicle for rejection test
    inactiveVehicle = await Vehicle.create({
      vehicleNumber: `TEST-INACT-${Date.now().toString().slice(-4)}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Standard Non-AC',
      vehicleModel: 'Ashok Leyland 42',
      vehicleName: 'Inactive Test Bus',
      seatingCapacity: 40,
      ownerName: 'Test Owner',
      ownerMobileNumber: '+919999988888',
      vehicleStatus: 'Inactive',
      rcNumber: 'RC-INACT-001',
      insurancePolicyNumber: 'INS-INACT-001',
      insuranceExpiryDetails: '2026-12-31',
      fareRate: 500,
      route: { origin: 'City A', destination: 'City B' }
    });
  });

  afterAll(async () => {
    if (inactiveVehicle) {
      await Vehicle.deleteOne({ _id: inactiveVehicle._id });
    }
    if (otherCustomerUser) {
      await User.deleteOne({ _id: otherCustomerUser._id });
    }
  });

  const seat1 = 'ST_' + Date.now().toString().slice(-4) + '_A';
  const seat2 = 'ST_' + Date.now().toString().slice(-4) + '_B';

  test('POST /api/bookings - Successfully create a Bus booking with selected seats', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: activeBus._id,
        serviceType: 'Bus',
        pickupLocation: 'Kashmere Gate ISBT, Delhi',
        dropLocation: 'Sindhi Camp Bus Stand, Jaipur',
        passengerDetails: [
          { name: customerUser.name, age: 30, gender: 'Male', seatNumber: seat1 },
          { name: 'Traveler Two', age: 28, gender: 'Female', seatNumber: seat2 }
        ],
        selectedSeats: [seat1, seat2],
        fare: activeBus.fareRate * 2,
        travelDate: new Date().toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingId).toBeDefined();
    expect(res.body.data.busSeatNumbers).toEqual([seat1, seat2]);
    expect(res.body.data.bookingStatus).toBe('Pending');
    expect(res.body.data.paymentStatus).toBe('Pending');
    createdBookingId = res.body.data.bookingId;
  });

  test('POST /api/bookings - Reject double booking of same seats on backend (Seat Collision Prevention)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: activeBus._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur',
        passengerDetails: [{ name: 'Conflicting User', age: 25, gender: 'Male', seatNumber: seat1 }],
        selectedSeats: [seat1], // Already booked in previous test
        fare: activeBus.fareRate,
        travelDate: new Date().toISOString()
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already booked/i);
  });

  test('POST /api/bookings - Reject booking on inactive vehicle', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: inactiveVehicle._id,
        serviceType: 'Bus',
        pickupLocation: 'City A',
        dropLocation: 'City B',
        fare: 500
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inactive/i);
  });

  test('POST /api/bookings - Reject booking when service is temporarily inactive', async () => {
    // Temporarily deactivate Bus service in ServiceControl
    await ServiceControl.findOneAndUpdate({}, { busService: 'Inactive' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: activeBus._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur',
        selectedSeats: ['U5'],
        fare: activeBus.fareRate
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inactive/i);

    // Restore active service
    await ServiceControl.findOneAndUpdate({}, { busService: 'Active' });
  });

  test('GET /api/bookings - Retrieve customer bookings list', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.all).toBeDefined();
    expect(res.body.data.upcoming).toBeDefined();
    expect(res.body.data.completed).toBeDefined();
  });

  test('GET /api/bookings/:id - Retrieve single booking details', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingId).toBe(createdBookingId);
  });

  test('GET /api/bookings/:id - Deny unauthorized customer from accessing another customer booking', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied/i);
  });
});
