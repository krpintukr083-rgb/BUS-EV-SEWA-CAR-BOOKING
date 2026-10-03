const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('../src/app');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');
const { connectTestDB, closeTestDB } = require('./setup');

describe('eSewa Payment Integration', () => {
  let customerToken;
  let testBooking;
  let testPaymentData;
  let testUser;
  const mockBookingId = 'BK-TEST-' + Date.now();

  beforeAll(async () => {
    await connectTestDB();
    testUser = await User.create({
      name: 'Test Customer',
      phone: '1234567890',
      email: 'testcustomer@example.com',
      password: 'password123',
      role: 'customer'
    });
    customerToken = jwt.sign({ id: testUser._id, role: 'customer' }, jwtConfig.secret || process.env.JWT_SECRET || 'testsecret', { expiresIn: '1d' });
    testBooking = await Booking.create({
      bookingId: mockBookingId,
      customer: { name: 'Test User', phone: '1234567890' },
      pickupLocation: 'A',
      dropLocation: 'B',
      fare: 1500,
      paymentStatus: 'Pending',
      bookingStatus: 'Pending'
    });
  });

  afterAll(async () => {
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await User.deleteMany({});
    await closeTestDB();
  });

  it('1-6. ESEWA payment request creation, signature generation, unique UUID, correct amount, no secret key exposed, booking NOT marked paid', async () => {
    const res = await request(app)
      .post('/api/payments/esewa/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: mockBookingId });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    testPaymentData = res.body.data;
    
    expect(testPaymentData.transaction_uuid).toBeDefined();
    expect(testPaymentData.total_amount).toBe(1500);
    expect(testPaymentData.signature).toBeDefined();
    expect(testPaymentData.secret_key).toBeUndefined(); // Important security check

    // Signature verification check (2. Correct signature generation)
    const message = `total_amount=1500,transaction_uuid=${testPaymentData.transaction_uuid},product_code=${testPaymentData.product_code}`;
    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    const expectedSignature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    expect(testPaymentData.signature).toBe(expectedSignature);

    // Verify booking NOT marked paid (6)
    const booking = await Booking.findOne({ bookingId: mockBookingId });
    expect(booking.paymentStatus).not.toBe('Paid');
    expect(booking.paymentStatus).not.toBe('Successful');
    expect(booking.paymentMethod).toBe('ESEWA');
  });

  it('10. Invalid transaction UUID rejected', async () => {
    const fakeData = {
      transaction_code: '123',
      status: 'COMPLETE',
      total_amount: 1500,
      transaction_uuid: 'wrong_uuid',
      product_code: 'EPAYTEST',
      signed_field_names: 'total_amount,transaction_uuid,product_code'
    };
    
    const message = `transaction_code=${fakeData.transaction_code},status=${fakeData.status},total_amount=${fakeData.total_amount},transaction_uuid=${fakeData.transaction_uuid},product_code=${fakeData.product_code},signed_field_names=${fakeData.signed_field_names}`;
    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    fakeData.signature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    
    const base64Data = Buffer.from(JSON.stringify(fakeData)).toString('base64');

    const res = await request(app)
      .post('/api/payments/esewa/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ data: base64Data });

    expect(res.statusCode).toBe(404);
  });

  it('9. Failed eSewa transaction -> booking NOT PAID', async () => {
    const fakeData = {
      transaction_code: '123',
      status: 'CANCELED',
      total_amount: 1500,
      transaction_uuid: testPaymentData.transaction_uuid,
      product_code: 'EPAYTEST',
      signed_field_names: 'total_amount,transaction_uuid,product_code'
    };
    
    const message = `transaction_code=${fakeData.transaction_code},status=${fakeData.status},total_amount=${fakeData.total_amount},transaction_uuid=${fakeData.transaction_uuid},product_code=${fakeData.product_code},signed_field_names=${fakeData.signed_field_names}`;
    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    fakeData.signature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    
    const base64Data = Buffer.from(JSON.stringify(fakeData)).toString('base64');

    const res = await request(app)
      .post('/api/payments/esewa/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ data: base64Data });

    expect(res.statusCode).toBe(400);
    const booking = await Booking.findOne({ bookingId: mockBookingId });
    expect(booking.paymentStatus).toBe('Pending');
  });

  it('7 & 8. Successful eSewa verification -> payment SUCCESS & booking PAID', async () => {
    const fakeData = {
      transaction_code: 'TXN-SUCCESS-123',
      status: 'COMPLETE',
      total_amount: 1500,
      transaction_uuid: testPaymentData.transaction_uuid,
      product_code: 'EPAYTEST',
      signed_field_names: 'total_amount,transaction_uuid,product_code'
    };
    
    const message = `transaction_code=${fakeData.transaction_code},status=${fakeData.status},total_amount=${fakeData.total_amount},transaction_uuid=${fakeData.transaction_uuid},product_code=${fakeData.product_code},signed_field_names=${fakeData.signed_field_names}`;
    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    fakeData.signature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    
    const base64Data = Buffer.from(JSON.stringify(fakeData)).toString('base64');

    const res = await request(app)
      .post('/api/payments/esewa/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ data: base64Data });

    expect(res.statusCode).toBe(200);
    
    const booking = await Booking.findOne({ bookingId: mockBookingId });
    expect(booking.paymentStatus).toBe('Paid');
    expect(booking.bookingStatus).toBe('Confirmed');

    const payment = await Payment.findOne({ booking: booking._id });
    expect(payment.paymentStatus).toBe('Paid');
    expect(payment.gatewayTransactionId).toBe('TXN-SUCCESS-123');
  });

  it('12. Duplicate callback/verification is idempotent', async () => {
    const fakeData = {
      transaction_code: 'TXN-SUCCESS-123',
      status: 'COMPLETE',
      total_amount: 1500,
      transaction_uuid: testPaymentData.transaction_uuid,
      product_code: 'EPAYTEST',
      signed_field_names: 'total_amount,transaction_uuid,product_code'
    };
    
    const message = `transaction_code=${fakeData.transaction_code},status=${fakeData.status},total_amount=${fakeData.total_amount},transaction_uuid=${fakeData.transaction_uuid},product_code=${fakeData.product_code},signed_field_names=${fakeData.signed_field_names}`;
    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    fakeData.signature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    
    const base64Data = Buffer.from(JSON.stringify(fakeData)).toString('base64');

    const res = await request(app)
      .post('/api/payments/esewa/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ data: base64Data });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('Payment already verified');
  });
});
