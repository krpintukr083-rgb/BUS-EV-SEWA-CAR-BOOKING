const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const PlatformChargeSettings = require('../src/models/PlatformChargeSettings');
const { calculatePlatformCharge } = require('../src/utils/platformChargeCalculator');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

jest.setTimeout(30000);

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Platform Charge on Driver Earnings — Comprehensive Test Suite', () => {
  let superAdminUser;
  let superAdminToken;
  let subAdminUser;
  let subAdminToken;
  let driverUser1;
  let driverUser2;
  let driverProfile1;
  let driverProfile2;
  let driver1Token;
  let driver2Token;
  let testBus;
  let testCar;
  let testEvSewa;

  beforeAll(async () => {
    // Generate Super Admin
    superAdminUser = await User.create({
      name: 'Super Admin Test',
      email: `superadmin_${Date.now()}@transportplatform.com`,
      phone: `98000${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'admin',
      status: 'Active'
    });
    superAdminToken = jwt.sign({ id: superAdminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });

    // Generate Sub Admin with only driver.view
    subAdminUser = await User.create({
      name: 'Sub Admin Test',
      email: `subadmin_${Date.now()}@transportplatform.com`,
      phone: `98001${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'sub_admin',
      adminType: 'driver_management',
      permissions: ['driver.view'],
      permissionsVersion: 1,
      status: 'Active'
    });
    subAdminToken = jwt.sign({ id: subAdminUser._id, role: 'sub_admin', permissionsVersion: 1 }, jwtConfig.secret, { expiresIn: '1h' });

    // Driver 1
    driverUser1 = await User.create({
      name: 'Driver One',
      email: `driver1_${Date.now()}@test.com`,
      phone: `98100${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    driverProfile1 = await Driver.create({
      user: driverUser1._id,
      name: 'Driver One',
      mobileNumber: driverUser1.phone,
      drivingLicenceNumber: 'DL-TEST-001',
      driverStatus: 'Active',
      isOnline: true,
      walletBalance: 0,
      totalEarnings: 0,
      totalCommission: 0
    });
    driver1Token = jwt.sign({ id: driverUser1._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    // Driver 2
    driverUser2 = await User.create({
      name: 'Driver Two',
      email: `driver2_${Date.now()}@test.com`,
      phone: `98200${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    driverProfile2 = await Driver.create({
      user: driverUser2._id,
      name: 'Driver Two',
      mobileNumber: driverUser2.phone,
      drivingLicenceNumber: 'DL-TEST-002',
      driverStatus: 'Active',
      isOnline: true,
      walletBalance: 0,
      totalEarnings: 0,
      totalCommission: 0
    });
    driver2Token = jwt.sign({ id: driverUser2._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    // Test Vehicles
    testBus = await Vehicle.create({
      vehicleNumber: `BUS-${Date.now()}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper 2+1',
      vehicleModel: 'Volvo 9600',
      vehicleName: 'Royal Express Deluxe',
      ownerName: 'Transport Platform',
      ownerMobileNumber: '9800000001',
      seatingCapacity: 40,
      approvalStatus: 'Approved',
      isAvailable: true,
      assignedDriver: driverProfile1._id
    });

    testCar = await Vehicle.create({
      vehicleNumber: `CAR-${Date.now()}`,
      vehicleType: 'Car',
      vehicleCategory: 'Sedan / Prime',
      vehicleModel: 'Swift Dzire',
      vehicleName: 'City Prime Cab',
      ownerName: 'Transport Platform',
      ownerMobileNumber: '9800000002',
      seatingCapacity: 4,
      approvalStatus: 'Approved',
      isAvailable: true,
      assignedDriver: driverProfile1._id
    });

    testEvSewa = await Vehicle.create({
      vehicleNumber: `EV-${Date.now()}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Shuttle 12-Seater',
      vehicleModel: 'Tata Tigor EV',
      vehicleName: 'Green City EV Shuttle',
      ownerName: 'Transport Platform',
      ownerMobileNumber: '9800000003',
      seatingCapacity: 7,
      approvalStatus: 'Approved',
      isAvailable: true,
      assignedDriver: driverProfile1._id
    });
  });

  afterAll(async () => {
    if (superAdminUser?._id) await User.deleteMany({ _id: { $in: [superAdminUser._id, subAdminUser?._id, driverUser1?._id, driverUser2?._id].filter(Boolean) } });
    if (driverProfile1?._id) await Driver.deleteMany({ _id: { $in: [driverProfile1._id, driverProfile2?._id].filter(Boolean) } });
    if (testBus?._id) await Vehicle.deleteMany({ _id: { $in: [testBus._id, testCar?._id, testEvSewa?._id].filter(Boolean) } });
    await Booking.deleteMany({ 'customer.name': 'PlatformChargeCustomer' });
  });

  // 1. Percentage charge calculation test
  test('1. Percentage charge calculation formula and net driver earning', () => {
    const settings = {
      isEnabled: true,
      chargeType: 'PERCENTAGE',
      percentageRate: 10,
      fixedAmount: 50,
      applicableServices: { bus: true, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: true },
      minCharge: null,
      maxCharge: null,
      version: 1
    };

    const res = calculatePlatformCharge(1000, 'Car', 'INSTANT', settings);
    expect(res.isApplicable).toBe(true);
    expect(res.grossFare).toBe(1000);
    expect(res.platformCharge).toBe(100);
    expect(res.netDriverEarning).toBe(900);
    expect(res.chargeType).toBe('PERCENTAGE');
    expect(res.chargeRateOrAmount).toBe(10);
  });

  // 2. Fixed charge calculation test
  test('2. Fixed charge calculation per completed booking', () => {
    const settings = {
      isEnabled: true,
      chargeType: 'FIXED',
      percentageRate: 10,
      fixedAmount: 75,
      applicableServices: { bus: true, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: true },
      minCharge: null,
      maxCharge: null,
      version: 1
    };

    const res = calculatePlatformCharge(1200, 'Car', 'INSTANT', settings);
    expect(res.isApplicable).toBe(true);
    expect(res.platformCharge).toBe(75);
    expect(res.netDriverEarning).toBe(1125);
    expect(res.chargeType).toBe('FIXED');
  });

  // 3. Platform charge disabled test
  test('3. Platform charge disabled returns ₹0 platform charge and gross equals net', () => {
    const settings = {
      isEnabled: false,
      chargeType: 'PERCENTAGE',
      percentageRate: 15,
      applicableServices: { bus: true, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: true },
      version: 2
    };

    const res = calculatePlatformCharge(800, 'Car', 'INSTANT', settings);
    expect(res.isApplicable).toBe(false);
    expect(res.platformCharge).toBe(0);
    expect(res.netDriverEarning).toBe(800);
  });

  // 4. Bus, EV-Sewa and Car separate configurable rules
  test('4. Bus, EV-Sewa and Car separate service toggle rules', () => {
    const settings = {
      isEnabled: true,
      chargeType: 'PERCENTAGE',
      percentageRate: 10,
      applicableServices: { bus: false, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: true }
    };

    // Bus is disabled -> charge is 0
    const busRes = calculatePlatformCharge(1000, 'Bus', 'SCHEDULE', settings);
    expect(busRes.isApplicable).toBe(false);
    expect(busRes.platformCharge).toBe(0);
    expect(busRes.netDriverEarning).toBe(1000);

    // Car is enabled -> charge is 10%
    const carRes = calculatePlatformCharge(1000, 'Car', 'INSTANT', settings);
    expect(carRes.isApplicable).toBe(true);
    expect(carRes.platformCharge).toBe(100);
    expect(carRes.netDriverEarning).toBe(900);
  });

  // 5. Instant vs Scheduled booking separate configurable rules
  test('5. Instant and Scheduled Booking separate rules', () => {
    const settings = {
      isEnabled: true,
      chargeType: 'FIXED',
      fixedAmount: 40,
      applicableServices: { bus: true, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: false }
    };

    const scheduledRes = calculatePlatformCharge(500, 'Bus', 'SCHEDULE', settings);
    expect(scheduledRes.isApplicable).toBe(false);
    expect(scheduledRes.platformCharge).toBe(0);

    const instantRes = calculatePlatformCharge(500, 'Car', 'INSTANT', settings);
    expect(instantRes.isApplicable).toBe(true);
    expect(instantRes.platformCharge).toBe(40);
    expect(instantRes.netDriverEarning).toBe(460);
  });

  // 6. Minimum / Maximum charge limits
  test('6. Minimum and Maximum limits enforcement', () => {
    const settingsMinMax = {
      isEnabled: true,
      chargeType: 'PERCENTAGE',
      percentageRate: 10,
      applicableServices: { bus: true, evSewa: true, car: true },
      applicableBookingModes: { instant: true, scheduled: true },
      minCharge: 30,
      maxCharge: 150
    };

    // Small fare (100 * 10% = 10) -> Clamped up to minCharge (30)
    const smallFareRes = calculatePlatformCharge(100, 'Car', 'INSTANT', settingsMinMax);
    expect(smallFareRes.platformCharge).toBe(30);
    expect(smallFareRes.netDriverEarning).toBe(70);

    // Large fare (3000 * 10% = 300) -> Clamped down to maxCharge (150)
    const largeFareRes = calculatePlatformCharge(3000, 'Car', 'INSTANT', settingsMinMax);
    expect(largeFareRes.platformCharge).toBe(150);
    expect(largeFareRes.netDriverEarning).toBe(2850);
  });

  // 7. Security: Super Admin only can modify settings, unauthorized rejected
  test('7. Unauthorized user cannot update platform charge settings', async () => {
    // Non-super-admin (sub-admin)
    const subAdminRes = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({ isEnabled: true, percentageRate: 12 });

    expect(subAdminRes.status).toBe(403);

    // Driver role
    const driverRes = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ isEnabled: true, percentageRate: 12 });

    expect(driverRes.status).toBe(403);
  });

  // 8. Super Admin can update settings and validation guards against invalid values
  test('8. Super Admin updates settings with validation', async () => {
    // Negative percentage rejection
    const invalidRes = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ percentageRate: -5 });
    expect(invalidRes.status).toBe(400);

    // Percentage > 100 rejection
    const over100Res = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ percentageRate: 125 });
    expect(over100Res.status).toBe(400);

    // Valid update
    const validRes = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        isEnabled: true,
        chargeType: 'PERCENTAGE',
        percentageRate: 10,
        fixedAmount: 60,
        applicableServices: { bus: true, evSewa: true, car: true },
        applicableBookingModes: { instant: true, scheduled: true },
        minCharge: 10,
        maxCharge: 200
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.data.percentageRate).toBe(10);
    expect(validRes.body.data.isEnabled).toBe(true);
  });

  // 9. End-to-end ride completion applies snapshot and credits driver wallet correctly
  test('9. Ride completion creates snapshot and credits wallet idempotently (no double deduction)', async () => {
    const booking = await Booking.create({
      bookingId: `BK-TEST-END-${Date.now()}`,
      customer: { name: 'PlatformChargeCustomer', phone: '9841000000' },
      driver: driverProfile1._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'INSTANT',
      pickupLocation: 'Kathmandu Mall',
      dropLocation: 'Tribhuvan International Airport',
      fare: 1000,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending',
      bookingStatus: 'Ongoing',
      rideStatus: 'Started',
      otpVerified: true
    });

    const initialDriver = await Driver.findById(driverProfile1._id);
    const initialBalance = initialDriver.walletBalance || 0;

    // Complete ride as driver 1
    const completeRes = await request(app)
      .post(`/api/driver/rides/${booking.bookingId}/end`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({});

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.bookingStatus).toBe('Completed');
    expect(updatedBooking.platformChargeSnapshot).toBeDefined();
    expect(updatedBooking.platformChargeSnapshot.isCalculated).toBe(true);
    expect(updatedBooking.platformChargeSnapshot.grossFare).toBe(1000);
    expect(updatedBooking.platformChargeSnapshot.platformCharge).toBe(100);
    expect(updatedBooking.platformChargeSnapshot.netDriverEarning).toBe(900);
    expect(updatedBooking.driverPaymentAmount).toBe(900);

    const driverAfterEnd = await Driver.findById(driverProfile1._id);
    expect(driverAfterEnd.walletBalance).toBe(initialBalance + 900);

    // Test Idempotency: repeating completion must NOT credit twice or charge twice
    const repeatRes = await request(app)
      .post(`/api/driver/rides/${booking.bookingId}/end`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({});

    expect(repeatRes.status).toBe(200);
    const driverAfterRepeat = await Driver.findById(driverProfile1._id);
    expect(driverAfterRepeat.walletBalance).toBe(initialBalance + 900);
  });

  // 10. Historical earnings remain unchanged when admin updates settings later
  test('10. Historical completed bookings snapshot remains unchanged when settings change', async () => {
    const historicalBooking = await Booking.create({
      bookingId: `BK-TEST-HIST-${Date.now()}`,
      customer: { name: 'PlatformChargeCustomer', phone: '9841000000' },
      driver: driverProfile1._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'INSTANT',
      pickupLocation: 'Patan Durbar Square',
      dropLocation: 'Boudhanath Stupa',
      fare: 1000,
      driverPaymentAmount: 900,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Paid',
      bookingStatus: 'Completed',
      rideStatus: 'Completed',
      platformChargeSnapshot: {
        grossFare: 1000,
        platformCharge: 100,
        chargeType: 'PERCENTAGE',
        chargeRateOrAmount: 10,
        netDriverEarning: 900,
        currency: 'NPR',
        platformChargeSettingsVersion: 1,
        calculatedAt: new Date(),
        isCalculated: true
      }
    });

    // Admin updates settings to 25%
    await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        percentageRate: 25,
        chargeType: 'PERCENTAGE'
      });

    // Verify historical booking snapshot did not change
    const checkBooking = await Booking.findById(historicalBooking._id);
    expect(checkBooking.platformChargeSnapshot.platformCharge).toBe(100);
    expect(checkBooking.platformChargeSnapshot.netDriverEarning).toBe(900);
    expect(checkBooking.platformChargeSnapshot.chargeRateOrAmount).toBe(10);
  });

  // 11. Driver data isolation: driver cannot view other drivers earnings
  test('11. Driver earnings API ownership validation - driver cannot access another driver data', async () => {
    const driver1Earnings = await request(app)
      .get('/api/driver/earnings')
      .set('Authorization', `Bearer ${driver1Token}`);
    expect(driver1Earnings.status).toBe(200);
    expect(driver1Earnings.body.success).toBe(true);

    const driver2Earnings = await request(app)
      .get('/api/driver/earnings')
      .set('Authorization', `Bearer ${driver2Token}`);
    expect(driver2Earnings.status).toBe(200);
    expect(driver2Earnings.body.success).toBe(true);
    // Driver 2 wallet balance is 0 and independent of driver 1
    expect(driver2Earnings.body.data.walletBalance).toBe(0);
  });

  // 12. Admin platform charge report endpoint generates correct aggregate metrics
  test('12. GET /api/admin/platform-charge/reports returns verified audited breakdown', async () => {
    const reportRes = await request(app)
      .get('/api/admin/platform-charge/reports')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);
    expect(reportRes.body.data.summary).toBeDefined();
    expect(reportRes.body.data.serviceBreakdown).toBeDefined();
    expect(reportRes.body.data.serviceBreakdown.Car).toBeDefined();
    expect(Array.isArray(reportRes.body.data.bookings)).toBe(true);
  });

  // 13. Persistence & calculation test: Save 10% vs 15% and calculate new booking
  test('13. Persistence & calculation test: Saving 10% vs 15% and calculating new eligible bookings', async () => {
    // A. Update setting to 10%
    const update10Res = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        isEnabled: true,
        chargeType: 'PERCENTAGE',
        percentageRate: 10,
        applicableServices: { bus: true, evSewa: true, car: true },
        applicableBookingModes: { instant: true, scheduled: true }
      });
    expect(update10Res.status).toBe(200);

    // Read back from DB
    const settings10 = await PlatformChargeSettings.getEffectiveSettings();
    expect(settings10.percentageRate).toBe(10);
    expect(settings10.isEnabled).toBe(true);

    // Calculate new booking with 10%: Gross 1000 -> Charge 100, Net 900
    const calc10 = calculatePlatformCharge(1000, 'Car', 'INSTANT', settings10);
    expect(calc10.platformCharge).toBe(100);
    expect(calc10.netDriverEarning).toBe(900);

    // B. Update setting to 15%
    const update15Res = await request(app)
      .put('/api/admin/platform-charge/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        isEnabled: true,
        chargeType: 'PERCENTAGE',
        percentageRate: 15,
        applicableServices: { bus: true, evSewa: true, car: true },
        applicableBookingModes: { instant: true, scheduled: true }
      });
    expect(update15Res.status).toBe(200);

    // Read back from DB
    const settings15 = await PlatformChargeSettings.getEffectiveSettings();
    expect(settings15.percentageRate).toBe(15);
    expect(settings15.isEnabled).toBe(true);

    // Calculate new booking with 15%: Gross 1000 -> Charge 150, Net 850
    const calc15 = calculatePlatformCharge(1000, 'Car', 'INSTANT', settings15);
    expect(calc15.platformCharge).toBe(150);
    expect(calc15.netDriverEarning).toBe(850);
  });
});
