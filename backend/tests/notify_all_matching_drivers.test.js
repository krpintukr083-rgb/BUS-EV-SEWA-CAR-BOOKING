const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { connectTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Notification = require('../src/models/Notification');
const ServiceControl = require('../src/models/ServiceControl');
const { notifyEligibleDriversForBooking } = require('../src/utils/notification');

describe('Multi-Driver Route Notification and Request Eligibility Regression Suite', () => {
  let customerUser, dUser1, dUser2, dUser3, dUserOpp, dUserIncomp;
  let driver1, driver2, driver3, driverOpp, driverIncomp;
  let v1, v2, v3, vOpp, vIncomp;
  let customerToken, token1, token2, token3, tokenOpp, tokenIncomp;
  const suffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    await connectTestDB();

    await ServiceControl.findOneAndUpdate(
      {},
      {
        busService: 'Active',
        instantBookingEnabled: true,
        oppositeRouteNotifications: false
      },
      { upsert: true }
    );

    // Customer
    customerUser = await User.create({
      name: 'Test Customer',
      email: `cust_${suffix}@test.com`,
      phone: `980${suffix}`,
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });
    customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });

    // Helper to create driver + user + vehicle
    const makeDriver = async (name, phonePrefix, origin, destination, vType) => {
      const u = await User.create({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '_')}_${suffix}@test.com`,
        phone: `${phonePrefix}${suffix}`,
        password: 'password123',
        role: 'driver',
        status: 'Active'
      });
      const d = await Driver.create({
        user: u._id,
        name,
        mobileNumber: u.phone,
        drivingLicenceNumber: `DL-${phonePrefix}-${suffix}`,
        driverStatus: 'Active',
        isOnline: true,
        route: { origin, destination },
        drivingLicenceStatus: 'Approved',
        citizenshipStatus: 'Approved',
        rcStatus: 'Approved',
        insuranceStatus: 'Approved',
        fitnessStatus: 'Approved',
        requiredDocumentsStatus: 'Approved'
      });
      const v = await Vehicle.create({
        vehicleNumber: `VEH-${phonePrefix}-${suffix}`,
        plateNumber: `VEH-${phonePrefix}-${suffix}`,
        vehicleName: `${name} Vehicle`,
        vehicleType: vType,
        vehicleCategory: vType === 'Bus' ? 'AC Deluxe' : 'Sedan',
        vehicleModel: vType === 'Bus' ? 'Tata Starbus' : 'Suzuki Dzire',
        ownerName: name,
        ownerMobileNumber: u.phone,
        vehicleStatus: 'Active',
        assignedDriver: d._id,
        route: { origin, destination },
        seatingCapacity: vType === 'Bus' ? 30 : 4
      });
      d.assignedVehicle = v._id;
      await d.save();
      const token = jwt.sign({ id: u._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
      return { u, d, v, token };
    };

    // Driver 1: Matching (Kathmandu -> Birgunj, Car)
    const res1 = await makeDriver('Eligible Driver 1', '981', 'Kathmandu', 'Birgunj', 'Car');
    dUser1 = res1.u; driver1 = res1.d; v1 = res1.v; token1 = res1.token;

    // Driver 2: Matching (Kathmandu -> Birgunj, Car)
    const res2 = await makeDriver('Eligible Driver 2', '982', 'Kathmandu', 'Birgunj', 'Car');
    dUser2 = res2.u; driver2 = res2.d; v2 = res2.v; token2 = res2.token;

    // Driver 3: Matching (Kathmandu -> Birgunj, Car)
    const res3 = await makeDriver('Eligible Driver 3', '983', 'Kathmandu', 'Birgunj', 'Car');
    dUser3 = res3.u; driver3 = res3.d; v3 = res3.v; token3 = res3.token;

    // Opposite Driver: Opposite route (Birgunj -> Kathmandu, Car)
    const resOpp = await makeDriver('Opposite Driver', '984', 'Birgunj', 'Kathmandu', 'Car');
    dUserOpp = resOpp.u; driverOpp = resOpp.d; vOpp = resOpp.v; tokenOpp = resOpp.token;

    // Incompatible Driver: Wrong vehicle type (Kathmandu -> Birgunj, Bus)
    const resIncomp = await makeDriver('Incompatible Bus Driver', '985', 'Kathmandu', 'Birgunj', 'Bus');
    dUserIncomp = resIncomp.u; driverIncomp = resIncomp.d; vIncomp = resIncomp.v; tokenIncomp = resIncomp.token;
  });

  afterAll(async () => {
    // Cleanup created test records
    const userIds = [customerUser?._id, dUser1?._id, dUser2?._id, dUser3?._id, dUserOpp?._id, dUserIncomp?._id].filter(Boolean);
    const vehicleIds = [v1?._id, v2?._id, v3?._id, vOpp?._id, vIncomp?._id].filter(Boolean);
    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
      await Driver.deleteMany({ user: { $in: userIds } });
    }
    if (vehicleIds.length > 0) {
      await Vehicle.deleteMany({ _id: { $in: vehicleIds } });
    }
  });

  test('All 3 matching route drivers receive notification; opposite & incompatible drivers are excluded', async () => {
    // 1. Create fresh Car instant booking (Kathmandu -> Birgunj)
    const bookingRes = await request(app)
      .post('/api/bookings/instant')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        pickupLocation: 'Kathmandu',
        dropLocation: 'Birgunj',
        serviceType: 'Car',
        bookingMode: 'INSTANT',
        fare: 2500,
        seatsBooked: 1,
        passengerDetails: [{ name: 'Test Passenger', phone: '9811122233', age: 28, gender: 'Male' }],
        paymentMethod: 'CASH',
        travelDate: new Date()
      });

    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;
    expect(booking).toBeDefined();

    // 2. Query notifications generated in database
    const notifs = await Notification.find({
      entityId: booking._id,
      eventType: 'BOOKING_REQUEST'
    });

    const notifiedDriverIds = notifs.map(n => n.driverId.toString());

    // 3. Verify exactly all 3 matching drivers received notifications
    expect(notifiedDriverIds).toContain(driver1._id.toString());
    expect(notifiedDriverIds).toContain(driver2._id.toString());
    expect(notifiedDriverIds).toContain(driver3._id.toString());

    // 4. Verify opposite-route driver did NOT receive notification
    expect(notifiedDriverIds).not.toContain(driverOpp._id.toString());

    // 5. Verify incompatible-type (Bus) driver did NOT receive notification
    expect(notifiedDriverIds).not.toContain(driverIncomp._id.toString());

    // 6. Verify GET /api/driver/booking-requests for all 3 eligible drivers
    const req1 = await request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${token1}`);
    expect(req1.status).toBe(200);
    expect(req1.body.data.some(r => r.bookingId === booking.bookingId)).toBe(true);

    const req2 = await request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${token2}`);
    expect(req2.status).toBe(200);
    expect(req2.body.data.some(r => r.bookingId === booking.bookingId)).toBe(true);

    const req3 = await request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${token3}`);
    expect(req3.status).toBe(200);
    expect(req3.body.data.some(r => r.bookingId === booking.bookingId)).toBe(true);

    // 7. Verify GET /api/driver/booking-requests for opposite-route driver (excluded)
    const reqOpp = await request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${tokenOpp}`);
    expect(reqOpp.status).toBe(200);
    expect(reqOpp.body.data.some(r => r.bookingId === booking.bookingId)).toBe(false);

    // 8. Verify GET /api/driver/booking-requests for incompatible-type driver (excluded)
    const reqIncomp = await request(app).get('/api/driver/booking-requests').set('Authorization', `Bearer ${tokenIncomp}`);
    expect(reqIncomp.status).toBe(200);
    expect(reqIncomp.body.data.some(r => r.bookingId === booking.bookingId)).toBe(false);

    // Cleanup created booking & notifications
    await Booking.deleteOne({ _id: booking._id });
    await Notification.deleteMany({ entityId: booking._id });
  });
});
