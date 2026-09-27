const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
const ServiceControl = require('../src/models/ServiceControl');
const jwtConfig = require('../src/config/jwt');
const { connectTestDB, closeTestDB } = require('./setup');

describe('Customer Schedule Booking vehicle eligibility', () => {
  const suffix = Date.now().toString();
  const travelDate = '2030-05-01';
  const vehicleIds = [];
  const bookingIds = [];
  let customer;
  let driverUser;
  let driver;
  let customerToken;
  let serviceControl;
  let previousServiceStatus;
  let createdServiceControl = false;
  const vehicles = {};
  const schedules = {};

  beforeAll(async () => {
    await connectTestDB();

    customer = await User.create({
      name: 'Schedule Booking Customer',
      email: `schedule_customer_${suffix}@test.com`,
      phone: `91${suffix.slice(-8)}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    driverUser = await User.create({
      name: 'Schedule Booking Driver',
      email: `schedule_driver_${suffix}@test.com`,
      phone: `92${suffix.slice(-8)}`,
      password: 'password123',
      role: 'driver',
      status: 'Active'
    });
    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-SCHEDULE-${suffix}`,
      driverStatus: 'Active',
      isOnline: true
    });
    customerToken = jwt.sign({ id: customer._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });

    serviceControl = await ServiceControl.findOne();
    if (serviceControl) {
      previousServiceStatus = {
        busService: serviceControl.busService,
        evSewaService: serviceControl.evSewaService,
        carService: serviceControl.carService
      };
      serviceControl.busService = 'Active';
      serviceControl.evSewaService = 'Active';
      serviceControl.carService = 'Active';
      await serviceControl.save();
    } else {
      serviceControl = await ServiceControl.create({
        busService: 'Active',
        evSewaService: 'Active',
        carService: 'Active'
      });
      createdServiceControl = true;
    }

    const createVehicle = async (key, vehicleType, vehicleStatus = 'Active') => {
      const vehicle = await Vehicle.create({
        vehicleNumber: `S${suffix.slice(-6)}-${key}`.slice(0, 20).toUpperCase(),
        vehicleType,
        vehicleCategory: `Test ${vehicleType}`,
        vehicleModel: `Schedule Test ${vehicleType}`,
        vehicleName: `Schedule Test ${key}`,
        ownerName: 'Schedule Test Owner',
        ownerMobileNumber: '9800000000',
        assignedDriver: driver._id,
        vehicleStatus,
        seatingCapacity: vehicleType === 'Car' ? 4 : 12,
        fareRate: 500,
        route: {
          origin: 'Delhi',
          destination: 'Jaipur',
          departureTime: '06:00 AM',
          arrivalTime: '11:30 AM'
        }
      });
      vehicleIds.push(vehicle._id);
      vehicles[key] = vehicle;
      return vehicle;
    };

    const createSchedule = async (vehicle, key, status = 'Active', origin = 'Delhi', destination = 'Jaipur', date = travelDate) => {
      const schedule = await Schedule.create({
        vehicle: vehicle._id,
        driver: driver._id,
        origin,
        destination,
        travelDate: new Date(`${date}T12:00:00.000Z`),
        departureTime: '06:00 PM',
        arrivalTime: '10:45 PM',
        fareRate: 650,
        status
      });
      schedules[key] = schedule;
      return schedule;
    };

    for (const [key, vehicleType] of [
      ['busScheduled', 'Bus'],
      ['busUnscheduled', 'Bus'],
      ['evScheduled', 'EV-Sewa'],
      ['evUnscheduled', 'EV-Sewa'],
      ['carScheduled', 'Car'],
      ['carUnscheduled', 'Car']
    ]) {
      const vehicle = await createVehicle(key, vehicleType);
      if (key.endsWith('Scheduled')) await createSchedule(vehicle, key);
    }

    const wrongRoute = await createVehicle('busWrongRoute', 'Bus');
    await createSchedule(wrongRoute, 'busWrongRoute', 'Active', 'Agra', 'Jaipur');
    const wrongDate = await createVehicle('busWrongDate', 'Bus');
    await createSchedule(wrongDate, 'busWrongDate', 'Active', 'Delhi', 'Jaipur', '2030-05-02');
    const pendingScheduleVehicle = await createVehicle('busPendingSchedule', 'Bus');
    await createSchedule(pendingScheduleVehicle, 'busPendingSchedule', 'Pending');
    const rejectedScheduleVehicle = await createVehicle('busRejectedSchedule', 'Bus');
    await createSchedule(rejectedScheduleVehicle, 'busRejectedSchedule', 'Rejected');
    await createVehicle('busInactive', 'Bus', 'Inactive');
    await createVehicle('evUnapproved', 'EV-Sewa', 'Pending');
    await createVehicle('carRejected', 'Car', 'Rejected');
  });

  afterAll(async () => {
    if (bookingIds.length > 0) {
      await Notification.deleteMany({
        $or: [
          { entityId: { $in: bookingIds } },
          { recipientId: customer?._id }
        ]
      });
      await Payment.deleteMany({ booking: { $in: bookingIds } });
      await Booking.deleteMany({ _id: { $in: bookingIds } });
    }
    if (vehicleIds.length > 0) {
      await Schedule.deleteMany({ vehicle: { $in: vehicleIds } });
      await Vehicle.deleteMany({ _id: { $in: vehicleIds } });
    }
    if (driver) await Driver.deleteOne({ _id: driver._id });
    if (customer) await User.deleteOne({ _id: customer._id });
    if (driverUser) await User.deleteOne({ _id: driverUser._id });
    if (serviceControl) {
      if (createdServiceControl) {
        await ServiceControl.deleteOne({ _id: serviceControl._id });
      } else {
        await ServiceControl.updateOne({ _id: serviceControl._id }, { $set: previousServiceStatus });
      }
    }
    await closeTestDB();
  });

  const getScheduleVehicles = (type) => request(app)
    .get('/api/vehicles')
    .query({
      type,
      from: 'Delhi',
      to: 'Jaipur',
      travelDate,
      scheduleBooking: 'true'
    });

  test.each([
    ['Bus', 'busScheduled', 'busUnscheduled'],
    ['EV-Sewa', 'evScheduled', 'evUnscheduled'],
    ['Car', 'carScheduled', 'carUnscheduled']
  ])('%s listing includes scheduled and unscheduled active vehicles, with real schedule metadata only', async (type, scheduledKey, unscheduledKey) => {
    const response = await getScheduleVehicles(type);
    expect(response.status).toBe(200);

    const resultById = new Map(response.body.data.map(vehicle => [vehicle._id, vehicle]));
    const scheduled = resultById.get(String(vehicles[scheduledKey]._id));
    const unscheduled = resultById.get(String(vehicles[unscheduledKey]._id));

    expect(scheduled).toBeDefined();
    expect(scheduled.schedule).toMatchObject({
      _id: String(schedules[scheduledKey]._id),
      origin: 'Delhi',
      destination: 'Jaipur',
      departureTime: '06:00 PM',
      arrivalTime: '10:45 PM',
      fareRate: 650,
      status: 'Active'
    });
    expect(new Date(scheduled.schedule.travelDate).toISOString().slice(0, 10)).toBe(travelDate);
    expect(unscheduled).toBeDefined();
    expect(unscheduled.schedule).toBeNull();
  });

  test('wrong route/date and pending/rejected schedules do not hide active vehicles or expose nonmatching schedule data', async () => {
    const response = await getScheduleVehicles('bus');
    expect(response.status).toBe(200);
    const resultById = new Map(response.body.data.map(vehicle => [vehicle._id, vehicle]));

    for (const key of ['busWrongRoute', 'busWrongDate', 'busPendingSchedule', 'busRejectedSchedule']) {
      expect(resultById.get(String(vehicles[key]._id))).toBeDefined();
      expect(resultById.get(String(vehicles[key]._id)).schedule).toBeNull();
    }
    for (const key of ['busInactive', 'evUnapproved', 'carRejected']) {
      expect(resultById.has(String(vehicles[key]._id))).toBe(false);
    }
  });

  test.each([
    ['Bus', 'busScheduled'],
    ['Bus', 'busUnscheduled'],
    ['EV-Sewa', 'evScheduled'],
    ['EV-Sewa', 'evUnscheduled'],
    ['Car', 'carScheduled'],
    ['Car', 'carUnscheduled']
  ])('%s scheduled and unscheduled vehicles remain bookable through the existing booking and driver notification flow', async (serviceType, vehicleKey) => {
    const schedule = vehicleKey.endsWith('Scheduled') ? schedules[vehicleKey] : null;
    const bookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: vehicles[vehicleKey]._id,
        serviceType,
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur',
        travelDate,
        bookingMode: 'NORMAL',
        paymentMethod: 'Offline Cash',
        fare: 500,
        ...(schedule ? { scheduleId: schedule._id } : {}),
        ...(serviceType === 'EV-Sewa' ? {
          passengerCount: 1,
          passengerDetails: [{ name: 'Schedule Passenger', age: 30, gender: 'Male' }]
        } : {})
      });

    expect(bookingResponse.status).toBe(201);
    const booking = bookingResponse.body.data;
    bookingIds.push(booking._id);
    expect(booking.scheduleId ? String(booking.scheduleId) : null)
      .toBe(schedule ? String(schedule._id) : null);
    expect(booking.bookingMode).toBe('NORMAL');
    expect(booking.serviceType).toBe(serviceType);

    const driverRequest = await Notification.findOne({
      recipientId: driverUser._id,
      entityId: booking._id,
      eventType: 'BOOKING_REQUEST'
    }).lean();
    expect(driverRequest).toBeDefined();
  });
});
