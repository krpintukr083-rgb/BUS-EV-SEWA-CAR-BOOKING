const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { connectTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const ServiceControl = require('../src/models/ServiceControl');

describe('Instant Booking Driver Request Delivery & Stale Booking Isolation', () => {
  let customerUser, driverUser1, driverUser2;
  let driver1, driver2;
  let vehicleBus, vehicleEv, vehicleCar, vehicleInactive, vehiclePending;
  let customerToken, driver1Token, driver2Token;
  const suffix = Date.now().toString().slice(-8);

  beforeAll(async () => {
    await connectTestDB();
    await Booking.init();

    await ServiceControl.findOneAndUpdate(
      {},
      { busService: 'Active', instantBookingEnabled: true },
      { upsert: true }
    );

    customerUser = await User.create({
      name: 'Test Customer',
      email: `cust_${suffix}@test.com`,
      phone: `98${suffix}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });

    driverUser1 = await User.create({
      name: 'Driver One',
      email: `driver1_${suffix}@test.com`,
      phone: `91${suffix}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });

    driverUser2 = await User.create({
      name: 'Driver Two',
      email: `driver2_${suffix}@test.com`,
      phone: `92${suffix}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });

    customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    driver1Token = jwt.sign({ id: driverUser1._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    driver2Token = jwt.sign({ id: driverUser2._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    driver1 = await Driver.create({
      user: driverUser1._id,
      name: 'Driver One',
      mobileNumber: driverUser1.phone,
      drivingLicenceNumber: `DL-1-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });

    driver2 = await Driver.create({
      user: driverUser2._id,
      name: 'Driver Two',
      mobileNumber: driverUser2.phone,
      drivingLicenceNumber: `DL-2-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });

    vehicleEv = await Vehicle.create({
      vehicleNumber: `EV${suffix}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Sedan EV',
      vehicleModel: 'Model EV',
      vehicleName: 'Test EV',
      ownerName: 'Owner EV',
      ownerMobileNumber: `91${suffix}`,
      vehicleStatus: 'Active',
      fareRate: 500,
      assignedDriver: driver1._id,
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });

    vehicleBus = await Vehicle.create({
      vehicleNumber: `BUS${suffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper',
      vehicleModel: 'Model Bus',
      vehicleName: 'Test Bus',
      ownerName: 'Owner Bus',
      ownerMobileNumber: `92${suffix}`,
      vehicleStatus: 'Active',
      fareRate: 600,
      assignedDriver: driver2._id,
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });

    vehicleInactive = await Vehicle.create({
      vehicleNumber: `INACT${suffix}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Sedan EV',
      vehicleModel: 'Model Inact',
      vehicleName: 'Test Inact',
      ownerName: 'Owner Inact',
      ownerMobileNumber: `93${suffix}`,
      vehicleStatus: 'Inactive',
      fareRate: 500,
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });

    vehiclePending = await Vehicle.create({
      vehicleNumber: `PEND${suffix}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Sedan EV',
      vehicleModel: 'Model Pend',
      vehicleName: 'Test Pend',
      ownerName: 'Owner Pend',
      ownerMobileNumber: `94${suffix}`,
      vehicleStatus: 'Pending',
      fareRate: 500,
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });

    driver1.assignedVehicle = vehicleEv._id;
    await driver1.save();

    driver2.assignedVehicle = vehicleBus._id;
    await driver2.save();
  });

  afterEach(async () => {
    await Booking.deleteMany({
      $or: [
        { user: customerUser._id },
        { driver: { $in: [driver1._id, driver2._id] } }
      ]
    });
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [customerUser._id, driverUser1._id, driverUser2._id] } });
    await Driver.deleteMany({ _id: { $in: [driver1._id, driver2._id] } });
    await Vehicle.deleteMany({ _id: { $in: [vehicleEv._id, vehicleBus._id, vehicleInactive._id, vehiclePending._id] } });
  });

  const createBooking = (overrides = {}) => {
    const bookingId = `BK-${Math.floor(1000000 + Math.random() * 9000000)}`;
    return Booking.create({
      bookingId,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      serviceType: 'Any',
      bookingMode: 'INSTANT',
      passengerDetails: [{ name: 'Test Passenger', age: 25, gender: 'Male' }],
      fare: 0,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driverConfirmed: false,
      rideStatus: 'None',
      ...overrides
    });
  };

  test('TEST 1: Fresh Instant booking appears when driver has no active Instant ride', async () => {
    const b = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === b.bookingId)).toBe(true);
  });

  test('TEST 2: Fresh Instant booking appears when driver has stale Instant booking with non-active/None rideStatus', async () => {
    // Create stale Instant booking for driver1 with rideStatus: 'None'
    await createBooking({
      driver: driver1._id,
      driverConfirmed: true,
      bookingStatus: 'Awaiting Cash Collection',
      rideStatus: 'None'
    });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(true);
  });

  test('TEST 3: Fresh Instant booking does NOT appear when driver has genuine active Instant ride', async () => {
    // Create genuinely active Instant booking for driver1 with rideStatus: 'Started'
    await createBooking({
      driver: driver1._id,
      driverConfirmed: true,
      bookingStatus: 'Ongoing',
      rideStatus: 'Started'
    });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(false);
  });

  test('TEST 4: Completed Instant booking does not block new Instant booking', async () => {
    await createBooking({
      driver: driver1._id,
      driverConfirmed: true,
      bookingStatus: 'Completed',
      rideStatus: 'Completed'
    });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(true);
  });

  test('TEST 5: Cancelled Instant booking does not block new Instant booking', async () => {
    await createBooking({
      driver: driver1._id,
      driverConfirmed: false,
      bookingStatus: 'Cancelled',
      rideStatus: 'Cancelled'
    });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(true);
  });

  test('TEST 6: Pending/non-active Instant booking does not block new Instant booking', async () => {
    await createBooking({
      driver: driver1._id,
      driverConfirmed: false,
      bookingStatus: 'Pending Driver Confirmation',
      rideStatus: 'None'
    });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(true);
  });

  test('TEST 7: Wrong-route Instant booking remains excluded', async () => {
    const wrongRouteBooking = await createBooking({
      pickupLocation: 'Mumbai',
      dropLocation: 'Pune'
    });

    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === wrongRouteBooking.bookingId)).toBe(false);
  });

  test('TEST 8: Inactive vehicle remains excluded', async () => {
    // Driver with inactive vehicle
    const inactiveDriverUser = await User.create({
      name: 'Inactive Driver',
      email: `inact_${Date.now()}@test.com`,
      phone: `93${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });
    const inactiveDriver = await Driver.create({
      user: inactiveDriverUser._id,
      name: 'Inactive Driver',
      mobileNumber: inactiveDriverUser.phone,
      drivingLicenceNumber: `DL-INACT-${Date.now()}`,
      driverStatus: 'Active',
      isOnline: true,
      assignedVehicle: vehicleInactive._id
    });
    const inactToken = jwt.sign({ id: inactiveDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${inactToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(false);

    await Driver.deleteOne({ _id: inactiveDriver._id });
    await User.deleteOne({ _id: inactiveDriverUser._id });
  });

  test('TEST 9: Pending vehicle remains excluded', async () => {
    const pendingDriverUser = await User.create({
      name: 'Pending Driver',
      email: `pend_${Date.now()}@test.com`,
      phone: `95${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });
    const pendingDriver = await Driver.create({
      user: pendingDriverUser._id,
      name: 'Pending Driver',
      mobileNumber: pendingDriverUser.phone,
      drivingLicenceNumber: `DL-PEND-${Date.now()}`,
      driverStatus: 'Active',
      isOnline: true,
      assignedVehicle: vehiclePending._id
    });
    const pendToken = jwt.sign({ id: pendingDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    const freshBooking = await createBooking();
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${pendToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(false);

    await Driver.deleteOne({ _id: pendingDriver._id });
    await User.deleteOne({ _id: pendingDriverUser._id });
  });

  test('TEST 10: Bus and EV-Sewa same-route drivers both receive Instant requests', async () => {
    const freshBooking = await createBooking();

    const [res1, res2] = await Promise.all([
      request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${driver1Token}`),
      request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${driver2Token}`)
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(true);
    expect(res2.body.data.some(req => req.bookingId === freshBooking.bookingId)).toBe(true);
  });

  test('TEST 11 & 12: First driver wins, second driver receives 409', async () => {
    const freshBooking = await createBooking();

    // Driver 1 accepts first
    const accept1 = await request(app)
      .post(`/api/driver/booking-requests/${freshBooking._id}/accept`)
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(accept1.status).toBe(200);
    expect(accept1.body.success).toBe(true);
    expect(accept1.body.data.bookingId).toBe(freshBooking.bookingId);

    // Driver 2 attempts to accept the same booking
    const accept2 = await request(app)
      .post(`/api/driver/booking-requests/${freshBooking._id}/accept`)
      .set('Authorization', `Bearer ${driver2Token}`);

    expect([400, 403, 409]).toContain(accept2.status);
    expect(accept2.body.success).toBe(false);
  });

  test('TEST 15 & 16: Instant fare displays Calculating (null/0) before claim and actual fare after claim', async () => {
    const freshBooking = await createBooking();

    // Before claim:
    const reqRes = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver1Token}`);
    const found = reqRes.body.data.find(r => r.bookingId === freshBooking.bookingId);
    expect(found).toBeDefined();
    expect(found.fare == null || found.fare === 0).toBe(true);

    // Accept booking:
    const acceptRes = await request(app)
      .post(`/api/driver/booking-requests/${freshBooking._id}/accept`)
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.fare).toBe(500); // vehicleEv.fareRate is 500
  });

  test('TEST 18: Schedule Booking regression test proves existing schedule behavior remains unchanged', async () => {
    const schedBookingId = `BK-SCHED-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const schedBooking = await Booking.create({
      bookingId: schedBookingId,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      serviceType: 'Bus',
      bookingMode: 'NORMAL',
      passengerDetails: [{ name: 'Sched Passenger', age: 30, gender: 'Female' }],
      fare: 600,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driverConfirmed: false,
      rideStatus: 'None'
    });

    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driver2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(req => req.bookingId === schedBookingId)).toBe(true);

    const accept = await request(app)
      .post(`/api/driver/booking-requests/${schedBooking._id}/accept`)
      .set('Authorization', `Bearer ${driver2Token}`);

    expect(accept.status).toBe(200);
    expect(accept.body.data.bookingId).toBe(schedBookingId);
  });
});
