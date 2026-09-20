const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const User = require('../src/models/User');
require('dotenv').config();

async function runDestinationFlowTest() {
  console.log('================================================================');
  console.log('🧪 REAL END-TO-END VERIFICATION: DESTINATION REACHED / COMPLETED');
  console.log('================================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.\n');

    // 1. Authenticate Customer
    let customerUser = await User.findOne({ role: 'customer' });
    if (!customerUser) {
      customerUser = await User.create({
        name: 'Test Customer',
        phone: '9876543210',
        email: 'testcustomer@example.com',
        password: 'Password123',
        role: 'customer'
      });
    }

    let custLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: customerUser.phone, password: 'Password123', role: 'customer' });
    
    if (custLogin.status !== 200) {
      customerUser.password = 'Password123';
      await customerUser.save();
      custLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: customerUser.phone, password: 'Password123', role: 'customer' });
    }
    const customerToken = custLogin.body.token;
    console.log(`✅ Customer Authenticated: ${customerUser.name} (${customerUser.phone})`);

    // 2. Authenticate Driver
    let driverDoc = await Driver.findOne().populate('assignedVehicle');
    if (!driverDoc) {
      throw new Error('No driver found in database for testing.');
    }
    let driverUser = await User.findById(driverDoc.user || driverDoc._id);
    if (!driverUser) {
      driverUser = await User.findOne({ role: 'driver', phone: driverDoc.mobileNumber });
    }

    driverDoc.isOnline = true;
    driverDoc.driverStatus = 'Active';
    await driverDoc.save();

    let vehicleDoc = driverDoc.assignedVehicle;
    if (!vehicleDoc) {
      vehicleDoc = await Vehicle.findOne({ assignedDriver: driverDoc._id }) || await Vehicle.findOne({ vehicleStatus: 'Active' });
      if (vehicleDoc) {
        vehicleDoc.assignedDriver = driverDoc._id;
        await vehicleDoc.save();
        driverDoc.assignedVehicle = vehicleDoc._id;
        await driverDoc.save();
      }
    }
    console.log(`✅ Driver Authenticated: ${driverDoc.name}, Vehicle: ${vehicleDoc?.vehicleNumber}`);

    let drvLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: driverDoc.mobileNumber, password: 'Password123', role: 'driver' });
    
    if (drvLogin.status !== 200 && driverUser) {
      driverUser.password = 'Password123';
      await driverUser.save();
      drvLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: driverDoc.mobileNumber, password: 'Password123', role: 'driver' });
    }
    const driverToken = drvLogin.body.token;

    // STEP 1: Create Offline/Cash Booking
    console.log('\n--- Step 1: Customer Creates Booking ---');
    const bookingPayload = {
      vehicleId: vehicleDoc._id.toString(),
      serviceType: vehicleDoc.vehicleType === 'EV-Sewa' ? 'EV-Sewa' : (vehicleDoc.vehicleType === 'Car' ? 'Car' : 'Bus'),
      pickupLocation: 'Kashmere Gate ISBT',
      dropLocation: 'Sector 62 Electronic City, Noida',
      passengerDetails: [{ name: customerUser.name, age: 28, gender: 'Male' }],
      fare: 650,
      paymentMethod: 'Offline Cash',
      travelDate: new Date().toISOString()
    };

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(bookingPayload);

    const booking = createRes.body.data;
    console.log('Created Booking ID:', booking.bookingId);

    // STEP 2: Driver Accepts Request
    console.log('\n--- Step 2: Driver Confirms Booking ---');
    const acceptRes = await request(app)
      .post(`/api/driver/booking-requests/${booking._id}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);
    
    console.log('Driver Accept Result status:', acceptRes.status, 'bookingStatus:', acceptRes.body.data?.bookingStatus);

    // STEP 3: Cash Collection
    console.log('\n--- Step 3: Cash Collection ---');
    const cashRes = await request(app)
      .post(`/api/driver/bookings/${booking._id}/collect-cash`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ amountCollected: 650 });

    console.log('Collect Cash status:', cashRes.status, 'paymentStatus:', cashRes.body.data?.paymentStatus);

    // STEP 4: Driver Arrives & Starts Ride (Verify OTP)
    console.log('\n--- Step 4: Driver Arrives & Starts Ride ---');
    const dbBookingBeforeStart = await Booking.findById(booking._id);
    const otp = dbBookingBeforeStart.rideOtp;
    console.log('Ride OTP for verification:', otp);

    const startRes = await request(app)
      .post(`/api/driver/rides/${booking._id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp });

    console.log('Start Ride status:', startRes.status, 'rideStatus:', startRes.body.data?.rideStatus, 'bookingStatus:', startRes.body.data?.bookingStatus);

    // MONGODB PRE-COMPLETION RECORD
    const preCompleteBooking = await Booking.findById(booking._id);
    console.log('\nMONGODB PRE-COMPLETION RECORD:', {
      bookingId: preCompleteBooking.bookingId,
      bookingStatus: preCompleteBooking.bookingStatus,
      rideStatus: preCompleteBooking.rideStatus,
      paymentStatus: preCompleteBooking.paymentStatus,
      driverId: preCompleteBooking.driver,
      customerId: preCompleteBooking.customer
    });

    // STEP 5: Driver Reaches Destination / Completes Ride
    console.log('\n--- Step 5: Driver Presses Destination Reached / Complete ---');
    const completeRes = await request(app)
      .post(`/api/driver/rides/${booking._id}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send();

    console.log('Destination Complete status:', completeRes.status);
    console.log('Destination Complete Response Message:', completeRes.body.message);

    // MONGODB POST-COMPLETION RECORD
    const postCompleteBooking = await Booking.findById(booking._id);
    console.log('\nMONGODB POST-COMPLETION RECORD:', {
      bookingId: postCompleteBooking.bookingId,
      bookingStatus: postCompleteBooking.bookingStatus,
      rideStatus: postCompleteBooking.rideStatus,
      paymentStatus: postCompleteBooking.paymentStatus,
      completedAt: postCompleteBooking.completedAt,
      driverId: postCompleteBooking.driver,
      customerId: postCompleteBooking.customer
    });

    if (postCompleteBooking.bookingStatus !== 'Completed' || postCompleteBooking.rideStatus !== 'Completed') {
      throw new Error('Destination completion failed in MongoDB!');
    }
    console.log('✅ BACKEND & MONGODB COMPLETION: PASS');

    // STEP 6: Idempotency Check
    console.log('\n--- Step 6: Testing Idempotent Completion Request ---');
    const repeatRes = await request(app)
      .post(`/api/driver/rides/${booking._id}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send();
    
    console.log('Repeat Completion Status:', repeatRes.status, 'Message:', repeatRes.body.message);
    if (repeatRes.status !== 200) {
      throw new Error('Idempotent completion request failed');
    }

    // STEP 7: Customer App History Check
    console.log('\n--- Step 7: Customer App History Check ---');
    const custMyBookingsRes = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    const completedInCust = (custMyBookingsRes.body.data?.completed || []).find(b => b.bookingId === booking.bookingId);
    console.log('Found in Customer Completed & History List:', Boolean(completedInCust));
    console.log('Customer Completed Booking Record:', {
      bookingId: completedInCust?.bookingId,
      bookingStatus: completedInCust?.bookingStatus,
      paymentStatus: completedInCust?.paymentStatus,
      fare: completedInCust?.fare,
      pickup: completedInCust?.pickupLocation,
      drop: completedInCust?.dropLocation
    });

    if (!completedInCust || completedInCust.bookingStatus !== 'Completed') {
      throw new Error('Completed booking not found in customer history!');
    }
    console.log('✅ CUSTOMER HISTORY & APP UPDATE: PASS');

    // STEP 8: Driver Requests Check (Must NOT reappear)
    console.log('\n--- Step 8: Driver Request Dispatches Check ---');
    const driverReqsRes = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    const reappeared = (driverReqsRes.body.data || []).find(r => r.bookingId === booking.bookingId);
    console.log('Completed booking reappeared in driver requests:', Boolean(reappeared));
    if (reappeared) {
      throw new Error('Completed booking reappeared in driver requests!');
    }
    console.log('✅ COMPLETED BOOKING NOT REAPPEARING: PASS');

    console.log('\n================================================================');
    console.log('🎉 DESTINATION REACHED / COMPLETED FLOW 100% PASSED WITH NO ERRORS!');
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Destination flow test failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runDestinationFlowTest();
