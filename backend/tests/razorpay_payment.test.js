const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Vehicle = require('../src/models/Vehicle');
require('dotenv').config();

describe('RAZORPAY TEST PAYMENT INTEGRATION SUITE', () => {
  let customerToken = '';
  let customerData = null;
  let testVehicle = null;
  let testBooking = null;
  let razorpayOrderData = null;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'sD8wUaPjGz9x7qK3mN1vB4rE';
  const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_test_secret_key_2026';

  beforeAll(async () => {
    await connectTestDB();

    // Authenticate Customer
    const authRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'customer@test.com',
        password: 'password123',
        role: 'customer'
      });

    customerToken = authRes.body.token;
    customerData = authRes.body.user;

    // Fetch Active Vehicle
    const vehicleRes = await request(app).get('/api/vehicles?type=ev-sewa');
    testVehicle = vehicleRes.body.data[0];
  });

  afterAll(async () => {
    if (testBooking) {
      await Payment.deleteMany({ booking: testBooking._id });
      await Booking.deleteOne({ _id: testBooking._id });
    }
    await closeTestDB();
  });

  // 1. Create Booking
  test('Step 1: Create Initial Booking in Pending State', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicle._id,
        serviceType: testVehicle.vehicleType,
        pickupLocation: testVehicle.pickupDropDetails?.pickupLocation || 'Delhi Station',
        dropLocation: testVehicle.pickupDropDetails?.dropLocation || 'Noida Hub',
        passengerDetails: [{ name: customerData.name, age: 28, gender: 'Male' }],
        fare: testVehicle.fareRate
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    testBooking = bookingRes.body.data;
    expect(testBooking.bookingStatus).toBe('Pending');
    expect(testBooking.paymentStatus).toBe('Pending');
  });

  // 2. Create Razorpay Test Order
  test('Step 2: POST /api/payments/razorpay/create-order - Server-Side Order Generation', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: testBooking.bookingId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();
    expect(res.body.data.amount).toBe(Math.round(testBooking.fare * 100));
    expect(res.body.data.currency).toBe('INR');
    expect(res.body.data.keyId).toBeDefined();

    // Security Check: Ensure Secret is NEVER exposed to client
    expect(res.body.data.keySecret).toBeUndefined();
    expect(res.body.data.webhookSecret).toBeUndefined();

    razorpayOrderData = res.body.data;

    // Verify Payment record in DB
    const paymentInDb = await Payment.findOne({ booking: testBooking._id });
    expect(paymentInDb).toBeDefined();
    expect(paymentInDb.paymentStatus).toBe('Pending');
    expect(paymentInDb.razorpayOrderId).toBe(razorpayOrderData.orderId);
  });

  // 3. Server-Side HMAC SHA-256 Signature Verification (Success)
  test('Step 3: POST /api/payments/razorpay/verify-payment - Valid Signature -> Booking Confirmed', async () => {
    const razorpayPaymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bodyToSign = `${razorpayOrderData.orderId}|${razorpayPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', key_secret)
      .update(bodyToSign)
      .digest('hex');

    const verifyRes = await request(app)
      .post('/api/payments/razorpay/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBooking.bookingId,
        razorpayOrderId: razorpayOrderData.orderId,
        razorpayPaymentId,
        razorpaySignature: validSignature
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.booking.bookingStatus).toBe('Confirmed');
    expect(verifyRes.body.data.booking.paymentStatus).toBe('Successful');

    // Verify in MongoDB
    const updatedBooking = await Booking.findById(testBooking._id);
    expect(updatedBooking.bookingStatus).toBe('Confirmed');
    expect(updatedBooking.paymentStatus).toBe('Successful');

    const updatedPayment = await Payment.findOne({ booking: testBooking._id });
    expect(updatedPayment.paymentStatus).toBe('Successful');
    expect(updatedPayment.razorpayPaymentId).toBe(razorpayPaymentId);
    expect(updatedPayment.razorpaySignature).toBe(validSignature);
  });

  // 4. Duplicate Protection
  test('Step 4: Duplicate Callback Protection - Repeated Verification returns existing confirmation without error', async () => {
    const existingPayment = await Payment.findOne({ booking: testBooking._id });

    const duplicateRes = await request(app)
      .post('/api/payments/razorpay/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBooking.bookingId,
        razorpayOrderId: existingPayment.razorpayOrderId,
        razorpayPaymentId: existingPayment.razorpayPaymentId,
        razorpaySignature: existingPayment.razorpaySignature
      });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.success).toBe(true);
    expect(duplicateRes.body.data.duplicateIgnored).toBe(true);

    const paymentCount = await Payment.countDocuments({ booking: testBooking._id });
    expect(paymentCount).toBe(1);
  });

  // 5. Test Failure & Tampered Signature Rejection
  test('Step 5: Invalid/Tampered Signature Rejection - Booking NOT Confirmed', async () => {
    // Create second booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicle._id,
        serviceType: testVehicle.vehicleType,
        pickupLocation: 'Terminal A',
        dropLocation: 'Terminal B',
        passengerDetails: [{ name: 'Test User', age: 30, gender: 'Male' }],
        fare: testVehicle.fareRate
      });

    const secondBooking = bookingRes.body.data;

    const fakeOrderId = 'order_fake_123456';
    const fakePaymentId = 'pay_fake_999888';
    const tamperedSignature = 'tampered_invalid_signature_hex_1234567890';

    const failVerifyRes = await request(app)
      .post('/api/payments/razorpay/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: secondBooking.bookingId,
        razorpayOrderId: fakeOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: tamperedSignature
      });

    expect(failVerifyRes.status).toBe(400);
    expect(failVerifyRes.body.success).toBe(false);

    // Verify booking is NOT marked Confirmed or Paid
    const bookingCheck = await Booking.findById(secondBooking._id);
    expect(bookingCheck.bookingStatus).toBe('Pending');
    expect(bookingCheck.paymentStatus).toBe('Failed');

    // Clean up second booking
    await Payment.deleteMany({ booking: secondBooking._id });
    await Booking.deleteOne({ _id: secondBooking._id });
  });

  // 6. Test Record Failure Handler
  test('Step 6: POST /api/payments/razorpay/record-failure - Correct Failure Logging', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicle._id,
        serviceType: testVehicle.vehicleType,
        pickupLocation: 'Origin X',
        dropLocation: 'Dest Y',
        passengerDetails: [{ name: 'Test User 2', age: 32, gender: 'Male' }],
        fare: testVehicle.fareRate
      });

    const thirdBooking = bookingRes.body.data;

    const failRes = await request(app)
      .post('/api/payments/razorpay/record-failure')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: thirdBooking.bookingId,
        razorpayOrderId: 'order_test_fail_777',
        error: { description: 'Bank server timeout (Test simulation)' }
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.success).toBe(false);

    const bookingInDb = await Booking.findById(thirdBooking._id);
    expect(bookingInDb.bookingStatus).toBe('Pending');
    expect(bookingInDb.paymentStatus).toBe('Failed');

    // Clean up third booking
    await Payment.deleteMany({ booking: thirdBooking._id });
    await Booking.deleteOne({ _id: thirdBooking._id });
  });

  // 7. Webhook Signature Verification
  test('Step 7: POST /api/payments/razorpay/webhook - Valid Webhook Signature Processing', async () => {
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_wh_test_123456',
            order_id: razorpayOrderData.orderId,
            amount: razorpayOrderData.amount,
            status: 'captured'
          }
        }
      }
    };

    const payloadString = JSON.stringify(webhookPayload);
    const webhookSignature = crypto
      .createHmac('sha256', webhook_secret)
      .update(payloadString)
      .digest('hex');

    const webhookRes = await request(app)
      .post('/api/payments/razorpay/webhook')
      .set('x-razorpay-signature', webhookSignature)
      .send(webhookPayload);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.status).toBe('ok');
  });

  // 8. My Bookings / Ticket Verification
  test('Step 8: Verified Confirmed Booking Appears in Customer My Bookings List', async () => {
    const myBookingsRes = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(myBookingsRes.status).toBe(200);
    expect(myBookingsRes.body.success).toBe(true);

    const allBookings = Array.isArray(myBookingsRes.body.data)
      ? myBookingsRes.body.data
      : myBookingsRes.body.data.all || [];

    const foundBooking = allBookings.find(
      (b) => b.bookingId === testBooking.bookingId || b._id === testBooking._id
    );
    expect(foundBooking).toBeDefined();
    expect(foundBooking.bookingStatus).toBe('Confirmed');
    expect(foundBooking.paymentStatus).toBe('Successful');
  });
});
