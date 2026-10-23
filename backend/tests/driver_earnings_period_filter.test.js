const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Booking = require('../src/models/Booking');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

jest.setTimeout(30000);

describe('Driver Earnings Period Filter & Platform Charge Regression Tests', () => {
  let driverUser;
  let driverProfile;
  let driverToken;
  let createdBookingIds = [];

  beforeAll(async () => {
    await connectTestDB();

    driverUser = await User.create({
      name: 'Period Filter Driver',
      email: `period_driver_${Date.now()}@transportplatform.com`,
      phone: `98333${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    driverProfile = await Driver.create({
      user: driverUser._id,
      name: 'Period Filter Driver',
      phone: driverUser.phone,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-PERIOD-${Date.now()}`,
      walletBalance: 2500,
      totalEarnings: 8000,
      totalCommission: 1200,
      totalWithdrawn: 5500,
      driverStatus: 'Active',
      isOnline: true
    });

    const now = new Date();

    // 1. Today booking: completed 2 hours ago (within today)
    const todayDate = new Date(now.getTime() - (2 * 60 * 60 * 1000));
    const bToday = await Booking.create({
      bookingId: `BK-TEST-TODAY-${Date.now()}`,
      customer: { name: 'Customer Today', phone: '9841111111' },
      driver: driverProfile._id,
      serviceType: 'Car',
      bookingMode: 'INSTANT',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Lalitpur',
      fare: 1000,
      driverPaymentAmount: 900,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Paid',
      bookingStatus: 'Completed',
      rideStatus: 'Completed',
      createdAt: todayDate,
      completedAt: todayDate,
      platformChargeSnapshot: {
        grossFare: 1000,
        platformCharge: 100,
        chargeType: 'PERCENTAGE',
        chargeRateOrAmount: 10,
        netDriverEarning: 900,
        currency: 'NPR',
        platformChargeSettingsVersion: 1,
        calculatedAt: todayDate,
        isCalculated: true
      }
    });
    createdBookingIds.push(bToday._id);

    // 2. Weekly booking (3 days ago - outside today, inside weekly & monthly)
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    const bWeek = await Booking.create({
      bookingId: `BK-TEST-WEEK-${Date.now()}`,
      customer: { name: 'Customer Week', phone: '9842222222' },
      driver: driverProfile._id,
      serviceType: 'EV-Sewa',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Pokhara',
      dropLocation: 'Chitwan',
      fare: 2000,
      driverPaymentAmount: 1800,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Paid',
      bookingStatus: 'Completed',
      rideStatus: 'Completed',
      createdAt: threeDaysAgo,
      completedAt: threeDaysAgo,
      platformChargeSnapshot: {
        grossFare: 2000,
        platformCharge: 200,
        chargeType: 'PERCENTAGE',
        chargeRateOrAmount: 10,
        netDriverEarning: 1800,
        currency: 'NPR',
        platformChargeSettingsVersion: 1,
        calculatedAt: threeDaysAgo,
        isCalculated: true
      }
    });
    createdBookingIds.push(bWeek._id);

    // 3. Monthly booking (15 days ago - outside weekly, inside monthly)
    // Legacy style without snapshot (should use fallback: fare - driverPaymentAmount = charge)
    const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    const bMonth = await Booking.create({
      bookingId: `BK-TEST-MONTH-${Date.now()}`,
      customer: { name: 'Customer Month', phone: '9843333333' },
      driver: driverProfile._id,
      serviceType: 'Bus',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Birgunj',
      dropLocation: 'Kathmandu',
      fare: 1500,
      driverPaymentAmount: 1200,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Paid',
      bookingStatus: 'Completed',
      rideStatus: 'Completed',
      createdAt: fifteenDaysAgo,
      completedAt: fifteenDaysAgo
      // No snapshot
    });
    createdBookingIds.push(bMonth._id);

    // 4. Old booking (45 days ago - outside today, weekly, and monthly)
    const fortyFiveDaysAgo = new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000));
    const bOld = await Booking.create({
      bookingId: `BK-TEST-OLD-${Date.now()}`,
      customer: { name: 'Customer Old', phone: '9844444444' },
      driver: driverProfile._id,
      serviceType: 'Car',
      bookingMode: 'INSTANT',
      pickupLocation: 'Bhaktapur',
      dropLocation: 'Patan',
      fare: 500,
      driverPaymentAmount: 450,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Paid',
      bookingStatus: 'Completed',
      rideStatus: 'Completed',
      createdAt: fortyFiveDaysAgo,
      completedAt: fortyFiveDaysAgo,
      platformChargeSnapshot: {
        grossFare: 500,
        platformCharge: 50,
        chargeType: 'PERCENTAGE',
        chargeRateOrAmount: 10,
        netDriverEarning: 450,
        currency: 'NPR',
        platformChargeSettingsVersion: 1,
        calculatedAt: fortyFiveDaysAgo,
        isCalculated: true
      }
    });
    createdBookingIds.push(bOld._id);
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    if (driverProfile) {
      await Driver.deleteOne({ _id: driverProfile._id });
    }
    if (driverUser) {
      await User.deleteOne({ _id: driverUser._id });
    }
    await closeTestDB();
  });

  test('1. period=today returns only bookings from today, exact math (gross - charge = net)', async () => {
    const res = await request(app)
      .get('/api/driver/earnings?period=today')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.period).toBe('today');
    expect(data.grossFare).toBe(1000);
    expect(data.platformCharge).toBe(100);
    expect(data.commission).toBe(100);
    expect(data.netEarnings).toBe(900);
    expect(data.completedTrips).toBe(1);

    // Verify grossFare - platformCharge = netEarnings
    expect(data.grossFare - data.platformCharge).toBe(data.netEarnings);

    // Lifetime balance remains untouched
    expect(data.walletBalance).toBe(2500);
    expect(data.totalEarnings).toBe(8000);
    expect(data.totalWithdrawn).toBe(5500);
  });

  test('2. period=weekly returns bookings within last 7 days (today + 3 days ago)', async () => {
    const res = await request(app)
      .get('/api/driver/earnings?period=weekly')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.period).toBe('weekly');
    // Today (1000 gross, 100 charge, 900 net) + 3 days ago (2000 gross, 200 charge, 1800 net)
    expect(data.grossFare).toBe(3000);
    expect(data.platformCharge).toBe(300);
    expect(data.netEarnings).toBe(2700);
    expect(data.completedTrips).toBe(2);

    expect(data.grossFare - data.platformCharge).toBe(data.netEarnings);
  });

  test('3. period=monthly returns bookings within last 30 days including legacy fallback booking', async () => {
    const res = await request(app)
      .get('/api/driver/earnings?period=monthly')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.period).toBe('monthly');
    // Today: 1000 gross, 100 charge, 900 net
    // Week: 2000 gross, 200 charge, 1800 net
    // Month (legacy): 1500 gross, 300 charge, 1200 net
    // Sum: Gross: 4500, Charge: 600, Net: 3900
    expect(data.grossFare).toBe(4500);
    expect(data.platformCharge).toBe(600);
    expect(data.netEarnings).toBe(3900);
    expect(data.completedTrips).toBe(3);

    // Excludes the 45-day-old booking completely
    expect(data.grossFare - data.platformCharge).toBe(data.netEarnings);
  });

  test('4. Default parameter (no query param) defaults gracefully to today', async () => {
    const res = await request(app)
      .get('/api/driver/earnings')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe('today');
    expect(res.body.data.netEarnings).toBe(900);
  });

  test('5. Empty period returns zero metrics without NaN or runtime errors', async () => {
    // Create new driver with 0 bookings
    const emptyUser = await User.create({
      name: 'Empty Driver',
      email: `empty_driver_${Date.now()}@transportplatform.com`,
      phone: `98444${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    const emptyToken = jwt.sign({ id: emptyUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    const emptyProfile = await Driver.create({
      user: emptyUser._id,
      name: 'Empty Driver',
      phone: emptyUser.phone,
      mobileNumber: emptyUser.phone,
      drivingLicenceNumber: `DL-EMPTY-${Date.now()}`,
      walletBalance: 0,
      totalEarnings: 0,
      totalCommission: 0,
      totalWithdrawn: 0,
      driverStatus: 'Active'
    });

    const res = await request(app)
      .get('/api/driver/earnings?period=today')
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.grossFare).toBe(0);
    expect(data.platformCharge).toBe(0);
    expect(data.netEarnings).toBe(0);
    expect(data.completedTrips).toBe(0);
    expect(data.walletBalance).toBe(0);

    // Cleanup
    await Driver.deleteOne({ _id: emptyProfile._id });
    await User.deleteOne({ _id: emptyUser._id });
  });

  test('6. Multiple services and booking modes are correctly aggregated within selected period', async () => {
    // Our setup includes Car (INSTANT), EV-Sewa (SCHEDULE), and Bus (SCHEDULE)
    const res = await request(app)
      .get('/api/driver/earnings?period=monthly')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    // Exactly 3 trips across Car, EV-Sewa, Bus
    expect(data.completedTrips).toBe(3);
    expect(data.grossFare).toBe(4500);
    expect(data.platformCharge).toBe(600);
    expect(data.netEarnings).toBe(3900);
  });
});
