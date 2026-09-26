const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');
const Booking = require('../src/models/Booking');
const jwtConfig = require('../src/config/jwt');
const { connectTestDB, closeTestDB } = require('./setup');

describe('driver-owned schedule and vehicle removal', () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const userIds = [];
  const driverIds = [];
  const vehicleIds = [];
  const scheduleIds = [];
  const bookingIds = [];
  let driver;
  let otherDriver;
  let driverToken;
  let otherDriverToken;

  const createVehicle = async (owner, index) => {
    const vehicle = await Vehicle.create({
      vehicleNumber: `REMOVE-${suffix}-${index}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Removal Test Bus',
      vehicleModel: 'Removal Test Model',
      vehicleName: 'Removal Test Vehicle',
      ownerName: owner.name,
      ownerMobileNumber: owner.mobileNumber,
      assignedDriver: owner._id,
      vehicleStatus: 'Active'
    });
    vehicleIds.push(vehicle._id);
    return vehicle;
  };

  const createSchedule = async (owner, vehicle, index, status = 'Pending') => {
    const schedule = await Schedule.create({
      vehicle: vehicle._id,
      driver: owner._id,
      origin: 'Delhi',
      destination: 'Jaipur',
      travelDate: new Date(Date.now() + index * 86400000),
      departureTime: '08:00',
      arrivalTime: '12:00',
      fareRate: 500,
      status
    });
    scheduleIds.push(schedule._id);
    return schedule;
  };

  const createActiveBooking = async (vehicle, schedule, index, options = {}) => {
    const booking = await Booking.create({
      bookingId: `REMOVE-BOOKING-${suffix}-${index}`,
      customer: { name: 'Removal Test Customer', phone: '9800000000' },
      vehicle: vehicle._id,
      ...(schedule ? { scheduleId: schedule._id } : {}),
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      fare: 500,
      bookingStatus: options.bookingStatus || 'Pending Driver Confirmation',
      travelDate: options.travelDate || new Date(),
      ...(options.rideStatus ? { rideStatus: options.rideStatus } : {})
    });
    bookingIds.push(booking._id);
    return booking;
  };

  beforeAll(async () => {
    await connectTestDB();
    const driverUser = await User.create({
      name: 'Removal Test Driver',
      email: `removal-driver-${suffix}@test.com`,
      phone: `94${String(suffix).slice(-8)}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    const otherDriverUser = await User.create({
      name: 'Other Removal Test Driver',
      email: `removal-other-driver-${suffix}@test.com`,
      phone: `93${String(suffix).slice(-8)}`,
      password: 'DriverPassword123!',
      role: 'driver',
      status: 'Active'
    });
    userIds.push(driverUser._id, otherDriverUser._id);

    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-REMOVE-${suffix}`,
      driverStatus: 'Active'
    });
    otherDriver = await Driver.create({
      user: otherDriverUser._id,
      name: otherDriverUser.name,
      mobileNumber: otherDriverUser.phone,
      drivingLicenceNumber: `DL-REMOVE-OTHER-${suffix}`,
      driverStatus: 'Active'
    });
    driverIds.push(driver._id, otherDriver._id);
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    otherDriverToken = jwt.sign({ id: otherDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await Promise.all([
      Booking.deleteMany({ _id: { $in: bookingIds } }),
      Schedule.deleteMany({ _id: { $in: scheduleIds } }),
      Vehicle.deleteMany({ _id: { $in: vehicleIds } }),
      Driver.deleteMany({ _id: { $in: driverIds } }),
      User.deleteMany({ _id: { $in: userIds } })
    ]);
    await closeTestDB();
  });

  test('removes only the driver-owned schedule and blocks another driver or a schedule with an active booking', async () => {
    const vehicle = await createVehicle(driver, 1);
    const removableSchedule = await createSchedule(driver, vehicle, 1);
    const protectedSchedule = await createSchedule(driver, vehicle, 2);
    const otherVehicle = await createVehicle(otherDriver, 3);
    const otherSchedule = await createSchedule(otherDriver, otherVehicle, 3);
    await createActiveBooking(vehicle, protectedSchedule, 1);

    await request(app)
      .delete(`/api/driver/schedules/${otherSchedule._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(404);
    expect(await Schedule.exists({ _id: otherSchedule._id })).toBeTruthy();

    const blocked = await request(app)
      .delete(`/api/driver/schedules/${protectedSchedule._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(400);
    expect(blocked.body.message).toBe('This schedule cannot be removed because it has an active booking.');
    expect(await Schedule.exists({ _id: protectedSchedule._id })).toBeTruthy();

    await request(app)
      .delete(`/api/driver/schedules/${removableSchedule._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200, { success: true, message: 'Schedule removed successfully.' });
    expect(await Schedule.exists({ _id: removableSchedule._id })).toBeFalsy();

    await request(app)
      .delete(`/api/driver/schedules/${otherSchedule._id}`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .expect(200);
  });

  test('protects vehicles in active schedules or bookings and removes an unused owned vehicle', async () => {
    const vehicleWithSchedule = await createVehicle(driver, 4);
    const activeSchedule = await createSchedule(driver, vehicleWithSchedule, 4, 'Active');
    const vehicleWithBooking = await createVehicle(driver, 5);
    await createActiveBooking(vehicleWithBooking, null, 2);
    const removableVehicle = await createVehicle(driver, 6);
    const otherVehicle = await createVehicle(otherDriver, 7);
    const historyOnlyVehicle = await createVehicle(driver, 8);
    await createSchedule(driver, historyOnlyVehicle, -10, 'Active');
    await createSchedule(driver, historyOnlyVehicle, 9, 'Cancelled');
    await createSchedule(driver, historyOnlyVehicle, 10, 'Rejected');
    await createActiveBooking(historyOnlyVehicle, null, 3, {
      bookingStatus: 'Completed',
      rideStatus: 'Completed',
      travelDate: new Date(Date.now() - 10 * 86400000)
    });
    await createActiveBooking(historyOnlyVehicle, null, 4, {
      bookingStatus: 'Pending',
      travelDate: new Date(Date.now() - 10 * 86400000)
    });

    const scheduledResponse = await request(app)
      .delete(`/api/driver/vehicles/${vehicleWithSchedule._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(400);
    expect(scheduledResponse.body.message).toBe('This vehicle cannot be removed because it is currently in use.');
    expect(await Vehicle.exists({ _id: vehicleWithSchedule._id })).toBeTruthy();
    expect(await Schedule.exists({ _id: activeSchedule._id })).toBeTruthy();

    await request(app)
      .delete(`/api/driver/vehicles/${vehicleWithBooking._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(400);
    expect(await Vehicle.exists({ _id: vehicleWithBooking._id })).toBeTruthy();

    await request(app)
      .delete(`/api/driver/vehicles/${otherVehicle._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(404);
    expect(await Vehicle.exists({ _id: otherVehicle._id })).toBeTruthy();

    await request(app)
      .delete(`/api/driver/vehicles/${removableVehicle._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200, { success: true, message: 'Vehicle removed successfully.' });
    expect(await Vehicle.exists({ _id: removableVehicle._id })).toBeFalsy();

    await request(app)
      .delete(`/api/driver/vehicles/${historyOnlyVehicle._id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200, { success: true, message: 'Vehicle removed successfully.' });
    expect(await Vehicle.exists({ _id: historyOnlyVehicle._id })).toBeFalsy();
  });
});
