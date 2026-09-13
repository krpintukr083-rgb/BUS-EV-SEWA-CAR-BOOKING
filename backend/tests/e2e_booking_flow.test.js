const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Cancellation = require('../src/models/Cancellation');
const Insurance = require('../src/models/Insurance');
const Notification = require('../src/models/Notification');
const Support = require('../src/models/Support');
const Policy = require('../src/models/Policy');
const ServiceControl = require('../src/models/ServiceControl');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('7. End-to-End Complete Booking & Database Verification Suite', () => {
  let customerToken = '';
  let customerData = null;
  let testBus = null;
  let testEv = null;
  let testCar = null;

  // STEP 1: AUTHENTICATION
  test('E2E Step 1: Customer Login -> Retrieve Token & Profile', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'customer@test.com',
        password: 'password123',
        role: 'customer'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    customerToken = res.body.token;
    customerData = res.body.user;

    // Verify User in MongoDB
    const userInDb = await User.findById(customerData.id);
    expect(userInDb).toBeDefined();
    expect(userInDb.email).toBe('customer@test.com');
  });

  // STEP 2: BUS END-TO-END JOURNEY
  test('E2E Step 2: Bus Search -> Seat Selection -> Booking -> Payment Sandbox Success -> Ticket Verification', async () => {
    // 1. Search Buses
    const searchRes = await request(app).get('/api/vehicles?type=bus');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBeGreaterThan(0);
    testBus = searchRes.body.data[0];

    // 2. Bus Details with booked seats layout
    const detailRes = await request(app).get(`/api/vehicles/${testBus._id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data._id).toBe(testBus._id.toString());
    const existingBooked = detailRes.body.data.bookedSeats || [];

    // Choose an available seat
    const candidateSeats = ['L3', 'L4', 'U3', 'U4', 'L5', 'L6', 'U7', 'U8'];
    const chosenSeats = candidateSeats.filter(s => !existingBooked.includes(s)).slice(0, 2);

    // 3. Create Booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testBus._id,
        serviceType: 'Bus',
        pickupLocation: 'Kashmere Gate ISBT, Delhi',
        dropLocation: 'Sindhi Camp Bus Stand, Jaipur',
        passengerDetails: [
          { name: customerData.name, age: 29, gender: 'Male', seatNumber: chosenSeats[0] },
          { name: 'Co-Passenger', age: 26, gender: 'Female', seatNumber: chosenSeats[1] }
        ],
        selectedSeats: chosenSeats,
        fare: testBus.fareRate * chosenSeats.length,
        travelDate: new Date().toISOString()
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    const busBooking = bookingRes.body.data;
    expect(busBooking.bookingStatus).toBe('Pending');

    // 4. Sandbox Payment Test Success
    const payRes = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: busBooking.bookingId,
        paymentMethod: 'UPI'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.booking.bookingStatus).toBe('Confirmed');
    expect(payRes.body.data.payment.paymentStatus).toBe('Successful');

    // 5. Digital Ticket / Booking Details Verification
    const ticketRes = await request(app)
      .get(`/api/bookings/${busBooking.bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.success).toBe(true);
    expect(ticketRes.body.data.bookingStatus).toBe('Confirmed');
    expect(ticketRes.body.data.transactionReference).toBeDefined();

    // 6. Verify MongoDB persistence
    const bookingInDb = await Booking.findOne({ bookingId: busBooking.bookingId });
    expect(bookingInDb.bookingStatus).toBe('Confirmed');
    expect(bookingInDb.paymentStatus).toBe('Successful');

    const paymentInDb = await Payment.findOne({ booking: busBooking._id });
    expect(paymentInDb).toBeDefined();
    expect(paymentInDb.paymentStatus).toBe('Successful');

    const insuranceInDb = await Insurance.findOne({ booking: busBooking._id });
    expect(insuranceInDb).toBeDefined();
    expect(insuranceInDb.insuranceStatus).toBe('Active');
  });

  // STEP 3: EV-SEWA END-TO-END JOURNEY
  test('E2E Step 3: EV-Sewa Listing -> Booking -> Payment Success -> Confirmation', async () => {
    const evRes = await request(app).get('/api/vehicles?type=ev-sewa');
    expect(evRes.status).toBe(200);
    testEv = evRes.body.data[0];

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testEv._id,
        serviceType: 'EV-Sewa',
        pickupLocation: 'Green Metro Station',
        dropLocation: 'Tech Park Zone 2',
        passengerDetails: [{ name: customerData.name, age: 29, gender: 'Male' }],
        fare: testEv.fareRate
      });

    expect(bookingRes.status).toBe(201);
    const evBooking = bookingRes.body.data;

    const payRes = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: evBooking.bookingId,
        paymentMethod: 'Card'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.booking.bookingStatus).toBe('Confirmed');
  });

  // STEP 4: CAR END-TO-END JOURNEY
  test('E2E Step 4: Car Listing -> Booking -> Payment Success -> Confirmation', async () => {
    const carRes = await request(app).get('/api/vehicles?type=car');
    expect(carRes.status).toBe(200);
    testCar = carRes.body.data[0];

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testCar._id,
        serviceType: 'Car',
        pickupLocation: 'Indira Gandhi International Airport Terminal 3',
        dropLocation: 'Cyber City, Gurugram',
        passengerDetails: [{ name: customerData.name, age: 29, gender: 'Male' }],
        fare: testCar.fareRate
      });

    expect(bookingRes.status).toBe(201);
    const carBooking = bookingRes.body.data;

    const payRes = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: carBooking.bookingId,
        paymentMethod: 'NetBanking'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.booking.bookingStatus).toBe('Confirmed');
  });

  // STEP 5: PAYMENT FAILURE TEST
  test('E2E Step 5: Payment Sandbox Failure -> Booking NOT confirmed', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testCar._id,
        serviceType: 'Car',
        pickupLocation: 'Delhi',
        dropLocation: 'Noida',
        passengerDetails: [{ name: customerData.name, age: 29, gender: 'Male' }],
        fare: testCar.fareRate
      });

    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;

    const failPayRes = await request(app)
      .post('/api/payments/test-failure')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: booking.bookingId,
        failureReason: 'Insufficient test balance simulation'
      });

    expect(failPayRes.status).toBe(200);
    expect(failPayRes.body.success).toBe(false);

    // Verify Booking in MongoDB did NOT get confirmed
    const bookingInDb = await Booking.findById(booking._id);
    expect(bookingInDb.bookingStatus).toBe('Pending');
    expect(bookingInDb.paymentStatus).toBe('Failed');
  });

  // STEP 6: CANCELLATION & REFUND PIPELINE
  test('E2E Step 6: Cancel Booking -> Verify MongoDB Cancellation & Refund update', async () => {
    // 1. Create and confirm a booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testCar._id,
        serviceType: 'Car',
        pickupLocation: 'Origin Point',
        dropLocation: 'Destination Point',
        passengerDetails: [{ name: customerData.name, age: 29, gender: 'Male' }],
        fare: 850
      });

    const booking = bookingRes.body.data;
    await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: booking.bookingId });

    // 2. Cancel the booking
    const cancelRes = await request(app)
      .post(`/api/bookings/${booking.bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancellationReason: 'Urgent meeting schedule conflict' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.booking.bookingStatus).toBe('Cancelled');
    expect(cancelRes.body.data.refundAmount).toBe(850);

    // 3. Verify MongoDB state
    const cancelledBookingInDb = await Booking.findById(booking._id);
    expect(cancelledBookingInDb.bookingStatus).toBe('Cancelled');
    expect(cancelledBookingInDb.paymentStatus).toBe('Refunded');

    const cancellationDoc = await Cancellation.findOne({ booking: booking._id });
    expect(cancellationDoc).toBeDefined();
    expect(cancellationDoc.refundStatus).toBe('Processed');
    expect(cancellationDoc.refundAmount).toBe(850);
  });

  // STEP 7: INACTIVE SERVICE REJECTION
  test('E2E Step 7: Inactive Service -> Reject booking creation', async () => {
    await ServiceControl.findOneAndUpdate({}, { carService: 'Inactive' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testCar._id,
        serviceType: 'Car',
        pickupLocation: 'Delhi',
        dropLocation: 'Gurgaon',
        fare: 500
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inactive/i);

    await ServiceControl.findOneAndUpdate({}, { carService: 'Active' });
  });

  // STEP 8: COMPREHENSIVE DATABASE INTEGRATION VERIFICATION
  test('E2E Step 8: Comprehensive Database Collection Verification', async () => {
    const usersCount = await User.countDocuments();
    const vehiclesCount = await Vehicle.countDocuments();
    const bookingsCount = await Booking.countDocuments();
    const paymentsCount = await Payment.countDocuments();
    const cancellationsCount = await Cancellation.countDocuments();
    const insurancesCount = await Insurance.countDocuments();
    const notificationsCount = await Notification.countDocuments();
    const supportCount = await Support.countDocuments();
    const policiesCount = await Policy.countDocuments();

    expect(usersCount).toBeGreaterThan(0);
    expect(vehiclesCount).toBeGreaterThan(0);
    expect(bookingsCount).toBeGreaterThan(0);
    expect(paymentsCount).toBeGreaterThan(0);
    expect(cancellationsCount).toBeGreaterThan(0);
    expect(insurancesCount).toBeGreaterThan(0);
    expect(notificationsCount).toBeGreaterThan(0);
    expect(supportCount).toBeGreaterThan(0);
    expect(policiesCount).toBeGreaterThan(0);
  });
});
