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
const BusOffer = require('../src/models/BusOffer');
const jwtConfig = require('../src/config/jwt');
const { connectTestDB, closeTestDB } = require('./setup');
const { getRouteSegmentFare, validateRoutePricing } = require('../src/utils/routeFares');
const { vehicleMatchesBookingRoute } = require('../src/utils/notification');

describe('Optional route-stop fares', () => {
  let user;
  let driverUser;
  let adminUser;
  let driver;
  let vehicle;
  let registeredVehicle;
  let schedule;
  let approvedSchedule;
  let control;
  let offer;
  let originalControl;
  let originalOffer;
  let createdControl = false;
  let createdOffer = false;
  let token;
  let driverToken;
  let adminToken;
  let userBookings = [];
  const suffix = Date.now().toString().slice(-8);
  const route = {
    origin: 'Delhi',
    destination: 'Jaipur',
    stops: [
      { name: 'Gurgaon', fareFromOrigin: 300 },
      { name: 'Neemrana', fareFromOrigin: 500 },
      { name: 'Behror', fareFromOrigin: 650 }
    ],
    destinationFareFromOrigin: 850
  };

  beforeAll(async () => {
    await connectTestDB();
    user = await User.create({
      name: 'Route Fare Customer',
      email: `route-fare-${suffix}@example.com`,
      phone: `97${suffix}`,
      password: 'Password123!',
      role: 'customer',
      status: 'Active'
    });
    token = jwt.sign({ id: user._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    driverUser = await User.create({
      name: 'Route Fare Driver',
      email: `route-driver-${suffix}@example.com`,
      phone: `96${suffix}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    driver = await Driver.create({
      user: driverUser._id,
      name: 'Route Fare Driver',
      mobileNumber: `96${suffix}`,
      drivingLicenceNumber: `DL-${suffix}`,
      rcNumber: `RC-${suffix}`,
      vehicleNumber: `BUS-${suffix}`,
      rcExpiry: '2030-01-01',
      rcStatus: 'Approved'
    });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    adminUser = await User.create({
      name: 'Route Fare Admin',
      email: `route-admin-${suffix}@example.com`,
      phone: `95${suffix}`,
      password: 'Password123!',
      role: 'admin',
      status: 'Active'
    });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });
    vehicle = await Vehicle.create({
      vehicleNumber: `ROUTE-${suffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'Route Fare Test Bus',
      vehicleModel: 'Test Bus',
      vehicleName: 'Route Fare Bus',
      seatingCapacity: 30,
      ownerName: 'Test Owner',
      ownerMobileNumber: '9800000000',
      vehicleStatus: 'Active',
      fareRate: 850,
      route
    });
    schedule = await Schedule.create({
      vehicle: vehicle._id,
      driver: driver._id,
      origin: 'Delhi',
      destination: 'Jaipur',
      travelDate: new Date(),
      departureTime: '08:00 AM',
      arrivalTime: '06:00 PM',
      fareRate: 850,
      status: 'Active'
    });

    control = await ServiceControl.findOne();
    if (control) {
      originalControl = control.toObject();
      control.busService = 'Active';
      control.carService = 'Active';
      await control.save();
    } else {
      control = await ServiceControl.create({ busService: 'Active', carService: 'Active' });
      createdControl = true;
    }
    offer = await BusOffer.findOne({ service: 'bus' });
    if (offer) {
      originalOffer = offer.toObject();
      offer.offerStatus = 'active';
      offer.discountPercentage = 10;
      await offer.save();
    } else {
      offer = await BusOffer.create({ service: 'bus', offerStatus: 'active', discountPercentage: 10 });
      createdOffer = true;
    }
  });

  afterAll(async () => {
    if (userBookings.length) {
      await Payment.deleteMany({ booking: { $in: userBookings } });
      await Booking.deleteMany({ _id: { $in: userBookings } });
    }
    if (schedule) await Schedule.findByIdAndDelete(schedule._id);
    if (approvedSchedule) await Schedule.findByIdAndDelete(approvedSchedule._id);
    if (vehicle) await Vehicle.findByIdAndDelete(vehicle._id);
    if (registeredVehicle) await Vehicle.findByIdAndDelete(registeredVehicle._id);
    if (driver) {
      await Notification.deleteMany({ recipientId: driver.user });
      await User.findByIdAndDelete(driver.user);
      await Driver.findByIdAndDelete(driver._id);
    }
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (user) {
      await Notification.deleteMany({ recipientId: user._id });
      await User.findByIdAndDelete(user._id);
    }
    if (createdControl && control) await ServiceControl.findByIdAndDelete(control._id);
    else if (originalControl && control) {
      await ServiceControl.findByIdAndUpdate(control._id, originalControl);
    }
    if (createdOffer && offer) await BusOffer.findByIdAndDelete(offer._id);
    else if (originalOffer && offer) await BusOffer.findByIdAndUpdate(offer._id, originalOffer);
    await closeTestDB();
  });

  test('driver registration derives the full fare and admin approval retains all segment fares', async () => {
    const submitted = await request(app)
      .post('/api/driver/vehicles')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicleNumber: `REGISTERED-${suffix}`,
        vehicleType: 'Bus',
        fareRate: 1,
        route
      });

    expect(submitted.status).toBe(201);
    expect(submitted.body.data.fareRate).toBe(850);
    expect(submitted.body.data.vehicleStatus).toBe('Pending');
    registeredVehicle = await Vehicle.findById(submitted.body.data._id);

    const approved = await request(app)
      .patch(`/api/admin/vehicles/${registeredVehicle._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.route.stops).toHaveLength(3);
    expect(approved.body.data.route.destinationFareFromOrigin).toBe(850);
    expect((await Vehicle.findById(registeredVehicle._id)).fareRate).toBe(850);

    const updatedRoute = {
      ...route,
      stops: route.stops.map((stop, index) => ({
        ...stop,
        fareFromOrigin: [310, 510, 660][index]
      })),
      destinationFareFromOrigin: 870
    };
    const fareUpdate = await request(app)
      .put('/api/driver/vehicle/fare')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ vehicleId: registeredVehicle._id, route: updatedRoute });
    expect(fareUpdate.status).toBe(200);
    expect(fareUpdate.body.data.fareRate).toBe(870);
    expect(fareUpdate.body.data.route.destinationFareFromOrigin).toBe(870);

    const scheduleSubmission = await request(app)
      .post('/api/driver/schedules')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        vehicle: registeredVehicle._id,
        origin: 'Delhi',
        destination: 'Jaipur',
        travelDate: '2030-06-15',
        departureTime: '08:00 AM',
        arrivalTime: '06:00 PM'
      });
    expect(scheduleSubmission.status).toBe(201);
    const scheduleApproval = await request(app)
      .patch(`/api/admin/schedules/${scheduleSubmission.body.data._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(scheduleApproval.status).toBe(200);
    expect(scheduleApproval.body.data.status).toBe('Active');
    expect(scheduleApproval.body.data.vehicle.toString()).toBe(String(registeredVehicle._id));
    expect((await Vehicle.findById(registeredVehicle._id)).route.stops).toHaveLength(3);
    approvedSchedule = scheduleSubmission.body.data;
  });

  test('calculates forward route segments and multiplies selected-seat fare', async () => {
    expect(validateRoutePricing(route)).toMatchObject({ valid: true, totalFare: 850 });
    expect(validateRoutePricing({
      ...route,
      stops: [
        { name: 'Gurgaon', fareFromOrigin: 500 },
        { name: 'Neemrana', fareFromOrigin: 300 },
        { name: 'Behror', fareFromOrigin: 650 }
      ]
    }).valid).toBe(false);
    expect(getRouteSegmentFare(route, 'Delhi', 'Gurgaon')).toBe(300);
    expect(getRouteSegmentFare(route, 'Delhi', 'Neemrana')).toBe(500);
    expect(getRouteSegmentFare(route, 'Gurgaon', 'Behror')).toBe(350);
    expect(getRouteSegmentFare(route, 'Neemrana', 'Jaipur')).toBe(350);
    expect(getRouteSegmentFare(route, 'Delhi', 'Behror')).toBe(650);
    expect(getRouteSegmentFare(route, 'Gurgaon', 'Neemrana')).toBe(200);
    expect(getRouteSegmentFare(route, 'Gurgaon', 'Jaipur')).toBe(550);
    expect(getRouteSegmentFare(route, 'Neemrana', 'Behror')).toBe(150);
    expect(getRouteSegmentFare(route, 'Behror', 'Jaipur')).toBe(200);
    expect(getRouteSegmentFare(route, 'Delhi', 'Jaipur')).toBe(850);
    expect(getRouteSegmentFare(route, 'Jaipur', 'Delhi')).toBeNull();
    expect(vehicleMatchesBookingRoute(
      { _id: 'other-vehicle', vehicleType: 'Bus', route },
      { pickupLocation: 'Gurgaon', dropLocation: 'Behror' }
    )).toBe(true);

    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const schedules = await request(app)
      .get('/api/schedules')
      .query({ from: 'Delhi', to: 'Neemrana', travelDate: date });
    expect(schedules.status).toBe(200);
    expect(schedules.body.data.some(item => String(item._id) === String(schedule._id))).toBe(true);
    expect(schedules.body.data.find(item => String(item._id) === String(schedule._id)).vehicle.route.stops[1].fareFromOrigin).toBe(500);

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: vehicle._id,
        scheduleId: schedule._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi',
        dropLocation: 'Neemrana',
        selectedSeats: ['A1', 'A2'],
        passengerDetails: [
          { name: 'Passenger One', age: 30, gender: 'Male', seatNumber: 'A1' },
          { name: 'Passenger Two', age: 28, gender: 'Female', seatNumber: 'A2' }
        ],
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    expect(response.status).toBe(201);
    expect(response.body.data.originalFare).toBe(1000);
    expect(response.body.data.discountPercentage).toBe(10);
    expect(response.body.data.fare).toBe(900);
    expect(response.body.data.pickupLocation).toBe('Delhi');
    expect(response.body.data.dropLocation).toBe('Neemrana');
    expect(response.body.payment.bookingAmount).toBe(900);
    expect(response.body.payment.paymentMethod).toBe('Offline Cash');
    expect(response.body.data.confirmationOtp).toBeTruthy();
    userBookings.push(response.body.data._id);

    const storedBooking = await Booking.findById(response.body.data._id);
    const storedPayment = await Payment.findOne({ booking: storedBooking._id });
    expect(storedBooking.fare).toBe(900);
    expect(storedBooking.originalFare).toBe(1000);
    expect(storedPayment.bookingAmount).toBe(900);
    const twoPassengersFullRouteFare = getRouteSegmentFare(route, 'Delhi', 'Jaipur') * 2;
    expect(twoPassengersFullRouteFare).toBe(1700);

    const threePassenger = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: vehicle._id,
        scheduleId: schedule._id,
        serviceType: 'Bus',
        pickupLocation: 'Gurgaon',
        dropLocation: 'Behror',
        selectedSeats: ['B1', 'B2', 'B3'],
        passengerDetails: [
          { name: 'Passenger One', age: 30, gender: 'Male', seatNumber: 'B1' },
          { name: 'Passenger Two', age: 28, gender: 'Female', seatNumber: 'B2' },
          { name: 'Passenger Three', age: 35, gender: 'Male', seatNumber: 'B3' }
        ],
        paymentMethod: 'Online Razorpay',
        travelDate: new Date().toISOString()
      });
    expect(threePassenger.status).toBe(201);
    expect(threePassenger.body.data.originalFare).toBe(1050);
    expect(threePassenger.body.data.fare).toBe(945);
    expect(threePassenger.body.payment.bookingAmount).toBe(945);
    expect(threePassenger.body.payment.paymentMethod).toBe('Online Razorpay');
    userBookings.push(threePassenger.body.data._id);

    const fullRouteTwoPassengers = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: vehicle._id,
        scheduleId: schedule._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi',
        dropLocation: 'Jaipur',
        selectedSeats: ['C1', 'C2'],
        passengerDetails: [
          { name: 'Passenger One', age: 30, gender: 'Male', seatNumber: 'C1' },
          { name: 'Passenger Two', age: 28, gender: 'Female', seatNumber: 'C2' }
        ],
        travelDate: new Date().toISOString()
      });
    expect(fullRouteTwoPassengers.status).toBe(201);
    expect(fullRouteTwoPassengers.body.data.originalFare).toBe(1700);
    expect(fullRouteTwoPassengers.body.data.fare).toBe(1530);
    userBookings.push(fullRouteTwoPassengers.body.data._id);

    vehicle.route = {
      origin: 'Delhi',
      destination: 'Jaipur',
      stops: [
        { name: 'Gurgaon', fareFromOrigin: 350 },
        { name: 'Neemrana', fareFromOrigin: 550 },
        { name: 'Behror', fareFromOrigin: 700 }
      ],
      destinationFareFromOrigin: 900
    };
    vehicle.fareRate = 900;
    await vehicle.save();
    expect((await Booking.findById(response.body.data._id)).fare).toBe(900);
    expect((await Booking.findById(fullRouteTwoPassengers.body.data._id)).originalFare).toBe(1700);
  });

  test('rejects invalid stop pairs and still uses flat fare for legacy vehicles', async () => {
    const invalid = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: vehicle._id,
        serviceType: 'Bus',
        pickupLocation: 'Jaipur',
        dropLocation: 'Delhi',
        travelDate: new Date().toISOString()
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toMatch(/forward route segment/i);

    const legacyVehicle = await Vehicle.create({
      vehicleNumber: `FLAT-${suffix}`,
      vehicleType: 'Car',
      vehicleCategory: 'Legacy',
      vehicleModel: 'Legacy Car',
      vehicleName: 'Flat Fare Car',
      seatingCapacity: 4,
      ownerName: 'Test Owner',
      ownerMobileNumber: '9800000000',
      vehicleStatus: 'Active',
      fareRate: 700,
      route: { origin: 'Old City', destination: 'New City' }
    });
    const legacyBooking = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: legacyVehicle._id,
        serviceType: 'Car',
        pickupLocation: 'Old City',
        dropLocation: 'New City',
        paymentMethod: 'Online Razorpay'
      });

    expect(legacyBooking.status).toBe(201);
    expect(legacyBooking.body.data.fare).toBe(700);
    expect(legacyBooking.body.payment.bookingAmount).toBe(700);
    userBookings.push(legacyBooking.body.data._id);
    await Vehicle.findByIdAndDelete(legacyVehicle._id);
  });
});
