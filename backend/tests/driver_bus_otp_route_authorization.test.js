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

describe('Driver Bus Seat OTP Route & Recipient Authorization Suite', () => {
  let customerUser, customerToken;
  let authorizedDriverUser, authorizedDriverToken, authorizedDriverDoc;
  let unauthorizedDriverUser, unauthorizedDriverToken, unauthorizedDriverDoc;
  let nepalBus;

  beforeAll(async () => {
    await connectTestDB();

    const timestamp = Date.now();

    // 1. Customer
    customerUser = await User.create({
      name: 'Nepal Bus Passenger',
      email: `nepal_passenger_${timestamp}@test.com`,
      phone: `9800${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'customer'
    });
    customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });

    // 2. Authorized Driver (Starts with empty route on Driver doc to verify fallback)
    authorizedDriverUser = await User.create({
      name: 'Authorized Nepal Driver',
      email: `auth_driver_${timestamp}@test.com`,
      phone: `9801${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'driver'
    });
    authorizedDriverToken = jwt.sign({ id: authorizedDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    // 3. Unauthorized Driver (Configured on a totally different route)
    unauthorizedDriverUser = await User.create({
      name: 'Unauthorized Pokhara Driver',
      email: `unauth_driver_${timestamp}@test.com`,
      phone: `9802${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
      role: 'driver'
    });
    unauthorizedDriverToken = jwt.sign({ id: unauthorizedDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    // 4. Nepal Bus Vehicle (Kathmandu, Nepal -> Birgunj, Nepal)
    nepalBus = await Vehicle.create({
      vehicleNumber: `BA2KHA${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Deluxe 2+2',
      vehicleModel: 'Tata Starbus Ultra AC',
      vehicleName: 'Yatra Nepal Deluxe Bus',
      ownerName: 'Authorized Nepal Driver',
      ownerMobileNumber: authorizedDriverUser.phone,
      seatingCapacity: 36,
      fareRate: 750,
      vehicleStatus: 'Active',
      routeApprovalStatus: 'Approved',
      route: {
        origin: 'Kathmandu, Nepal',
        destination: 'Birgunj, Nepal',
        departureTime: '07:00 AM',
        arrivalTime: '02:30 PM'
      }
    });

    // Link authorized driver to vehicle with blank route on driver doc
    authorizedDriverDoc = await Driver.create({
      user: authorizedDriverUser._id,
      name: authorizedDriverUser.name,
      mobileNumber: authorizedDriverUser.phone,
      drivingLicenceNumber: `DL-NEPAL-${timestamp}`,
      driverStatus: 'Active',
      isOnline: true,
      assignedVehicle: nepalBus._id,
      route: { origin: '', destination: '' } // Simulates review driver profile where driver.route is blank
    });
    nepalBus.assignedDriver = authorizedDriverDoc._id;
    await nepalBus.save();

    // Link unauthorized driver to another vehicle / route
    unauthorizedDriverDoc = await Driver.create({
      user: unauthorizedDriverUser._id,
      name: unauthorizedDriverUser.name,
      mobileNumber: unauthorizedDriverUser.phone,
      drivingLicenceNumber: `DL-POKHARA-${timestamp}`,
      driverStatus: 'Active',
      isOnline: true,
      route: { origin: 'Pokhara', destination: 'Kathmandu' }
    });
  });

  afterAll(async () => {
    await closeTestDB();
  });

  test('1. Rejects OTP confirmation when driver route mismatches booking route (Nhfff -> Hhddx)', async () => {
    const rawOtp = '294615';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const mismatchedBooking = await Booking.create({
      bookingId: `BK-TEST-MISMATCH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: authorizedDriverDoc._id,
      vehicle: nepalBus._id,
      serviceType: 'Bus',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Nhfff',
      dropLocation: 'Hhddx',
      fare: 500,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      busSeatNumbers: ['A1']
    });

    const res = await request(app)
      .post(`/api/driver/bookings/${mismatchedBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${authorizedDriverToken}`)
      .send({ otp: rawOtp });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/driver route does not match this booking/i);

    const check = await Booking.findById(mismatchedBooking._id);
    expect(check.driverConfirmed).toBe(false);
  });

  test('2. Authorizes and confirms OTP when driver route matches via assigned vehicle fallback (Kathmandu, Nepal -> Birgunj, Nepal)', async () => {
    const rawOtp = '582914';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const validBooking = await Booking.create({
      bookingId: `BK-TEST-NEPAL-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: authorizedDriverDoc._id,
      vehicle: nepalBus._id,
      serviceType: 'Bus',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu, Nepal',
      dropLocation: 'Birgunj, Nepal',
      fare: 750,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      busSeatNumbers: ['S-01']
    });

    const res = await request(app)
      .post(`/api/driver/bookings/${validBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${authorizedDriverToken}`)
      .send({ otp: rawOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.driverConfirmed).toBe(true);

    const updatedBooking = await Booking.findById(validBooking._id);
    expect(updatedBooking.driverConfirmed).toBe(true);
    expect(updatedBooking.driverConfirmationStatus).toBe('Confirmed');
    expect(updatedBooking.confirmationOtpVerifiedAt).toBeTruthy();
    expect(updatedBooking.bookingStatus).toBe('Awaiting Cash Collection');
  });

  test('3. Authorizes normalized location variation ("Kathmandu" vs "Kathmandu, Nepal")', async () => {
    const rawOtp = '771234';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const normalizedBooking = await Booking.create({
      bookingId: `BK-TEST-NORM-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: authorizedDriverDoc._id,
      vehicle: nepalBus._id,
      serviceType: 'Bus',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Birgunj',
      fare: 750,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      busSeatNumbers: ['S-02']
    });

    const res = await request(app)
      .post(`/api/driver/bookings/${normalizedBooking.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${authorizedDriverToken}`)
      .send({ otp: rawOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.driverConfirmed).toBe(true);
  });

  test('4. Rejects unauthorized driver with HTTP 403 Forbidden even with correct customer OTP', async () => {
    const rawOtp = '991823';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const bookingForAuthDriver = await Booking.create({
      bookingId: `BK-TEST-UNAUTH-${Date.now()}`,
      user: customerUser._id,
      customer: { name: customerUser.name, phone: customerUser.phone },
      driver: authorizedDriverDoc._id,
      vehicle: nepalBus._id,
      serviceType: 'Bus',
      bookingMode: 'SCHEDULE',
      pickupLocation: 'Kathmandu, Nepal',
      dropLocation: 'Birgunj, Nepal',
      fare: 750,
      paymentMethod: 'Offline Cash',
      paymentStatus: 'Pending Cash',
      bookingStatus: 'Pending Driver Confirmation',
      confirmationOtpHash: otpHash,
      confirmationOtpExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      busSeatNumbers: ['S-03']
    });

    // Unauthorized driver attempts to verify OTP for this booking
    const res = await request(app)
      .post(`/api/driver/bookings/${bookingForAuthDriver.bookingId}/verify-otp`)
      .set('Authorization', `Bearer ${unauthorizedDriverToken}`)
      .send({ otp: rawOtp });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/driver route does not match this booking or driver is not an authorized recipient/i);

    const check = await Booking.findById(bookingForAuthDriver._id);
    expect(check.driverConfirmed).toBe(false);
  });
});
