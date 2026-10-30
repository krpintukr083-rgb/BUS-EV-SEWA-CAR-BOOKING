const mongoose = require('mongoose');
const { connectTestDB, closeTestDB } = require('./setup');
const { getBusManifestJourneys, getBusPassengerManifest } = require('../src/controllers/adminController');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Schedule = require('../src/models/Schedule');
const Driver = require('../src/models/Driver');
const User = require('../src/models/User');

jest.setTimeout(35000);

describe('Passenger Manifest EV-Sewa & Car Dedicated QA Suite', () => {
  let testDriverUser, testDriver;
  let testCustomerUser;
  let busVehicle, busSchedule, busBooking;
  let legacyEvVehicle234555, legacyEvBookingDirect;
  let olderEvVehicleNepali, olderEvBookingDirect;
  let carVehicleUP70, carBookingDirect;
  let minimalEvVehicle;

  let createdBookingIds = [];
  let createdVehicleIds = [];
  let createdDriverIds = [];
  let createdUserIds = [];

  const mockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  beforeAll(async () => {
    await connectTestDB();

    testDriverUser = await User.create({
      name: 'Manifest Driver',
      email: `manifest_drv_${Date.now()}@test.com`,
      phone: `98444${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    createdUserIds.push(testDriverUser._id);

    testDriver = await Driver.create({
      user: testDriverUser._id,
      name: 'Ganesh Yadav',
      phone: testDriverUser.phone,
      mobileNumber: testDriverUser.phone,
      drivingLicenceNumber: `DL-EV-${Date.now()}`,
      licenseNumber: `DL-EV-${Date.now()}`,
      status: 'Active'
    });
    createdDriverIds.push(testDriver._id);

    testCustomerUser = await User.create({
      name: 'Ram Shrestha',
      email: `ram_${Date.now()}@test.com`,
      phone: `9802056362`,
      password: 'Password@123',
      role: 'customer',
      status: 'Active'
    });
    createdUserIds.push(testCustomerUser._id);

    // 1. Bus with Schedule
    busVehicle = await Vehicle.create({
      vehicleNumber: `BA 2 KHA ${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Deluxe 2+2',
      vehicleModel: 'Tata Starbus Ultra AC',
      vehicleName: 'YatraSewanp Deluxe Bus',
      ownerName: 'Bus Operator',
      ownerMobileNumber: '9841000001',
      assignedDriver: testDriver._id,
      route: {
        origin: 'Kathmandu',
        destination: 'Birgunj',
        departureTime: '07:00 AM',
        boardingPoints: ['Gongabu', 'Kalanki']
      }
    });
    createdVehicleIds.push(busVehicle._id);

    busSchedule = await Schedule.create({
      vehicle: busVehicle._id,
      driver: testDriver._id,
      origin: 'Kathmandu',
      destination: 'Birgunj',
      travelDate: new Date('2026-11-10T00:00:00.000Z'),
      departureTime: '07:00 AM',
      fareRate: 800,
      status: 'Active'
    });

    busBooking = await Booking.create({
      bookingId: `BK-BUS-${Date.now()}`,
      customer: { name: 'Sita Sharma', phone: '9841234567', email: 'sita@test.com' },
      driver: testDriver._id,
      vehicle: busVehicle._id,
      scheduleId: busSchedule._id,
      serviceType: 'Bus',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Birgunj',
      travelDate: new Date('2026-11-10T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Sita Sharma', age: 28, gender: 'Female', seatNumber: 'B1' },
        { name: 'Rita Sharma', age: 25, gender: 'Female', seatNumber: 'B2' }
      ],
      busSeatNumbers: ['B1', 'B2'],
      fare: 1600,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(busBooking._id);

    // 2. Legacy EV-Sewa vehicle 234555 with direct booking (scheduleId: null)
    legacyEvVehicle234555 = await Vehicle.create({
      vehicleNumber: '234555',
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Driver Submitted Vehicle',
      vehicleModel: '2024',
      vehicleName: 'Kyc',
      seatingCapacity: 11,
      ownerName: 'Ganesh yadav',
      ownerMobileNumber: '9802056362',
      assignedDriver: testDriver._id,
      rcNumber: 'RC-VERIFIED-COMMERCIAL',
      route: {
        origin: 'Birgunj',
        destination: 'Bharatpur',
        departureTime: '06:00 AM'
      }
    });
    createdVehicleIds.push(legacyEvVehicle234555._id);

    legacyEvBookingDirect = await Booking.create({
      bookingId: `BK-EV-234555-${Date.now()}`,
      customer: { name: 'Hari Bahadur', phone: '9802056362', email: 'hari@test.com' },
      driver: testDriver._id,
      vehicle: legacyEvVehicle234555._id,
      scheduleId: null, // Direct booking
      serviceType: 'EV-Sewa',
      pickupLocation: 'Birgunj',
      dropLocation: 'Bharatpur',
      travelDate: new Date('2026-11-12T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Hari Bahadur', age: 40, gender: 'Male' }
      ],
      fare: 400,
      bookingStatus: 'Completed',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(legacyEvBookingDirect._id);

    // 3. Older EV-Sewa vehicle with Devanagari plate
    olderEvVehicleNepali = await Vehicle.create({
      vehicleNumber: 'बागमती प्रेदेश 06001ज0113',
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Van',
      vehicleModel: 'Gonow',
      vehicleName: 'Kyc',
      seatingCapacity: 12,
      ownerName: 'Ramesh Binda',
      ownerMobileNumber: '9764509201',
      assignedDriver: testDriver._id,
      route: {
        origin: 'Bharatpur',
        destination: 'Birgunj',
        departureTime: '07:30 AM'
      }
    });
    createdVehicleIds.push(olderEvVehicleNepali._id);

    olderEvBookingDirect = await Booking.create({
      bookingId: `BK-EV-NEP-${Date.now()}`,
      customer: { name: 'Kiran KC', phone: '9764509201', email: 'kiran@test.com' },
      driver: testDriver._id,
      vehicle: olderEvVehicleNepali._id,
      scheduleId: null,
      serviceType: 'EV-Sewa',
      pickupLocation: 'Bharatpur',
      dropLocation: 'Birgunj',
      travelDate: new Date('2026-11-14T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Kiran KC', age: 34, gender: 'Male' }
      ],
      fare: 450,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(olderEvBookingDirect._id);

    // 4. Car vehicle UP70TR1234 with direct booking
    carVehicleUP70 = await Vehicle.create({
      vehicleNumber: 'UP70TR1234',
      vehicleType: 'Car',
      vehicleCategory: 'Sedan',
      vehicleModel: 'Swift Dzire ZXI',
      vehicleName: 'Yatra Review Car',
      seatingCapacity: 4,
      ownerName: 'Car Owner',
      ownerMobileNumber: '9841999999',
      assignedDriver: testDriver._id,
      rcNumber: 'RC-UP70TR1234',
      route: {
        origin: 'Kathmandu',
        destination: 'Birgunj',
        departureTime: '09:00 AM'
      }
    });
    createdVehicleIds.push(carVehicleUP70._id);

    carBookingDirect = await Booking.create({
      bookingId: `BK-CAR-${Date.now()}`,
      customer: { name: 'Sunita Thapa', phone: '9841888888', email: 'sunita@test.com' },
      driver: testDriver._id,
      vehicle: carVehicleUP70._id,
      scheduleId: null, // Direct booking
      serviceType: 'Car',
      pickupLocation: 'Kathmandu',
      dropLocation: 'Birgunj',
      travelDate: new Date('2026-11-15T00:00:00.000Z'),
      passengerDetails: [
        { name: 'Sunita Thapa', age: 30, gender: 'Female' }
      ],
      fare: 2500,
      bookingStatus: 'Confirmed',
      rideStatus: 'Started',
      paymentStatus: 'Paid'
    });
    createdBookingIds.push(carBookingDirect._id);

    // 5. EV-Sewa vehicle with missing optional fields (legacy)
    minimalEvVehicle = await Vehicle.create({
      vehicleNumber: 'BA.03.001.JA 598',
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Shuttle',
      vehicleModel: 'Tata Tigor',
      vehicleName: 'KYC Shuttle',
      ownerName: 'Legacy Owner',
      ownerMobileNumber: '9800000000'
      // missing assignedDriver, missing busDetails, minimal fields
    });
    createdVehicleIds.push(minimalEvVehicle._id);
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    if (createdVehicleIds.length > 0) await Vehicle.deleteMany({ _id: { $in: createdVehicleIds } });
    if (busSchedule) await Schedule.deleteOne({ _id: busSchedule._id });
    if (createdDriverIds.length > 0) await Driver.deleteMany({ _id: { $in: createdDriverIds } });
    if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
    await closeTestDB();
  });

  test('1. Bus registration search finds scheduled bus journeys', async () => {
    const res = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: busVehicle.vehicleNumber } }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.length).toBeGreaterThan(0);
    expect(res.jsonData.data[0].vehicleNumber).toBe(busVehicle.vehicleNumber);
    expect(res.jsonData.data[0].serviceType).toBe('Bus');
  });

  test('2. Legacy EV-Sewa registration 234555 exact search resolves correctly', async () => {
    const res = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: '234555' } }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.length).toBeGreaterThan(0);
    const match = res.jsonData.data.find(j => j.vehicleNumber === '234555');
    expect(match).toBeDefined();
    expect(match.serviceType).toBe('EV-Sewa');
  });

  test('3. Other older EV-Sewa registration numbers (Devanagari and dotted format) search resolves', async () => {
    // Devanagari plate
    const resNepali = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: 'बागमती प्रेदेश 06001ज0113' } }, resNepali, () => {});
    expect(resNepali.jsonData.success).toBe(true);
    expect(resNepali.jsonData.data.some(j => j.vehicleNumber === 'बागमती प्रेदेश 06001ज0113')).toBe(true);

    // Dotted format: 598
    const res598 = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: '598' } }, res598, () => {});
    expect(res598.jsonData.success).toBe(true);
    expect(res598.jsonData.data.some(j => j.vehicleNumber === 'BA.03.001.JA 598')).toBe(true);
  });

  test('4. Car registration search for UP70TR1234 resolves correctly', async () => {
    const res = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: 'UP70TR1234' } }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.length).toBeGreaterThan(0);
    const match = res.jsonData.data.find(j => j.vehicleNumber === 'UP70TR1234');
    expect(match).toBeDefined();
    expect(match.serviceType).toBe('Car');
  });

  test('5. Partial registration matching for EV-Sewa (234, 555) and Car (1234, UP70)', async () => {
    // 234
    const res234 = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: '234' } }, res234, () => {});
    expect(res234.jsonData.data.some(j => j.vehicleNumber === '234555')).toBe(true);

    // 555
    const res555 = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: '555' } }, res555, () => {});
    expect(res555.jsonData.data.some(j => j.vehicleNumber === '234555')).toBe(true);

    // 1234
    const res1234 = mockRes();
    await getBusManifestJourneys({ query: { vehicleRegistration: '1234' } }, res1234, () => {});
    expect(res1234.jsonData.data.some(j => j.vehicleNumber === 'UP70TR1234')).toBe(true);
  });

  test('6. EV-Sewa direct bookings appear under correct vehicle without fabricated seat numbers', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: { vehicleId: legacyEvVehicle234555._id.toString(), travelDate: '2026-11-12' }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.journeyInfo.vehicleNumber).toBe('234555');
    expect(res.jsonData.data.length).toBeGreaterThan(0);
    const row = res.jsonData.data[0];
    expect(row.bookingId).toBe(legacyEvBookingDirect.bookingId);
    expect(row.passengerName).toBe('Hari Bahadur');
    // EV-Sewa seats must not be fabricated
    expect(row.seatNumber).toBe('N/A');
  });

  test('7. Car direct bookings appear with driver, ride status and fare', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: { vehicleId: carVehicleUP70._id.toString(), travelDate: '2026-11-15' }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.journeyInfo.vehicleNumber).toBe('UP70TR1234');
    expect(res.jsonData.data.length).toBeGreaterThan(0);
    const row = res.jsonData.data[0];
    expect(row.bookingId).toBe(carBookingDirect.bookingId);
    expect(row.assignedDriver).toBe('Ganesh Yadav');
    expect(row.rideStatus).toBe('Started');
    expect(row.fare).toBe(2500);
  });

  test('8. Scheduled Bus bookings continue working with seats and boarding points', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: { vehicleId: busVehicle._id.toString(), travelDate: '2026-11-10', scheduleId: busSchedule._id.toString() }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.length).toBe(2); // Sita and Rita
    expect(res.jsonData.data[0].seatNumber).toBe('B1');
    expect(res.jsonData.data[1].seatNumber).toBe('B2');
    expect(res.jsonData.journeyInfo.boardingPoints).toContain('Gongabu');
  });

  test('9. Bookings with null schedule IDs (direct bookings) are supported seamlessly', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: { vehicleId: legacyEvVehicle234555._id.toString(), scheduleId: 'direct' }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.some(r => r.bookingId === legacyEvBookingDirect.bookingId)).toBe(true);
  });

  test('10. Vehicle dropdown completeness: returns vehicles of target service even if 0 journeys found', async () => {
    const res = mockRes();
    await getBusManifestJourneys({
      query: { serviceType: 'EV-Sewa', vehicleRegistration: 'NONEXISTENT_REG_9999' }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.length).toBe(0); // 0 journeys match
    // Complete fleet dropdown remains preserved!
    expect(res.jsonData.vehicles.length).toBeGreaterThan(0);
    expect(res.jsonData.vehicles.some(v => v.vehicleNumber === '234555')).toBe(true);
  });

  test('11. Service-specific filters: Bus, EV-Sewa and Car return only vehicles of selected service', async () => {
    // Bus filter
    const resBus = mockRes();
    await getBusManifestJourneys({ query: { serviceType: 'Bus' } }, resBus, () => {});
    expect(resBus.jsonData.vehicles.every(v => v.serviceType === 'Bus')).toBe(true);

    // EV-Sewa filter
    const resEv = mockRes();
    await getBusManifestJourneys({ query: { serviceType: 'EV-Sewa' } }, resEv, () => {});
    expect(resEv.jsonData.vehicles.every(v => v.serviceType === 'EV-Sewa')).toBe(true);

    // Car filter
    const resCar = mockRes();
    await getBusManifestJourneys({ query: { serviceType: 'Car' } }, resCar, () => {});
    expect(resCar.jsonData.vehicles.every(v => v.serviceType === 'Car')).toBe(true);
  });

  test('12. Booking ID search inside the selected passenger manifest works', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: {
        vehicleId: legacyEvVehicle234555._id.toString(),
        search: legacyEvBookingDirect.bookingId
      }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.data.length).toBe(1);
    expect(res.jsonData.data[0].bookingId).toBe(legacyEvBookingDirect.bookingId);
  });

  test('13. No duplicate bookings or passengers in manifest rows', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: { vehicleId: busVehicle._id.toString() }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    const manifestIds = res.jsonData.data.map(r => r.manifestId);
    const uniqueIds = new Set(manifestIds);
    expect(manifestIds.length).toBe(uniqueIds.size);
  });

  test('14. Missing optional vehicle fields do not crash the manifest API', async () => {
    const res = mockRes();
    await getBusPassengerManifest({
      query: { vehicleId: minimalEvVehicle._id.toString() }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    expect(res.jsonData.journeyInfo.vehicleNumber).toBe('BA.03.001.JA 598');
    expect(res.jsonData.data).toEqual([]);
  });

  test('15. No unrelated vehicle or booking associations across services', async () => {
    const res = mockRes();
    // Querying Car vehicle must never return EV-Sewa or Bus bookings
    await getBusPassengerManifest({
      query: { vehicleId: carVehicleUP70._id.toString() }
    }, res, () => {});
    expect(res.jsonData.success).toBe(true);
    res.jsonData.data.forEach(row => {
      expect(row.vehicleNumber).toBe('UP70TR1234');
      expect(row.serviceType).toBe('Car');
      expect(row.bookingId).not.toBe(legacyEvBookingDirect.bookingId);
      expect(row.bookingId).not.toBe(busBooking.bookingId);
    });
  });
});
