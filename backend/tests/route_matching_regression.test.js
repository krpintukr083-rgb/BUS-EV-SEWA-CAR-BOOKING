const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Schedule = require('../src/models/Schedule');
const ServiceControl = require('../src/models/ServiceControl');
const jwtConfig = require('../src/config/jwt');
const { connectTestDB, closeTestDB } = require('./setup');
const {
  normalizeRouteLocation,
  normalizeVehicleType,
  isServiceTypeCompatible,
  resolveDriverRoute,
  isSameRoute,
  isReverseRoute,
  isEligibleForBooking,
  driverMatchesBookingRoute
} = require('../src/utils/routeMatching');

describe('Route Matching & Driver Request Delivery Regression Tests', () => {
  describe('1. Pure Route Matching Utilities', () => {
    test('normalizeRouteLocation correctly normalizes cities with parentheses and country suffixes', () => {
      expect(normalizeRouteLocation(' Kathmandu (Kalanki), Nepal ')).toBe('kathmandu');
      expect(normalizeRouteLocation('Birgunj, Nepal')).toBe('birgunj');
      expect(normalizeRouteLocation('Delhi, India')).toBe('delhi');
      expect(normalizeRouteLocation('Pokhara')).toBe('pokhara');
      expect(normalizeRouteLocation('')).toBe('');
      expect(normalizeRouteLocation(null)).toBe('');
    });

    test('isSameRoute matches same direction and rejects reverse or mismatched routes', () => {
      expect(isSameRoute('Kathmandu', 'Birgunj', 'Kathmandu', 'Birgunj')).toBe(true);
      expect(isSameRoute('Kathmandu (Kalanki), Nepal', 'Birgunj', 'Kathmandu', 'Birgunj, Nepal')).toBe(true);
      // Reverse direction is NOT same route
      expect(isSameRoute('Kathmandu', 'Birgunj', 'Birgunj', 'Kathmandu')).toBe(false);
      // Mismatched destinations
      expect(isSameRoute('Kathmandu', 'Birgunj', 'Kathmandu', 'Pokhara')).toBe(false);
      expect(isSameRoute('Kathmandu', 'Birgunj', 'Pokhara', 'Birgunj')).toBe(false);
    });

    test('isReverseRoute detects exact reversed routes and rejects others', () => {
      expect(isReverseRoute('Kathmandu', 'Birgunj', 'Birgunj', 'Kathmandu')).toBe(true);
      expect(isReverseRoute('Kathmandu (Kalanki), Nepal', 'Birgunj', 'Birgunj, Nepal', 'Kathmandu')).toBe(true);
      expect(isReverseRoute('Kathmandu', 'Birgunj', 'Kathmandu', 'Birgunj')).toBe(false);
      expect(isReverseRoute('Kathmandu', 'Birgunj', 'Kathmandu', 'Pokhara')).toBe(false);
    });

    test('isEligibleForBooking handles allowOpposite explicitly', () => {
      // Same direction: always eligible
      expect(isEligibleForBooking('Kathmandu', 'Birgunj', 'Kathmandu', 'Birgunj', false).finalEligible).toBe(true);
      expect(isEligibleForBooking('Kathmandu', 'Birgunj', 'Kathmandu', 'Birgunj', true).finalEligible).toBe(true);

      // Reverse direction: NOT eligible when allowOpposite is false
      expect(isEligibleForBooking('Kathmandu', 'Birgunj', 'Birgunj', 'Kathmandu', false).finalEligible).toBe(false);
      // Reverse direction: eligible only when allowOpposite is true
      expect(isEligibleForBooking('Kathmandu', 'Birgunj', 'Birgunj', 'Kathmandu', true).finalEligible).toBe(true);

      // Mismatched route: never eligible regardless of allowOpposite
      expect(isEligibleForBooking('Kathmandu', 'Birgunj', 'Kathmandu', 'Pokhara', false).finalEligible).toBe(false);
      expect(isEligibleForBooking('Kathmandu', 'Birgunj', 'Kathmandu', 'Pokhara', true).finalEligible).toBe(false);
    });

    test('isServiceTypeCompatible validates vehicle type against requested service', () => {
      // Car driver
      expect(isServiceTypeCompatible('Car', 'Car')).toBe(true);
      expect(isServiceTypeCompatible('Car', 'EV-Sewa')).toBe(false);
      expect(isServiceTypeCompatible('Car', 'Bus')).toBe(false);
      expect(isServiceTypeCompatible('Car', 'Any')).toBe(true);

      // EV-Sewa driver
      expect(isServiceTypeCompatible('EV-Sewa', 'EV-Sewa')).toBe(true);
      expect(isServiceTypeCompatible('EV-Sewa', 'Car')).toBe(false);
      expect(isServiceTypeCompatible('EV-Sewa', 'Bus')).toBe(false);
      expect(isServiceTypeCompatible('EV-Sewa', 'Any')).toBe(true);

      // Bus driver
      expect(isServiceTypeCompatible('Bus', 'Bus')).toBe(true);
      expect(isServiceTypeCompatible('Bus', 'Car')).toBe(false);
      expect(isServiceTypeCompatible('Bus', 'EV-Sewa')).toBe(false);
      expect(isServiceTypeCompatible('Bus', 'Any')).toBe(true);
    });

    test('resolveDriverRoute prioritizes independent driver route over vehicle route', () => {
      const driverWithOwnRoute = {
        route: { origin: 'Kathmandu', destination: 'Birgunj' },
        assignedVehicle: {
          route: { origin: 'Pokhara', destination: 'Chitwan' }
        }
      };
      const resolved = resolveDriverRoute(driverWithOwnRoute);
      expect(resolved).toEqual({ origin: 'Kathmandu', destination: 'Birgunj' });

      const driverWithoutOwnRoute = {
        route: { origin: '', destination: '' },
        assignedVehicle: {
          route: { origin: 'Pokhara', destination: 'Chitwan' }
        }
      };
      const resolvedFallback = resolveDriverRoute(driverWithoutOwnRoute);
      expect(resolvedFallback).toEqual({ origin: 'Pokhara', destination: 'Chitwan' });
    });
  });

  describe('2. Driver Requests API Integration & Observed Bug Scenario', () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const testUsers = [];
    const testDrivers = [];
    const testVehicles = [];
    const testBookings = [];
    let carDriver, carDriverUser, carVehicle, carDriverToken;
    let evDriver, evDriverUser, evVehicle, evDriverToken;

    beforeAll(async () => {
      await connectTestDB();
      jest.spyOn(console, 'log').mockImplementation(() => {});

      // Create Driver 1: Car driver with route Kathmandu -> Birgunj
      carDriverUser = await User.create({
        name: `Review Car Driver ${suffix}`,
        email: `car-driver-${suffix}@test.com`,
        phone: `98${String(suffix).slice(-8)}`,
        password: 'Password123!',
        role: 'driver',
        status: 'Active'
      });
      testUsers.push(carDriverUser._id);

      carDriver = await Driver.create({
        user: carDriverUser._id,
        name: carDriverUser.name,
        mobileNumber: carDriverUser.phone,
        drivingLicenceNumber: `DL-CAR-${suffix}`,
        driverStatus: 'Active',
        isOnline: true,
        route: { origin: 'Kathmandu', destination: 'Birgunj' }
      });
      testDrivers.push(carDriver._id);

      carVehicle = await Vehicle.create({
        vehicleNumber: `CAR-${suffix}`,
        vehicleType: 'Car',
        vehicleCategory: 'Sedan',
        vehicleModel: 'Swift Dzire',
        vehicleName: 'Private Car',
        ownerName: carDriver.name,
        ownerMobileNumber: carDriver.mobileNumber,
        assignedDriver: carDriver._id,
        vehicleStatus: 'Active',
        route: { origin: '', destination: '' }
      });
      testVehicles.push(carVehicle._id);

      carDriver.assignedVehicle = carVehicle._id;
      await carDriver.save();

      carDriverToken = jwt.sign({ id: carDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

      // Create Driver 2: EV-Sewa driver with route Birgunj -> Kathmandu
      evDriverUser = await User.create({
        name: `EV-Sewa Driver ${suffix}`,
        email: `ev-driver-${suffix}@test.com`,
        phone: `97${String(suffix).slice(-8)}`,
        password: 'Password123!',
        role: 'driver',
        status: 'Active'
      });
      testUsers.push(evDriverUser._id);

      evDriver = await Driver.create({
        user: evDriverUser._id,
        name: evDriverUser.name,
        mobileNumber: evDriverUser.phone,
        drivingLicenceNumber: `DL-EV-${suffix}`,
        driverStatus: 'Active',
        isOnline: true,
        route: { origin: 'Birgunj', destination: 'Kathmandu' }
      });
      testDrivers.push(evDriver._id);

      evVehicle = await Vehicle.create({
        vehicleNumber: `EV-${suffix}`,
        vehicleType: 'EV-Sewa',
        vehicleCategory: 'Electric Shuttle 12-Seater',
        vehicleModel: 'Tata Tigor EV',
        vehicleName: 'Green City EV',
        ownerName: evDriver.name,
        ownerMobileNumber: evDriver.mobileNumber,
        assignedDriver: evDriver._id,
        vehicleStatus: 'Active',
        route: { origin: 'Birgunj', destination: 'Kathmandu' }
      });
      testVehicles.push(evVehicle._id);

      evDriver.assignedVehicle = evVehicle._id;
      await evDriver.save();

      evDriverToken = jwt.sign({ id: evDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    });

    afterAll(async () => {
      await Booking.deleteMany({ _id: { $in: testBookings } });
      await Vehicle.deleteMany({ _id: { $in: testVehicles } });
      await Driver.deleteMany({ _id: { $in: testDrivers } });
      await User.deleteMany({ _id: { $in: testUsers } });
      await closeTestDB();
      jest.restoreAllMocks();
    });

    test('reproduces observed BK-9517284 bug: Car driver on Kathmandu->Birgunj MUST NOT see Birgunj->Kathmandu EV-Sewa schedule request', async () => {
      // Create the observed booking: BK-9517284
      // Pickup: Birgunj, Drop: Kathmandu, ServiceType: EV-Sewa, Mode: SCHEDULE
      const observedBooking = await Booking.create({
        bookingId: `BK-9517284-${suffix}`,
        user: carDriverUser._id,
        customer: { name: 'Observed Customer', phone: '9800000000' },
        serviceType: 'EV-Sewa',
        bookingMode: 'SCHEDULE',
        pickupLocation: 'Birgunj',
        dropLocation: 'Kathmandu',
        vehicle: evVehicle._id,
        fare: 650,
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None'
      });
      testBookings.push(observedBooking._id);

      // Car driver polls requests
      const resCarDriver = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${carDriverToken}`)
        .expect(200);

      const carDriverRequestIds = resCarDriver.body.data.map(item => String(item._id));
      expect(carDriverRequestIds).not.toContain(String(observedBooking._id));

      // EV driver (assigned vehicle & matching route Birgunj -> Kathmandu) SHOULD see it
      const resEvDriver = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${evDriverToken}`)
        .expect(200);

      const evDriverRequestIds = resEvDriver.body.data.map(item => String(item._id));
      expect(evDriverRequestIds).toContain(String(observedBooking._id));

      // Car driver must be forbidden from accepting this EV-Sewa reverse booking
      const acceptRes = await request(app)
        .post(`/api/driver/booking-requests/${observedBooking._id}/accept`)
        .set('Authorization', `Bearer ${carDriverToken}`);

      expect([403, 409]).toContain(acceptRes.status);
    });

    test('matching vehicle type and same-direction route is eligible and can be accepted', async () => {
      const carBooking = await Booking.create({
        bookingId: `BK-CAR-${suffix}`,
        user: carDriverUser._id,
        customer: { name: 'Car Passenger', phone: '9811111111' },
        serviceType: 'Car',
        bookingMode: 'INSTANT',
        pickupLocation: 'Kathmandu',
        dropLocation: 'Birgunj',
        fare: 1200,
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None'
      });
      testBookings.push(carBooking._id);

      const resCar = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${carDriverToken}`)
        .expect(200);

      const carRequestIds = resCar.body.data.map(item => String(item._id));
      expect(carRequestIds).toContain(String(carBooking._id));

      const acceptRes = await request(app)
        .post(`/api/driver/booking-requests/${carBooking._id}/accept`)
        .set('Authorization', `Bearer ${carDriverToken}`)
        .expect(200);

      expect(acceptRes.body.success).toBe(true);
    });

    test('expired instant booking (>45s) cannot be accepted and is excluded from requests list', async () => {
      const expiredBooking = await Booking.create({
        bookingId: `BK-EXPIRED-${suffix}`,
        user: carDriverUser._id,
        customer: { name: 'Late Customer', phone: '9822222222' },
        serviceType: 'Car',
        bookingMode: 'INSTANT',
        pickupLocation: 'Kathmandu',
        dropLocation: 'Birgunj',
        fare: 1000,
        createdAt: new Date(Date.now() - 60 * 1000), // 60 seconds ago (> 45s)
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None'
      });
      testBookings.push(expiredBooking._id);

      const resList = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${carDriverToken}`)
        .expect(200);

      const requestIds = resList.body.data.map(item => String(item._id));
      expect(requestIds).not.toContain(String(expiredBooking._id));

      const acceptRes = await request(app)
        .post(`/api/driver/booking-requests/${expiredBooking._id}/accept`)
        .set('Authorization', `Bearer ${carDriverToken}`);

      expect(acceptRes.status).toBe(409);
      expect(acceptRes.body.message).toMatch(/expired/i);
    });

    test('mismatched route (Kathmandu -> Pokhara) is excluded from driver with Kathmandu -> Birgunj route', async () => {
      const mismatchedBooking = await Booking.create({
        bookingId: `BK-POKHARA-${suffix}`,
        user: carDriverUser._id,
        customer: { name: 'Pokhara Customer', phone: '9833333333' },
        serviceType: 'Car',
        bookingMode: 'INSTANT',
        pickupLocation: 'Kathmandu',
        dropLocation: 'Pokhara',
        fare: 1500,
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None'
      });
      testBookings.push(mismatchedBooking._id);

      const resList = await request(app)
        .get('/api/driver/booking-requests')
        .set('Authorization', `Bearer ${carDriverToken}`)
        .expect(200);

      const requestIds = resList.body.data.map(item => String(item._id));
      expect(requestIds).not.toContain(String(mismatchedBooking._id));
    });

    test('scheduled booking assigned to Driver B cannot be accepted by Driver A', async () => {
      const assignedToEvBooking = await Booking.create({
        bookingId: `BK-ASSIGNED-EV-${suffix}`,
        user: carDriverUser._id,
        customer: { name: 'Assigned Customer', phone: '9844444444' },
        serviceType: 'EV-Sewa',
        bookingMode: 'SCHEDULE',
        pickupLocation: 'Birgunj',
        dropLocation: 'Kathmandu',
        driver: evDriver._id,
        vehicle: evVehicle._id,
        fare: 700,
        bookingStatus: 'Pending Driver Confirmation',
        rideStatus: 'None'
      });
      testBookings.push(assignedToEvBooking._id);

      const acceptRes = await request(app)
        .post(`/api/driver/booking-requests/${assignedToEvBooking._id}/accept`)
        .set('Authorization', `Bearer ${carDriverToken}`);

      expect([403, 409]).toContain(acceptRes.status);
    });
  });
});
