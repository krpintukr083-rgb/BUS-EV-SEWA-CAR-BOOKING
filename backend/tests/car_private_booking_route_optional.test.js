const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

describe('Car Private Booking — Route Match Optional & Strict Security Suite', () => {
  let customerUser, customerToken;
  let carDriverUser, carDriverToken, carDriverDoc;
  let unauthorizedDriverUser, unauthorizedDriverToken, unauthorizedDriverDoc;
  let busDriverUser, busDriverToken, busDriverDoc;
  let testCar, testBus, testEvSewa;

  beforeAll(async () => {
    await connectTestDB();
    const timestamp = Date.now();

    // 1. Customer
    customerUser = await User.create({
      name: 'Car Private Passenger',
      email: `car_passenger_${timestamp}@test.com`,
      phone: `9810${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'customer'
    });
    customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });

    // 2. Car Driver (Configured operating route: Kathmandu -> Pokhara)
    carDriverUser = await User.create({
      name: 'Authorized Car Driver',
      email: `car_driver_${timestamp}@test.com`,
      phone: `9811${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'driver'
    });
    carDriverToken = jwt.sign({ id: carDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    testCar = await Vehicle.create({
      vehicleNumber: `BA1PA${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'Car',
      vehicleCategory: 'Sedan',
      vehicleModel: 'Hyundai Elantra',
      vehicleName: 'Private Luxury Sedan',
      ownerName: carDriverUser.name,
      ownerMobileNumber: carDriverUser.phone,
      seatingCapacity: 4,
      fareRate: 2500,
      vehicleStatus: 'Active',
      routeApprovalStatus: 'Approved',
      route: {
        origin: 'Kathmandu',
        destination: 'Pokhara'
      }
    });

    carDriverDoc = await Driver.create({
      user: carDriverUser._id,
      name: carDriverUser.name,
      mobileNumber: carDriverUser.phone,
      drivingLicenceNumber: `DL-CAR-${timestamp}`,
      driverStatus: 'Active',
      isOnline: true,
      assignedVehicle: testCar._id,
      route: { origin: 'Kathmandu', destination: 'Pokhara' }
    });
    testCar.assignedDriver = carDriverDoc._id;
    await testCar.save();

    // 3. Unauthorized Unrelated Driver (No link to testCar, different route)
    unauthorizedDriverUser = await User.create({
      name: 'Unrelated Car Driver',
      email: `unauth_car_${timestamp}@test.com`,
      phone: `9812${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'driver'
    });
    unauthorizedDriverToken = jwt.sign({ id: unauthorizedDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    unauthorizedDriverDoc = await Driver.create({
      user: unauthorizedDriverUser._id,
      name: unauthorizedDriverUser.name,
      mobileNumber: unauthorizedDriverUser.phone,
      drivingLicenceNumber: `DL-UNAUTH-${timestamp}`,
      driverStatus: 'Active',
      isOnline: true,
      route: { origin: 'Birgunj', destination: 'Janakpur' }
    });

    // 4. Bus Driver & Bus Vehicle (Route: Kathmandu -> Birgunj)
    busDriverUser = await User.create({
      name: 'Nepal Bus Driver',
      email: `bus_driver_${timestamp}@test.com`,
      phone: `9813${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'driver'
    });
    busDriverToken = jwt.sign({ id: busDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    testBus = await Vehicle.create({
      vehicleNumber: `BA2KHA${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Deluxe',
      vehicleModel: 'Tata Starbus',
      vehicleName: 'Express Bus',
      ownerName: busDriverUser.name,
      ownerMobileNumber: busDriverUser.phone,
      seatingCapacity: 40,
      fareRate: 800,
      vehicleStatus: 'Active',
      routeApprovalStatus: 'Approved',
      route: {
        origin: 'Kathmandu',
        destination: 'Birgunj'
      }
    });

    busDriverDoc = await Driver.create({
      user: busDriverUser._id,
      name: busDriverUser.name,
      mobileNumber: busDriverUser.phone,
      drivingLicenceNumber: `DL-BUS-${timestamp}`,
      driverStatus: 'Active',
      isOnline: true,
      assignedVehicle: testBus._id,
      route: { origin: 'Kathmandu', destination: 'Birgunj' }
    });
    testBus.assignedDriver = busDriverDoc._id;
    await testBus.save();

    // 5. EV-Sewa Vehicle & Driver
    testEvSewa = await Vehicle.create({
      vehicleNumber: `BA3CHA${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Microbus',
      vehicleModel: 'BYD T3',
      vehicleName: 'Green EV Express',
      ownerName: 'EV Owner',
      ownerMobileNumber: '9814000000',
      seatingCapacity: 14,
      fareRate: 600,
      vehicleStatus: 'Active',
      routeApprovalStatus: 'Approved',
      route: {
        origin: 'Kathmandu',
        destination: 'Hetauda'
      }
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  test('1. Car booking with matching route — authorized driver can receive and accept it', async () => {
    const rawOtp = '123456';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const booking = await Booking.create({
      bookingId: `BK-CAR-MATCH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Pokhara',
      fare: 2500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: new Date()
    });

    // Check request list
    const reqRes = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${carDriverToken}`);

    expect(reqRes.status).toBe(200);
    const found = reqRes.body.data.find(b => b.bookingId === booking.bookingId);
    expect(found).toBeDefined();

    // Accept booking
    const acceptRes = await request(app)
      .post(`/api/driver/booking-requests/${booking.bookingId}/accept`)
      .set('Authorization', `Bearer ${carDriverToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
  });

  test('2. Car private booking with mismatching route — authorized assigned driver receives and accepts it', async () => {
    // Driver route: Kathmandu -> Pokhara
    // Booking route: Lalitpur -> Bhaktapur (completely different route!)
    const rawOtp = '654321';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const privateBooking = await Booking.create({
      bookingId: `BK-CAR-MISMATCH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Lalitpur City',
      dropLocation: 'Bhaktapur Durbar',
      fare: 3500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: new Date()
    });

    // Authorized assigned driver receives it despite route mismatch
    const reqRes = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${carDriverToken}`);

    expect(reqRes.status).toBe(200);
    const found = reqRes.body.data.find(b => b.bookingId === privateBooking.bookingId);
    expect(found).toBeDefined();
    expect(found.pickupLocation).toBe('Lalitpur City');
    expect(found.dropLocation).toBe('Bhaktapur Durbar');

    // Authorized assigned driver can accept it despite route mismatch
    const acceptRes = await request(app)
      .post(`/api/driver/booking-requests/${privateBooking.bookingId}/accept`)
      .set('Authorization', `Bearer ${carDriverToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
  });

  test('3. Car booking OTP confirmation succeeds for authorized driver despite route mismatch', async () => {
    // Booking route: Thamel -> Nagarkot
    // Driver route: Kathmandu -> Pokhara
    const rawOtp = '789123';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const carBooking = await Booking.create({
      bookingId: `BK-CAR-OTP-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Thamel, Kathmandu',
      dropLocation: 'Nagarkot View Tower',
      fare: 4000,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: new Date()
    });

    const verifyRes = await request(app)
      .post(`/api/driver/bookings/${carBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${carDriverToken}`)
      .send({ otp: rawOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.message).toMatch(/Customer OTP verified successfully/i);

    const verified = await Booking.findById(carBooking._id);
    expect(verified.driverConfirmed).toBe(true);
    expect(verified.confirmationOtpVerifiedAt).toBeDefined();
    expect(verified.pickupLocation).toBe('Thamel, Kathmandu');
    expect(verified.dropLocation).toBe('Nagarkot View Tower');
  });

  test('4. An unrelated/unauthorized driver is rejected with HTTP 403 on Car booking OTP verification', async () => {
    const rawOtp = '345678';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const carBooking = await Booking.create({
      bookingId: `BK-CAR-UNAUTH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Tribhuvan Airport',
      dropLocation: 'Patan Durbar Square',
      fare: 2000,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: new Date()
    });

    // Unrelated driver attempts to confirm OTP -> must receive HTTP 403!
    const verifyRes = await request(app)
      .post(`/api/driver/bookings/${carBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${unauthorizedDriverToken}`)
      .send({ otp: rawOtp });

    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.success).toBe(false);

    const check = await Booking.findById(carBooking._id);
    expect(check.driverConfirmed).toBe(false);
  });

  test('5. Bus route mismatch still returns HTTP 403 (strict route matching maintained for Bus)', async () => {
    // Bus driver route: Kathmandu -> Birgunj
    // Booking route: Pokhara -> Chitwan (mismatched!)
    const rawOtp = '987654';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const busBooking = await Booking.create({
      bookingId: `BK-BUS-MISMATCH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: busDriverDoc._id,
      vehicle: testBus._id,
      serviceType: 'Bus',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Pokhara Bus Park',
      dropLocation: 'Chitwan Sauraha',
      fare: 900,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      busSeatNumbers: ['B1']
    });

    const verifyRes = await request(app)
      .post(`/api/driver/bookings/${busBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${busDriverToken}`)
      .send({ otp: rawOtp });

    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.message).toMatch(/driver route does not match this booking/i);
  });

  test('6. EV-Sewa route matching behavior remains strict and unchanged', async () => {
    // EV-Sewa route: Kathmandu -> Hetauda
    // Driver route: Pokhara -> Kathmandu (different driver)
    const rawOtp = '112233';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const evBooking = await Booking.create({
      bookingId: `BK-EV-MISMATCH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: unauthorizedDriverDoc._id, // Birgunj -> Janakpur
      vehicle: testEvSewa._id,
      serviceType: 'EV-Sewa',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu Ring Road',
      dropLocation: 'Hetauda Bus Stand',
      fare: 650,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false
    });

    const verifyRes = await request(app)
      .post(`/api/driver/bookings/${evBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${unauthorizedDriverToken}`)
      .send({ otp: rawOtp });

    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.success).toBe(false);
  });

  test('7. Expired or cancelled bookings remain ineligible for acceptance and confirmation', async () => {
    const rawOtp = '445566';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const cancelledBooking = await Booking.create({
      bookingId: `BK-CAR-CANCELLED-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Pokhara',
      fare: 2500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Cancelled',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp
    });

    const acceptRes = await request(app)
      .post(`/api/driver/booking-requests/${cancelledBooking.bookingId}/accept`)
      .set('Authorization', `Bearer ${carDriverToken}`);

    expect([400, 404, 409]).toContain(acceptRes.status);

    const expiredBooking = await Booking.create({
      bookingId: `BK-CAR-EXPIRED-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Pokhara',
      fare: 2500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() - 10 * 60 * 1000), // expired 10 minutes ago
      customerViewOtp: rawOtp
    });

    const verifyRes = await request(app)
      .post(`/api/driver/bookings/${expiredBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${carDriverToken}`)
      .send({ otp: rawOtp });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.message).toMatch(/expired/i);
  });

  test('8. Customer OTP is single-use and never exposed in driver-facing response data', async () => {
    const rawOtp = '778899';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const carBooking = await Booking.create({
      bookingId: `BK-CAR-REPLAY-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: carDriverDoc._id,
      vehicle: testCar._id,
      serviceType: 'Car',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu Center',
      dropLocation: 'Chandragiri Hills',
      fare: 3000,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      travelDate: new Date()
    });

    // 1st verify: Should succeed
    const firstVerify = await request(app)
      .post(`/api/driver/bookings/${carBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${carDriverToken}`)
      .send({ otp: rawOtp });

    expect(firstVerify.status).toBe(200);
    // Security check: Customer OTP must NEVER be exposed in driver response
    expect(firstVerify.body.data.customerViewOtp).toBeUndefined();
    expect(firstVerify.body.data.confirmationOtp).toBeUndefined();
    expect(firstVerify.body.data.confirmationOtpHash).toBeUndefined();
    expect(firstVerify.body.data.rideOtp).toBeUndefined();

    // 2nd verify (replay attempt): Must fail with HTTP 400
    const replayVerify = await request(app)
      .post(`/api/driver/bookings/${carBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${carDriverToken}`)
      .send({ otp: rawOtp });

    expect(replayVerify.status).toBe(400);
    expect(replayVerify.body.message).toMatch(/already verified/i);
  });
});
