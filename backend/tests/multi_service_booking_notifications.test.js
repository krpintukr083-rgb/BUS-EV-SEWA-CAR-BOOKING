const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Notification = require('../src/models/Notification');
const jwtConfig = require('../src/config/jwt');
const { connectTestDB, closeTestDB } = require('./setup');
const { notifyEligibleDriversForBooking } = require('../src/utils/notification');

describe('same-route booking requests for Bus, EV-Sewa, and Car', () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const testUsers = [];
  const testDrivers = [];
  const testVehicles = [];
  const testBookings = [];
  const notificationBookingIds = [];
  let originalFetch;
  let customer;
  let evDriver;
  let evVehicle;
  let secondEvDriver;
  let secondEvVehicle;

  const route = {
    origin: 'Delhi',
    destination: 'Jaipur',
    stops: [{ name: 'Gurgaon', fareFromOrigin: 300 }],
    destinationFareFromOrigin: 850
  };

  const createDriverAndVehicle = async (serviceType, index, options = {}) => {
    const user = await User.create({
      name: `Route Request Driver ${index}`,
      email: `route-request-${suffix}-${index}@test.com`,
      phone: `97${String(suffix).slice(-7)}${String(index).padStart(2, '0')}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    testUsers.push(user._id);
    const driver = await Driver.create({
      user: user._id,
      name: user.name,
      mobileNumber: user.phone,
      drivingLicenceNumber: `DL-ROUTE-REQUEST-${suffix}-${index}`,
      driverStatus: options.driverStatus || 'Active',
      isOnline: options.isOnline !== false,
      pushToken: `ExponentPushToken[RouteRequest${index}]`
    });
    testDrivers.push(driver._id);
    const vehicle = await Vehicle.create({
      vehicleNumber: `RR-${suffix}-${index}`,
      vehicleType: serviceType,
      vehicleCategory: `${serviceType} request test`,
      vehicleModel: `${serviceType} test model`,
      vehicleName: `${serviceType} test vehicle`,
      ownerName: driver.name,
      ownerMobileNumber: driver.mobileNumber,
      vehicleStatus: 'Active',
      assignedDriver: driver._id,
      route: options.route || route
    });
    testVehicles.push(vehicle._id);
    driver.assignedVehicle = vehicle._id;
    await driver.save();
    return { user, driver, vehicle };
  };

  const createBooking = async (serviceType, vehicle, pickupLocation, dropLocation, index) => {
    const booking = await Booking.create({
      bookingId: `RR-BOOKING-${suffix}-${index}`,
      user: customer._id,
      customer: { name: customer.name, phone: customer.phone },
      vehicle: vehicle._id,
      serviceType,
      pickupLocation,
      dropLocation,
      fare: 500,
      bookingStatus: 'Pending Driver Confirmation'
    });
    testBookings.push(booking._id);
    return booking;
  };

  beforeAll(async () => {
    await connectTestDB();
    customer = await User.create({
      name: 'Route Request Customer',
      email: `route-request-customer-${suffix}@test.com`,
      phone: `96${String(suffix).slice(-8)}`,
      password: 'CustomerPassword123!',
      role: 'customer',
      status: 'Active'
    });
    testUsers.push(customer._id);

    const busDrivers = await Promise.all([
      createDriverAndVehicle('Bus', 1),
      createDriverAndVehicle('Bus', 2),
      createDriverAndVehicle('Bus', 3)
    ]);
    await createDriverAndVehicle('Bus', 4, { isOnline: false });
    await createDriverAndVehicle('Bus', 5, {
      route: { origin: 'Mumbai', destination: 'Pune', stops: [], destinationFareFromOrigin: 400 }
    });
    const evPair = await createDriverAndVehicle('EV-Sewa', 6);
    evDriver = evPair.driver;
    evVehicle = evPair.vehicle;
    const secondEvPair = await createDriverAndVehicle('EV-Sewa', 7);
    secondEvDriver = secondEvPair.driver;
    secondEvVehicle = secondEvPair.vehicle;
    const carPair = await createDriverAndVehicle('Car', 8);

    const eligibleBusBooking = {
      _id: new mongoose.Types.ObjectId(),
      bookingId: `RR-BUS-${suffix}`,
      serviceType: 'Bus',
      bookingMode: 'NORMAL',
      pickupLocation: 'Delhi',
      dropLocation: 'Gurgaon'
    };
    const reverseBusBooking = {
      ...eligibleBusBooking,
      _id: new mongoose.Types.ObjectId(),
      bookingId: `RR-BUS-REVERSE-${suffix}`,
      pickupLocation: 'Gurgaon',
      dropLocation: 'Delhi'
    };
    const instantBusBooking = {
      ...eligibleBusBooking,
      _id: new mongoose.Types.ObjectId(),
      bookingId: `RR-BUS-INSTANT-${suffix}`,
      bookingMode: 'INSTANT'
    };
    const eligibleEvBooking = {
      ...eligibleBusBooking,
      _id: new mongoose.Types.ObjectId(),
      bookingId: `RR-EV-${suffix}`,
      serviceType: 'EV-Sewa'
    };
    const eligibleCarBooking = {
      ...eligibleBusBooking,
      _id: new mongoose.Types.ObjectId(),
      bookingId: `RR-CAR-${suffix}`,
      serviceType: 'Car'
    };
    notificationBookingIds.push(
      eligibleBusBooking._id,
      reverseBusBooking._id,
      instantBusBooking._id,
      eligibleEvBooking._id,
      eligibleCarBooking._id
    );

    const fetchBodies = [];
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (_url, options) => {
      const messages = JSON.parse(options.body);
      fetchBodies.push(messages);
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: messages.map(() => ({ status: 'ok' })) })
      };
    });

    await notifyEligibleDriversForBooking(eligibleBusBooking);
    await notifyEligibleDriversForBooking(eligibleBusBooking);
    await notifyEligibleDriversForBooking(reverseBusBooking);
    await notifyEligibleDriversForBooking(instantBusBooking);
    await notifyEligibleDriversForBooking(eligibleEvBooking);
    await notifyEligibleDriversForBooking(eligibleCarBooking);

    expect(fetchBodies.flat().filter(message => message.data.bookingId === eligibleBusBooking.bookingId)).toHaveLength(3);
    expect(fetchBodies.flat().filter(message => message.data.bookingId === reverseBusBooking.bookingId)).toHaveLength(0);
    expect(fetchBodies.flat().filter(message => message.data.bookingId === instantBusBooking.bookingId)).toHaveLength(0);
    expect(fetchBodies.flat().filter(message => message.data.bookingId === eligibleEvBooking.bookingId)).toHaveLength(2);
    expect(fetchBodies.flat().filter(message => message.data.bookingId === eligibleCarBooking.bookingId)).toHaveLength(1);
    expect(fetchBodies.flat().every(message => ['Bus', 'EV-Sewa', 'Car'].includes(message.data.serviceType))).toBe(true);

    const busRequestNotifications = await Notification.find({
      eventType: 'BOOKING_REQUEST',
      entityId: eligibleBusBooking._id
    }).lean();
    expect(busRequestNotifications).toHaveLength(3);
    expect(new Set(busRequestNotifications.map(item => String(item.recipientId))).size).toBe(3);
    expect(busDrivers).toHaveLength(3);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await Promise.all([
      Booking.deleteMany({ _id: { $in: testBookings } }),
      Notification.deleteMany({ entityId: { $in: notificationBookingIds } }),
      Vehicle.deleteMany({ _id: { $in: testVehicles } }),
      Driver.deleteMany({ _id: { $in: testDrivers } }),
      User.deleteMany({ _id: { $in: testUsers } })
    ]);
    await closeTestDB();
  });

  test('driver request list is category-specific and includes forward route-stop requests', async () => {
    const forwardBooking = await createBooking('EV-Sewa', evVehicle, 'Delhi', 'Gurgaon', 1);
    await createBooking('EV-Sewa', evVehicle, 'Gurgaon', 'Delhi', 2);
    await createBooking('Bus', evVehicle, 'Delhi', 'Gurgaon', 3);

    const driverToken = jwt.sign({ id: evDriver.user, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    const response = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    expect(response.body.data.map(item => item._id)).toContain(String(forwardBooking._id));
    expect(response.body.data.some(item => item.pickupLocation === 'Gurgaon' && item.dropLocation === 'Delhi')).toBe(false);
    expect(response.body.data.some(item => item.serviceType === 'Bus')).toBe(false);
    expect(response.body.data.find(item => item._id === String(forwardBooking._id)).serviceType).toBe('EV-Sewa');
  });

  test('only one matching driver can claim a request', async () => {
    const booking = await createBooking('EV-Sewa', secondEvVehicle, 'Delhi', 'Gurgaon', 4);
    const firstToken = jwt.sign({ id: evDriver.user, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    const secondToken = jwt.sign({ id: secondEvDriver.user, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    const firstAccept = await request(app)
      .post(`/api/driver/booking-requests/${booking._id}/accept`)
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(200);
    expect(String(firstAccept.body.data.driver)).toBe(String(evDriver._id));

    await request(app)
      .post(`/api/driver/booking-requests/${booking._id}/accept`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(400);

    const storedBooking = await Booking.findById(booking._id).lean();
    expect(String(storedBooking.driver)).toBe(String(evDriver._id));
    expect(storedBooking.rideStatus).toBe('Accepted');
  });
});
