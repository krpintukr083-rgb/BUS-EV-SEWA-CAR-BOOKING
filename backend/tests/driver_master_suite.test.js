const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const { connectTestDB, closeTestDB } = require('./setup');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const Withdrawal = require('../src/models/Withdrawal');
const Incentive = require('../src/models/Incentive');
const Support = require('../src/models/Support');
const Notification = require('../src/models/Notification');
const jwt = require('jsonwebtoken');

// App setup
const app = express();
app.use(express.json());
app.use('/api/auth', require('../src/routes/authRoutes'));
app.use('/api/driver', require('../src/routes/driverRoutes'));
app.use('/api/bookings', require('../src/routes/bookingRoutes'));

describe('Driver App / Driver Panel Master Test Suite', () => {
  let driverUserA, driverUserB, customerUser;
  let driverProfileA, driverProfileB;
  let vehicleBus, vehicleEV;
  let tokenA, tokenB, customerToken;

  beforeAll(async () => {
    await connectTestDB();
    
    // Clean up only test specific collections/records
    await User.deleteMany({ $or: [{ email: { $in: ['ramesh.customer@test.com', 'hari.driver@test.com', 'shyam.driver@test.com'] } }, { phone: { $in: ['9800000001', '9841000001', '9841000002', '9841999999'] } }] });
    await Driver.deleteMany({ $or: [{ name: { $in: ['Hari Bahadur', 'Shyam Kumar', 'Bikram Thapa'] } }, { drivingLicenceNumber: 'DL-TEST-9999' }] });
    await Vehicle.deleteMany({ vehicleNumber: { $in: ['BA-2-PA-9901', 'BA-1-KHA-1234'] } });

    // 1. Create Users
    customerUser = await User.create({
      name: 'Ramesh Sharma',
      email: 'ramesh.customer@test.com',
      phone: '9800000001',
      password: 'Password123!',
      role: 'customer'
    });
    customerToken = jwt.sign(
      { id: customerUser._id, role: customerUser.role },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1d' }
    );

    driverUserA = await User.create({
      name: 'Hari Bahadur',
      email: 'hari.driver@test.com',
      phone: '9841000001',
      password: 'Password123!',
      role: 'driver'
    });
    tokenA = jwt.sign(
      { id: driverUserA._id, role: driverUserA.role },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1d' }
    );

    driverUserB = await User.create({
      name: 'Shyam Kumar',
      email: 'shyam.driver@test.com',
      phone: '9841000002',
      password: 'Password123!',
      role: 'driver'
    });
    tokenB = jwt.sign(
      { id: driverUserB._id, role: driverUserB.role },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1d' }
    );

    // 2. Create Vehicles
    vehicleEV = await Vehicle.create({
      vehicleNumber: 'BA-2-PA-9901',
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Shuttle 12-Seater',
      vehicleModel: 'Tata Nexon EV Max',
      vehicleName: 'Green City EV Express',
      seatingCapacity: 4,
      fareRate: 25,
      ownerName: 'Green Nepal Travels',
      ownerMobileNumber: '9841000000',
      vehicleStatus: 'Active',
      evDetails: {
        batteryCapacity: '40.5 kWh',
        rangeKm: 312
      }
    });

    vehicleBus = await Vehicle.create({
      vehicleNumber: 'BA-1-KHA-1234',
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper 2+1',
      vehicleModel: 'Ashok Leyland AC Deluxe',
      vehicleName: 'Royal Kathmandu Express',
      seatingCapacity: 35,
      fareRate: 15,
      ownerName: 'Bagmati Yatayat',
      ownerMobileNumber: '9841111111',
      vehicleStatus: 'Active'
    });

    // 3. Create Driver Profiles
    driverProfileA = await Driver.create({
      user: driverUserA._id,
      name: 'Hari Bahadur',
      mobileNumber: '9841000001',
      drivingLicenceNumber: 'DL-9841-KTM',
      assignedVehicle: vehicleEV._id,
      assignedType: 'ev',
      driverStatus: 'Active',
      verificationStatus: 'approved',
      isOnline: true,
      walletBalance: 1500,
      totalEarnings: 3000,
      totalCommission: 600,
      language: 'en',
      batteryPercentage: 85,
      estimatedRangeKm: 265
    });

    driverProfileB = await Driver.create({
      user: driverUserB._id,
      name: 'Shyam Kumar',
      mobileNumber: '9841000002',
      drivingLicenceNumber: 'DL-9841-BUS',
      assignedVehicle: vehicleBus._id,
      assignedType: 'bus',
      driverStatus: 'Active',
      verificationStatus: 'approved',
      isOnline: false,
      walletBalance: 500,
      totalEarnings: 1000,
      totalCommission: 200,
      language: 'ne'
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  // TEST 1: Driver Registration via Auth Route
  test('1. Driver Registration with initial status pending KYC', async () => {
    const res = await request(app)
      .post('/api/auth/driver-register')
      .send({
        name: 'Bikram Thapa',
        phone: '9841999999',
        password: 'Password123!',
        drivingLicenceNumber: 'DL-TEST-9999',
        city: 'Kathmandu'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.driver.driverStatus).toBe('Pending Verification');
  });

  // TEST 2: Driver Online / Offline Toggle
  test('2. Online / Offline toggle persists in DB and updates response', async () => {
    // Check initial online status
    const initialRes = await request(app)
      .get('/api/driver/status')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(initialRes.status).toBe(200);
    expect(initialRes.body.data.isOnline).toBe(true);

    // Toggle to offline
    const toggleRes = await request(app)
      .patch('/api/driver/toggle-status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isOnline: false });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isOnline).toBe(false);

    // Verify in database
    const dbDriver = await Driver.findOne({ user: driverUserA._id });
    expect(dbDriver.isOnline).toBe(false);

    // Toggle back to online for subsequent tests
    await request(app)
      .patch('/api/driver/toggle-status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isOnline: true });
  });

  // TEST 3: Driver KYC & 5 Document Expiry Tracking
  test('3. Driver KYC documents upload and expiry tracking', async () => {
    const res = await request(app)
      .post('/api/driver/documents')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        documentType: 'citizenship',
        documentUrl: 'https://storage.test.com/docs/citizenship_hari.jpg',
        expiryDate: '2030-01-01',
        documentNumber: '12-01-78-12345'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.citizenshipStatus).toBe('pending');

    const docList = await request(app)
      .get('/api/driver/documents')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(docList.status).toBe(200);
    expect(docList.body.data.documents.citizenship).toBeDefined();
    expect(docList.body.data.documents.citizenship.expiry).toBe('2030-01-01');
  });

  // TEST 4: Ride Request Creation and Driver Notification (Respects Online Status)
  let rideBookingId, rideOtpCode;
  test('4. Booking dispatch: Online driver sees request with countdown timer', async () => {
    const booking = await Booking.create({
      bookingId: 'BK-EV-' + Date.now(),
      customer: {
        name: customerUser.name,
        phone: customerUser.phone,
        email: customerUser.email
      },
      vehicle: vehicleEV._id,
      serviceType: 'EV-Sewa',
      pickupLocation: 'Thamel, Kathmandu',
      dropLocation: 'Tribhuvan International Airport',
      fare: 500,
      totalFare: 500,
      paymentMethod: 'Online Payment',
      paymentStatus: 'Paid',
      driverConfirmationStatus: 'Pending',
      bookingStatus: 'Pending Driver Confirmation',
      driver: driverProfileA._id,
      driverAssigned: driverProfileA._id,
      rideStatus: 'None'
    });

    rideBookingId = booking._id;
    rideOtpCode = booking.rideOtp;
    expect(rideOtpCode).toBeDefined();
    expect(rideOtpCode.length).toBe(4);

    const pendingRequests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(pendingRequests.status).toBe(200);
    expect(pendingRequests.body.data.length).toBeGreaterThanOrEqual(1);
    const target = pendingRequests.body.data.find(b => b._id.toString() === rideBookingId.toString());
    expect(target).toBeDefined();
    expect(target.remainingSeconds).toBeGreaterThan(0);
  });

  // TEST 5: Driver Accepts Ride
  test('5. Driver Accepts Ride -> rideStatus transitions to Accepted', async () => {
    const acceptRes = await request(app)
      .post(`/api/driver/accept-ride/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.rideStatus).toBe('Accepted');
    expect(acceptRes.body.data.driverConfirmationStatus).toBe('Confirmed');
  });

  // TEST 6: Driver Arrives at Pickup
  test('6. Driver Arrives at Pickup -> sets arrivedAt timestamp and rideStatus Arrived', async () => {
    const arriveRes = await request(app)
      .post(`/api/driver/arrived/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(arriveRes.status).toBe(200);
    expect(arriveRes.body.success).toBe(true);
    expect(arriveRes.body.data.rideStatus).toBe('Arrived');
    expect(arriveRes.body.data.arrivedAt).toBeDefined();
  });

  // TEST 7: OTP / PIN Verification Barrier
  test('7. Start ride without OTP must fail; OTP verification unlocks ride start', async () => {
    // 7a. Attempt to start ride without OTP
    const invalidStart = await request(app)
      .post(`/api/driver/start-ride/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(invalidStart.status).toBe(400);
    expect(invalidStart.body.message).toMatch(/OTP/i);

    // 7b. Verify invalid OTP
    const wrongOtpRes = await request(app)
      .post(`/api/driver/verify-otp/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ otp: '9999' });

    expect(wrongOtpRes.status).toBe(400);
    expect(wrongOtpRes.body.message).toMatch(/Invalid OTP/i);

    // 7c. Verify correct OTP
    const correctOtpRes = await request(app)
      .post(`/api/driver/verify-otp/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ otp: rideOtpCode });

    expect(correctOtpRes.status).toBe(200);
    expect(correctOtpRes.body.data.otpVerified).toBe(true);

    // 7d. Now start ride successfully
    const startRes = await request(app)
      .post(`/api/driver/start-ride/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.data.rideStatus).toBe('Started');
  });

  // TEST 8: End Ride -> Authoritative Pricing -> 20% Commission -> Driver Wallet Credit
  test('8. End Ride calculates 20% commission and credits 80% to driver wallet balance', async () => {
    const driverBefore = await Driver.findById(driverProfileA._id);
    const balanceBefore = driverBefore.walletBalance;

    const endRes = await request(app)
      .post(`/api/driver/end-ride/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        distanceKm: 15,
        tollCharge: 50,
        waitingCharge: 20
      });

    expect(endRes.status).toBe(200);
    expect(endRes.body.success).toBe(true);
    expect(endRes.body.data.rideStatus).toBe('Completed');
    expect(endRes.body.data.receipt).toBeDefined();

    // Verify fare breakdown
    const receipt = endRes.body.data.receipt;
    expect(receipt.totalFare).toBeGreaterThan(0);
    expect(receipt.platformCommission).toBe(receipt.totalFare * 0.20);
    expect(receipt.driverEarnings).toBe(receipt.totalFare * 0.80);

    // Verify driver wallet balance was incremented authoritative
    const driverAfter = await Driver.findById(driverProfileA._id);
    expect(driverAfter.walletBalance).toBe(balanceBefore + receipt.driverEarnings);
  });

  // TEST 9: Strict Driver Data Isolation Barrier (HTTP 403)
  test('9. Driver A cannot access or manipulate Driver B bookings or profile (403/404)', async () => {
    // Driver B attempts to access Driver A's booking
    const unauthorizedRes = await request(app)
      .post(`/api/driver/arrived/${rideBookingId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(unauthorizedRes.status);
    expect(unauthorizedRes.body.success).toBe(false);
  });

  // TEST 10: Driver Wallet & Payout Gateway Blocked Check
  test('10. Payout / Withdrawal request validation and blocked status without credentials', async () => {
    const walletRes = await request(app)
      .get('/api/driver/wallet')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(walletRes.status).toBe(200);
    expect(walletRes.body.data.walletBalance).toBeGreaterThan(0);

    // Request withdrawal via eSewa (unconfigured merchant)
    const withdrawRes = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 200,
        method: 'esewa',
        accountDetails: { esewaId: '9841000001' }
      });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.success).toBe(true);
    expect(withdrawRes.body.data.status).toBe('pending');
    expect(withdrawRes.body.data.gatewayStatus).toMatch(/BLOCKED — PAYMENT PROVIDER CONFIGURATION REQUIRED/);
  });

  // TEST 11: SOS Emergency Trigger (Zero GPS Telemetry)
  test('11. SOS Alert triggers emergency notification with zero background GPS requirement', async () => {
    const sosRes = await request(app)
      .post('/api/driver/sos')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        notes: 'Emergency assistance requested on ring road',
        lastKnownLocation: 'Ring Road, Balkhu'
      });

    expect(sosRes.status).toBe(200);
    expect(sosRes.body.success).toBe(true);
    expect(sosRes.body.message).toMatch(/SOS alert dispatched/i);
    expect(sosRes.body.data.helpline).toBeDefined();
  });

  // TEST 12: EV Hub & Battery Range Updates
  test('12. EV Hub returns battery %, range estimator and charging stations; Petrol/Diesel hidden', async () => {
    // Driver A has EV assigned
    const evRes = await request(app)
      .get('/api/driver/ev-hub')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(evRes.status).toBe(200);
    expect(evRes.body.data.isEV).toBe(true);
    expect(evRes.body.data.batteryPercentage).toBe(85);
    expect(evRes.body.data.chargingStations.length).toBeGreaterThan(0);

    // Update battery status
    const updateBatteryRes = await request(app)
      .patch('/api/driver/battery-update')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ batteryPercentage: 70 });

    expect(updateBatteryRes.status).toBe(200);
    expect(updateBatteryRes.body.data.batteryPercentage).toBe(70);

    // Driver B has Bus (Petrol/Diesel)
    const busRes = await request(app)
      .get('/api/driver/ev-hub')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(busRes.status).toBe(200);
    expect(busRes.body.data.isEV).toBe(false);
  });

  // TEST 13: Multi-Language Localization Persistence
  test('13. Language preference updates and persists across sessions', async () => {
    const langRes = await request(app)
      .patch('/api/driver/language')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ language: 'ne' });

    expect(langRes.status).toBe(200);
    expect(langRes.body.data.language).toBe('ne');

    const profile = await Driver.findOne({ user: driverUserA._id });
    expect(profile.language).toBe('ne');
  });

  // TEST 14: Offline Cash Collection and Dual Confirmation Flow
  test('14. Offline Cash Collection confirms booking and marks payment as paid', async () => {
    const cashBooking = await Booking.create({
      bookingId: 'BK-CASH-' + Date.now(),
      customer: {
        name: customerUser.name,
        phone: customerUser.phone,
        email: customerUser.email
      },
      vehicle: vehicleBus._id,
      serviceType: 'Bus',
      pickupLocation: 'Kalanki, Kathmandu',
      dropLocation: 'Pokhara Bus Park',
      fare: 1600,
      totalFare: 1600,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      driverConfirmationStatus: 'Pending',
      bookingStatus: 'Pending Driver Confirmation',
      driver: driverProfileB._id,
      driverAssigned: driverProfileB._id,
      rideStatus: 'None'
    });

    // Driver B accepts cash booking
    await request(app)
      .post(`/api/driver/accept-ride/${cashBooking._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    // Driver B collects cash
    const collectRes = await request(app)
      .post(`/api/driver/collect-cash/${cashBooking._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ amountCollected: 1600 });

    expect(collectRes.status).toBe(200);
    expect(collectRes.body.success).toBe(true);
    expect(collectRes.body.data.paymentStatus).toBe('Paid');
    expect(collectRes.body.data.bookingStatus).toBe('Confirmed');
  });
});
