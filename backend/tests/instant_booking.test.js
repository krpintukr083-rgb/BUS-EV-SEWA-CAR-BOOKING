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
  let adminUser;
  let driver;
  let vehicle;
  let otherServiceVehicles = [];
  let customerToken;
  let secondCustomerToken;
  let driverToken;
  let adminToken;
  let serviceControl;
  let previousServiceControl;
  let createdServiceControl = false;
  const testBookingIds = [];
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
    adminUser = await User.create({
      name: 'Instant Booking Admin',
      email: `instant_admin_${suffix}@test.com`,
      phone: `94${suffix}`,
      password: 'password123',
      role: 'admin',
      status: 'Active'
    });

    customerToken = jwt.sign({ id: customer._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    secondCustomerToken = jwt.sign({ id: secondCustomer._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });

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

    otherServiceVehicles = await Promise.all(['EV-Sewa', 'Car'].map((serviceType, index) => Vehicle.create({
      vehicleNumber: `INSTANT${serviceType === 'Car' ? 'C' : 'E'}${suffix}`,
      vehicleType: serviceType,
      vehicleCategory: `Test ${serviceType}`,
      vehicleModel: `Test ${serviceType} Model`,
      vehicleName: `Instant Test ${serviceType}`,
      ownerName: 'Test Owner',
      ownerMobileNumber: `93${suffix}`,
      assignedDriver: driver._id,
      vehicleStatus: 'Active',
      fareRate: 500,
      route: { origin: 'Delhi', destination: 'Jaipur' },
      seatingCapacity: index === 0 ? 4 : 1
    })));
  });

  beforeEach(async () => {
    if (testBookingIds.length > 0) {
      const bookingIdPattern = testBookingIds.join('|');
      await Notification.deleteMany({
        $or: [
          { recipientId: { $in: [customer._id, secondCustomer._id] } },
          { recipientRole: 'driver', message: { $regex: bookingIdPattern } }
        ]
      });
      testBookingIds.length = 0;
    }
    const bookings = await Booking.find({ vehicle: vehicle._id }).select('_id').lean();
    await Payment.deleteMany({ booking: { $in: bookings.map(booking => booking._id) } });
    await Booking.deleteMany({ vehicle: vehicle._id });
    await Notification.deleteMany({ recipientId: { $in: [customer._id, secondCustomer._id, driver._id] } });
    vehicle.route = { origin: 'Delhi', destination: 'Jaipur' };
    vehicle.vehicleStatus = 'Active';
    await vehicle.save();
    driver.isOnline = true;
    driver.driverStatus = 'Active';
    driver.assignedVehicle = vehicle._id;
    await driver.save();
  });

  afterAll(async () => {
    if (testBookingIds.length > 0) {
      await Notification.deleteMany({
        $or: [
          { recipientId: { $in: [customer._id, secondCustomer._id] } },
          { recipientRole: 'driver', message: { $regex: testBookingIds.join('|') } }
        ]
      });
    }
    if (vehicle) await Vehicle.deleteOne({ _id: vehicle._id });
    if (otherServiceVehicles.length > 0) {
      await Vehicle.deleteMany({ _id: { $in: otherServiceVehicles.map(item => item._id) } });
    }
    if (driver) await Driver.deleteOne({ _id: driver._id });
    if (customer || secondCustomer || driverUser || adminUser) {
      await User.deleteMany({
        _id: { $in: [customer?._id, secondCustomer?._id, driverUser?._id, adminUser?._id].filter(Boolean) }
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
    })
    .then(response => {
      if (response.status === 201 && response.body.data?.bookingId) {
        testBookingIds.push(response.body.data.bookingId);
      }
      return response;
    });

  const setInstantBookingEnabled = async enabled => {
    serviceControl = await ServiceControl.findByIdAndUpdate(
      serviceControl._id,
      { $set: { instantBookingEnabled: enabled } },
      { new: true }
    );
  };

  test('exposes the optional switch through the admin-only service-control API', async () => {
    const denied = await request(app)
      .put('/api/admin/service-control')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ instantBookingEnabled: true });
    expect(denied.status).toBe(403);

    const enabled = await request(app)
      .put('/api/admin/service-control')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ instantBookingEnabled: true });
    expect(enabled.status).toBe(200);
    expect(enabled.body.data.instantBookingEnabled).toBe(true);

    const invalid = await request(app)
      .put('/api/admin/service-control')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ instantBookingEnabled: 'true' });
    expect(invalid.status).toBe(400);
  });

  test('keeps the existing normal booking and driver request flow when instant mode is disabled', async () => {
    await setInstantBookingEnabled(false);

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
    await setInstantBookingEnabled(true);

    const response = await submitBooking(customerToken);
    expect(response.status).toBe(201);
    expect(response.body.data.bookingMode).toBe('INSTANT');
    expect(response.body.data.driver.toString()).toBe(driver._id.toString());
    expect(response.body.data.driverConfirmed).toBe(true);
    expect(response.body.data.driverConfirmationStatus).toBe('Confirmed');
    expect(await Notification.countDocuments({
      recipientRole: 'driver',
      recipientId: driver._id
    })).toBe(0);

    const requests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(requests.status).toBe(200);
    expect(requests.body.data).toEqual([]);

    const onlinePayment = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: response.body.data._id });
    expect(onlinePayment.status).toBe(200);
    expect(onlinePayment.body.data.booking.bookingMode).toBe('INSTANT');
    expect(onlinePayment.body.data.booking.paymentStatus).toBe('Paid');
    expect(onlinePayment.body.data.booking.bookingStatus).toBe('Confirmed');

    const active = await request(app)
      .get('/api/driver/active-bookings')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(active.status).toBe(200);
    expect(active.body.data.some(booking => booking._id === response.body.data._id)).toBe(true);
  });

  test('rejects instant assignment for wrong-route, offline, or suspended drivers without creating a booking', async () => {
    await setInstantBookingEnabled(true);

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

  test('assigns the selected eligible EV-Sewa and Car drivers using their service-specific vehicles', async () => {
    await setInstantBookingEnabled(true);

    for (const serviceVehicle of otherServiceVehicles) {
      driver.assignedVehicle = serviceVehicle._id;
      await driver.save();
      const response = await submitBooking(customerToken, 'INSTANT', {
        vehicleId: serviceVehicle._id,
        serviceType: serviceVehicle.vehicleType
      });
      expect(response.status).toBe(201);
      expect(response.body.data.serviceType).toBe(serviceVehicle.vehicleType);
      expect(response.body.data.vehicle.toString()).toBe(serviceVehicle._id.toString());
      expect(response.body.data.driver.toString()).toBe(driver._id.toString());
      await Booking.deleteOne({ _id: response.body.data._id });
      await Payment.deleteMany({ booking: response.body.data._id });
    }
  });

  test('allows only one concurrent instant booking to claim a driver', async () => {
    await setInstantBookingEnabled(true);

    const instantAssignmentIndex = (await Booking.collection.indexes())
      .find(index => index.name === 'one_active_instant_booking_per_driver');
    expect(instantAssignmentIndex).toBeDefined();

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
    await setInstantBookingEnabled(true);

    const created = await submitBooking(customerToken, 'INSTANT', { paymentMethod: 'Offline Cash' });
    expect(created.status).toBe(201);
    const confirmed = await request(app)
      .post(`/api/bookings/${created.body.data._id}/offline-cash`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.booking.bookingMode).toBe('INSTANT');
    expect(confirmed.body.data.booking.bookingStatus).toBe('Awaiting Cash Collection');
    expect(confirmed.body.data.booking.driverConfirmed).toBe(true);
    const otpVerification = await request(app)
      .post(`/api/driver/bookings/${created.body.data._id}/verify-otp`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: created.body.data.confirmationOtp });
    expect(otpVerification.status).toBe(200);
    expect(otpVerification.body.data.confirmationOtpVerifiedAt).toBeTruthy();
    expect(await Notification.countDocuments({
      recipientId: customer._id,
      title: 'Booking Confirmed by Driver'
    })).toBe(1);

    const driverRequests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(driverRequests.body.data).toEqual([]);
  });
});
