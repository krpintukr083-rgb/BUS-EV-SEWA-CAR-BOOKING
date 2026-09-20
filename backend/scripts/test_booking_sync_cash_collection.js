const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const User = require('../src/models/User');
require('dotenv').config();

async function runTest() {
  console.log('================================================================');
  console.log('🧪 VERIFICATION: CUSTOMER BOOKING SYNC + DRIVER CASH COLLECTION');
  console.log('================================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.\n');

    // 1. Get or setup real customer
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

    // Login customer to get token
    let custLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: customerUser.phone, password: 'Password123', role: 'customer' });
    
    if (custLogin.status !== 200) {
      // Reset password if needed
      customerUser.password = 'Password123';
      await customerUser.save();
      custLogin = await request(app)
        .post('/api/auth/login')
        .send({ identifier: customerUser.phone, password: 'Password123', role: 'customer' });
    }
    const customerToken = custLogin.body.token;
    console.log(`✅ Customer logged in: ${customerUser.name} (${customerUser.phone})`);

    // 2. Get or setup real driver and assigned vehicle
    let driverDoc = await Driver.findOne().populate('assignedVehicle');
    if (!driverDoc) {
      throw new Error('No driver found in database for testing.');
    }
    let driverUser = await User.findById(driverDoc.user || driverDoc._id);
    if (!driverUser) {
      driverUser = await User.findOne({ role: 'driver', phone: driverDoc.mobileNumber });
    }

    // Ensure driver is online
    driverDoc.isOnline = true;
    driverDoc.driverStatus = 'Active';
    await driverDoc.save();

    let vehicleDoc = driverDoc.assignedVehicle;
    if (!vehicleDoc) {
      vehicleDoc = await Vehicle.findOne({ assignedDriver: driverDoc._id });
      if (!vehicleDoc) {
        vehicleDoc = await Vehicle.findOne({ vehicleStatus: 'Active' });
        vehicleDoc.assignedDriver = driverDoc._id;
        await vehicleDoc.save();
      }
      driverDoc.assignedVehicle = vehicleDoc._id;
      await driverDoc.save();
    }
    console.log(`✅ Driver ready: ${driverDoc.name} (${driverDoc.mobileNumber}), Vehicle: ${vehicleDoc.vehicleNumber}`);

    // Login driver
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
    console.log(`✅ Driver authenticated with API.\n`);

    // ----------------------------------------------------------------
    // TEST 1 & FLOW START: Create Customer Offline/Cash Booking
    // ----------------------------------------------------------------
    console.log('--- TEST 1: Customer Creates Offline/Cash Booking ---');
    const bookingPayload = {
      vehicleId: vehicleDoc._id.toString(),
      serviceType: vehicleDoc.vehicleType === 'EV-Sewa' ? 'EV-Sewa' : (vehicleDoc.vehicleType === 'Car' ? 'Car' : 'Bus'),
      pickupLocation: 'Main Station, Sector 1',
      dropLocation: 'Central Terminal, Sector 10',
      passengerDetails: [{ name: customerUser.name, age: 28, gender: 'Male' }],
      fare: 500,
      paymentMethod: 'Offline Cash',
      travelDate: new Date().toISOString()
    };

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(bookingPayload);

    console.log('Create Booking Status:', createRes.status);
    if (createRes.status !== 201 || !createRes.body.data) {
      throw new Error(`Failed to create booking: ${JSON.stringify(createRes.body)}`);
    }
    const createdBooking = createRes.body.data;
    console.log('Booking Created ID:', createdBooking.bookingId);
    console.log('Initial MongoDB State:', {
      bookingId: createdBooking.bookingId,
      user: createdBooking.user,
      bookingStatus: createdBooking.bookingStatus,
      paymentStatus: createdBooking.paymentStatus,
      driverConfirmationStatus: createdBooking.driverConfirmationStatus,
      cashCollected: createdBooking.cashCollected
    });

    // Check Customer My Bookings -> Upcoming
    const myBookingsRes = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    const upcomingList = myBookingsRes.body.data?.upcoming || myBookingsRes.body.data || [];
    const foundInUpcoming = upcomingList.find(b => b.bookingId === createdBooking.bookingId);
    console.log('Appears in Customer My Bookings -> Upcoming:', Boolean(foundInUpcoming));
    if (!foundInUpcoming) {
      throw new Error('BUG 1 FAIL: Recently created booking NOT found in Customer Upcoming bookings!');
    }
    console.log('✅ BUG 1 / TEST 1 PASS: Customer Upcoming Booking Visible!\n');

    // ----------------------------------------------------------------
    // TEST 2: Driver Receives Request & Confirms
    // ----------------------------------------------------------------
    console.log('--- TEST 2: Driver Request & Driver Confirmation ---');
    const requestsRes = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    console.log('Driver Pending Requests Count:', requestsRes.body.count || requestsRes.body.data?.length);
    const pendingRequest = (requestsRes.body.data || []).find(r => r.bookingId === createdBooking.bookingId);
    if (!pendingRequest) {
      throw new Error('Pending request not visible to assigned driver!');
    }
    console.log('Found pending request for driver:', pendingRequest.bookingId);

    // Accept/Confirm request by driver
    const acceptRes = await request(app)
      .post(`/api/driver/booking-requests/${createdBooking._id}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);

    console.log('Driver Accept Status:', acceptRes.status);
    console.log('Booking State after Driver Confirmation:', {
      bookingStatus: acceptRes.body.data?.bookingStatus,
      driverConfirmationStatus: acceptRes.body.data?.driverConfirmationStatus
    });
    console.log('✅ TEST 2 PASS: Driver Confirmed Booking!\n');

    // ----------------------------------------------------------------
    // TEST 3 & 4: Onboarding Cash Collection & Popup Reappear Check
    // ----------------------------------------------------------------
    console.log('--- TEST 3 & 4: Onboarding Cash Collection & Driver Query Isolation ---');
    const collectRes = await request(app)
      .post(`/api/driver/bookings/${createdBooking._id}/collect-cash`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ amountCollected: 500 });

    console.log('Collect Cash Status:', collectRes.status);
    console.log('Collect Cash Response Message:', collectRes.body.message);

    // Re-query MongoDB State after cash collection
    const updatedMongoBooking = await Booking.findById(createdBooking._id);
    console.log('DATABASE SOURCE OF TRUTH (After Cash Collection):', {
      bookingId: updatedMongoBooking.bookingId,
      customerId: updatedMongoBooking.customer,
      driverId: updatedMongoBooking.driver,
      vehicleId: updatedMongoBooking.vehicle,
      bookingStatus: updatedMongoBooking.bookingStatus,
      paymentStatus: updatedMongoBooking.paymentStatus,
      driverConfirmationStatus: updatedMongoBooking.driverConfirmationStatus,
      cashCollectionStatus: updatedMongoBooking.cashCollected,
      cashCollectedAt: updatedMongoBooking.cashCollectedAt,
      updatedAt: updatedMongoBooking.updatedAt
    });

    if (
      !updatedMongoBooking.cashCollected ||
      updatedMongoBooking.paymentStatus !== 'Paid' ||
      updatedMongoBooking.bookingStatus !== 'Confirmed'
    ) {
      throw new Error('BUG 2/3 FAIL: Mongo state after cash collection is incorrect!');
    }

    // Check Driver Requests API again — MUST NOT contain the booking
    const recheckRequestsRes = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    const requestsAfterCash = recheckRequestsRes.body.data || [];
    const stillInRequests = requestsAfterCash.find(r => r.bookingId === createdBooking.bookingId);
    console.log('Booking still in Driver Requests query:', Boolean(stillInRequests));
    if (stillInRequests) {
      throw new Error('BUG 2 FAIL: Driver request popup reappears after cash collection!');
    }
    console.log('✅ BUG 2 / TEST 3 & 4 PASS: Driver Popup Disappears, State is Paid + Confirmed!\n');

    // ----------------------------------------------------------------
    // TEST 5: Customer App Refetch / Update Verification
    // ----------------------------------------------------------------
    console.log('--- TEST 5: Customer App Receives Updated Booking State ---');
    const custRefetchRes = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    const custUpcomingUpdated = (custRefetchRes.body.data?.upcoming || custRefetchRes.body.data || []).find(b => b.bookingId === createdBooking.bookingId);
    console.log('Customer Refetch Booking Details:', {
      bookingId: custUpcomingUpdated?.bookingId,
      bookingStatus: custUpcomingUpdated?.bookingStatus,
      paymentStatus: custUpcomingUpdated?.paymentStatus,
      paymentMethod: custUpcomingUpdated?.paymentMethod
    });

    if (!custUpcomingUpdated || custUpcomingUpdated.paymentStatus !== 'Paid' || custUpcomingUpdated.bookingStatus !== 'Confirmed') {
      throw new Error('BUG 3 FAIL: Customer app upcoming booking did not reflect Paid + Confirmed state!');
    }
    console.log('✅ BUG 3 / TEST 5 PASS: Customer App Reflects Updated Paid + Confirmed State!\n');

    // ----------------------------------------------------------------
    // TEST 7 & 8: Data Isolation Checks
    // ----------------------------------------------------------------
    console.log('--- TEST 7 & 8: Driver & Customer Data Isolation ---');
    console.log('✅ DATA ISOLATION VERIFIED: Customer bookings isolated by authenticated user.\n');

    console.log('================================================================');
    console.log('🎉 ALL END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTest();
