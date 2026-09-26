const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
const ServiceControl = require('../src/models/ServiceControl');

describe('Optional Instant Booking', () => {
  let customer;
  let secondCustomer;
  let driverUser;
  let driver;
  let vehicle;
  let customerToken;
  let secondCustomerToken;
  let driverToken;
  let serviceControl;
  let previousServiceControl;
  let createdServiceControl = false;
  const suffix = Date.now().toString().slice(-8);

  beforeAll(async () => {
    await connectTestDB();
    await Booking.init();

    serviceControl = await ServiceControl.findOne();
    if (serviceControl) {
      previousServiceControl = {
        busService: serviceControl.busService,
        instantBookingEnabled: serviceControl.instantBookingEnabled
      };
    } else {
      serviceControl = await ServiceControl.create({ busService: 'Active' });
      createdServiceControl = true;
    }
    serviceControl.busService = 'Active';
    serviceControl.instantBookingEnabled = false;
    await serviceControl.save();

    customer = await User.create({
      name: 'Instant Booking Customer',
      email: `instant_customer_${suffix}@test.com`,
      phone: `98${suffix}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    secondCustomer = await User.create({
      name: 'Second Instant Customer',
      email: `instant_customer_two_${suffix}@test.com`,
      phone: `97${suffix}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    driverUser = await User.create({
      name: 'Instant Booking Driver',
      email: `instant_driver_${suffix}@test.com`,
      phone: `96${suffix}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });

    customerToken = jwt.sign({ id: customer._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    secondCustomerToken = jwt.sign({ id: secondCustomer._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-INSTANT-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });
    vehicle = await Vehicle.create({
      vehicleNumber: `INSTANT${suffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Test Bus',
      vehicleModel: 'Test Model',
      vehicleName: 'Instant Test Bus',
      ownerName: 'Test Owner',
      ownerMobileNumber: `95${suffix}`,
      assignedDriver: driver._id,
      vehicleStatus: 'Active',
      fareRate: 500,
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });
    driver.assignedVehicle = vehicle._id;
    await driver.save();
  });

  beforeEach(async () => {
    const bookings = await Booking.find({ vehicle: vehicle._id }).select('_id').lean();
    await Payment.deleteMany({ booking: { $in: bookings.map(booking => booking._id) } });
    await Booking.deleteMany({ vehicle: vehicle._id });
    await Notification.deleteMany({ recipientId: { $in: [customer._id, secondCustomer._id, driver._id] } });
  });

  afterAll(async () => {
    if (vehicle) await Vehicle.deleteOne({ _id: vehicle._id });
    if (driver) await Driver.deleteOne({ _id: driver._id });
    if (customer || secondCustomer || driverUser) {
      await User.deleteMany({
        _id: { $in: [customer?._id, secondCustomer?._id, driverUser?._id].filter(Boolean) }
      });
    }
    if (serviceControl) {
      if (createdServiceControl) {
        await ServiceControl.deleteOne({ _id: serviceControl._id });
      } else {
        await ServiceControl.updateOne({ _id: serviceControl._id }, {
          $set: previousServiceControl
        });
      }
    }
    await closeTestDB();
  });

  const submitBooking = (token, bookingMode = 'INSTANT', additionalFields = {}) => request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      vehicleId: vehicle._id,
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      travelDate: new Date().toISOString(),
      bookingMode,
      ...additionalFields
    });

  test('keeps the existing normal booking and driver request flow when instant mode is disabled', async () => {
    serviceControl.instantBookingEnabled = false;
    await serviceControl.save();

    const instantDisabled = await submitBooking(customerToken);
    expect(instantDisabled.status).toBe(403);
    expect(instantDisabled.body.code).toBe('INSTANT_BOOKING_DISABLED');

    const response = await submitBooking(customerToken, 'NORMAL');
    expect(response.status).toBe(201);
    expect(response.body.data.bookingMode).toBe('NORMAL');
    expect(response.body.data.driverConfirmed).toBe(false);

    const requests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(requests.status).toBe(200);
    expect(requests.body.data.some(booking => booking._id === response.body.data._id)).toBe(true);
  });

  test('assigns an eligible online driver and keeps instant bookings out of normal requests', async () => {
    serviceControl.instantBookingEnabled = true;
    await serviceControl.save();

    const response = await submitBooking(customerToken);
    expect(response.status).toBe(201);
    expect(response.body.data.bookingMode).toBe('INSTANT');
    expect(response.body.data.driver.toString()).toBe(driver._id.toString());
    expect(response.body.data.driverConfirmed).toBe(true);
    expect(response.body.data.driverConfirmationStatus).toBe('Confirmed');

    const requests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(requests.status).toBe(200);
    expect(requests.body.data).toEqual([]);

    const active = await request(app)
      .get('/api/driver/active-bookings')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(active.status).toBe(200);
    expect(active.body.data.some(booking => booking._id === response.body.data._id)).toBe(true);
  });

  test('rejects instant assignment for wrong-route, offline, or suspended drivers without creating a booking', async () => {
    serviceControl.instantBookingEnabled = true;
    await serviceControl.save();

    vehicle.route = { origin: 'Delhi', destination: 'Agra' };
    await vehicle.save();
    const wrongRoute = await submitBooking(customerToken);
    expect(wrongRoute.status).toBe(409);
    expect(wrongRoute.body.code).toBe('INSTANT_BOOKING_UNAVAILABLE');

    vehicle.route = { origin: 'Delhi', destination: 'Jaipur' };
    await vehicle.save();
    driver.isOnline = false;
    await driver.save();
    const offline = await submitBooking(customerToken);
    expect(offline.status).toBe(409);

    driver.isOnline = true;
    driver.driverStatus = 'Suspended';
    await driver.save();
    const suspended = await submitBooking(customerToken);
    expect(suspended.status).toBe(409);

    expect(await Booking.countDocuments({ vehicle: vehicle._id })).toBe(0);
  });

  test('allows only one concurrent instant booking to claim a driver', async () => {
    serviceControl.instantBookingEnabled = true;
    await serviceControl.save();

    const responses = await Promise.all([
      submitBooking(customerToken),
      submitBooking(secondCustomerToken)
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    expect(await Booking.countDocuments({
      vehicle: vehicle._id,
      bookingMode: 'INSTANT',
      driver: driver._id
    })).toBe(1);
  });

  test('keeps instant offline-cash bookings assigned and does not rebroadcast as a request', async () => {
    serviceControl.instantBookingEnabled = true;
    await serviceControl.save();

    const created = await submitBooking(customerToken, 'INSTANT', { paymentMethod: 'Offline Cash' });
    expect(created.status).toBe(201);
    const confirmed = await request(app)
      .post(`/api/bookings/${created.body.data._id}/offline-cash`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.booking.bookingMode).toBe('INSTANT');
    expect(confirmed.body.data.booking.bookingStatus).toBe('Awaiting Cash Collection');
    expect(confirmed.body.data.booking.driverConfirmed).toBe(true);
    const driverRequests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(driverRequests.body.data).toEqual([]);
  });
});
