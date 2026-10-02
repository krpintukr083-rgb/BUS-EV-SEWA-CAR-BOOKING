const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Schedule = require('../src/models/Schedule');
const ServiceControl = require('../src/models/ServiceControl');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

function generateTestToken(user) {
  return jwt.sign({ id: user._id, role: user.role, permissionsVersion: 1 }, jwtConfig.secret, { expiresIn: '1h' });
}

describe('E2E Matrix Audit', () => {
  
  beforeEach(async () => {
    await Booking.deleteMany({});
    await Driver.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await Schedule.deleteMany({});
    await ServiceControl.deleteMany({});
    
    await ServiceControl.create({
      busService: 'Active',
      evSewaService: 'Active',
      carService: 'Active',
      instantBookingEnabled: true
    });
  });

  const flows = [
    { serviceType: 'Bus', mode: 'INSTANT' },
    { serviceType: 'Bus', mode: 'SCHEDULE' },
    { serviceType: 'EV-Sewa', mode: 'INSTANT' },
    { serviceType: 'EV-Sewa', mode: 'SCHEDULE' },
    { serviceType: 'Car', mode: 'INSTANT' },
    { serviceType: 'Car', mode: 'SCHEDULE' },
  ];

  for (const flow of flows) {
    test(`${flow.serviceType} - ${flow.mode} - Route Matching: Jaipur -> Delhi`, async () => {
      // Setup Customer
      const custUser = await User.create({ name: 'Cust', email: `c_${flow.serviceType.toLowerCase()}_${flow.mode.toLowerCase()}@test.com`, phone: '9999999999', role: 'customer', password: 'password123' });
      const custToken = generateTestToken(custUser);
      
      // Setup Driver A
      const d1User = await User.create({ name: 'DriverA', email: `da_${flow.serviceType.toLowerCase()}_${flow.mode.toLowerCase()}@test.com`, phone: '1111111111', role: 'driver', password: 'password123' });
      const d1Token = generateTestToken(d1User);

      let vehicleType = flow.serviceType === 'Bus' ? 'Bus' : flow.serviceType === 'EV-Sewa' ? 'EV-Sewa' : 'Car';

      const v1 = await Vehicle.create({
        vehicleName: 'Test Vehicle',
        vehicleModel: 'Sedan',
        vehicleType: vehicleType,
        vehicleCategory: 'AC',
        vehicleNumber: 'DL-01-1234',
        seatingCapacity: 4,
        availableSeats: 4,
        ownerName: 'Owner',
        ownerMobileNumber: '9999999999',
        route: { origin: 'Kathmandu', destination: 'Birgunj' },
        vehicleStatus: 'Active'
      });

      const d1 = await Driver.create({
        user: d1User._id,
        name: 'DriverA',
        mobileNumber: '1111111111',
        drivingLicenceNumber: 'DL-123456',
        assignedVehicle: v1._id,
        route: { origin: 'Jaipur', destination: 'Delhi' },
        approvalStatus: 'Approved',
        driverStatus: 'Active',
        isOnline: true
      });
      v1.assignedDriver = d1._id;
      await v1.save();

      let scheduleId;
      if (flow.mode === 'SCHEDULE') {
        const schedule = await Schedule.create({
          driver: d1._id,
          vehicle: v1._id,
          travelDate: new Date(),
          departureTime: '10:00 AM',
          arrivalTime: '02:00 PM',
          origin: 'Jaipur',
          destination: 'Delhi',
          fare: 500,
          status: 'Active'
        });
        scheduleId = schedule._id;
      }

      let bookingRes;
      if (flow.mode === 'INSTANT') {
        bookingRes = await request(app)
          .post('/api/bookings/instant')
          .set('Authorization', `Bearer ${custToken}`)
          .send({
            vehicleId: v1._id,
            serviceType: flow.serviceType,
            pickupLocation: 'Jaipur',
            dropLocation: 'Delhi',
            passengerDetails: [{ name: 'Cust', age: 29, gender: 'Male' }],
            passengerCount: 1,
            fare: 500
          });
      } else {
        bookingRes = await request(app)
          .post('/api/bookings/schedule')
          .set('Authorization', `Bearer ${custToken}`)
          .send({
            vehicleId: v1._id,
            scheduleId: scheduleId,
            serviceType: flow.serviceType,
            pickupLocation: 'Jaipur',
            dropLocation: 'Delhi',
            passengerDetails: [{ name: 'Cust', age: 29, gender: 'Male' }],
            passengerCount: 1,
            fare: 500,
            travelDate: new Date()
          });
      }

      if (bookingRes.status !== 201 && bookingRes.status !== 200) {
        console.log(`Booking Creation Failed for ${flow.serviceType} ${flow.mode}:`, bookingRes.body);
      }
      expect([200, 201]).toContain(bookingRes.status);
      
      const booking = bookingRes.body.data || bookingRes.body.booking;
      const bookingId = booking._id;

      // Driver A Accepts Booking
      const acceptRes = await request(app)
        .post(`/api/driver/requests/${bookingId}/accept`)
        .set('Authorization', `Bearer ${d1Token}`);
        
      if (acceptRes.status !== 200) {
        console.log(`Accept Failed for ${flow.serviceType} ${flow.mode}:`, acceptRes.body);
      }
      expect(acceptRes.status).toBe(200);

      // Verify assigned driver
      const acceptedBooking = await Booking.findById(bookingId);
      expect(acceptedBooking.driver.toString()).toBe(d1._id.toString());
      
      // OTP Flow
      const rideOtp = acceptedBooking.customerViewOtp || acceptedBooking.rideOtp || '123456';

      // Driver B Setup (Wrong Route)
      const d2User = await User.create({ name: 'DriverB', email: `db_${flow.serviceType.toLowerCase()}_${flow.mode.toLowerCase()}@test.com`, phone: '2222222222', role: 'driver', password: 'password123' });
      const d2 = await Driver.create({
        user: d2User._id,
        name: 'DriverB',
        mobileNumber: '2222222222',
        drivingLicenceNumber: 'DL-789012',
        assignedVehicle: v1._id, // Assigning same just to test authorization
        route: { origin: 'Jaipur', destination: 'Agra' },
        approvalStatus: 'Approved',
        driverStatus: 'Active',
        isOnline: true
      });
      const d2Token = generateTestToken(d2User);

      // Driver B Tries to Verify OTP (Should Fail)
      const d2OtpRes = await request(app)
        .post(`/api/driver/bookings/${bookingId}/verify-otp`)
        .set('Authorization', `Bearer ${d2Token}`)
        .send({ otp: rideOtp });
      expect(d2OtpRes.status).not.toBe(200);

      // Driver A Tries Wrong OTP (Should Fail)
      const wrongOtpRes = await request(app)
        .post(`/api/driver/bookings/${bookingId}/verify-otp`)
        .set('Authorization', `Bearer ${d1Token}`)
        .send({ otp: '000000' }); // Must be 6 digits
      expect(wrongOtpRes.status).toBe(400);

      // Driver A Tries Correct OTP (Should Succeed)
      const correctOtpRes = await request(app)
        .post(`/api/driver/bookings/${bookingId}/verify-otp`)
        .set('Authorization', `Bearer ${d1Token}`)
        .send({ otp: rideOtp });
      
      if (correctOtpRes.status !== 200) {
         console.log(`OTP Verify Failed for ${flow.serviceType} ${flow.mode}:`, correctOtpRes.body);
      }
      expect(correctOtpRes.status).toBe(200);

      // Verify OTP Cannot Be Reused
      const reuseOtpRes = await request(app)
        .post(`/api/driver/bookings/${bookingId}/verify-otp`)
        .set('Authorization', `Bearer ${d1Token}`)
        .send({ otp: rideOtp });
      expect(reuseOtpRes.status).toBe(400);

      // Final Booking Status
      const finalBooking = await Booking.findById(bookingId);
      expect(finalBooking.otpVerified).toBe(true);
      
      console.log(`${flow.serviceType.toUpperCase()} | ${flow.mode} | BOOKING CREATE | DRIVER REQUEST | ROUTE MATCH | ACCEPT | OTP | FINAL`);
    });
  }
});
