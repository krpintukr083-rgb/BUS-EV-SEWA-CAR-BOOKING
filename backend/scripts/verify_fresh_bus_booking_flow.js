const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Notification = require('../src/models/Notification');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const REVIEW_DRIVER_EMAIL = 'krpintukr083+driverreview@gmail.com';
const EXPECTED_VEHICLE_NUM = 'BA 2 KHA 7788';

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFYING FRESH BUS BOOKING END-TO-END FLOW');
  console.log('================================================================');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to DB: ${mongoose.connection.name}`);

  // 1. Inspect existing latest bookings
  const latestBookings = await Booking.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log('\n--- 1. Latest Existing Bookings in Database ---');
  latestBookings.forEach((b, i) => {
    console.log(`[${i + 1}] ID: ${b.bookingId} | Mode: ${b.bookingMode} | Service: ${b.serviceType} | Status: ${b.bookingStatus} | Route: ${b.pickupLocation} -> ${b.dropLocation} | Created: ${b.createdAt}`);
  });

  // 2. Verify Review Driver & Assigned Vehicle
  console.log('\n--- 2. Verifying Review Driver ---');
  const driverUser = await User.findOne({ email: REVIEW_DRIVER_EMAIL });
  if (!driverUser) throw new Error('Driver user not found');
  const driver = await Driver.findOne({ user: driverUser._id }).populate('assignedVehicle');
  if (!driver) throw new Error('Driver profile not found');
  console.log(`Driver ID: ${driver._id}`);
  console.log(`Driver Status: ${driver.driverStatus} | Online: ${driver.isOnline}`);
  console.log(`Driver Push Token: ${driver.pushToken ? driver.pushToken.slice(0, 20) + '...' : 'none'}`);
  console.log(`Assigned Vehicle: ${driver.assignedVehicle?.vehicleNumber} (${driver.assignedVehicle?.vehicleType})`);
  console.log(`Driver Route: ${driver.route?.origin} -> ${driver.route?.destination}`);
  console.log(`Vehicle Route: ${driver.assignedVehicle?.route?.origin} -> ${driver.assignedVehicle?.route?.destination}`);

  const vehicle = await Vehicle.findOne({ vehicleNumber: EXPECTED_VEHICLE_NUM });
  if (!vehicle) throw new Error(`Vehicle ${EXPECTED_VEHICLE_NUM} not found`);

  // Generate tokens for test
  const driverToken = jwt.sign(
    { id: driverUser._id, role: 'driver', driverId: driver._id },
    process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure',
    { expiresIn: '1d' }
  );

  // 3. Find or Create Test Customer
  let customerUser = await User.findOne({ role: 'customer' });
  if (!customerUser) {
    customerUser = await User.create({
      name: 'Test Passenger',
      email: 'testpassenger998@example.com',
      phone: '9841000999',
      role: 'customer',
      status: 'Active',
      isPhoneVerified: true
    });
  }
  const customerToken = jwt.sign(
    { id: customerUser._id, role: 'customer' },
    process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure',
    { expiresIn: '1d' }
  );

  // Pick unbooked seat
  const seatNum = `S${Math.floor(10 + Math.random() * 89)}`;

  // 4. Create Exactly ONE Fresh Test Bus Booking via Customer API
  console.log('\n--- 3. Submitting Fresh Customer Booking via API ---');
  const bookingPayload = {
    vehicleId: String(vehicle._id),
    serviceType: 'Bus',
    pickupLocation: 'Kathmandu, Nepal',
    dropLocation: 'Birgunj, Nepal',
    passengerDetails: [{ name: customerUser.name, age: 30, gender: 'Male' }],
    selectedSeats: [seatNum],
    fare: 1200,
    paymentMethod: 'Offline Cash',
    travelDate: new Date().toISOString()
  };

  const createRes = await request(app)
    .post('/api/customer/bookings')
    .set('Authorization', `Bearer ${customerToken}`)
    .send(bookingPayload);

  console.log(`Customer Booking HTTP Status: ${createRes.status}`);
  if (createRes.status !== 201) {
    console.error('Customer Booking Failed:', createRes.body);
    process.exit(1);
  }

  const createdBooking = createRes.body.data;
  const newBookingId = createdBooking.bookingId;
  const customerOtp = createRes.body.data.confirmationOtp;
  console.log(`✅ Created Fresh Booking ID: ${newBookingId}`);
  console.log(`Customer View OTP (given to passenger): ${customerOtp}`);

  // Wait 1.5 seconds for async notifications and push dispatch to complete
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 5. Inspect the Database Record
  console.log('\n--- 4. Inspecting Database Record ---');
  const dbBooking = await Booking.findOne({ bookingId: newBookingId }).lean();
  console.log(`DB Booking ID: ${dbBooking.bookingId}`);
  console.log(`Booking Status: ${dbBooking.bookingStatus}`);
  console.log(`Driver Confirmation Status: ${dbBooking.driverConfirmationStatus}`);
  console.log(`Assigned Driver ID: ${dbBooking.driver}`);
  console.log(`Driver Match Review Driver: ${String(dbBooking.driver) === String(driver._id)}`);
  console.log(`Vehicle ID: ${dbBooking.vehicle}`);
  console.log(`Seats: ${dbBooking.busSeatNumbers?.join(', ')}`);
  console.log(`Stored customerViewOtp: ${dbBooking.customerViewOtp}`);

  // 6. Inspect Notifications for Driver
  console.log('\n--- 5. Inspecting Driver Notifications ---');
  const notifs = await Notification.find({
    driverId: driver._id,
    bookingId: newBookingId
  }).lean();
  console.log(`Notifications found for booking ${newBookingId}: ${notifs.length}`);
  notifs.forEach(n => {
    console.log(`  Notif ID: ${n._id} | Type: ${n.eventType} | Title: ${n.title} | Status: ${n.status}`);
  });

  const getNotifsRes = await request(app)
    .get('/api/driver/notifications')
    .set('Authorization', `Bearer ${driverToken}`);
  console.log(`GET /api/driver/notifications count: ${getNotifsRes.body.data?.length || 0}`);
  const hasNotif = (getNotifsRes.body.data || []).some(n => n.bookingId === newBookingId || String(n.entityId) === String(dbBooking._id));
  console.log(`Driver notification list contains new booking notification: ${hasNotif}`);

  // 7. Check GET /api/driver/booking-requests (Requests Tab)
  console.log('\n--- 6. Checking Requests Tab (GET /api/driver/booking-requests) ---');
  const reqRes = await request(app)
    .get('/api/driver/booking-requests')
    .set('Authorization', `Bearer ${driverToken}`);

  console.log(`HTTP Status: ${reqRes.status} | Count: ${reqRes.body.count}`);
  const matchingReq = (reqRes.body.data || []).find(b => b.bookingId === newBookingId);
  if (matchingReq) {
    console.log(`✅ Fresh booking returned in booking-requests!`);
    console.log(`   Remaining Seconds: ${matchingReq.remainingSeconds}`);
    console.log(`   Customer View OTP leaked? ${matchingReq.customerViewOtp !== undefined} (Value: ${matchingReq.customerViewOtp})`);
    console.log(`   Confirmation OTP leaked? ${matchingReq.confirmationOtp !== undefined}`);
    console.log(`   Ride OTP leaked? ${matchingReq.rideOtp !== undefined}`);
  } else {
    console.log(`❌ Fresh booking NOT returned in booking-requests.`);
  }

  // 8. Check GET /api/driver/active-bookings (OTP Confirm Tab)
  console.log('\n--- 7. Checking OTP Confirm Tab (GET /api/driver/active-bookings) ---');
  const activeRes = await request(app)
    .get('/api/driver/active-bookings')
    .set('Authorization', `Bearer ${driverToken}`);

  console.log(`HTTP Status: ${activeRes.status} | Count: ${activeRes.body.count}`);
  const matchingActive = (activeRes.body.data || []).find(b => b.bookingId === newBookingId);
  if (matchingActive) {
    console.log(`✅ Fresh booking returned in active-bookings!`);
    console.log(`   Booking Status: ${matchingActive.bookingStatus}`);
    console.log(`   Driver Confirmation Status: ${matchingActive.driverConfirmationStatus}`);
    console.log(`   Customer View OTP leaked? ${matchingActive.customerViewOtp !== undefined} (Value: ${matchingActive.customerViewOtp})`);
    console.log(`   Confirmation OTP leaked? ${matchingActive.confirmationOtp !== undefined}`);
  } else {
    console.log(`❌ Fresh booking NOT returned in active-bookings.`);
  }

  // 9. Unauthorized Driver Access Test
  console.log('\n--- 8. Testing Unauthorized Driver Access ---');
  let unauthDriverUser = await User.findOne({ email: 'unauth_driver_test@example.com' });
  let unauthDriver = unauthDriverUser ? await Driver.findOne({ user: unauthDriverUser._id }) : null;
  if (!unauthDriver) {
    if (!unauthDriverUser) {
      unauthDriverUser = await User.create({
        name: 'Unauth Driver',
        email: 'unauth_driver_test@example.com',
        phone: '9841999888',
        password: 'UnauthPass@12345!',
        role: 'driver',
        status: 'Active',
        isPhoneVerified: true
      });
    }
    unauthDriver = await Driver.create({
      user: unauthDriverUser._id,
      name: 'Unauth Driver',
      mobileNumber: '9841999888',
      drivingLicenceNumber: 'DL-UNAUTH-999',
      driverStatus: 'Active',
      isOnline: true,
      route: { origin: 'Pokhara', destination: 'Chitwan' }
    });
  }

  const unauthDriverToken = jwt.sign(
    { id: unauthDriverUser._id, role: 'driver', driverId: unauthDriver._id },
    process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure',
    { expiresIn: '1d' }
  );

  const unauthRes = await request(app)
    .post(`/api/driver/bookings/${newBookingId}/verify-otp`)
    .set('Authorization', `Bearer ${unauthDriverToken}`)
    .send({ otp: customerOtp });

  console.log(`Unauthorized Driver Confirmation HTTP Status: ${unauthRes.status}`);
  console.log(`Unauthorized response message: ${unauthRes.body?.message}`);
  const isForbidden = unauthRes.status === 403;
  console.log(`Unauthorized driver blocked with 403 Forbidden: ${isForbidden}`);

  // 10. Legitimate Review Driver OTP Confirmation
  console.log('\n--- 9. Testing Legitimate Review Driver Confirmation ---');
  const confirmRes = await request(app)
    .post(`/api/driver/bookings/${newBookingId}/verify-otp`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ otp: customerOtp });

  console.log(`Driver OTP Confirmation HTTP Status: ${confirmRes.status}`);
  console.log(`Confirmation response:`, confirmRes.body);

  // Verify post-confirmation DB status
  const postConfirmDb = await Booking.findOne({ bookingId: newBookingId }).lean();
  console.log(`Post-confirmation Booking Status: ${postConfirmDb.bookingStatus}`);
  console.log(`Post-confirmation Driver Confirmed: ${postConfirmDb.driverConfirmed}`);
  console.log(`Post-confirmation Driver Confirmation Status: ${postConfirmDb.driverConfirmationStatus}`);
  console.log(`Single-use OTP cleared: ${postConfirmDb.customerViewOtp === null}`);

  // 11. Confirm Second OTP Attempt is Blocked (Single-Use OTP)
  const replayRes = await request(app)
    .post(`/api/driver/bookings/${newBookingId}/verify-otp`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({ otp: customerOtp });
  console.log(`Replay OTP Attempt HTTP Status: ${replayRes.status} (Expected 400)`);

  console.log('\n================================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS COMPLETED');
  console.log('================================================================');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
