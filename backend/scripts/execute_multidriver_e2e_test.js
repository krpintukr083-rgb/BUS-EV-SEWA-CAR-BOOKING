const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Notification = require('../src/models/Notification');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');

const API_BASE = 'http://localhost:5000/api';
const KNOWN_PASSWORD = 'Password123';

const DRIVERS_TO_TEST = [
  { key: 'Driver 1 (Eligible)', phone: '6504992804', expected: true, reason: 'Kathmandu -> Birgunj, Car' },
  { key: 'Driver 2 (Eligible)', phone: '9802056362', expected: true, reason: 'Kathmandu -> Birgunj, Car' },
  { key: 'Driver 3 (Eligible)', phone: '9829260506', expected: true, reason: 'Kathmandu -> Birgunj, Car' },
  { key: 'Opposite Driver (Control)', phone: '9845551720', expected: false, reason: 'Birgunj -> Kathmandu, Car (Opposite Route)' },
  { key: 'Incompatible Driver (Control)', phone: '9807281274', expected: false, reason: 'Kathmandu -> Birgunj, Bus (Incompatible Vehicle Type)' }
];

async function runMultiDriverTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  console.log('\n======================================================');
  console.log('1. AUTHENTICATING ALL 5 TEST DRIVERS');
  console.log('======================================================');
  const driverTokens = {};
  for (const item of DRIVERS_TO_TEST) {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        identifier: item.phone,
        password: KNOWN_PASSWORD,
        role: 'driver'
      });
      driverTokens[item.phone] = {
        token: res.data.token,
        driver: res.data.driver,
        user: res.data.user
      };
      console.log(`[AUTH OK] ${item.key}: DriverID=${res.data.driver?._id || res.data.user?.driverInfo?._id}, Name=${res.data.user?.name}`);
    } catch (err) {
      console.error(`[AUTH FAILED] ${item.key}:`, err.response?.data?.message || err.message);
    }
  }

  console.log('\n======================================================');
  console.log('2. AUTHENTICATING / RETRIEVING CUSTOMER TOKEN');
  console.log('======================================================');
  let customerUser = await User.findOne({ role: 'customer' });
  if (!customerUser) {
    customerUser = await User.create({
      name: 'Demo Test Customer',
      email: 'customer.test@gmail.com',
      phone: '9811122233',
      password: KNOWN_PASSWORD,
      role: 'customer',
      status: 'Active'
    });
  } else {
    customerUser.password = KNOWN_PASSWORD;
    await customerUser.save();
  }

  const custLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    identifier: customerUser.phone,
    password: KNOWN_PASSWORD,
    role: 'customer'
  });
  const customerToken = custLoginRes.data.token;
  console.log(`[CUSTOMER AUTH OK] ID=${customerUser._id}, Phone=${customerUser.phone}`);

  console.log('\n======================================================');
  console.log('3. CREATING FRESH INSTANT CAR BOOKING (Kathmandu -> Birgunj)');
  console.log('======================================================');
  const bookingPayload = {
    pickupLocation: 'Kathmandu',
    dropLocation: 'Birgunj',
    serviceType: 'Car',
    bookingMode: 'INSTANT',
    fare: 2500,
    seatsBooked: 1,
    passengerDetails: [{ name: 'Test Passenger', phone: '9811122233', age: 28, gender: 'Male' }],
    paymentMethod: 'CASH',
    travelDate: new Date().toISOString()
  };

  const bookingRes = await axios.post(`${API_BASE}/bookings/instant`, bookingPayload, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });

  const createdBooking = bookingRes.data.data;
  const bookingId = createdBooking.bookingId;
  const bookingMongoId = createdBooking._id;
  console.log(`[BOOKING CREATED] ID=${bookingId} (_id=${bookingMongoId})`);
  console.log(`Route: ${createdBooking.pickupLocation} -> ${createdBooking.dropLocation}`);
  console.log(`ServiceType: ${createdBooking.serviceType}, BookingMode: ${createdBooking.bookingMode}`);

  // Small delay for async notification processing
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n======================================================');
  console.log('4. AUDITING NOTIFICATION DISPATCH IN DATABASE');
  console.log('======================================================');
  const notifications = await Notification.find({
    entityId: new mongoose.Types.ObjectId(bookingMongoId),
    eventType: 'BOOKING_REQUEST'
  }).populate('recipientId', 'name phone role').populate('driverId', 'name mobileNumber route');

  console.log(`Total notifications generated: ${notifications.length}`);
  const notifiedDriverIds = new Set();
  notifications.forEach((n, idx) => {
    const driverId = n.driverId?._id?.toString() || n.driverId?.toString() || 'unknown';
    notifiedDriverIds.add(driverId);
    console.log(`  [Notif ${idx + 1}] Recipient: ${n.recipient} | RecipientID: ${n.recipientId?._id} | DriverID: ${driverId} | Status: ${n.status}`);
  });

  console.log('\n======================================================');
  console.log('5. VERIFYING GET /api/driver/booking-requests FOR ALL 5 DRIVERS');
  console.log('======================================================');
  const results = [];
  for (const item of DRIVERS_TO_TEST) {
    const authData = driverTokens[item.phone];
    if (!authData) {
      results.push({ ...item, status: 'SKIPPED (No Auth)' });
      continue;
    }

    try {
      const reqRes = await axios.get(`${API_BASE}/driver/booking-requests`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });

      const requests = reqRes.data.data || [];
      const hasBooking = requests.some(r => r.bookingId === bookingId || r._id === bookingMongoId);
      const passed = hasBooking === item.expected;

      results.push({
        driverName: authData.user?.name,
        driverId: authData.driver?._id || authData.user?.driverInfo?._id,
        phone: item.phone,
        category: item.key,
        reason: item.reason,
        expected: item.expected,
        hasBooking,
        passed,
        requestsCount: requests.length,
        notificationDbFound: notifiedDriverIds.has(String(authData.driver?._id || authData.user?.driverInfo?._id))
      });

      console.log(`[TEST RESULT] ${item.key} (${item.phone}):`);
      console.log(`  Expected Booking: ${item.expected} | Actual Booking Present: ${hasBooking}`);
      console.log(`  Notification DB Found: ${notifiedDriverIds.has(String(authData.driver?._id || authData.user?.driverInfo?._id))}`);
      console.log(`  Verdict: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    } catch (err) {
      console.error(`[API ERROR] ${item.key}:`, err.response?.data?.message || err.message);
      results.push({ ...item, status: 'API ERROR', error: err.message });
    }
  }

  console.log('\n======================================================');
  console.log('6. FINAL TEST SUMMARY');
  console.log('======================================================');
  console.table(results.map(r => ({
    Driver: r.driverName,
    Phone: r.phone,
    Category: r.category,
    Expected: r.expected ? 'YES' : 'NO',
    'Has Booking': r.hasBooking ? 'YES' : 'NO',
    'Notif in DB': r.notificationDbFound ? 'YES' : 'NO',
    Verdict: r.passed ? 'PASS' : 'FAIL'
  })));

  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall multi-driver eligibility result: ${allPassed ? '✅ ALL 5 SCENARIOS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

runMultiDriverTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
