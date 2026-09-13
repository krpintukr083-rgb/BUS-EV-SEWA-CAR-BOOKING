const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Insurance = require('../src/models/Insurance');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('4. Payment Sandbox Pipeline Tests', () => {
  let customerUser;
  let customerToken;
  let testBookingSuccess;
  let testBookingFailure;
  let sampleVehicle;

  beforeAll(async () => {
    customerUser = await User.findOne({ role: 'customer', status: 'Active' });
    customerToken = jwt.sign({ id: customerUser._id, role: customerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    sampleVehicle = await Vehicle.findOne({ vehicleStatus: 'Active' });

    // Create booking for success test
    testBookingSuccess = await Booking.create({
      bookingId: `BK-TEST-SUCC-${Date.now().toString().slice(-4)}`,
      customer: { name: customerUser.name, phone: customerUser.phone, email: customerUser.email },
      vehicle: sampleVehicle._id,
      serviceType: sampleVehicle.vehicleType,
      pickupLocation: 'Pickup Point A',
      dropLocation: 'Drop Point B',
      passengerDetails: [{ name: customerUser.name, age: 25, gender: 'Male' }],
      fare: 1200,
      paymentStatus: 'Pending',
      bookingStatus: 'Pending'
    });

    // Create booking for failure test
    testBookingFailure = await Booking.create({
      bookingId: `BK-TEST-FAIL-${Date.now().toString().slice(-4)}`,
      customer: { name: customerUser.name, phone: customerUser.phone, email: customerUser.email },
      vehicle: sampleVehicle._id,
      serviceType: sampleVehicle.vehicleType,
      pickupLocation: 'Pickup Point A',
      dropLocation: 'Drop Point B',
      passengerDetails: [{ name: customerUser.name, age: 25, gender: 'Male' }],
      fare: 1200,
      paymentStatus: 'Pending',
      bookingStatus: 'Pending'
    });
  });

  afterAll(async () => {
    if (testBookingSuccess) {
      await Booking.deleteOne({ _id: testBookingSuccess._id });
      await Payment.deleteOne({ booking: testBookingSuccess._id });
      await Insurance.deleteOne({ booking: testBookingSuccess._id });
    }
    if (testBookingFailure) {
      await Booking.deleteOne({ _id: testBookingFailure._id });
      await Payment.deleteOne({ booking: testBookingFailure._id });
    }
  });

  test('POST /api/payments/create - Initialize pending payment session', async () => {
    const res = await request(app)
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingSuccess.bookingId,
        paymentMethod: 'UPI'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentStatus).toBe('Pending');
    expect(res.body.data.bookingId).toBe(testBookingSuccess.bookingId);
  });

  test('POST /api/payments/test-success - Process successful sandbox payment and confirm booking', async () => {
    const res = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingSuccess.bookingId,
        paymentMethod: 'UPI'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.paymentStatus).toBe('Successful');
    expect(res.body.data.booking.bookingStatus).toBe('Confirmed');
    expect(res.body.data.transactionId).toBeDefined();

    // Verify MongoDB Booking state
    const updatedBooking = await Booking.findById(testBookingSuccess._id);
    expect(updatedBooking.bookingStatus).toBe('Confirmed');
    expect(updatedBooking.paymentStatus).toBe('Successful');

    // Verify Insurance document was created
    const insurance = await Insurance.findOne({ booking: testBookingSuccess._id });
    expect(insurance).toBeDefined();
    expect(insurance.insuranceStatus).toBe('Active');
  });

  test('POST /api/payments/test-failure - Process failed sandbox payment without confirming booking', async () => {
    const res = await request(app)
      .post('/api/payments/test-failure')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingFailure.bookingId,
        failureReason: 'Card issuer decline'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.data.payment.paymentStatus).toBe('Failed');

    // Verify MongoDB Booking remains Pending (NOT Confirmed)
    const booking = await Booking.findById(testBookingFailure._id);
    expect(booking.bookingStatus).toBe('Pending');
    expect(booking.paymentStatus).toBe('Failed');
  });

  test('GET /api/payments/:bookingId - Retrieve payment details by bookingId', async () => {
    const res = await request(app)
      .get(`/api/payments/${testBookingSuccess.bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingId).toBe(testBookingSuccess.bookingId);
    expect(res.body.data.paymentStatus).toBe('Successful');
  });
});
