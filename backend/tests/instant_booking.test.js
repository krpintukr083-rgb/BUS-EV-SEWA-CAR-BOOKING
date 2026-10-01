const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
  const claimTestDrivers = [];
  const claimTestVehicles = [];
  const claimTestUsers = [];
  const suffix = Date.now().toString().slice(-8);

  beforeAll(async () => {
    await connectTestDB();
    await Booking.init();

    serviceControl = await ServiceControl.findOne();
    if (serviceControl) {
      previousServiceControl = {
        busService: serviceControl.busService,
        instantBookingEnabled: serviceControl.instantBookingEnabled,
        oppositeRouteNotifications: serviceControl.oppositeRouteNotifications
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
    const bookings = await Booking.find({
      $or: [
        { user: { $in: [customer._id, secondCustomer._id] } },
        { vehicle: vehicle._id }
      ]
    }).select('_id').lean();
    const bookingIds = bookings.map(booking => booking._id);
    await Notification.deleteMany({ recipientId: { $in: [customer._id, secondCustomer._id, driver._id] } });
    if (bookingIds.length > 0) {
      await Notification.deleteMany({ entityId: { $in: bookingIds } });
      await Payment.deleteMany({ booking: { $in: bookingIds } });
      await Booking.deleteMany({ _id: { $in: bookingIds } });
    }
    if (claimTestVehicles.length > 0) {
      await Vehicle.deleteMany({ _id: { $in: claimTestVehicles } });
      claimTestVehicles.length = 0;
    }
    if (claimTestDrivers.length > 0) {
      await Driver.deleteMany({ _id: { $in: claimTestDrivers } });
      claimTestDrivers.length = 0;
    }
    if (claimTestUsers.length > 0) {
      await User.deleteMany({ _id: { $in: claimTestUsers } });
      claimTestUsers.length = 0;
    }
    vehicle.route = { origin: 'Delhi', destination: 'Jaipur' };
    vehicle.vehicleStatus = 'Active';
    vehicle.vehicleType = 'Bus';
    await vehicle.save();
    driver.isOnline = true;
    driver.driverStatus = 'Active';
    driver.assignedVehicle = vehicle._id;
    await driver.save();
  });

  afterAll(async () => {
    const bookings = await Booking.find({
      $or: [
        { user: { $in: [customer._id, secondCustomer._id] } },
        { vehicle: { $in: [vehicle._id, ...otherServiceVehicles.map(item => item._id)] } }
      ]
    }).select('_id').lean();
    const bookingIds = bookings.map(booking => booking._id);
    await Notification.deleteMany({
      $or: [
        { recipientId: { $in: [customer._id, secondCustomer._id, driver._id] } },
        ...(bookingIds.length > 0 ? [{ entityId: { $in: bookingIds } }] : [])
      ]
    });
    if (bookingIds.length > 0) {
      await Payment.deleteMany({ booking: { $in: bookingIds } });
      await Booking.deleteMany({ _id: { $in: bookingIds } });
    }
    if (vehicle) await Vehicle.deleteOne({ _id: vehicle._id });
    if (otherServiceVehicles.length > 0) {
      await Vehicle.deleteMany({ _id: { $in: otherServiceVehicles.map(item => item._id) } });
    }
    if (claimTestVehicles.length > 0) await Vehicle.deleteMany({ _id: { $in: claimTestVehicles } });
    if (claimTestDrivers.length > 0) await Driver.deleteMany({ _id: { $in: claimTestDrivers } });
    if (claimTestUsers.length > 0) await User.deleteMany({ _id: { $in: claimTestUsers } });
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
    .post(bookingMode === 'INSTANT' ? '/api/bookings/instant' : '/api/bookings')
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

  const submitInstantRequest = (token, additionalFields = {}) => request(app)
    .post('/api/bookings/instant')
    .set('Authorization', `Bearer ${token}`)
    .send({
      serviceType: 'Any',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      passengerCount: 1,
      passengerDetails: [{ name: 'Instant Passenger', age: 30, gender: 'Male' }],
      travelDate: new Date().toISOString(),
      bookingMode: 'INSTANT',
      paymentMethod: 'Offline Cash',
      ...additionalFields
    });

  const setInstantBookingEnabled = async enabled => {
    serviceControl = await ServiceControl.findByIdAndUpdate(
      serviceControl._id,
      { $set: { instantBookingEnabled: enabled } },
      { new: true }
    );
  };

  const createClaimDriver = async ({
    vehicleType = 'Bus',
    route = { origin: 'Jaipur', destination: 'Delhi' },
    seatingCapacity = 12,
    assignmentDirection = 'vehicle',
    driverStatus = 'Active',
    isOnline = true
  } = {}) => {
    const discriminator = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const uniqueDigits = crypto.randomInt(10000000, 99999999).toString();
    const user = await User.create({
      name: `Instant Claim Driver ${discriminator}`,
      email: `instant_claim_${discriminator}@test.com`,
      phone: `95${uniqueDigits}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });
    claimTestUsers.push(user._id);
    const claimDriver = await Driver.create({
      user: user._id,
      name: user.name,
      mobileNumber: user.phone,
      drivingLicenceNumber: `DL-CLAIM-${discriminator}`,
      driverStatus,
      isOnline
    });
    claimTestDrivers.push(claimDriver._id);
    const claimVehicle = await Vehicle.create({
      vehicleNumber: `C${uniqueDigits}${Date.now().toString().slice(-8)}`,
      vehicleType,
      vehicleCategory: `Test ${vehicleType}`,
      vehicleModel: `Claim Test ${vehicleType}`,
      vehicleName: `Claim Test ${vehicleType}`,
      ownerName: 'Test Owner',
      ownerMobileNumber: user.phone,
      assignedDriver: assignmentDirection === 'vehicle' ? claimDriver._id : null,
      vehicleStatus: 'Active',
      seatingCapacity,
      fareRate: 500,
      route
    });
    claimTestVehicles.push(claimVehicle._id);
    if (assignmentDirection === 'driver') {
      claimDriver.assignedVehicle = claimVehicle._id;
      await claimDriver.save();
    }

    return {
      driver: claimDriver,
      vehicle: claimVehicle,
      token: jwt.sign({ id: user._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' })
    };
  };

  const createUnassignedInstantBooking = async (passengerCount = 1) => Booking.create({
    bookingId: `BK-CLAIM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: customer._id,
    customer: { name: customer.name, phone: customer.phone },
    bookingMode: 'INSTANT',
    serviceType: 'Any',
    pickupLocation: 'Jaipur',
    dropLocation: 'Delhi',
    passengerDetails: Array.from({ length: passengerCount }, (_, index) => ({
      name: `Claim Passenger ${index + 1}`,
      age: 30,
      gender: 'Male'
    })),
    fare: 0,
    paymentMethod: 'Offline Cash',
    paymentStatus: 'Pending Cash',
    bookingStatus: 'Pending Driver Confirmation',
    driverConfirmationStatus: 'Pending',
    driverConfirmed: false,
    rideStatus: 'None'
  });

  const acceptInstantBookingAs = (bookingId, token) => request(app)
    .post(`/api/driver/booking-requests/${bookingId}/accept`)
    .set('Authorization', `Bearer ${token}`);

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

  test('creates an instant request for an eligible driver, who claims it before assignment', async () => {
    await setInstantBookingEnabled(true);

    const response = await submitInstantRequest(customerToken);
    expect(response.status).toBe(201);
    expect(response.body.data.bookingMode).toBe('INSTANT');
    expect(response.body.data.driver).toBeNull();
    expect(response.body.data.vehicle).toBeNull();
    expect(response.body.data.bookingStatus).toBe('Pending Driver Confirmation');
    expect(response.body.data.driverConfirmed).toBe(false);
    expect(response.body.data.fare).toBe(0);
    const bookingId = response.body.data._id;
    expect(await Notification.countDocuments({
      recipientId: driverUser._id,
      entityId: bookingId,
      eventType: 'BOOKING_REQUEST'
    })).toBe(1);

    const requests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(requests.status).toBe(200);
    expect(requests.body.data.some(booking => booking._id === bookingId)).toBe(true);

    const accepted = await request(app)
      .post(`/api/driver/booking-requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(accepted.status).toBe(200);
    const claimedBooking = await Booking.findById(bookingId).lean();
    expect(String(claimedBooking.driver)).toBe(driver._id.toString());
    expect(String(claimedBooking.vehicle)).toBe(vehicle._id.toString());
    expect(claimedBooking.driverConfirmed).toBe(false);
    expect(claimedBooking.driverConfirmationStatus).toBe('Pending');
    expect(claimedBooking.fare).toBe(500);
    expect(await Notification.countDocuments({
      recipientId: customer._id,
      title: 'Ride Request Accepted'
    })).toBe(1);

    const createdOrder = await request(app)
      .post('/api/payments/razorpay/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId });
    expect(createdOrder.status).toBe(200);
    expect(createdOrder.body.data.orderId).toBeTruthy();

    const authorizedPayment = await request(app)
      .post('/api/payments/razorpay/test-pay')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId,
        razorpayOrderId: createdOrder.body.data.orderId,
        status: 'success',
        method: 'UPI'
      });
    expect(authorizedPayment.status).toBe(200);

    const verifiedPayment = await request(app)
      .post('/api/payments/razorpay/verify-payment')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId,
        razorpayOrderId: authorizedPayment.body.data.razorpayOrderId,
        razorpayPaymentId: authorizedPayment.body.data.razorpayPaymentId,
        razorpaySignature: authorizedPayment.body.data.razorpaySignature
      });
    expect(verifiedPayment.status).toBe(200);
    expect(verifiedPayment.body.data.booking.bookingMode).toBe('INSTANT');
    expect(verifiedPayment.body.data.booking.paymentStatus).toBe('Paid');
    expect(verifiedPayment.body.data.booking.bookingStatus).toBe('Pending Driver Confirmation');
    expect(await Payment.countDocuments({ booking: response.body.data._id })).toBe(1);

    const active = await request(app)
      .get('/api/driver/active-bookings')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(active.status).toBe(200);
    expect(active.body.data.some(booking => booking._id === bookingId)).toBe(true);
  });

  test.each(['Active', 'Approved'])(
    'allows an %s same-route driver linked through Vehicle.assignedDriver to claim an unassigned Instant booking',
    async driverStatus => {
      const claimant = await createClaimDriver({ assignmentDirection: 'vehicle', driverStatus });
      const booking = await createUnassignedInstantBooking();

      const accepted = await acceptInstantBookingAs(booking._id, claimant.token);

      expect(accepted.status).toBe(200);
      const claimed = await Booking.findById(booking._id).lean();
      expect(String(claimed.driver)).toBe(String(claimant.driver._id));
      expect(String(claimed.vehicle)).toBe(String(claimant.vehicle._id));
      expect(claimed.serviceType).toBe('Bus');
      expect(claimed.fare).toBe(500);
    }
  );

  test('allows Driver B to claim when same-route Driver A has not claimed the request', async () => {
    const driverA = await createClaimDriver({ assignmentDirection: 'vehicle' });
    const driverB = await createClaimDriver({ assignmentDirection: 'driver' });
    const booking = await createUnassignedInstantBooking();

    const visibleToA = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverA.token}`);
    expect(visibleToA.status).toBe(200);
    expect(visibleToA.body.data.some(item => item._id === booking._id.toString())).toBe(true);

    const accepted = await acceptInstantBookingAs(booking._id, driverB.token);

    expect(accepted.status).toBe(200);
    const claimed = await Booking.findById(booking._id).lean();
    expect(String(claimed.driver)).toBe(String(driverB.driver._id));
    expect(String(claimed.vehicle)).toBe(String(driverB.vehicle._id));
    expect(String(claimed.driver)).not.toBe(String(driverA.driver._id));
  });

  test('Instant OTP uses the claimed route vehicle instead of a mismatched legacy assignedVehicle', async () => {
    const claimant = await createClaimDriver();
    const uniqueDigits = crypto.randomInt(10000000, 99999999).toString();
    const legacyVehicle = await Vehicle.create({
      vehicleNumber: `LEG${uniqueDigits}`,
      vehicleType: 'Car',
      vehicleCategory: 'Legacy Test Car',
      vehicleModel: 'Legacy Test Car',
      vehicleName: 'Legacy Test Car',
      ownerName: 'Test Owner',
      ownerMobileNumber: claimant.driver.mobileNumber,
      assignedDriver: claimant.driver._id,
      vehicleStatus: 'Active',
      seatingCapacity: 4,
      fareRate: 500,
      route: { origin: 'Agra', destination: 'Jaipur' }
    });
    claimTestVehicles.push(legacyVehicle._id);
    claimant.driver.assignedVehicle = legacyVehicle._id;
    await claimant.driver.save();

    const booking = await createUnassignedInstantBooking();
    booking.customerViewOtp = '654321';
    booking.confirmationOtpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await booking.save();

    const accepted = await acceptInstantBookingAs(booking._id, claimant.token);
    expect(accepted.status).toBe(200);
    expect(String(accepted.body.data.vehicle)).toBe(String(claimant.vehicle._id));

    const verified = await request(app)
      .post(`/api/driver/bookings/${booking._id}/verify-otp`)
      .set('Authorization', `Bearer ${claimant.token}`)
      .send({ otp: '654321' });

    expect(verified.status).toBe(200);
    expect(verified.body.data.driverConfirmed).toBe(true);
    expect(String(verified.body.data.vehicle)).toBe(String(claimant.vehicle._id));
    const savedBooking = await Booking.findById(booking._id).lean();
    expect(String(savedBooking.vehicle)).toBe(String(claimant.vehicle._id));
    expect(String(savedBooking.driver)).toBe(String(claimant.driver._id));
  });

  test('scheduled OTP succeeds only for the assigned driver and assigned route vehicle', async () => {
    const booking = await Booking.create({
      bookingId: `BK-SCHEDULE-OTP-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
      user: customer._id,
      customer: { name: customer.name, phone: customer.phone },
      bookingMode: 'SCHEDULE',
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      passengerDetails: [{ name: 'Schedule OTP Passenger', age: 30, gender: 'Male' }],
      fare: 500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driver: driver._id,
      vehicle: vehicle._id,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      customerViewOtp: '654321',
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    const assignedDriverResponse = await request(app)
      .post(`/api/driver/bookings/${booking._id}/verify-otp`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: '654321' });
    expect(assignedDriverResponse.status).toBe(200);

    const otherDriver = await createClaimDriver({
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });
    const unverifiedBooking = await Booking.create({
      bookingId: `BK-SCHEDULE-WRONG-DRIVER-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
      user: customer._id,
      customer: { name: customer.name, phone: customer.phone },
      bookingMode: 'SCHEDULE',
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      passengerDetails: [{ name: 'Schedule OTP Passenger', age: 30, gender: 'Male' }],
      fare: 500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driver: driver._id,
      vehicle: vehicle._id,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      customerViewOtp: '654321',
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });
    const wrongDriverResponse = await request(app)
      .post(`/api/driver/bookings/${unverifiedBooking._id}/verify-otp`)
      .set('Authorization', `Bearer ${otherDriver.token}`)
      .send({ otp: '654321' });
    expect(wrongDriverResponse.status).toBe(403);
    expect(wrongDriverResponse.body.message).toMatch(/assigned vehicle route does not match/i);
  });

  test('scheduled OTP rejects the assigned driver when the assigned vehicle route does not match', async () => {
    const booking = await Booking.create({
      bookingId: `BK-SCHEDULE-ROUTE-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
      user: customer._id,
      customer: { name: customer.name, phone: customer.phone },
      bookingMode: 'SCHEDULE',
      serviceType: 'Bus',
      pickupLocation: 'Agra',
      dropLocation: 'Jaipur',
      passengerDetails: [{ name: 'Schedule Route Passenger', age: 30, gender: 'Male' }],
      fare: 500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driver: driver._id,
      vehicle: vehicle._id,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      customerViewOtp: '654321',
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    const response = await request(app)
      .post(`/api/driver/bookings/${booking._id}/verify-otp`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: '654321' });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/assigned vehicle route does not match/i);
  });

  test('atomically lets only the first eligible same-route driver claim an Instant booking', async () => {
    const driverA = await createClaimDriver();
    const driverB = await createClaimDriver();
    const booking = await createUnassignedInstantBooking();

    const claims = await Promise.all([
      acceptInstantBookingAs(booking._id, driverA.token),
      acceptInstantBookingAs(booking._id, driverB.token)
    ]);

    expect(claims.map(response => response.status).sort()).toEqual([200, 409]);
    const winnerIndex = claims.findIndex(response => response.status === 200);
    const winner = winnerIndex === 0 ? driverA : driverB;
    const claimed = await Booking.findById(booking._id).lean();
    expect(String(claimed.driver)).toBe(String(winner.driver._id));
    expect(String(claimed.vehicle)).toBe(String(winner.vehicle._id));
  });

  test('rejects an opposite-route driver when opposite-route notifications are disabled', async () => {
    const originalOppositeRouteSetting = serviceControl.oppositeRouteNotifications;
    serviceControl = await ServiceControl.findByIdAndUpdate(
      serviceControl._id,
      { $set: { oppositeRouteNotifications: false } },
      { new: true }
    );
    const claimant = await createClaimDriver({
      route: { origin: 'Delhi', destination: 'Jaipur' }
    });
    const booking = await createUnassignedInstantBooking();

    const accepted = await acceptInstantBookingAs(booking._id, claimant.token);

    expect(accepted.status).toBe(403);
    expect(await Booking.findById(booking._id).select('driver vehicle').lean()).toMatchObject({
      driver: null,
      vehicle: null
    });
    serviceControl = await ServiceControl.findByIdAndUpdate(
      serviceControl._id,
      { $set: { oppositeRouteNotifications: originalOppositeRouteSetting } },
      { new: true }
    );
  });

  test('rejects an unrelated-route driver for an unassigned Instant booking', async () => {
    const claimant = await createClaimDriver({
      route: { origin: 'Jaipur', destination: 'Agra' }
    });
    const booking = await createUnassignedInstantBooking();

    const accepted = await acceptInstantBookingAs(booking._id, claimant.token);

    expect(accepted.status).toBe(403);
    expect(await Booking.findById(booking._id).select('driver vehicle').lean()).toMatchObject({
      driver: null,
      vehicle: null
    });
  });

  test.each([
    ['offline', { isOnline: false }],
    ['suspended', { driverStatus: 'Suspended' }]
  ])('rejects an %s driver claiming an unassigned Instant booking', async (_state, driverOptions) => {
    const claimant = await createClaimDriver(driverOptions);
    const booking = await createUnassignedInstantBooking();

    const accepted = await acceptInstantBookingAs(booking._id, claimant.token);

    expect(accepted.status).toBe(403);
    expect(await Booking.findById(booking._id).select('driver vehicle').lean()).toMatchObject({
      driver: null,
      vehicle: null
    });
  });

  test('rejects an otherwise eligible same-route vehicle with insufficient seats', async () => {
    const claimant = await createClaimDriver({ seatingCapacity: 1 });
    const booking = await createUnassignedInstantBooking(2);

    const accepted = await acceptInstantBookingAs(booking._id, claimant.token);

    expect(accepted.status).toBe(409);
    expect(accepted.body.code).toBe('VEHICLE_CAPACITY_FULL');
    expect(await Booking.findById(booking._id).select('driver vehicle').lean()).toMatchObject({
      driver: null,
      vehicle: null
    });
  });

  test.each(['Bus', 'Car', 'EV-Sewa'])(
    'allows serviceType Any Instant bookings to be claimed by a %s vehicle',
    async vehicleType => {
      const claimant = await createClaimDriver({ vehicleType });
      const booking = await createUnassignedInstantBooking();

      const accepted = await acceptInstantBookingAs(booking._id, claimant.token);

      expect(accepted.status).toBe(200);
      const claimed = await Booking.findById(booking._id).lean();
      expect(String(claimed.vehicle)).toBe(String(claimant.vehicle._id));
      expect(claimed.serviceType).toBe(vehicleType);
    }
  );

  test('shows the newly accepted instant booking first in OTP confirmation and verifies its OTP', async () => {
    await setInstantBookingEnabled(true);
    const oldBooking = await Booking.create({
      bookingId: `BK-OLD-${suffix}`,
      bookingMode: 'NORMAL',
      user: customer._id,
      customer: { name: customer.name, phone: customer.phone },
      driver: driver._id,
      vehicle: vehicle._id,
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      fare: 500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });
    const created = await submitBooking(customerToken);
    expect(created.status).toBe(201);
    const freshBooking = created.body.data;
    const otp = freshBooking.confirmationOtp;
    expect(freshBooking.bookingStatus).toBe('Pending Driver Confirmation');
    expect(freshBooking.driverConfirmationStatus).toBe('Pending');
    expect(freshBooking.driverConfirmed).toBe(false);
    expect(freshBooking.confirmationOtpVerifiedAt).toBeNull();

    const requests = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(requests.status).toBe(200);
    expect(requests.body.data.some(booking => booking._id === freshBooking._id.toString())).toBe(true);

    const accepted = await request(app)
      .post(`/api/driver/booking-requests/${freshBooking._id}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.bookingMode).toBe('INSTANT');
    expect(accepted.body.data.bookingStatus).toBe('Pending Driver Confirmation');
    expect(accepted.body.data.driverConfirmationStatus).toBe('Pending');
    expect(accepted.body.data.driverConfirmed).toBe(false);
    expect(accepted.body.data.confirmationOtpVerifiedAt).toBeNull();

    const active = await request(app)
      .get('/api/driver/active-bookings')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(active.status).toBe(200);
    expect(active.headers['cache-control']).toContain('no-store');
    expect(active.body.data[0]._id).toBe(freshBooking._id.toString());
    expect(active.body.data[0].bookingId).toBe(freshBooking.bookingId);
    expect(active.body.data[0].bookingStatus).toBe('Pending Driver Confirmation');
    expect(active.body.data[0].driverConfirmationStatus).toBe('Pending');
    expect(active.body.data[0].driverConfirmed).toBe(false);
    expect(active.body.data[0].confirmationOtpVerifiedAt).toBeNull();
    expect(active.body.data[0].customerViewOtp).toBe(otp);
    expect(active.body.data.some(booking => booking._id === oldBooking._id.toString())).toBe(true);

    const verified = await request(app)
      .post(`/api/driver/bookings/${freshBooking._id}/verify-otp`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp });
    expect(verified.status).toBe(200);
    expect(verified.body.data.confirmationOtpVerifiedAt).toBeTruthy();
    expect(verified.body.data.driverConfirmed).toBe(true);
  });

  test('rejects instant assignment for wrong-route, offline, or suspended drivers without creating a booking', async () => {
    await setInstantBookingEnabled(true);

    const getAvailability = () => request(app)
      .post('/api/bookings/instant/availability')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceType: 'Bus',
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur'
      });

    vehicle.route = { origin: 'Delhi', destination: 'Agra' };
    await vehicle.save();
    const wrongRoute = await getAvailability();
    expect(wrongRoute.status).toBe(200);
    expect(wrongRoute.body.data).toHaveLength(0);

    vehicle.route = { origin: 'Delhi', destination: 'Jaipur' };
    await vehicle.save();
    driver.isOnline = false;
    await driver.save();
    const offline = await getAvailability();
    expect(offline.status).toBe(200);
    expect(offline.body.data).toHaveLength(0);

    driver.isOnline = true;
    driver.driverStatus = 'Suspended';
    await driver.save();
    const suspended = await getAvailability();
    expect(suspended.status).toBe(200);
    expect(suspended.body.data).toHaveLength(0);

    expect(await Booking.countDocuments({ user: customer._id, bookingMode: 'INSTANT' })).toBe(0);
  });

  test('assigns the selected eligible EV-Sewa and Car drivers using their service-specific vehicles', async () => {
    await setInstantBookingEnabled(true);

    for (const serviceVehicle of otherServiceVehicles) {
      driver.assignedVehicle = serviceVehicle._id;
      await driver.save();
      const availability = await request(app)
        .post('/api/bookings/instant/availability')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceType: serviceVehicle.vehicleType,
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur'
        });
      expect(availability.status).toBe(200);
      expect(availability.body.data.some(item =>
        item._id === serviceVehicle._id.toString() &&
        item.vehicleType === serviceVehicle.vehicleType &&
        item.instantDriver._id === driver._id.toString()
      )).toBe(true);

      const response = await submitInstantRequest(customerToken);
      expect(response.status).toBe(201);
      const accepted = await request(app)
        .post(`/api/driver/booking-requests/${response.body.data._id}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);
      expect(accepted.status).toBe(200);
      const assignedBooking = await Booking.findById(response.body.data._id).lean();
      expect(assignedBooking.serviceType).toBe(serviceVehicle.vehicleType);
      expect(String(assignedBooking.vehicle)).toBe(serviceVehicle._id.toString());
      expect(String(assignedBooking.driver)).toBe(driver._id.toString());
      await Notification.deleteMany({ entityId: response.body.data._id });
      await Booking.deleteOne({ _id: response.body.data._id });
      await Payment.deleteMany({ booking: response.body.data._id });

      const scheduledMode = await submitBooking(customerToken, 'NORMAL', {
        vehicleId: serviceVehicle._id,
        serviceType: serviceVehicle.vehicleType
      });
      expect(scheduledMode.status).toBe(201);
      expect(scheduledMode.body.data.bookingMode).toBe('NORMAL');
      expect(scheduledMode.body.data.serviceType).toBe(serviceVehicle.vehicleType);
      expect(scheduledMode.body.data.pickupLocation).toBe('Delhi');
      expect(scheduledMode.body.data.dropLocation).toBe('Jaipur');
      expect(scheduledMode.body.data.fare).toBe(500);
      await Payment.deleteMany({ booking: scheduledMode.body.data._id });
      await Booking.deleteOne({ _id: scheduledMode.body.data._id });
    }
  });

  test('allows only one concurrent instant booking request to be claimed by a driver', async () => {
    await setInstantBookingEnabled(true);

    const instantAssignmentIndex = (await Booking.collection.indexes())
      .find(index => index.name === 'one_active_instant_booking_per_driver');
    expect(instantAssignmentIndex).toBeDefined();

    const responses = await Promise.all([
      submitInstantRequest(customerToken),
      submitInstantRequest(secondCustomerToken)
    ]);
    expect(responses.map(response => response.status)).toEqual([201, 201]);
    const claims = await Promise.all(responses.map(response => request(app)
      .post(`/api/driver/booking-requests/${response.body.data._id}/accept`)
      .set('Authorization', `Bearer ${driverToken}`)));
    expect(claims.map(response => response.status).sort()).toEqual([200, 409]);
    expect(await Booking.countDocuments({
      driver: driver._id,
      bookingMode: 'INSTANT',
      bookingStatus: { $in: ['Pending Driver Confirmation', 'Confirmed', 'Ongoing'] }
    })).toBe(1);
  });

  test('keeps instant offline-cash bookings assigned and does not rebroadcast as a request', async () => {
    await setInstantBookingEnabled(true);

    const created = await submitInstantRequest(customerToken);
    expect(created.status).toBe(201);
    const accepted = await request(app)
      .post(`/api/driver/booking-requests/${created.body.data._id}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(accepted.status).toBe(200);
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
    expect(driverRequests.body.data.some(booking => booking._id === created.body.data._id)).toBe(false);
  });
});
