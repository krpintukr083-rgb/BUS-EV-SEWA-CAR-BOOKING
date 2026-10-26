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
  let bookingGroup;
  let bookingCancelled;
  let bookingTrip2;
  let testEvSewaVehicle;
  let testEvSewaBooking;
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
    bookingGroup = await Booking.create({
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
    bookingCancelled = await Booking.create({
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
    bookingTrip2 = await Booking.create({
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

    // 6. Create EV-Sewa Vehicle and Booking Fixture (To rigorously verify non-bus isolation)
    testEvSewaVehicle = await Vehicle.create({
      vehicleNumber: `EV 99 BA ${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Shuttle 12-Seater',
      vehicleModel: 'Tata Tigor EV',
      vehicleName: 'Green City EV',
      seatingCapacity: 12,
      ownerName: 'EV Fleet Operator',
      ownerMobileNumber: '9841999999',
      assignedDriver: testDriver._id
    });
    createdVehicleIds.push(testEvSewaVehicle._id);

    testEvSewaBooking = await Booking.create({
      bookingId: `BK-EV-${Date.now()}`,
      serviceType: 'EV-Sewa',
      vehicle: testEvSewaVehicle._id,
      customer: {
        name: 'EV Passenger Test',
        phone: '9812345678',
        email: 'ev@test.com'
      },
      pickupLocation: 'Birgunj',
      dropLocation: 'Bharatpur',
      travelDate: new Date('2026-11-01T00:00:00.000Z'),
      fare: 500,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(testEvSewaBooking._id);
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

  describe('14 Search & Filter Regression Tests', () => {
    test('1. A valid bus registration number returns its matching journey', async () => {
      const req = { query: { search: testBus1.vehicleNumber } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBeGreaterThanOrEqual(1);
      expect(resp.data.some(j => j.vehicleNumber === testBus1.vehicleNumber)).toBe(true);
    });

    test('2. A partial registration number returns matching journeys', async () => {
      // Direct partial
      const partialRaw = testBus1.vehicleNumber.slice(0, 5);
      const reqPartial = { query: { search: partialRaw } };
      let respPartial = null;
      await getBusManifestJourneys(reqPartial, { json: d => { respPartial = d; } }, jest.fn());
      expect(respPartial.success).toBe(true);
      expect(respPartial.data.some(j => j.vehicleNumber === testBus1.vehicleNumber)).toBe(true);

      // Normalized partial (stripped spaces and lowercase)
      const partialNorm = testBus1.vehicleNumber.replace(/[\s\-_]/g, '').toLowerCase().slice(0, 6);
      const reqNorm = { query: { search: partialNorm } };
      let respNorm = null;
      await getBusManifestJourneys(reqNorm, { json: d => { respNorm = d; } }, jest.fn());
      expect(respNorm.success).toBe(true);
      expect(respNorm.data.some(j => j.vehicleNumber === testBus1.vehicleNumber)).toBe(true);
    });

    test('3. A valid route-origin search returns matching journeys', async () => {
      const req = { query: { search: 'Kathmandu' } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBeGreaterThanOrEqual(1);
      expect(resp.data.some(j => j.origin === 'Kathmandu')).toBe(true);
    });

    test('4. A valid destination search returns matching journeys', async () => {
      const req = { query: { search: 'Pokhara' } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBeGreaterThanOrEqual(1);
      expect(resp.data.some(j => j.destination.toLowerCase().includes('pokhara'))).toBe(true);
    });

    test('5. A valid driver\'s name returns assigned journeys', async () => {
      const req = { query: { search: testDriver.name } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.some(j => j.driverName === testDriver.name)).toBe(true);
    });

    test('6. A valid trip ID returns the correct journey', async () => {
      const schedIdStr = testSchedule._id.toString();
      const req = { query: { search: schedIdStr } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      const matched = resp.data.find(j => j.tripId === schedIdStr);
      expect(matched).toBeDefined();
      expect(matched.vehicleNumber).toBe(testBus1.vehicleNumber);
    });

    test('7. A valid schedule ID returns the correct journey', async () => {
      const schedIdStr = testSchedule._id.toString();
      const req = { query: { search: schedIdStr } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      const matched = resp.data.find(j => j.scheduleId && j.scheduleId.toString() === schedIdStr);
      expect(matched).toBeDefined();
      expect(matched.travelDate).toBe('2026-11-01');
    });

    test('8. A booking ID linked to a bus journey returns that journey', async () => {
      const req = { query: { search: bookingGroup.bookingId } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(1);
      expect(resp.data[0].vehicleNumber).toBe(testBus1.vehicleNumber);
      expect(resp.data[0].travelDate).toBe('2026-11-01');
    });

    test('9. An existing car or EV-Sewa booking ID does not incorrectly appear as a bus journey', async () => {
      // Query using the isolated EV-Sewa fixture booking ID
      const req = { query: { search: testEvSewaBooking.bookingId } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(0);
      expect(resp.count).toBe(0);
      expect(resp.nonBusMatch).toBeDefined();
      expect(resp.nonBusMatch.serviceType).toBe('EV-Sewa');
    });

    test('10. A nonexistent booking ID returns an empty result', async () => {
      const req = { query: { search: 'BK-NONEXISTENT-99999999' } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(0);
      expect(resp.count).toBe(0);
    });

    test('11. A registration filter and journey-date filter work together', async () => {
      // Match: Bus 1 on 2026-11-01 with matching search
      const reqMatch = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: 'Kathmandu'
        }
      };
      let respMatch = null;
      await getBusManifestJourneys(reqMatch, { json: d => { respMatch = d; } }, jest.fn());
      expect(respMatch.success).toBe(true);
      expect(respMatch.data.length).toBeGreaterThanOrEqual(1);
      expect(respMatch.data.every(j => j.vehicleId.toString() === testBus1._id.toString())).toBe(true);
      expect(respMatch.data.every(j => j.travelDate === '2026-11-01')).toBe(true);

      // Mismatch: Bus 1 on 2026-11-05 with Alice Smith search (Alice is only on 2026-11-01)
      const reqMismatch = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-05',
          search: 'Alice'
        }
      };
      let respMismatch = null;
      await getBusManifestJourneys(reqMismatch, { json: d => { respMismatch = d; } }, jest.fn());
      expect(respMismatch.success).toBe(true);
      expect(respMismatch.data.length).toBe(0);
    });

    test('12. Clearing search restores the results permitted by the other filters', async () => {
      // Search with restrictive text on 2026-11-05 yields 0
      const reqFiltered = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-05',
          search: 'NonExistent'
        }
      };
      let respFiltered = null;
      await getBusManifestJourneys(reqFiltered, { json: d => { respFiltered = d; } }, jest.fn());
      expect(respFiltered.data.length).toBe(0);

      // Clearing search text restores the 2026-11-05 journey permitted by the remaining filters
      const reqCleared = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-05',
          search: ''
        }
      };
      let respCleared = null;
      await getBusManifestJourneys(reqCleared, { json: d => { respCleared = d; } }, jest.fn());
      expect(respCleared.success).toBe(true);
      expect(respCleared.data.some(j => j.travelDate === '2026-11-05')).toBe(true);
    });

    test('13. Multiple matching fields do not create duplicate journeys', async () => {
      // Query that matches testBus1 vehicleNumber, route origin, and driver simultaneously
      const req = { query: { search: testBus1.vehicleNumber } };
      let resp = null;
      await getBusManifestJourneys(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);

      const journeyKeys = resp.data.map(j => j.journeyKey);
      const uniqueKeys = new Set(journeyKeys);
      expect(journeyKeys.length).toBe(uniqueKeys.size);

      // Also verify booking linked to a specific journey does not duplicate journeys
      const reqBk = { query: { search: bookingGroup.bookingId } };
      let respBk = null;
      await getBusManifestJourneys(reqBk, { json: d => { respBk = d; } }, jest.fn());
      expect(respBk.data.length).toBe(1);
    });

    test('14. API errors are handled without crashing the page', async () => {
      const nextFn = jest.fn();
      let resJson = null;
      let resStatus = null;
      const res = {
        status: code => {
          resStatus = code;
          return { json: d => { resJson = d; } };
        },
        json: d => { resJson = d; }
      };

      // 14a. Invalid vehicleId to manifest endpoint returns 400 without unhandled exception
      await getBusPassengerManifest({ query: { vehicleId: 'not-valid-id' } }, res, nextFn);
      expect(resStatus).toBe(400);
      expect(resJson.success).toBe(false);

      // 14b. Controller passes unexpected errors to next() for Express error middleware
      const brokenReq = {
        get query() {
          throw new Error('Database connection failed mock');
        }
      };
      const brokenNext = jest.fn();
      await getBusManifestJourneys(brokenReq, res, brokenNext);
      expect(brokenNext).toHaveBeenCalled();
      expect(brokenNext.mock.calls[0][0].message).toBe('Database connection failed mock');
    });
  });

  describe('Manifest Passenger Search & Booking ID Match Tests', () => {
    test('1. Matches by full Booking ID (e.g. BK-MAN-...)', async () => {
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: bookingGroup.bookingId
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(2);
      expect(resp.data.every(p => p.bookingId === bookingGroup.bookingId)).toBe(true);
      expect(resp.data.map(p => p.passengerName)).toEqual(expect.arrayContaining(['Alice Smith', 'Bob Smith']));
    });

    test('2. Matches by partial Booking ID (digits or partial prefix)', async () => {
      // Search partial numeric ID without prefix
      const partialId = bookingGroup.bookingId.split('-')[2]; // e.g. timestamp part
      const reqPartial = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: partialId
        }
      };
      let respPartial = null;
      await getBusPassengerManifest(reqPartial, { json: d => { respPartial = d; } }, jest.fn());
      expect(respPartial.success).toBe(true);
      expect(respPartial.data.length).toBeGreaterThanOrEqual(2);
      expect(respPartial.data.some(p => p.bookingId === bookingGroup.bookingId)).toBe(true);

      // Search partial prefix (e.g. 'BK-MAN')
      const reqPrefix = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: 'BK-MAN'
        }
      };
      let respPrefix = null;
      await getBusPassengerManifest(reqPrefix, { json: d => { respPrefix = d; } }, jest.fn());
      expect(respPrefix.success).toBe(true);
      expect(respPrefix.data.length).toBeGreaterThanOrEqual(2);
    });

    test('3. Search is case-insensitive and ignores leading/trailing spaces', async () => {
      const paddedQuery = `   ${bookingGroup.bookingId.toLowerCase()}   `;
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: paddedQuery
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(2);
      expect(resp.data.every(p => p.bookingId === bookingGroup.bookingId)).toBe(true);
    });

    test('4. Matches by passenger name', async () => {
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: 'alice'
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(1);
      expect(resp.data[0].passengerName).toBe('Alice Smith');
    });

    test('5. Matches by seat number', async () => {
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: 'S01'
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(1);
      expect(resp.data[0].seatNumber).toBe('S01');
      expect(resp.data[0].passengerName).toBe('Alice Smith');
    });

    test('6. Matches by mobile number', async () => {
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: testCustomerUser.phone
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(2);
      expect(resp.data.every(p => p.mobileNumber === testCustomerUser.phone)).toBe(true);
    });

    test('7. Search works together with booking status filter', async () => {
      // Confirmed status + Charlie search -> Charlie is Cancelled, should be 0
      const reqMismatch = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          status: 'Confirmed',
          search: 'Charlie'
        }
      };
      let respMismatch = null;
      await getBusPassengerManifest(reqMismatch, { json: d => { respMismatch = d; } }, jest.fn());
      expect(respMismatch.success).toBe(true);
      expect(respMismatch.data.length).toBe(0);

      // Cancelled status + Charlie search -> matches Charlie Brown
      const reqMatch = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          status: 'Cancelled',
          search: 'Charlie'
        }
      };
      let respMatch = null;
      await getBusPassengerManifest(reqMatch, { json: d => { respMatch = d; } }, jest.fn());
      expect(respMatch.success).toBe(true);
      expect(respMatch.data.length).toBe(1);
      expect(respMatch.data[0].passengerName).toBe('Charlie Brown');
    });

    test('8. Search works together with boarding point filter', async () => {
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          boardingPoint: 'Kalanki',
          search: bookingGroup.bookingId
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(2);

      // Mismatched boarding point
      const reqMismatch = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          boardingPoint: 'Gongabu',
          search: bookingGroup.bookingId
        }
      };
      let respMismatch = null;
      await getBusPassengerManifest(reqMismatch, { json: d => { respMismatch = d; } }, jest.fn());
      expect(respMismatch.success).toBe(true);
      expect(respMismatch.data.length).toBe(0);
    });

    test('9. Search strictly isolates selected bus journey and vehicle', async () => {
      // Query on Nov 1 manifest with booking ID from Nov 5 (different journey for same bus)
      const reqDiffDate = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: bookingTrip2.bookingId
        }
      };
      let respDiffDate = null;
      await getBusPassengerManifest(reqDiffDate, { json: d => { respDiffDate = d; } }, jest.fn());
      expect(respDiffDate.success).toBe(true);
      expect(respDiffDate.data.length).toBe(0);

      // Query on Bus manifest with booking ID from EV-Sewa vehicle
      const reqEv = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: testEvSewaBooking.bookingId
        }
      };
      let respEv = null;
      await getBusPassengerManifest(reqEv, { json: d => { respEv = d; } }, jest.fn());
      expect(respEv.success).toBe(true);
      expect(respEv.data.length).toBe(0);
    });

    test('10. Nonexistent search returns empty array', async () => {
      const req = {
        query: {
          vehicleId: testBus1._id.toString(),
          travelDate: '2026-11-01',
          search: 'BK-00000000-NONEXISTENT'
        }
      };
      let resp = null;
      await getBusPassengerManifest(req, { json: d => { resp = d; } }, jest.fn());
      expect(resp.success).toBe(true);
      expect(resp.data.length).toBe(0);
    });
  });
});

