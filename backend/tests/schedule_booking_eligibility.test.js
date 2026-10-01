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
  const extraDriverIds = [];
  const extraUserIds = [];
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
    if (extraDriverIds.length > 0) await Driver.deleteMany({ _id: { $in: extraDriverIds } });
    if (extraUserIds.length > 0) await User.deleteMany({ _id: { $in: extraUserIds } });
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

  test('Drivers with an active trip still receive eligible Instant and Schedule requests', async () => {
    const createdDriverIds = [];
    const createdUserIds = [];
    const createdVehicleIds = [];
    const createdBookingIds = [];
    const createDriverWithVehicle = async (vehicleType, index, route = { origin: 'Delhi', destination: 'Jaipur' }) => {
      const user = await User.create({
        name: `Active Trip ${vehicleType} Driver ${index}`,
        email: `active_trip_${vehicleType}_${index}_${suffix}@test.com`,
        phone: `95${String(Number(suffix.slice(-8)) + index).slice(-8)}`,
        password: 'password123',
        role: 'driver',
        status: 'Active'
      });
      extraUserIds.push(user._id);
      createdUserIds.push(user._id);
      const assignedDriver = await Driver.create({
        user: user._id,
        name: user.name,
        mobileNumber: user.phone,
        drivingLicenceNumber: `DL-ACTIVE-TRIP-${suffix}-${vehicleType}-${index}`,
        driverStatus: 'Active',
        isOnline: true
      });
      extraDriverIds.push(assignedDriver._id);
      createdDriverIds.push(assignedDriver._id);
      const vehicle = await Vehicle.create({
        vehicleNumber: `AT${suffix.slice(-5)}${index}`.toUpperCase(),
        vehicleType,
        vehicleCategory: `Active trip test ${vehicleType}`,
        vehicleModel: `Active trip test ${vehicleType} model`,
        vehicleName: `Active trip test ${vehicleType}`,
        ownerName: user.name,
        ownerMobileNumber: user.phone,
        vehicleStatus: 'Active',
        seatingCapacity: 4,
        assignedDriver: assignedDriver._id,
        route
      });
      vehicleIds.push(vehicle._id);
      createdVehicleIds.push(vehicle._id);
      assignedDriver.assignedVehicle = vehicle._id;
      await assignedDriver.save();
      const token = jwt.sign({ id: user._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
      return { user, driver: assignedDriver, vehicle, token, vehicleType };
    };

    try {
      const bus = await createDriverWithVehicle('Bus', 1);
      const ev = await createDriverWithVehicle('EV-Sewa', 2);
      const car = await createDriverWithVehicle('Car', 3);
      const otherCar = await createDriverWithVehicle('Car', 5);
      const wrongRouteBus = await createDriverWithVehicle('Bus', 4, { origin: 'Delhi', destination: 'Agra' });

      bus.driver.assignedVehicle = otherCar.vehicle._id;
      await bus.driver.save();

      const activeTripsByDriverId = new Map();
      for (const group of [bus, ev, car, wrongRouteBus]) {
        const activeTrip = await Booking.create({
          bookingId: `ACTIVE-${group.vehicleType}-${suffix}-${group.driver._id.toString().slice(-4)}`,
          user: customer._id,
          customer: { name: customer.name, phone: customer.phone },
          driver: group.driver._id,
          vehicle: group.vehicle._id,
          serviceType: group.vehicleType === 'Bus' && group === bus ? 'Any' : group.vehicleType,
          bookingMode: group.vehicleType === 'Bus' && group === bus ? 'INSTANT' : 'SCHEDULE',
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur',
          passengerDetails: [{ name: customer.name, age: 28, gender: 'Male' }],
          fare: 500,
          bookingStatus: 'Ongoing',
          rideStatus: 'Started',
          driverConfirmed: true,
          driverConfirmationStatus: 'Confirmed',
          paymentStatus: 'Paid',
          travelDate: new Date(travelDate)
        });
        bookingIds.push(activeTrip._id);
        createdBookingIds.push(activeTrip._id);
        activeTripsByDriverId.set(String(group.driver._id), activeTrip);
      }

      const scheduleRequests = [];
      for (const group of [bus, ev, car]) {
        const scheduleRequest = await Booking.create({
          bookingId: `REQUEST-${group.vehicleType}-${suffix}-${group.driver._id.toString().slice(-4)}`,
          user: customer._id,
          customer: { name: customer.name, phone: customer.phone },
          driver: null,
          vehicle: group.vehicle._id,
          serviceType: group.vehicleType,
          bookingMode: 'SCHEDULE',
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur',
          fare: 500,
          bookingStatus: 'Pending Driver Confirmation',
          rideStatus: 'None',
          paymentStatus: 'Pending Cash',
          travelDate: new Date(travelDate)
        });
        bookingIds.push(scheduleRequest._id);
        createdBookingIds.push(scheduleRequest._id);
        scheduleRequests.push(scheduleRequest);
      }
      const instantRequest = await Booking.create({
        bookingId: `INSTANT-ACTIVE-${suffix}`,
        user: customer._id,
        customer: { name: customer.name, phone: customer.phone },
        serviceType: 'Any',
        bookingMode: 'INSTANT',
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur',
        passengerDetails: [{ name: customer.name, age: 28, gender: 'Male' }],
        fare: 0,
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None',
        paymentStatus: 'Pending Cash',
        travelDate: new Date(travelDate)
      });
      bookingIds.push(instantRequest._id);
      createdBookingIds.push(instantRequest._id);
      const overCapacityInstantRequest = await Booking.create({
        bookingId: `INSTANT-FULL-${suffix}`,
        user: customer._id,
        customer: { name: customer.name, phone: customer.phone },
        serviceType: 'Any',
        bookingMode: 'INSTANT',
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur',
        passengerDetails: Array.from({ length: 4 }, () => ({
          name: customer.name,
          age: 28,
          gender: 'Male'
        })),
        fare: 0,
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None',
        paymentStatus: 'Pending Cash',
        travelDate: new Date(travelDate)
      });
      bookingIds.push(overCapacityInstantRequest._id);
      createdBookingIds.push(overCapacityInstantRequest._id);

      for (const group of [bus, ev, car]) {
        const activeBookingsResponse = await request(app)
          .get('/api/driver/active-bookings')
          .set('Authorization', `Bearer ${group.token}`);
        expect(activeBookingsResponse.status).toBe(200);
        expect(activeBookingsResponse.body.data.map(item => String(item._id)))
          .toContain(String(activeTripsByDriverId.get(String(group.driver._id))._id));

        const response = await request(app)
          .get('/api/driver/booking-requests')
          .set('Authorization', `Bearer ${group.token}`);
        expect(response.status).toBe(200);
        const visibleBookingIds = response.body.data.map(item => String(item._id));
        expect(response.body.count).toBeGreaterThanOrEqual(2);
        expect(visibleBookingIds).toContain(String(instantRequest._id));
        if (group === bus) {
          expect(visibleBookingIds).not.toContain(String(overCapacityInstantRequest._id));
        }
        const matchingScheduleRequest = scheduleRequests.find(item => item.serviceType === group.vehicleType);
        expect(visibleBookingIds).toContain(String(matchingScheduleRequest._id));
        expect(scheduleRequests
          .filter(item => item._id !== matchingScheduleRequest._id)
          .every(item => !visibleBookingIds.includes(String(item._id)))).toBe(true);

        const visibleDiagnostics = response.body.data
          .filter(item => [instantRequest._id, matchingScheduleRequest._id]
            .some(id => String(id) === String(item._id)))
          .map(item => ({
            bookingId: item.bookingId,
            bookingMode: item.bookingMode,
            serviceType: item.serviceType,
            route: { origin: item.pickupLocation, destination: item.dropLocation },
            assignedDriver: item.driver ? String(item.driver._id || item.driver) : null,
            assignedVehicle: item.vehicle ? String(item.vehicle._id || item.vehicle) : null,
            rideStatus: item.rideStatus,
            bookingStatus: item.bookingStatus
          }));
        console.info(`[ACTIVE-TRIP API] driverVehicle=${group.vehicle._id} count=${response.body.count} activeBooking=${activeTripsByDriverId.get(String(group.driver._id)).bookingId}`, JSON.stringify(visibleDiagnostics));

        for (const bookingId of [instantRequest._id, matchingScheduleRequest._id]) {
          const requestData = response.body.data.find(item => String(item._id) === String(bookingId));
          expect(requestData).toMatchObject({
            bookingMode: bookingId === instantRequest._id ? 'INSTANT' : 'SCHEDULE',
            pickupLocation: 'Delhi',
            dropLocation: 'Jaipur',
            rideStatus: 'None'
          });
          expect(requestData.bookingStatus).toBe('Pending Driver Confirmation');
        }
        const scheduleRequestData = response.body.data.find(item => String(item._id) === String(matchingScheduleRequest._id));
        expect(scheduleRequestData.vehicle.route).toMatchObject({ origin: 'Delhi', destination: 'Jaipur' });
        expect(String(scheduleRequestData.vehicle._id)).toBe(String(group.vehicle._id));

        const dashboardResponse = await request(app)
          .get('/api/driver/dashboard')
          .set('Authorization', `Bearer ${group.token}`);
        expect(dashboardResponse.status).toBe(200);
        const dashboardRequestIds = dashboardResponse.body.data.bookingRequests.map(item => String(item._id));
        expect(dashboardResponse.body.data.stats.pendingRequestsCount).toBeGreaterThanOrEqual(2);
        expect(dashboardRequestIds).toContain(String(instantRequest._id));
        expect(dashboardRequestIds).toContain(String(matchingScheduleRequest._id));
        if (group === bus) {
          expect(dashboardRequestIds).not.toContain(String(overCapacityInstantRequest._id));
        }
        expect(String(dashboardResponse.body.data.activeRide._id))
          .toBe(String(activeTripsByDriverId.get(String(group.driver._id))._id));
      }

      const otherCarResponse = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${otherCar.token}`);
      expect(otherCarResponse.status).toBe(200);
      const otherCarRequestIds = otherCarResponse.body.data.map(item => String(item._id));
      expect(otherCarRequestIds).toContain(String(instantRequest._id));
      expect(otherCarRequestIds).not.toContain(String(scheduleRequests.find(item => item.serviceType === 'Car')._id));
      const otherCarDashboardResponse = await request(app)
        .get('/api/driver/dashboard')
        .set('Authorization', `Bearer ${otherCar.token}`);
      expect(otherCarDashboardResponse.status).toBe(200);
      const otherCarDashboardRequestIds = otherCarDashboardResponse.body.data.bookingRequests.map(item => String(item._id));
      expect(otherCarDashboardRequestIds).toContain(String(instantRequest._id));
      expect(otherCarDashboardRequestIds).not.toContain(String(scheduleRequests.find(item => item.serviceType === 'Car')._id));

      const duplicateInstantAcceptResponse = await request(app)
        .post(`/api/driver/booking-requests/${instantRequest._id}/accept`)
        .set('Authorization', `Bearer ${bus.token}`);
      expect(duplicateInstantAcceptResponse.status).toBe(200);
      expect(duplicateInstantAcceptResponse.body.success).toBe(true);
      const repeatedInstantAcceptResponse = await request(app)
        .post(`/api/driver/booking-requests/${instantRequest._id}/accept`)
        .set('Authorization', `Bearer ${bus.token}`);
      expect(repeatedInstantAcceptResponse.status).toBe(200);
      expect(repeatedInstantAcceptResponse.body.success).toBe(true);
      expect((await Booking.findById(instantRequest._id).lean()).driver.toString())
        .toBe(String(bus.driver._id));

      const wrongRouteResponse = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${wrongRouteBus.token}`);
      expect(wrongRouteResponse.status).toBe(200);
      expect(wrongRouteResponse.body.data.map(item => String(item._id))).not.toContain(String(instantRequest._id));
      expect(wrongRouteResponse.body.data.map(item => String(item._id))).not.toContain(String(scheduleRequests[0]._id));
    } finally {
      await Notification.deleteMany({ entityId: { $in: createdBookingIds } });
      await Payment.deleteMany({ booking: { $in: createdBookingIds } });
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
      await Driver.deleteMany({ _id: { $in: createdDriverIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
      await Vehicle.deleteMany({ _id: { $in: createdVehicleIds } });
    }
  });

  test('Instant booking without a selected service notifies same-route Bus, EV-Sewa, and Car drivers', async () => {
    const addedDrivers = [];
    const addedUsers = [];
    const addedVehicles = [];
    const expectedTokens = [
      'ExponentPushToken[InstantBus]',
      'ExponentPushToken[InstantEvSewa]',
      'ExponentPushToken[InstantCar]'
    ];
    const originalInstantBookingEnabled = serviceControl.instantBookingEnabled;
    const originalFetch = global.fetch;
    const submittedPushes = [];

    try {
      serviceControl.instantBookingEnabled = true;
      await serviceControl.save();

      for (const [index, vehicleType] of ['Bus', 'EV-Sewa', 'Car'].entries()) {
        const user = await User.create({
          name: `Instant ${vehicleType} Driver`,
          email: `instant_${index}_${suffix}@test.com`,
          phone: `94${String(Number(suffix.slice(-8)) + index + 1).slice(-8)}`,
          password: 'password123',
          role: 'driver',
          status: 'Active'
        });
        addedUsers.push(user._id);
        const assignedDriver = await Driver.create({
          user: user._id,
          name: user.name,
          mobileNumber: user.phone,
          drivingLicenceNumber: `DL-INSTANT-${suffix}-${index}`,
          driverStatus: index === 1 ? 'Approved' : 'Active',
          isOnline: true,
          pushToken: expectedTokens[index]
        });
        addedDrivers.push(assignedDriver._id);
        const vehicle = await Vehicle.create({
          vehicleNumber: `I${suffix.slice(-5)}-${index}`.toUpperCase(),
          vehicleType,
          vehicleCategory: `Instant test ${vehicleType}`,
          vehicleModel: `Instant test ${vehicleType} model`,
          vehicleName: `Instant test ${vehicleType}`,
          ownerName: user.name,
          ownerMobileNumber: user.phone,
          vehicleStatus: 'Active',
          assignedDriver: assignedDriver._id,
          route: { origin: 'Delhi', destination: 'Jaipur', stops: [] }
        });
        addedVehicles.push(vehicle._id);
        assignedDriver.assignedVehicle = vehicle._id;
        await assignedDriver.save();
      }

      global.fetch = jest.fn(async (_url, options) => {
        submittedPushes.push(...JSON.parse(options.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: JSON.parse(options.body).map(() => ({ status: 'ok' })) })
        };
      });

      const response = await request(app)
        .post('/api/bookings/instant')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur',
          travelDate,
          paymentMethod: 'Offline Cash'
        });

      expect(response.status).toBe(201);
      const booking = response.body.data;
      bookingIds.push(booking._id);
      expect(booking.bookingMode).toBe('INSTANT');
      expect(booking.serviceType).toBe('Any');
      expect(submittedPushes.map(message => message.to).sort()).toEqual(expectedTokens.sort());
      expect(submittedPushes.every(message => message.data.bookingId === booking.bookingId)).toBe(true);
      expect(submittedPushes.every(message => message.data.screen === 'Requests')).toBe(true);
      const requests = await Notification.find({
        entityId: booking._id,
        eventType: 'BOOKING_REQUEST'
      }).lean();
      expect(requests).toHaveLength(4);
      expect(new Set(requests.map(item => String(item.recipientId))))
        .toEqual(new Set([...addedUsers, driverUser._id].map(String)));
    } finally {
      global.fetch = originalFetch;
      serviceControl.instantBookingEnabled = originalInstantBookingEnabled;
      await serviceControl.save();
      if (addedVehicles.length) await Vehicle.deleteMany({ _id: { $in: addedVehicles } });
      if (addedDrivers.length) await Driver.deleteMany({ _id: { $in: addedDrivers } });
      if (addedUsers.length) await User.deleteMany({ _id: { $in: addedUsers } });
    }
  });

  test('Car schedule booking notifies only its assigned driver', async () => {
    driver.pushToken = 'ExponentPushToken[ScheduleBookingTest]';
    await driver.save();
    const extraDrivers = [];
    for (const [index, token] of ['ExponentPushToken[OtherDriver1]', 'ExponentPushToken[OtherDriver2]'].entries()) {
      const user = await User.create({
        name: `Unassigned Schedule Driver ${index + 1}`,
        email: `schedule_unassigned_${index}_${suffix}@test.com`,
        phone: `93${String(Number(suffix.slice(-8)) + index + 1).slice(-8)}`,
        password: 'password123',
        role: 'driver',
        status: 'Active'
      });
      extraUserIds.push(user._id);
      const otherDriver = await Driver.create({
        user: user._id,
        name: user.name,
        mobileNumber: user.phone,
        drivingLicenceNumber: `DL-SCHEDULE-OTHER-${suffix}-${index}`,
        driverStatus: 'Active',
        isOnline: true,
        pushToken: token
      });
      extraDriverIds.push(otherDriver._id);
      extraDrivers.push(otherDriver);
    }

    const originalFetch = global.fetch;
    const submittedPushes = [];
    const pushMock = jest.fn(async (_url, options) => {
      submittedPushes.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'test-push-ticket' }] }) };
    });
    global.fetch = pushMock;
    let response;
    try {
      response = await request(app)
        .post('/api/bookings/schedule')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleId: vehicles.carScheduled._id,
          scheduleId: schedules.carScheduled._id,
          serviceType: 'Car',
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur',
          travelDate,
          paymentMethod: 'Offline Cash',
          fare: 1
        });
    } finally {
      global.fetch = originalFetch;
    }

    expect(response.status).toBe(201);
    const booking = response.body.data;
    bookingIds.push(booking._id);
    expect(booking.bookingMode).toBe('SCHEDULE');
    expect(booking.serviceType).toBe('Car');
    expect(booking.fare).toBe(vehicles.carScheduled.fareRate);
    expect(response.body.payment.paymentMethod).toBe('Offline Cash');
    expect(response.body.payment.paymentStatus).toBe('Pending Cash');

    expect(submittedPushes).toHaveLength(1);
    expect(submittedPushes[0].to).toBe('ExponentPushToken[ScheduleBookingTest]');
    expect(submittedPushes[0].data).toMatchObject({
      bookingId: booking.bookingId,
      eventType: 'BOOKING_REQUEST',
      serviceType: 'Car',
      screen: 'Requests'
    });
    expect(extraDrivers.some(otherDriver => submittedPushes[0].to === otherDriver.pushToken)).toBe(false);

    const driverRequests = await Notification.find({
      entityId: booking._id,
      eventType: 'BOOKING_REQUEST'
    }).lean();
    expect(driverRequests).toHaveLength(1);
    expect(String(driverRequests[0].recipientId)).toBe(String(driverUser._id));
    expect(driverRequests[0].message).toContain('Service: Private Car');
    expect(driverRequests[0].message).toContain('Schedule Booking Customer');
    expect(driverRequests[0].message).toContain(booking.bookingId);
    expect(driverRequests[0].message).toContain(booking.pickupLocation);
    expect(driverRequests[0].message).toContain(booking.dropLocation);
    expect(driverRequests[0].message).toContain(`Fare: ${booking.fare}`);

    const { notifyAssignedCarDriverForScheduleBooking } = require('../src/utils/notification');
    await notifyAssignedCarDriverForScheduleBooking(await Booking.findById(booking._id));
    expect(submittedPushes).toHaveLength(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  test('Car schedule booking succeeds when the push provider fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Push provider unavailable'));
    let response;
    try {
      response = await request(app)
        .post('/api/bookings/schedule')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleId: vehicles.carScheduled._id,
          scheduleId: schedules.carScheduled._id,
          serviceType: 'Car',
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur',
          travelDate,
          paymentMethod: 'Offline Cash',
          fare: 1
        });
    } finally {
      global.fetch = originalFetch;
    }

    expect(response.status).toBe(201);
    bookingIds.push(response.body.data._id);
    expect(response.body.data.serviceType).toBe('Car');
    expect(response.body.payment.paymentStatus).toBe('Pending Cash');
  });

  test('Car schedule booking without an assigned driver does not broadcast', async () => {
    const car = vehicles.carUnscheduled;
    const originalAssignedDriver = car.assignedDriver;
    car.assignedDriver = null;
    await car.save();

    const originalFetch = global.fetch;
    const pushMock = jest.fn();
    global.fetch = pushMock;
    let response;
    try {
      response = await request(app)
        .post('/api/bookings/schedule')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleId: car._id,
          serviceType: 'Car',
          pickupLocation: 'Delhi',
          dropLocation: 'Jaipur',
          travelDate,
          paymentMethod: 'Offline Cash'
        });
    } finally {
      global.fetch = originalFetch;
      car.assignedDriver = originalAssignedDriver;
      await car.save();
    }

    expect(response.status).toBe(201);
    bookingIds.push(response.body.data._id);
    expect(pushMock).not.toHaveBeenCalled();
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
