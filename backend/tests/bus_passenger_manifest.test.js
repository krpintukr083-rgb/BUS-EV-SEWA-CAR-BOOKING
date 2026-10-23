const mongoose = require('mongoose');
const { connectTestDB, closeTestDB } = require('./setup');
const { getBusManifestJourneys, getBusPassengerManifest } = require('../src/controllers/adminController');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Schedule = require('../src/models/Schedule');
const Driver = require('../src/models/Driver');
const User = require('../src/models/User');

jest.setTimeout(30000);

describe('Bus Passenger Manifest Feature Tests', () => {
  let testDriverUser;
  let testDriver;
  let testBus1;
  let testSchedule;
  let testCustomerUser;
  let createdBookingIds = [];
  let createdVehicleIds = [];
  let createdDriverIds = [];
  let createdUserIds = [];

  beforeAll(async () => {
    await connectTestDB();

    // 1. Create a test driver with user
    testDriverUser = await User.create({
      name: 'Manifest Driver User',
      email: `driver_manifest_${Date.now()}@test.com`,
      phone: `98444${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    createdUserIds.push(testDriverUser._id);

    testDriver = await Driver.create({
      user: testDriverUser._id,
      name: 'Manifest Test Driver',
      phone: testDriverUser.phone,
      mobileNumber: testDriverUser.phone,
      drivingLicenceNumber: `DL-MAN-${Date.now()}`,
      licenseNumber: `DL-MAN-${Date.now()}`,
      driverStatus: 'Active',
      status: 'Active'
    });
    createdDriverIds.push(testDriver._id);

    // 2. Create customer user with emergency contact
    testCustomerUser = await User.create({
      name: 'Manifest Customer',
      email: `manifest_cust_${Date.now()}@test.com`,
      phone: `98555${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'customer',
      status: 'Active',
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Sister',
        phone: '9800000099'
      }
    });
    createdUserIds.push(testCustomerUser._id);

    // 3. Create Bus 1 (with 2 distinct trips / dates)
    testBus1 = await Vehicle.create({
      vehicleNumber: `BA 99 KHA ${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper 2+1',
      vehicleModel: 'Volvo 9600',
      vehicleName: 'Yatra Deluxe Express',
      seatingCapacity: 36,
      ownerName: 'Manifest Fleet Operator',
      ownerMobileNumber: '9841000000',
      assignedDriver: testDriver._id,
      route: {
        origin: 'Kathmandu',
        destination: 'Pokhara',
        departureTime: '07:00 AM',
        arrivalTime: '01:00 PM',
        duration: '6h',
        boardingPoints: ['Kalanki Bus Stop', 'Gongabu Bus Park'],
        droppingPoints: ['Prithvi Chowk Pokhara']
      },
      busDetails: {
        busType: 'AC Sleeper',
        seatLayout: '2+1 Luxury Sleeper',
        availableSeats: 36
      }
    });
    createdVehicleIds.push(testBus1._id);

    // 4. Create Schedule for Bus 1 on Date 2026-11-01
    testSchedule = await Schedule.create({
      vehicle: testBus1._id,
      driver: testDriver._id,
      origin: 'Kathmandu',
      destination: 'Pokhara',
      travelDate: new Date('2026-11-01T00:00:00.000Z'),
      departureTime: '07:00 AM',
      arrivalTime: '01:00 PM',
      fareRate: 1200,
      status: 'Active'
    });

    // 5. Create multiple bookings for Bus 1 on Date 2026-11-01
    // Booking A: Group booking with 2 distinct passengers
    const bookingGroup = await Booking.create({
      bookingId: `BK-MAN-${Date.now()}-1`,
      customer: {
        name: 'Manifest Customer',
        phone: testCustomerUser.phone,
        email: testCustomerUser.email
      },
      user: testCustomerUser._id,
      driver: testDriver._id,
      vehicle: testBus1._id,
      scheduleId: testSchedule._id,
      serviceType: 'Bus',
      pickupLocation: 'Kalanki Bus Stop',
      dropLocation: 'Prithvi Chowk Pokhara',
      travelDate: new Date('2026-11-01T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Alice Smith', age: 29, gender: 'Female', seatNumber: 'S01' },
        { name: 'Bob Smith', age: 32, gender: 'Male', seatNumber: 'S02' }
      ],
      busSeatNumbers: ['S01', 'S02'],
      fare: 2400,
      finalFare: 2400,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(bookingGroup._id);

    // Booking B: Single booking with Cancelled status
    const bookingCancelled = await Booking.create({
      bookingId: `BK-MAN-${Date.now()}-2`,
      customer: {
        name: 'Charlie Brown',
        phone: '9866600001',
        email: 'charlie@test.com'
      },
      driver: testDriver._id,
      vehicle: testBus1._id,
      scheduleId: testSchedule._id,
      serviceType: 'Bus',
      pickupLocation: 'Gongabu Bus Park',
      dropLocation: 'Prithvi Chowk Pokhara',
      travelDate: new Date('2026-11-01T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Charlie Brown', age: 40, gender: 'Male', seatNumber: 'S05' }
      ],
      busSeatNumbers: ['S05'],
      fare: 1200,
      finalFare: 1200,
      bookingStatus: 'Cancelled',
      paymentStatus: 'Refunded'
    });
    createdBookingIds.push(bookingCancelled._id);

    // Booking C: Different travel date (2026-11-05) for SAME BUS (Testing multi-journey separation)
    const bookingTrip2 = await Booking.create({
      bookingId: `BK-MAN-${Date.now()}-3`,
      customer: {
        name: 'Diana Prince',
        phone: '9866600002',
        email: 'diana@test.com'
      },
      driver: testDriver._id,
      vehicle: testBus1._id,
      serviceType: 'Bus',
      pickupLocation: 'Kalanki Bus Stop',
      dropLocation: 'Prithvi Chowk Pokhara',
      travelDate: new Date('2026-11-05T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Diana Prince', age: 25, gender: 'Female', seatNumber: 'S10' }
      ],
      busSeatNumbers: ['S10'],
      fare: 1200,
      finalFare: 1200,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(bookingTrip2._id);
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdBookingIds.length) await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    if (createdVehicleIds.length) await Vehicle.deleteMany({ _id: { $in: createdVehicleIds } });
    if (createdDriverIds.length) await Driver.deleteMany({ _id: { $in: createdDriverIds } });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
    if (testSchedule) await Schedule.deleteOne({ _id: testSchedule._id });
    await closeTestDB();
  });

  test('1. Journey Selection: Lists distinct journeys including bus registration, operator, driver, and counts', async () => {
    const req = { query: { vehicleId: testBus1._id.toString() } };
    let responseData = null;
    const res = { json: data => { responseData = data; } };
    const next = jest.fn();

    await getBusManifestJourneys(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);

    // Same bus operates multiple trips (2026-11-01 and 2026-11-05)
    const trips = responseData.data.filter(j => j.vehicleId.toString() === testBus1._id.toString());
    expect(trips.length).toBeGreaterThanOrEqual(2);

    const tripNov1 = trips.find(t => t.travelDate === '2026-11-01');
    expect(tripNov1).toBeDefined();
    expect(tripNov1.vehicleNumber).toBe(testBus1.vehicleNumber);
    expect(tripNov1.driverName).toBe(testDriver.name);
    expect(tripNov1.operatorName).toBe('Manifest Fleet Operator');
    expect(tripNov1.origin).toBe('Kathmandu');
    expect(tripNov1.destination).toBe('Pokhara');
  });

  test('2. Manifest Retrieval: Displays separate passenger list for specific bus & journey date', async () => {
    const req = {
      query: {
        vehicleId: testBus1._id.toString(),
        travelDate: '2026-11-01'
      }
    };
    let responseData = null;
    const res = { json: data => { responseData = data; } };
    const next = jest.fn();

    await getBusPassengerManifest(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(responseData.success).toBe(true);
    expect(responseData.journeyInfo.vehicleNumber).toBe(testBus1.vehicleNumber);

    // On 2026-11-01, we have Alice Smith, Bob Smith, and Charlie Brown (3 passengers total across 2 bookings)
    expect(responseData.summary.totalManifestPassengers).toBe(3);
    expect(responseData.summary.confirmedCount).toBe(2);
    expect(responseData.summary.cancelledCount).toBe(1);

    const names = responseData.data.map(p => p.passengerName);
    expect(names).toContain('Alice Smith');
    expect(names).toContain('Bob Smith');
    expect(names).toContain('Charlie Brown');
    // Diana Prince is on 2026-11-05 and should NOT appear in 2026-11-01 manifest
    expect(names).not.toContain('Diana Prince');
  });

  test('3. Group Booking Handling: Correctly lists individual passengers with seats without duplicates', async () => {
    const req = {
      query: {
        vehicleId: testBus1._id.toString(),
        travelDate: '2026-11-01'
      }
    };
    let responseData = null;
    const res = { json: data => { responseData = data; } };

    await getBusPassengerManifest(req, res, jest.fn());
    const alice = responseData.data.find(p => p.passengerName === 'Alice Smith');
    const bob = responseData.data.find(p => p.passengerName === 'Bob Smith');

    expect(alice).toBeDefined();
    expect(alice.seatNumber).toBe('S01');
    expect(alice.age).toBe(29);
    expect(alice.gender).toBe('Female');
    expect(alice.passengerCountInBooking).toBe(2);
    expect(alice.isLeadPassenger).toBe(true);

    expect(bob).toBeDefined();
    expect(bob.seatNumber).toBe('S02');
    expect(bob.age).toBe(32);
    expect(bob.gender).toBe('Male');
    expect(bob.passengerCountInBooking).toBe(2);
    expect(bob.isLeadPassenger).toBe(false);

    // Emergency contact (if collected in customer profile or booking)
    expect(alice).toHaveProperty('emergencyContact');
    if (alice.emergencyContact) {
      expect(alice.emergencyContact.name).toBe('Jane Doe');
      expect(alice.emergencyContact.relationship).toBe('Sister');
      expect(alice.emergencyContact.phone).toBe('9800000099');
    } else {
      expect(alice.emergencyContact).toBeNull();
    }
  });

  test('4. Status and Route Filtering: Filters manifest by booking status and boarding point', async () => {
    // Filter only Confirmed bookings
    const reqConfirmed = {
      query: {
        vehicleId: testBus1._id.toString(),
        travelDate: '2026-11-01',
        status: 'Confirmed'
      }
    };
    let respConfirmed = null;
    await getBusPassengerManifest(reqConfirmed, { json: d => { respConfirmed = d; } }, jest.fn());
    expect(respConfirmed.data.length).toBe(2);
    expect(respConfirmed.data.every(p => p.bookingStatus === 'Confirmed')).toBe(true);

    // Filter by Boarding point
    const reqBoarding = {
      query: {
        vehicleId: testBus1._id.toString(),
        travelDate: '2026-11-01',
        boardingPoint: 'Gongabu'
      }
    };
    let respBoarding = null;
    await getBusPassengerManifest(reqBoarding, { json: d => { respBoarding = d; } }, jest.fn());
    expect(respBoarding.data.length).toBe(1);
    expect(respBoarding.data[0].passengerName).toBe('Charlie Brown');
  });

  test('5. Validation: Rejects invalid or missing vehicleId with 400', async () => {
    let statusCode = null;
    let errResp = null;
    const res = {
      status: code => {
        statusCode = code;
        return { json: data => { errResp = data; } };
      }
    };

    await getBusPassengerManifest({ query: {} }, res, jest.fn());
    expect(statusCode).toBe(400);
    expect(errResp.success).toBe(false);

    await getBusPassengerManifest({ query: { vehicleId: 'invalid-id' } }, res, jest.fn());
    expect(statusCode).toBe(400);
    expect(errResp.success).toBe(false);
  });
});
