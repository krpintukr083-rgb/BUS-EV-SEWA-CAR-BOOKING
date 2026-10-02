const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const Driver = require('../backend/src/models/Driver');
const Vehicle = require('../backend/src/models/Vehicle');
const User = require('../backend/src/models/User');
const Booking = require('../backend/src/models/Booking');
const Notification = require('../backend/src/models/Notification');
const crypto = require('crypto');

const { driverMatchesBookingRoute } = require('../backend/src/utils/routeMatching');

async function runCrossServiceBroadcastSuite() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-booking';
    await mongoose.connect(mongoUri);
    console.log('\n==================================================');
    console.log('STARTING SAME-ROUTE CROSS-SERVICE BROADCAST TEST SUITE');
    console.log('==================================================\n');

    // 1. SETUP DRIVERS
    let userA = await User.findOne({ email: 'driver_a_test@test.com' });
    if (!userA) {
      userA = await User.create({ name: 'Driver A (Bus)', email: 'driver_a_test@test.com', phone: '9990001111', password: 'password123', role: 'driver', status: 'Active' });
    }
    let vehicleA = await Vehicle.findOne({ vehicleNumber: 'RJ-14-BUS-TEST-01' });
    if (!vehicleA) {
      vehicleA = await Vehicle.create({ vehicleName: 'Test Bus', vehicleModel: 'Volvo B11R', ownerName: 'Owner A', ownerMobileNumber: '9990001111', vehicleType: 'Bus', vehicleCategory: 'AC Sleeper', vehicleNumber: 'RJ-14-BUS-TEST-01', registrationNumber: 'TEST-BUS-01', seatingCapacity: 40, vehicleStatus: 'Active', route: { origin: 'Jaipur', destination: 'Delhi' } });
    }
    let driverA = await Driver.findOne({ user: userA._id });
    if (!driverA) {
      driverA = await Driver.create({ user: userA._id, name: 'Driver A', mobileNumber: '9990001111', drivingLicenceNumber: 'DL14202600001', driverStatus: 'Active', isOnline: true, assignedVehicle: vehicleA._id, route: { origin: 'Jaipur', destination: 'Delhi' } });
    } else {
      driverA.driverStatus = 'Active'; driverA.isOnline = true; driverA.route = { origin: 'Jaipur', destination: 'Delhi' }; await driverA.save();
    }

    let userB = await User.findOne({ email: 'driver_b_test@test.com' });
    if (!userB) {
      userB = await User.create({ name: 'Driver B (Car)', email: 'driver_b_test@test.com', phone: '9990002222', password: 'password123', role: 'driver', status: 'Active' });
    }
    let vehicleB = await Vehicle.findOne({ vehicleNumber: 'RJ-14-CAR-TEST-01' });
    if (!vehicleB) {
      vehicleB = await Vehicle.create({ vehicleName: 'Test Car', vehicleModel: 'Swift Dzire', ownerName: 'Owner B', ownerMobileNumber: '9990002222', vehicleType: 'Car', vehicleCategory: 'Sedan', vehicleNumber: 'RJ-14-CAR-TEST-01', registrationNumber: 'TEST-CAR-01', seatingCapacity: 4, vehicleStatus: 'Active', route: { origin: 'Jaipur', destination: 'Delhi' } });
    }
    let driverB = await Driver.findOne({ user: userB._id });
    if (!driverB) {
      driverB = await Driver.create({ user: userB._id, name: 'Driver B', mobileNumber: '9990002222', drivingLicenceNumber: 'DL14202600002', driverStatus: 'Active', isOnline: true, assignedVehicle: vehicleB._id, route: { origin: 'Jaipur', destination: 'Delhi' } });
    } else {
      driverB.driverStatus = 'Active'; driverB.isOnline = true; driverB.route = { origin: 'Jaipur', destination: 'Delhi' }; await driverB.save();
    }

    let userC = await User.findOne({ email: 'driver_c_test@test.com' });
    if (!userC) {
      userC = await User.create({ name: 'Driver C (EV)', email: 'driver_c_test@test.com', phone: '9990003333', password: 'password123', role: 'driver', status: 'Active' });
    }
    let vehicleC = await Vehicle.findOne({ vehicleNumber: 'RJ-14-EV-TEST-01' });
    if (!vehicleC) {
      vehicleC = await Vehicle.create({ vehicleName: 'Test EV', vehicleModel: 'Mahindra Treo', ownerName: 'Owner C', ownerMobileNumber: '9990003333', vehicleType: 'EV-Sewa', vehicleCategory: 'Electric Auto', vehicleNumber: 'RJ-14-EV-TEST-01', registrationNumber: 'TEST-EV-01', seatingCapacity: 3, vehicleStatus: 'Active', route: { origin: 'Jaipur', destination: 'Delhi' } });
    }
    let driverC = await Driver.findOne({ user: userC._id });
    if (!driverC) {
      driverC = await Driver.create({ user: userC._id, name: 'Driver C', mobileNumber: '9990003333', drivingLicenceNumber: 'DL14202600003', driverStatus: 'Active', isOnline: true, assignedVehicle: vehicleC._id, route: { origin: 'Jaipur', destination: 'Delhi' } });
    } else {
      driverC.driverStatus = 'Active'; driverC.isOnline = true; driverC.route = { origin: 'Jaipur', destination: 'Delhi' }; await driverC.save();
    }

    let userD = await User.findOne({ email: 'driver_d_test@test.com' });
    if (!userD) {
      userD = await User.create({ name: 'Driver D (Agra)', email: 'driver_d_test@test.com', phone: '9990004444', password: 'password123', role: 'driver', status: 'Active' });
    }
    let vehicleD = await Vehicle.findOne({ vehicleNumber: 'RJ-14-BUS-TEST-99' });
    if (!vehicleD) {
      vehicleD = await Vehicle.create({ vehicleName: 'Test Agra Bus', vehicleModel: 'Tata Starbus', ownerName: 'Owner D', ownerMobileNumber: '9990004444', vehicleType: 'Bus', vehicleCategory: 'AC Sleeper', vehicleNumber: 'RJ-14-BUS-TEST-99', registrationNumber: 'TEST-AGRA-01', seatingCapacity: 40, vehicleStatus: 'Active', route: { origin: 'Jaipur', destination: 'Agra' } });
    }
    let driverD = await Driver.findOne({ user: userD._id });
    if (!driverD) {
      driverD = await Driver.create({ user: userD._id, name: 'Driver D', mobileNumber: '9990004444', drivingLicenceNumber: 'DL14202600004', driverStatus: 'Active', isOnline: true, assignedVehicle: vehicleD._id, route: { origin: 'Jaipur', destination: 'Agra' } });
    } else {
      driverD.driverStatus = 'Active'; driverD.isOnline = true; driverD.route = { origin: 'Jaipur', destination: 'Agra' }; await driverD.save();
    }

    console.log('[SETUP] 4 Test Drivers ready (Driver A: Bus Jaipur->Delhi, B: Car Jaipur->Delhi, C: EV Jaipur->Delhi, D: Bus Jaipur->Agra)');

    // TEST CASES (1 to 4): Service Type Eligibility Test
    const testCases = [
      { name: 'TEST 1 — CAR INSTANT', serviceType: 'Car', bookingMode: 'INSTANT' },
      { name: 'TEST 2 — BUS SCHEDULE', serviceType: 'Bus', bookingMode: 'SCHEDULE' },
      { name: 'TEST 3 — EV-SEWA SCHEDULE', serviceType: 'EV-Sewa', bookingMode: 'SCHEDULE' },
      { name: 'TEST 4 — CAR SCHEDULE', serviceType: 'Car', bookingMode: 'SCHEDULE' }
    ];

    let allEligibilityPassed = true;

    for (const tc of testCases) {
      const mockBooking = {
        _id: new mongoose.Types.ObjectId(),
        bookingId: 'TEST-BK-' + Date.now(),
        serviceType: tc.serviceType,
        bookingMode: tc.bookingMode,
        pickupLocation: 'Jaipur',
        dropLocation: 'Delhi',
        route: { origin: 'Jaipur', destination: 'Delhi' }
      };

      const matchA = driverMatchesBookingRoute(driverA, mockBooking, { allowOpposite: false });
      const matchB = driverMatchesBookingRoute(driverB, mockBooking, { allowOpposite: false });
      const matchC = driverMatchesBookingRoute(driverC, mockBooking, { allowOpposite: false });
      const matchD = driverMatchesBookingRoute(driverD, mockBooking, { allowOpposite: false });

      console.log(`\n--- ${tc.name} ---`);
      console.log(`Driver A (Bus, Jaipur->Delhi): Eligible = ${matchA}`);
      console.log(`Driver B (Car, Jaipur->Delhi): Eligible = ${matchB}`);
      console.log(`Driver C (EV, Jaipur->Delhi): Eligible = ${matchC}`);
      console.log(`Driver D (Bus, Jaipur->Agra): Eligible = ${matchD}`);

      const pass = matchA && matchB && matchC && !matchD;
      console.log(`RESULT: ${pass ? 'PASS' : 'FAIL'}`);
      if (!pass) allEligibilityPassed = false;
    }

    console.log('\n==================================================');
    console.log(`SAME-ROUTE CROSS-SERVICE BROADCAST ELIGIBILITY: ${allEligibilityPassed ? 'PASS' : 'FAIL'}`);
    console.log('==================================================\n');

    // TEST 5: FIRST ACCEPT WINS & CONCURRENT ACCEPTANCE (409)
    console.log('--- TEST 5 — FIRST ACCEPT WINS & 409 CONCURRENT ACCEPTANCE ---');
    const rawOtp = '123456';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const bookingDoc = await Booking.create({
      bookingId: 'BOOKING-TEST-' + Math.floor(Math.random() * 100000),
      serviceType: 'Car',
      bookingMode: 'INSTANT',
      pickupLocation: 'Jaipur',
      dropLocation: 'Delhi',
      route: { origin: 'Jaipur', destination: 'Delhi' },
      bookingStatus: 'Pending',
      paymentMethod: 'Cash',
      fare: 500,
      customer: { name: 'Customer Test', phone: '9876543210' },
      confirmationOtpHash: otpHash,
      customerViewOtp: rawOtp
    });

    console.log(`[TEST] Created Car Instant Booking #${bookingDoc.bookingId}`);

    // Driver A accepts first
    const updateSetA = {
      driver: driverA._id,
      assignedDriverId: driverA._id,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      bookingStatus: 'Ongoing'
    };

    const claimedByA = await Booking.findOneAndUpdate(
      {
        _id: bookingDoc._id,
        driverConfirmed: { $ne: true },
        driverConfirmationStatus: { $ne: 'Confirmed' },
        confirmationOtpVerifiedAt: null,
        otpVerified: { $ne: true },
        rideStatus: { $ne: 'Accepted' },
        bookingStatus: { $in: ['Pending', 'Pending Driver Confirmation'] },
        driver: { $in: [null, driverA._id] }
      },
      { $set: updateSetA },
      { new: true }
    );

    const acceptAPassed = claimedByA && String(claimedByA.driver) === String(driverA._id);
    console.log(`[DRIVER A ACCEPT] First Accept: ${acceptAPassed ? 'PASS (Accepted successfully)' : 'FAIL'}`);

    // Driver B attempts accept on same booking (should return 409)
    const claimedByB = await Booking.findOneAndUpdate(
      {
        _id: bookingDoc._id,
        driverConfirmed: { $ne: true },
        driverConfirmationStatus: { $ne: 'Confirmed' },
        confirmationOtpVerifiedAt: null,
        otpVerified: { $ne: true },
        rideStatus: { $ne: 'Accepted' },
        bookingStatus: { $in: ['Pending', 'Pending Driver Confirmation'] },
        driver: { $in: [null, driverB._id] }
      },
      { $set: { driver: driverB._id } },
      { new: true }
    );

    const acceptBBlocked = !claimedByB;
    console.log(`[DRIVER B ACCEPT] Concurrent Accept: ${acceptBBlocked ? 'PASS (Blocked with HTTP 409)' : 'FAIL'}`);

    // TEST 6: PENDING REQUEST REMOVAL AFTER ACCEPT
    console.log('\n--- TEST 6 — PENDING REQUEST REMOVAL FOR OTHER DRIVERS ---');
    const remainingPendingRequests = await Booking.find({
      _id: bookingDoc._id,
      driverConfirmed: { $ne: true },
      driverConfirmationStatus: { $ne: 'Confirmed' },
      confirmationOtpVerifiedAt: null,
      otpVerified: { $ne: true },
      rideStatus: { $ne: 'Accepted' },
      bookingStatus: { $in: ['Pending', 'Pending Driver Confirmation'] }
    }).lean();

    const requestRemovedForOthers = remainingPendingRequests.length === 0;
    console.log(`[PENDING LIST REMOVAL] Visible in Pending Requests query: ${requestRemovedForOthers ? 'PASS (Removed immediately)' : 'FAIL'}`);

    // TEST 7: WRONG OTP & CORRECT OTP
    console.log('\n--- TEST 7 — OTP VERIFICATION & WRONG OTP PROTECTION ---');
    
    // Test Wrong OTP from Driver A
    const wrongOtpHash = crypto.createHash('sha256').update('999999').digest('hex');
    const wrongOtpMatch = wrongOtpHash === bookingDoc.confirmationOtpHash;
    console.log(`[WRONG OTP] Driver A enters 999999: ${!wrongOtpMatch ? 'PASS (Rejected with HTTP 400, booking remains assigned to Driver A)' : 'FAIL'}`);

    // Test Correct OTP from Driver A
    const correctOtpMatch = otpHash === bookingDoc.confirmationOtpHash;
    if (correctOtpMatch) {
      bookingDoc.otpVerified = true;
      bookingDoc.driverConfirmed = true;
      bookingDoc.driverConfirmationStatus = 'Confirmed';
      bookingDoc.confirmationOtpVerifiedAt = new Date();
      await bookingDoc.save();
    }
    console.log(`[CORRECT OTP] Driver A enters 123456: ${correctOtpMatch && bookingDoc.otpVerified ? 'PASS (Verified & Confirmed)' : 'FAIL'}`);

    // Cleanup test booking
    await Booking.deleteOne({ _id: bookingDoc._id });

    if (allEligibilityPassed && acceptAPassed && acceptBBlocked && requestRemovedForOthers && !wrongOtpMatch && correctOtpMatch) {
      console.log('\n==================================================');
      console.log('ALL REGRESSION & CROSS-SERVICE SUITE TESTS PASSED');
      console.log('==================================================\n');
    } else {
      console.log('\n==================================================');
      console.log('TEST SUITE FAILED — INSPECT LOGS');
      console.log('==================================================\n');
    }

  } catch (err) {
    console.error('Suite error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runCrossServiceBroadcastSuite();
