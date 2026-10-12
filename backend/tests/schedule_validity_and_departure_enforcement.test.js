const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');
const Booking = require('../src/models/Booking');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');
const { isScheduleDeparted } = require('../src/utils/timeFormat');

describe('Schedule Validity and Past Departure Enforcement Suite', () => {
  let customerUser, customerToken;
  let driverUser, driverDoc, driverToken;
  let testBus;
  let pastSchedule, futureSchedule;

  beforeAll(async () => {
    await connectTestDB();

    const timestamp = Date.now();

    // 1. Setup Customer
    customerUser = await User.create({
      name: 'Schedule QA Customer',
      email: `customer_sched_${timestamp}@test.com`,
      phone: `9800${Math.floor(100000 + Math.random() * 900000)}`,
      role: 'customer',
      password: 'Password123!',
      status: 'Active'
    });
    customerToken = jwt.sign(
      { id: customerUser._id, _id: customerUser._id, role: customerUser.role },
      jwtConfig.secret,
      { expiresIn: '2h' }
    );

    // 2. Setup Driver
    driverUser = await User.create({
      name: 'Schedule QA Driver',
      email: `driver_sched_${timestamp}@test.com`,
      phone: `9700${Math.floor(100000 + Math.random() * 900000)}`,
      role: 'driver',
      password: 'Password123!',
      status: 'Active'
    });
    driverDoc = await Driver.create({
      user: driverUser._id,
      name: 'Schedule QA Driver',
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-SCHED-${timestamp}`,
      driverStatus: 'Active',
      isOnline: true,
      route: { origin: 'Kathmandu, Nepal', destination: 'Birgunj, Nepal' }
    });
    driverToken = jwt.sign(
      { id: driverUser._id, _id: driverUser._id, role: 'driver', driverId: driverDoc._id },
      jwtConfig.secret,
      { expiresIn: '2h' }
    );

    // 3. Setup Bus
    testBus = await Vehicle.create({
      vehicleNumber: `BA-TEST-${timestamp.toString().slice(-4)}`,
      vehicleName: 'Yatra Deluxe Test Bus',
      vehicleModel: 'Volvo B11R',
      ownerName: 'Schedule QA Driver',
      ownerMobileNumber: driverUser.phone,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper',
      assignedDriver: driverDoc._id,
      vehicleStatus: 'Active',
      routeActive: true,
      routeApprovalStatus: 'Approved',
      route: { origin: 'Kathmandu, Nepal', destination: 'Birgunj, Nepal' },
      fareRate: 600,
      seatingCapacity: 30
    });
    driverDoc.assignedVehicle = testBus._id;
    await driverDoc.save();

    // 4. Past Schedule (Yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    pastSchedule = await Schedule.create({
      vehicle: testBus._id,
      driver: driverDoc._id,
      origin: 'Kathmandu',
      destination: 'Birgunj',
      travelDate: yesterday,
      departureTime: '07:00 AM',
      status: 'Active',
      fareRate: 600
    });

    // 5. Future Schedule (Tomorrow)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    futureSchedule = await Schedule.create({
      vehicle: testBus._id,
      driver: driverDoc._id,
      origin: 'Kathmandu',
      destination: 'Birgunj',
      travelDate: tomorrow,
      departureTime: '08:00 AM',
      status: 'Active',
      fareRate: 600
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  test('1. TimeFormat helper accurately identifies passed departure vs future departure', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    expect(isScheduleDeparted(yesterday, '07:00 AM')).toBe(true);
    expect(isScheduleDeparted(tomorrow, '08:00 AM')).toBe(false);
  });

  test('2. Backend rejects creating a booking for a past departure schedule (HTTP 400)', async () => {
    const res = await request(app)
      .post('/api/bookings/schedule')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testBus._id.toString(),
        serviceType: 'Bus',
        bookingMode: 'SCHEDULE',
        scheduleId: pastSchedule._id.toString(),
        pickupLocation: 'Kathmandu',
        dropLocation: 'Birgunj',
        travelDate: pastSchedule.travelDate.toISOString(),
        passengerDetails: [{ name: 'Test Passenger', age: 25, gender: 'Male', seatNumber: '01' }],
        paymentMethod: 'Offline Cash'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already passed|past/i);
  });

  test('3. Backend allows creating a booking for a valid future schedule', async () => {
    const res = await request(app)
      .post('/api/bookings/schedule')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testBus._id.toString(),
        serviceType: 'Bus',
        bookingMode: 'SCHEDULE',
        scheduleId: futureSchedule._id.toString(),
        pickupLocation: 'Kathmandu',
        dropLocation: 'Birgunj',
        travelDate: futureSchedule.travelDate.toISOString(),
        passengerDetails: [{ name: 'Test Passenger', age: 25, gender: 'Male', seatNumber: '02' }],
        paymentMethod: 'Offline Cash'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingId).toBeDefined();
    expect(res.body.data.bookingMode).toBe('SCHEDULE');
  });

  test('4. Driver booking-requests filter excludes departed schedules', async () => {
    const expiredBooking = await Booking.create({
      bookingId: `BK-PAST-${Date.now().toString().slice(-4)}`,
      bookingMode: 'SCHEDULE',
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone, email: customerUser.email },
      driver: driverDoc._id,
      vehicle: testBus._id,
      scheduleId: pastSchedule._id,
      serviceType: 'Bus',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Birgunj',
      passengerDetails: [{ name: 'Test', age: 30, gender: 'Male' }],
      fare: 600,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: pastSchedule.travelDate
    });

    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    const returnedIds = (res.body.data || []).map(b => b.bookingId);
    expect(returnedIds).not.toContain(expiredBooking.bookingId);

    await Booking.deleteOne({ _id: expiredBooking._id });
  });

  test('5. Driver cannot accept a request for an expired/departed schedule (HTTP 409)', async () => {
    const expiredBooking = await Booking.create({
      bookingId: `BK-EXPA-${Date.now().toString().slice(-4)}`,
      bookingMode: 'SCHEDULE',
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone, email: customerUser.email },
      driver: driverDoc._id,
      vehicle: testBus._id,
      scheduleId: pastSchedule._id,
      serviceType: 'Bus',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Birgunj',
      passengerDetails: [{ name: 'Test', age: 30, gender: 'Male' }],
      fare: 600,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: pastSchedule.travelDate
    });

    const res = await request(app)
      .post(`/api/driver/booking-requests/${expiredBooking.bookingId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already departed|no longer active/i);

    await Booking.deleteOne({ _id: expiredBooking._id });
  });
});
