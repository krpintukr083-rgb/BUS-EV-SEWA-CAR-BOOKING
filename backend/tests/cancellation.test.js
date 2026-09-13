const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Cancellation = require('../src/models/Cancellation');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('5. Cancellation & Refund Pipeline Tests', () => {
  let customerUser;
  let otherCustomerUser;
  let customerToken;
  let otherCustomerToken;
  let bookingToCancel;
  let sampleVehicle;

  beforeAll(async () => {
    customerUser = await User.findOne({ role: 'customer', status: 'Active' });
    customerToken = jwt.sign({ id: customerUser._id, role: customerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    otherCustomerUser = await User.create({
      name: 'Unauthorized User',
      email: `unauth_${Date.now()}@autotest.com`,
      phone: `+9196${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    otherCustomerToken = jwt.sign({ id: otherCustomerUser._id, role: otherCustomerUser.role }, jwtConfig.secret, { expiresIn: '1h' });

    sampleVehicle = await Vehicle.findOne({ vehicleStatus: 'Active' });

    bookingToCancel = await Booking.create({
      bookingId: `BK-TEST-CAN-${Date.now().toString().slice(-4)}`,
      customer: { name: customerUser.name, phone: customerUser.phone, email: customerUser.email },
      vehicle: sampleVehicle._id,
      serviceType: sampleVehicle.vehicleType,
      pickupLocation: 'Pickup A',
      dropLocation: 'Drop B',
      passengerDetails: [{ name: customerUser.name, age: 30, gender: 'Male' }],
      fare: 1500,
      paymentStatus: 'Successful',
      bookingStatus: 'Confirmed'
    });

    await Payment.create({
      booking: bookingToCancel._id,
      bookingId: bookingToCancel.bookingId,
      customer: { name: customerUser.name, phone: customerUser.phone },
      bookingAmount: 1500,
      paymentStatus: 'Successful',
      transactionReference: `TXN-CAN-${Date.now()}`
    });
  });

  afterAll(async () => {
    if (bookingToCancel) {
      await Booking.deleteOne({ _id: bookingToCancel._id });
      await Payment.deleteOne({ booking: bookingToCancel._id });
      await Cancellation.deleteOne({ booking: bookingToCancel._id });
    }
    if (otherCustomerUser) {
      await User.deleteOne({ _id: otherCustomerUser._id });
    }
  });

  test('POST /api/bookings/:id/cancel - Prevent unauthorized customer from cancelling someone else\'s booking', async () => {
    const res = await request(app)
      .post(`/api/bookings/${bookingToCancel.bookingId}/cancel`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ cancellationReason: 'Malicious attempt' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/bookings/:id/cancel - Successfully cancel booking, process refund, and store Cancellation in MongoDB', async () => {
    const res = await request(app)
      .post(`/api/bookings/${bookingToCancel.bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancellationReason: 'Change in personal travel plans' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.bookingStatus).toBe('Cancelled');
    expect(res.body.data.refundAmount).toBe(1500);

    // Verify MongoDB Booking state
    const updatedBooking = await Booking.findById(bookingToCancel._id);
    expect(updatedBooking.bookingStatus).toBe('Cancelled');
    expect(updatedBooking.paymentStatus).toBe('Refunded');

    // Verify Cancellation document created in MongoDB
    const cancellation = await Cancellation.findOne({ booking: bookingToCancel._id });
    expect(cancellation).toBeDefined();
    expect(cancellation.refundStatus).toBe('Processed');
    expect(cancellation.refundAmount).toBe(1500);

    // Verify Payment document updated in MongoDB
    const payment = await Payment.findOne({ booking: bookingToCancel._id });
    expect(payment.paymentStatus).toBe('Refunded');
    expect(payment.refundAmount).toBe(1500);
  });

  test('POST /api/bookings/:id/cancel - Reject cancellation of already cancelled booking', async () => {
    const res = await request(app)
      .post(`/api/bookings/${bookingToCancel.bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancellationReason: 'Repeated cancellation request' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already cancelled/i);
  });
});
